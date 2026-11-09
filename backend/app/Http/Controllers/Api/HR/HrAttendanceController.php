<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAttendance;
use App\Models\HrAttendanceRegularization;
use App\Models\HrEmployee;
use App\Models\HrLeave;
use App\Models\HrLocation;
use App\Models\HrRemoteAttendanceRequest;
use App\Models\User;
use App\Notifications\HrNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class HrAttendanceController extends Controller
{
    // ── Company Shift Configuration ────────────────────────────────────────────
    const SHIFT_START  = '09:00:00'; // Official shift start
    const GRACE_END    = '09:10:00'; // Late after this (grace period 9–9:10 AM)
    const SHIFT_END    = '17:30:00'; // Official end (5:30 PM)
    const HALF_DAY_HRS = 4.5;        // Below this = half day

    /**
     * Check if user is authorized as an adjustment manager.
     * Rule: Only users explicitly assigned in HR Settings (or Super Admin) have approval authority.
     */
    public static function isAdjustmentManager(?object $user, ?HrEmployee $targetEmployee = null): bool
    {
        return HrSettingController::isApprovalManager($user);
    }

    // ── Haversine distance (meters) ────────────────────────────────────────────
    private function getDistance($lat1, $lon1, $lat2, $lon2): float
    {
        $earthRadius = 6371000;
        $latFrom = deg2rad($lat1); $lonFrom = deg2rad($lon1);
        $latTo   = deg2rad($lat2); $lonTo   = deg2rad($lon2);
        $angle   = 2 * asin(sqrt(
            pow(sin(($latTo - $latFrom) / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin(($lonTo - $lonFrom) / 2), 2)
        ));
        return $angle * $earthRadius;
    }

    private function findValidLocation($lat, $lng): ?HrLocation
    {
        foreach (HrLocation::where('status', 'active')->get() as $loc) {
            if ($this->getDistance($lat, $lng, $loc->latitude, $loc->longitude) <= $loc->radius_meters) {
                return $loc;
            }
        }
        return null;
    }

    /** Determine status from clock-in time. Grace: 9:00–10:00 = present. After 10:00 = late. */
    private function deriveStatus(Carbon $clockIn, string $date): string
    {
        $localClockIn = $clockIn->copy()->timezone('Asia/Colombo');
        $graceEnd = Carbon::parse($localClockIn->toDateString() . ' ' . self::GRACE_END, 'Asia/Colombo');
        return $localClockIn->greaterThan($graceEnd) ? 'late' : 'present';
    }

    /** Recalculate hours and status on clock-out */
    private function recalcOnClockOut(HrAttendance $att, Carbon $clockOut): array
    {
        $clockIn = Carbon::parse($att->clock_in_time);
        $hoursWorked = round($clockIn->diffInMinutes($clockOut) / 60, 2);
        
        $localClockOut = $clockOut->copy()->timezone('Asia/Colombo');
        $shiftEnd = Carbon::parse($localClockOut->toDateString() . ' ' . self::SHIFT_END, 'Asia/Colombo');
        $earlyDepart = $localClockOut->lessThan($shiftEnd);

        // Less than half a day worked → mark as half_day
        $status = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $att->status;

        return [
            'clock_out_time'  => $clockOut,
            'working_hours'   => $hoursWorked,
            'early_departure' => $earlyDepart && $hoursWorked >= self::HALF_DAY_HRS,
            'status'          => $status,
        ];
    }

    // ── Employee: Clock In ─────────────────────────────────────────────────────
    public function clockIn(Request $request)
    {
        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
            'address'   => 'nullable|string',
        ]);

        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee profile not found.'], 404);

        // Self-heal any unclosed past attendance records
        $this->autoClosePastAttendances($employee->id);

        $today = Carbon::today()->toDateString();
        $now   = Carbon::now();

        $existing = HrAttendance::where('employee_id', $employee->id)->where('date', $today)->first();
        if ($existing?->clock_in_time) {
            return response()->json(['message' => 'You have already clocked in today.'], 400);
        }

        // Strict Geofencing check
        $location = $this->findValidLocation($request->latitude, $request->longitude);
        if (!$location) {
            $nearest = null;
            $minDistance = null;
            foreach (\App\Models\HrLocation::where('status', 'active')->get() as $loc) {
                $dist = $this->getDistance($request->latitude, $request->longitude, $loc->latitude, $loc->longitude);
                if ($minDistance === null || $dist < $minDistance) {
                    $minDistance = $dist;
                    $nearest = $loc;
                }
            }
            
            $msg = 'You are outside the approved work zone. Clock in denied.';
            if ($nearest) {
                $msg = "You are outside the approved work zone (Nearest zone: {$nearest->name}, Distance: " . round($minDistance) . "m). Clock in denied.";
            }

            return response()->json(['message' => $msg], 403);
        }

        $clientIp = $request->ip();

        $record = HrAttendance::updateOrCreate(
            ['employee_id' => $employee->id, 'date' => $today],
            [
                'clock_in_time'        => $now,
                'clock_in_lat'         => $request->latitude,
                'clock_in_lng'         => $request->longitude,
                'clock_in_address'     => $request->address,
                'clock_in_location_id' => $location->id,
                'status'               => $this->deriveStatus($now, $today),
                'ip_address'           => $clientIp,
                'notes'                => null,
            ]
        );

        $msg = 'Clocked in successfully at ' . $location->name;

        if ($record->status === 'late') {
            try {
                $adminUsers = \App\Models\User::where(function($q) {
                    $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                      ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
                })->get();

                \Illuminate\Support\Facades\Notification::send($adminUsers, new \App\Notifications\HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => 'warning',
                    'title'      => 'Late Arrival Alert',
                    'message'    => "{$employee->full_name} clocked in late at " . $now->copy()->timezone('Asia/Colombo')->format('h:i A') . " ({$location->name}).",
                    'link'       => '/solar/hr/admin/attendance',
                    'source_id'  => $record->id,
                ]));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('HR Notification error on late clock in: ' . $e->getMessage());
            }
        }

        return response()->json([
            'message' => $msg,
            'data'    => $record->load('clockInLocation'),
        ]);
    }

    // ── Employee: Clock Out ────────────────────────────────────────────────────
    public function clockOut(Request $request)
    {
        $request->validate([
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
            'address'   => 'nullable|string',
        ]);

        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee profile not found.'], 404);

        $today = Carbon::today()->toDateString();
        $now   = Carbon::now();

        $att = HrAttendance::where('employee_id', $employee->id)->where('date', $today)->first();
        if (!$att?->clock_in_time) return response()->json(['message' => 'You must clock in before clocking out.'], 400);
        if ($att->clock_out_time)  return response()->json(['message' => 'You have already clocked out today.'], 400);

        // Strict Geofencing check
        $location = $this->findValidLocation($request->latitude, $request->longitude);
        if (!$location) {
            $nearest = null;
            $minDistance = null;
            foreach (\App\Models\HrLocation::where('status', 'active')->get() as $loc) {
                $dist = $this->getDistance($request->latitude, $request->longitude, $loc->latitude, $loc->longitude);
                if ($minDistance === null || $dist < $minDistance) {
                    $minDistance = $dist;
                    $nearest = $loc;
                }
            }
            
            $msg = 'You are outside the approved work zone. Clock out denied.';
            if ($nearest) {
                $msg = "You are outside the approved work zone (Nearest zone: {$nearest->name}, Distance: " . round($minDistance) . "m). Clock out denied.";
            }

            return response()->json(['message' => $msg], 403);
        }

        $att->update(array_merge(
            $this->recalcOnClockOut($att, $now),
            [
                'clock_out_lat'     => $request->latitude,
                'clock_out_lng'     => $request->longitude,
                'clock_out_address' => $request->address,
            ]
        ));

        return response()->json(['message' => 'Clocked out successfully', 'data' => $att]);
    }

    // ── Employee: Today's Record ───────────────────────────────────────────────
    public function myToday(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(null);

        // Self-heal any unclosed past attendance records
        $this->autoClosePastAttendances($employee->id);

        return response()->json(
            HrAttendance::with('clockInLocation')
                ->where('employee_id', $employee->id)
                ->where('date', Carbon::today()->toDateString())
                ->first()
        );
    }

    /**
     * Expand approved leaves (non-short) for an employee within a given Y-m month into a map of date => HrLeave.
     */
    private function getApprovedLeaveDateMap(int $employeeId, string $month): array
    {
        $monthStart = Carbon::parse($month . '-01')->startOfDay();
        $monthEnd   = $monthStart->copy()->endOfMonth()->endOfDay();

        $leaves = HrLeave::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('leave_type', '!=', 'short')
            ->whereDate('start_date', '<=', $monthEnd->toDateString())
            ->whereDate('end_date', '>=', $monthStart->toDateString())
            ->get();

        $dateMap = [];
        foreach ($leaves as $leave) {
            $start = Carbon::parse($leave->start_date)->startOfDay();
            $end   = Carbon::parse($leave->end_date ?? $leave->start_date)->startOfDay();
            if ($start->lt($monthStart)) $start = $monthStart->copy();
            if ($end->gt($monthEnd)) $end = $monthEnd->copy();

            for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                if (!$d->isWeekend()) {
                    $dateMap[$d->toDateString()] = $leave;
                }
            }
        }

        return $dateMap;
    }

    /**
     * Merge approved leave dates into an attendance collection for a given employee & month.
     */
    private function mergeApprovedLeavesIntoHistory(int $employeeId, string $month, $attendances)
    {
        $leaveDateMap = $this->getApprovedLeaveDateMap($employeeId, $month);
        if (empty($leaveDateMap)) {
            return $attendances;
        }

        $byDate = [];
        $items = [];
        foreach ($attendances as $att) {
            $dateStr = $att->date instanceof Carbon
                ? $att->date->format('Y-m-d')
                : Carbon::parse($att->date)->format('Y-m-d');
            $arr = $att->toArray();
            $arr['date'] = $dateStr;
            if (isset($leaveDateMap[$dateStr]) && (empty($arr['clock_in_time']) || $arr['status'] === 'absent')) {
                $lv = $leaveDateMap[$dateStr];
                $arr['status'] = 'leave';
                $arr['leave_type'] = $lv->leave_type;
                $arr['notes'] = $arr['notes'] ?: (ucfirst($lv->leave_type) . ' Leave' . ($lv->reason ? ': ' . $lv->reason : ''));
            }
            $byDate[$dateStr] = true;
            $items[] = $arr;
        }

        foreach ($leaveDateMap as $dateStr => $lv) {
            if (!isset($byDate[$dateStr])) {
                $items[] = [
                    'id'                 => 'leave-' . $lv->id . '-' . $dateStr,
                    'employee_id'        => $employeeId,
                    'date'               => $dateStr,
                    'clock_in_time'      => null,
                    'clock_out_time'     => null,
                    'working_hours'      => null,
                    'status'             => 'leave',
                    'leave_type'         => $lv->leave_type,
                    'notes'              => ucfirst($lv->leave_type) . ' Leave' . ($lv->reason ? ': ' . $lv->reason : ''),
                    'is_approved_leave'  => true,
                ];
            }
        }

        usort($items, fn($a, $b) => strcmp($b['date'], $a['date']));
        return array_values($items);
    }

    // ── Employee: Monthly History ──────────────────────────────────────────────
    public function myHistory(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $this->autoClosePastAttendances($employee->id);

        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $attendances = HrAttendance::with(['clockInLocation', 'regularization'])
            ->where('employee_id', $employee->id)
            ->where('date', 'like', $month . '%')
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(
            $this->mergeApprovedLeavesIntoHistory($employee->id, $month, $attendances)
        );
    }

    public function employeeHistory(Request $request, $employeeId)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->autoClosePastAttendances((int) $employeeId);

        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $attendances = HrAttendance::with(['clockInLocation', 'regularization'])
            ->where('employee_id', $employeeId)
            ->where('date', 'like', $month . '%')
            ->orderBy('date', 'desc')
            ->get();

        return response()->json(
            $this->mergeApprovedLeavesIntoHistory((int) $employeeId, $month, $attendances)
        );
    }

    // ── HR Admin: Daily View ───────────────────────────────────────────────────
    public function index(Request $request)
    {
        $this->autoClosePastAttendances();

        $date   = $request->get('date', Carbon::today()->toDateString());
        $deptId = $request->get('department_id');

        $query = HrEmployee::with(['department', 'designation'])
            ->with([
                'attendances' => fn($q) => $q->where('date', $date)->with(['clockInLocation', 'regularization']),
                'leaves'      => fn($q) => $q->where('status', 'approved')
                    ->where('leave_type', '!=', 'short')
                    ->whereDate('start_date', '<=', $date)
                    ->whereDate('end_date', '>=', $date),
            ])
            ->where('status', 'active');

        if ($deptId) $query->where('department_id', $deptId);

        $employees = $query->get()->map(function ($emp) use ($date) {
            $empArr = $emp->toArray();
            $attList = $empArr['attendances'] ?? [];
            $approvedLeave = $emp->leaves->first();

            if ($approvedLeave) {
                if (empty($attList)) {
                    $empArr['attendances'] = [[
                        'id'                => null,
                        'employee_id'       => $emp->id,
                        'date'              => $date,
                        'clock_in_time'     => null,
                        'clock_out_time'    => null,
                        'working_hours'     => null,
                        'status'            => 'leave',
                        'leave_type'        => $approvedLeave->leave_type,
                        'notes'             => ucfirst($approvedLeave->leave_type) . ' Leave' . ($approvedLeave->reason ? ': ' . $approvedLeave->reason : ''),
                        'is_approved_leave' => true,
                    ]];
                } elseif (empty($attList[0]['clock_in_time']) || $attList[0]['status'] === 'absent') {
                    $empArr['attendances'][0]['status'] = 'leave';
                    $empArr['attendances'][0]['leave_type'] = $approvedLeave->leave_type;
                }
            }

            return $empArr;
        });

        return response()->json($employees);
    }

    // ── HR Admin: Create attendance manually ──────────────────────────────────
    public function store(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->ensureStatusColumnSupportsMissing();

        $validated = $request->validate([
            'employee_id'    => 'required|exists:hr_employees,id',
            'date'           => 'required|date',
            'clock_in_time'  => 'nullable|date',
            'clock_out_time' => 'nullable|date',
            'status'         => 'required|in:present,absent,late,half_day,leave,missing,short_leave',
            'notes'          => 'nullable|string',
        ]);

        $att = HrAttendance::updateOrCreate(
            ['employee_id' => $validated['employee_id'], 'date' => $validated['date']],
            array_merge($validated, [
                'is_manual_override' => true,
                'is_auto_clock_out'  => $validated['status'] === 'missing',
                'approved_by'        => $request->user()->id,
            ])
        );

        if ($att->clock_in_time && $att->clock_out_time) {
            $clockIn  = Carbon::parse($att->clock_in_time);
            $clockOut = Carbon::parse($att->clock_out_time);
            $att->update(['working_hours' => round($clockIn->diffInMinutes($clockOut) / 60, 2)]);
        } else {
            $att->update(['working_hours' => null]);
        }

        return response()->json(['message' => 'Attendance record saved', 'data' => $att], 201);
    }

    // ── HR Admin: Correct attendance ──────────────────────────────────────────
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->ensureStatusColumnSupportsMissing();

        $validated = $request->validate([
            'clock_in_time'  => 'nullable|date',
            'clock_out_time' => 'nullable|date',
            'status'         => 'required|in:present,absent,late,half_day,leave,missing,short_leave',
            'notes'          => 'nullable|string',
        ]);

        $att = HrAttendance::findOrFail($id);
        $validated['is_manual_override'] = true;
        $validated['approved_by']        = $request->user()->id;

        if (!empty($validated['clock_in_time']) && !empty($validated['clock_out_time'])) {
            $clockIn  = Carbon::parse($validated['clock_in_time']);
            $clockOut = Carbon::parse($validated['clock_out_time']);
            $hoursWorked = round($clockIn->diffInMinutes($clockOut) / 60, 2);
            $validated['working_hours'] = $hoursWorked;
            $validated['is_auto_clock_out'] = false;

            // If status was 'missing' and HR filled clock_out_time, automatically derive present/late/half_day
            if ($validated['status'] === 'missing') {
                $derived = $this->deriveStatus($clockIn, Carbon::parse($att->date)->toDateString());
                $validated['status'] = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $derived;
            }
        } else {
            $validated['working_hours'] = null;
        }

        $att->update($validated);

        return response()->json(['message' => 'Attendance corrected', 'data' => $att]);
    }

    // ── HR Admin: Monthly Calendar Data ───────────────────────────────────────
    public function calendar(Request $request)
    {
        $this->autoClosePastAttendances();

        $month  = $request->get('month', Carbon::now()->format('Y-m'));
        $deptId = $request->get('department_id');

        $monthStart = Carbon::parse($month . '-01')->startOfDay();
        $monthEnd   = $monthStart->copy()->endOfMonth()->endOfDay();

        $query = HrEmployee::with([
            'attendances' => fn($q) => $q->where('date', 'like', $month . '%'),
            'leaves'      => fn($q) => $q->where('status', 'approved')
                ->where('leave_type', '!=', 'short')
                ->whereDate('start_date', '<=', $monthEnd->toDateString())
                ->whereDate('end_date', '>=', $monthStart->toDateString()),
        ])->where('status', 'active');

        if ($deptId) $query->where('department_id', $deptId);

        $map = [];
        foreach ($query->get() as $emp) {
            $attMap = [];
            foreach ($emp->attendances as $att) {
                $dateStr = $att->date instanceof \Carbon\Carbon 
                    ? $att->date->format('Y-m-d') 
                    : \Carbon\Carbon::parse($att->date)->format('Y-m-d');
                $attMap[$dateStr] = $att->status;
            }

            foreach ($emp->leaves as $leave) {
                $start = Carbon::parse($leave->start_date)->startOfDay();
                $end   = Carbon::parse($leave->end_date ?? $leave->start_date)->startOfDay();
                if ($start->lt($monthStart)) $start = $monthStart->copy();
                if ($end->gt($monthEnd)) $end = $monthEnd->copy();

                for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                    if (!$d->isWeekend()) {
                        $dateStr = $d->toDateString();
                        if (!isset($attMap[$dateStr]) || $attMap[$dateStr] === 'absent') {
                            $attMap[$dateStr] = 'leave';
                        }
                    }
                }
            }

            $map[$emp->id] = $attMap;
        }

        return response()->json($map);
    }

    // ── HR Admin: Monthly Report ───────────────────────────────────────────────
    public function report(Request $request)
    {
        $this->autoClosePastAttendances();

        $month  = $request->get('month', Carbon::now()->format('Y-m'));
        $deptId = $request->get('department_id');

        $monthStart = Carbon::parse($month . '-01')->startOfDay();
        $monthEnd   = $monthStart->copy()->endOfMonth()->endOfDay();

        $query = HrEmployee::with([
            'department',
            'attendances' => fn($q) => $q->where('date', 'like', $month . '%'),
            'leaves'      => fn($q) => $q->where('status', 'approved')
                ->where('leave_type', '!=', 'short')
                ->whereDate('start_date', '<=', $monthEnd->toDateString())
                ->whereDate('end_date', '>=', $monthStart->toDateString()),
        ])->where('status', 'active');

        if ($deptId) $query->where('department_id', $deptId);

        $workingDays = $this->getWorkingDaysInMonth($month);

        $report = $query->get()->map(function ($emp) use ($workingDays, $monthStart, $monthEnd) {
            $att = $emp->attendances;
            $attendedDates = [];
            foreach ($att as $a) {
                $dStr = $a->date instanceof Carbon ? $a->date->format('Y-m-d') : Carbon::parse($a->date)->format('Y-m-d');
                if ($a->status !== 'absent') {
                    $attendedDates[$dStr] = $a->status;
                }
            }

            $leaveDaysCount = 0;
            foreach ($emp->leaves as $leave) {
                $start = Carbon::parse($leave->start_date)->startOfDay();
                $end   = Carbon::parse($leave->end_date ?? $leave->start_date)->startOfDay();
                if ($start->lt($monthStart)) $start = $monthStart->copy();
                if ($end->gt($monthEnd)) $end = $monthEnd->copy();

                for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
                    if (!$d->isWeekend() && !isset($attendedDates[$d->toDateString()])) {
                        $attendedDates[$d->toDateString()] = 'leave';
                        $leaveDaysCount++;
                    }
                }
            }

            $attended = $att->whereIn('status', ['present', 'late', 'short_leave'])->count();
            return [
                'employee_id'          => $emp->employee_id,
                'name'                 => $emp->full_name,
                'department'           => $emp->department?->name ?? 'N/A',
                'working_days'         => $workingDays,
                'present'              => $att->where('status', 'present')->count(),
                'late'                 => $att->where('status', 'late')->count(),
                'short_leave'          => $att->where('status', 'short_leave')->count(),
                'half_day'             => $att->where('status', 'half_day')->count(),
                'missing'              => $att->where('status', 'missing')->count(),
                'leave'                => $leaveDaysCount + $att->where('status', 'leave')->count(),
                'absent'               => $att->where('status', 'absent')->count(),
                'total_working_hours' => round($att->sum('working_hours'), 1),
                'attendance_rate'     => $workingDays > 0
                    ? round(($attended / $workingDays) * 100, 1)
                    : 0,
            ];
        });

        return response()->json($report);
    }

    // ── HR Admin: Send Weekly / Monthly Attendance & Leave Email Report ───────
    public function sendReportEmail(Request $request, \App\Services\HrAttendanceLeaveReportService $reportService)
    {
        $user = $request->user();
        if (!$user->hasRole('super_admin') && !$user->hasRole('solar_hr_admin') && !HrLeaveController::isLeaveApprovalManager($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'period'        => 'required|in:weekly,monthly',
            'month'         => 'nullable|string|max:10',
            'department_id' => 'nullable|integer',
        ]);

        $result = $reportService->sendReport(
            $validated['period'],
            $validated['month'] ?? null,
            !empty($validated['department_id']) ? (int) $validated['department_id'] : null
        );

        return response()->json([
            'message' => ucfirst($result['period']) . ' Attendance & Leave report emailed to ' . count($result['recipients']) . ' recipient(s).',
            'data'    => $result,
        ]);
    }

    /** Count Mon–Fri working days in a given Y-m month */
    private function getWorkingDaysInMonth(string $month): int
    {
        $start = Carbon::parse($month . '-01');
        $end   = $start->copy()->endOfMonth();
        $days  = 0;
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if (!$d->isWeekend()) $days++;
        }
        return $days;
    }

    private static bool $statusColumnChecked = false;

    private function ensureStatusColumnSupportsMissing(): void
    {
        if (self::$statusColumnChecked) return;
        self::$statusColumnChecked = true;
        try {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE hr_attendances MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'present'");
        } catch (\Throwable $e) {
            // Ignore if already VARCHAR or SQLite
        }
    }

    /**
     * Mark unclosed past attendances as Missing Attendance with blank clock_out_time (no automatic 5:30 PM time).
     * Also converts any previously auto-closed 5:30 PM records (not manually overridden by HR) to blank Missing Attendance.
     */
    private function autoClosePastAttendances(?int $employeeId = null): void
    {
        $this->ensureStatusColumnSupportsMissing();

        $today = Carbon::today('Asia/Colombo')->toDateString();

        $query = HrAttendance::where('date', '<', $today)
            ->whereNotNull('clock_in_time')
            ->where(function ($q) {
                $q->where(function ($sq) {
                    $sq->whereNull('clock_out_time')
                       ->where('status', '!=', 'missing');
                })->orWhere(function ($sq) {
                    // Convert any old automatic 5:30 PM records that haven't been manually approved/overridden
                    $sq->where('is_auto_clock_out', true)
                       ->where('is_manual_override', false)
                       ->whereNotNull('clock_out_time');
                });
            });

        if ($employeeId !== null) {
            $query->where('employee_id', $employeeId);
        }

        $unclosed = $query->get();

        foreach ($unclosed as $att) {
            $att->update([
                'clock_out_time'    => null,
                'working_hours'     => null,
                'status'            => 'missing',
                'is_auto_clock_out' => true,
                'notes'             => 'Missing clock-out (Clock-out left blank — employee must submit time & reason before month end)',
            ]);
        }
    }

    /**
     * Employee: Fetch past missing-clock-out attendances eligible for time & reason submission before month end
     */
    public function unclosedOrAutoAttendances(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $this->autoClosePastAttendances($employee->id);

        $today = Carbon::today('Asia/Colombo')->toDateString();
        $startOfMonth = Carbon::now('Asia/Colombo')->startOfMonth()->toDateString();
        $thirtyDaysAgo = Carbon::now('Asia/Colombo')->subDays(31)->toDateString();
        $cutoff = $thirtyDaysAgo < $startOfMonth ? $thirtyDaysAgo : $startOfMonth;

        $records = HrAttendance::with(['regularization', 'clockInLocation'])
            ->where('employee_id', $employee->id)
            ->where('date', '<', $today)
            ->where('date', '>=', $cutoff)
            ->whereNotNull('clock_in_time')
            ->where(function ($q) {
                $q->whereNull('clock_out_time')
                  ->orWhere('status', 'missing')
                  ->orWhere('is_auto_clock_out', true)
                  ->orWhereHas('regularization');
            })
            ->orderByDesc('date')
            ->get();

        return response()->json($records);
    }

    /**
     * Employee: Request clock-out adjustment/regularization
     */
    public function requestRegularization(Request $request, $id = null)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee profile not found.'], 404);

        $attendanceId = $id ?: $request->input('attendance_id');
        if (!$attendanceId) {
            return response()->json(['message' => 'Attendance record ID is required.'], 422);
        }

        $att = HrAttendance::where('id', $attendanceId)
            ->where('employee_id', $employee->id)
            ->firstOrFail();

        $requestedClockOut = $request->input('requested_clock_out_time');
        if (!$requestedClockOut && $request->filled('requested_time')) {
            $datePart = $att->date instanceof Carbon ? $att->date->toDateString() : substr((string)$att->date, 0, 10);
            $requestedClockOut = $datePart . ' ' . $request->input('requested_time') . ':00';
        }

        if (!$requestedClockOut) {
            return response()->json(['message' => 'Requested departure time is required.'], 422);
        }

        $reason = trim((string) $request->input('reason', ''));
        if ($reason === '') {
            return response()->json(['message' => 'Reason for adjustment is required.'], 422);
        }

        $requestedTime = Carbon::parse($requestedClockOut, 'Asia/Colombo')->utc();

        if ($att->clock_in_time && $requestedTime->lessThan(Carbon::parse($att->clock_in_time))) {
            return response()->json(['message' => 'Requested clock-out time must be after clock-in time.'], 422);
        }

        $regularization = HrAttendanceRegularization::updateOrCreate(
            [
                'attendance_id' => $att->id,
                'employee_id'   => $employee->id,
            ],
            [
                'requested_clock_out_time' => $requestedTime,
                'reason'                   => $reason,
                'status'                   => 'pending',
                'reviewed_by'              => null,
                'admin_notes'              => null,
            ]
        );

        try {
            $dateFormatted = Carbon::parse($att->date)->format('d M');
            $timeFormatted = $requestedTime->copy()->timezone('Asia/Colombo')->format('h:i A');

            // Resolve manually assigned approval managers from HR Settings
            $mgrSettings = HrSettingController::getApprovalManagerSettings();
            $mgrIds = $mgrSettings['manager_user_ids'] ?? [];
            $mgrEmails = $mgrSettings['manager_emails'] ?? [];

            $approverUsers = User::where(function($q) use ($mgrIds, $mgrEmails) {
                $q->whereIn('id', $mgrIds)
                  ->orWhereIn('email', $mgrEmails);
            })->get();

            // Dispatch notification to assigned Approval Managers
            foreach ($approverUsers as $mgr) {
                $mgr->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => 'warning',
                    'title'      => 'Missing Attendance Adjustment Request',
                    'message'    => "{$employee->full_name} submitted clock-out time ({$timeFormatted}) for {$dateFormatted}. Awaiting Manager review.",
                    'link'       => '/solar/hr/portal/attendance?tab=approvals',
                    'source_id'  => $regularization->id,
                ]));
            }

            // Inform HR Admins that a request has arrived
            $hrAdmins = User::where(function($q) {
                $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                  ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
            })->whereNotIn('id', $approverUsers->pluck('id'))->get();

            if ($hrAdmins->isNotEmpty()) {
                Notification::send($hrAdmins, new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => 'info',
                    'title'      => 'Missing Attendance Adjustment Request',
                    'message'    => "{$employee->full_name} submitted clock-out time ({$timeFormatted}) for {$dateFormatted}. (Pending Manager Review)",
                    'link'       => '/solar/hr/admin/attendance',
                    'source_id'  => $regularization->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Regularization notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Missing attendance clock-out time request submitted for Line Manager / Management review.',
            'data'    => $regularization->load('attendance'),
        ], 201);
    }

    /**
     * HR Admin / Manager: List regularization requests
     */
    public function listRegularizations(Request $request)
    {
        $user = $request->user();
        $isHR = $user->hasRole('super_admin') || $user->hasRole('solar_hr_admin');
        $isMgr = self::isAdjustmentManager($user);

        if (!$isHR && !$isMgr) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $status = $request->get('status', 'pending');

        $query = HrAttendanceRegularization::with([
            'employee.department',
            'employee.manager.user',
            'attendance.clockInLocation',
            'reviewer',
            'managerReviewer',
        ])->orderByDesc('created_at');

        if ($status && $status !== 'all') {
            if ($status === 'pending') {
                $query->where('status', 'pending');
            } elseif ($status === 'manager_approved') {
                $query->where('status', 'manager_approved');
            } elseif ($status === 'approved') {
                $query->where('status', 'approved');
            } elseif ($status === 'rejected') {
                $query->whereIn('status', ['rejected', 'manager_rejected']);
            } else {
                $query->where('status', $status);
            }
        }

        $records = $query->get();

        // Calculate counts
        $baseCountQuery = HrAttendanceRegularization::query();

        $pendingCount = (clone $baseCountQuery)->where('status', 'pending')->count();
        $mgrApprovedCount = (clone $baseCountQuery)->where('status', 'manager_approved')->count();
        $approvedCount = (clone $baseCountQuery)->where('status', 'approved')->count();
        $rejectedCount = (clone $baseCountQuery)->whereIn('status', ['rejected', 'manager_rejected'])->count();

        return response()->json([
            'data'                   => $records,
            'pending_count'          => $pendingCount,
            'manager_approved_count' => $mgrApprovedCount,
            'approved_count'         => $approvedCount,
            'rejected_count'         => $rejectedCount,
        ]);
    }

    /**
     * Approve or reject clock-out adjustment:
     * Stage 1: Line Manager / General Manager / Project Director (status: manager_approved / manager_rejected)
     * Stage 2: HR Admin (status: approved / rejected)
     */
    public function updateRegularization(Request $request, $id)
    {
        $user = $request->user();
        $isHR = $user->hasRole('super_admin') || $user->hasRole('solar_hr_admin');
        $isMgr = self::isAdjustmentManager($user);

        if (!$isHR && !$isMgr) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $this->ensureStatusColumnSupportsMissing();

        $validated = $request->validate([
            'status'      => 'required|in:manager_approved,manager_rejected,approved,rejected',
            'notes'       => 'nullable|string|max:500',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $notes = $validated['notes'] ?? $validated['admin_notes'] ?? null;
        $status = $validated['status'];

        $reg = HrAttendanceRegularization::with(['attendance', 'employee.user', 'employee.manager'])->findOrFail($id);
        $att = $reg->attendance;
        $emp = $reg->employee;

        // ── Stage 1: Line Manager / General Manager / Project Director Review ──
        if (str_starts_with($status, 'manager_')) {
            if (!self::isAdjustmentManager($user, $emp)) {
                return response()->json([
                    'message' => 'Unauthorized. Line Manager, General Manager, or Project Director approval required.'
                ], 403);
            }

            if ($reg->status !== 'pending') {
                return response()->json([
                    'message' => 'This request is not pending manager review.'
                ], 422);
            }

            $reg->update([
                'status'              => $status,
                'manager_approved_by' => $user->id,
                'manager_approved_at' => Carbon::now(),
                'manager_notes'       => $notes,
            ]);

            try {
                $dateStr = Carbon::parse($att->date)->format('d M');
                if ($status === 'manager_approved') {
                    // Notify HR Admins that manager approved and awaiting HR final sign-off
                    $hrAdmins = User::where(function($q) {
                        $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                          ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
                    })->where('id', '!=', $user->id)->get();

                    Notification::send($hrAdmins, new HrNotification([
                        'division'   => 'hr',
                        'category'   => 'attendance',
                        'severity'   => 'info',
                        'title'      => 'Adjustment Approved by Manager',
                        'message'    => "Manager approved clock-out adjustment for {$emp?->full_name} ({$dateStr}). Awaiting HR final approval.",
                        'link'       => '/solar/hr/admin/attendance',
                        'source_id'  => $reg->id,
                    ]));

                    // Notify employee
                    if ($emp?->user) {
                        $emp->user->notify(new HrNotification([
                            'division'   => 'hr',
                            'category'   => 'attendance',
                            'severity'   => 'info',
                            'title'      => 'Missing Attendance Manager-Approved',
                            'message'    => "Your clock-out adjustment for {$dateStr} was approved by Manager and forwarded to HR for final sign-off.",
                            'link'       => '/solar/hr/portal/home',
                            'source_id'  => $reg->id,
                        ]));
                    }
                } else {
                    // Manager rejected
                    if ($emp?->user) {
                        $emp->user->notify(new HrNotification([
                            'division'   => 'hr',
                            'category'   => 'attendance',
                            'severity'   => 'danger',
                            'title'      => 'Missing Attendance Request Rejected',
                            'message'    => "Your clock-out adjustment request for {$dateStr} was rejected by Manager." . ($notes ? " Note: {$notes}" : ''),
                            'link'       => '/solar/hr/portal/home',
                            'source_id'  => $reg->id,
                        ]));
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Regularization manager notification error: ' . $e->getMessage());
            }

            return response()->json([
                'message' => $status === 'manager_approved' 
                    ? 'Adjustment approved by Manager and forwarded to HR.'
                    : 'Adjustment rejected by Manager.',
                'data'    => $reg->load(['attendance', 'reviewer', 'managerReviewer']),
            ]);
        }

        // ── Stage 2: HR Final Approval (approved / rejected) ──
        if (!$isHR) {
            return response()->json(['message' => 'Unauthorized for HR finalization.'], 403);
        }

        if ($reg->status !== 'manager_approved') {
            return response()->json([
                'message' => 'Line Manager / General Manager / Project Director approval is required before HR can finalize this request.',
            ], 422);
        }

        if ($status === 'approved') {
            $newClockOut = Carbon::parse($reg->requested_clock_out_time);
            $clockIn = Carbon::parse($att->clock_in_time);
            $hoursWorked = round($clockIn->diffInMinutes($newClockOut) / 60, 2);

            $localClockOut = $newClockOut->copy()->timezone('Asia/Colombo');
            $shiftEnd = Carbon::parse($localClockOut->toDateString() . ' ' . self::SHIFT_END, 'Asia/Colombo');
            $earlyDepart = $localClockOut->lessThan($shiftEnd);

            $baseStatus = $this->deriveStatus($clockIn, Carbon::parse($att->date)->toDateString());
            $attStatus = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $baseStatus;

            $att->update([
                'clock_out_time'     => $newClockOut,
                'working_hours'      => $hoursWorked,
                'early_departure'    => $earlyDepart && $hoursWorked >= self::HALF_DAY_HRS,
                'status'             => $attStatus,
                'is_manual_override' => true,
                'is_auto_clock_out'  => false,
                'approved_by'        => $user->id,
                'notes'              => 'Regularized by HR: ' . $reg->reason,
            ]);
        }

        $reg->update([
            'status'      => $status,
            'reviewed_by' => $user->id,
            'admin_notes' => $notes,
        ]);

        // Notify employee of final outcome
        try {
            if ($emp?->user) {
                $dateStr = Carbon::parse($att->date)->format('d M');
                $isApp = $status === 'approved';
                $emp->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => $isApp ? 'success' : 'danger',
                    'title'      => $isApp ? 'Missing Attendance Officially Approved' : 'Missing Attendance Request Rejected',
                    'message'    => $isApp 
                        ? "HR officially approved your clock-out time for {$dateStr}."
                        : "HR rejected your clock-out time request for {$dateStr}." . ($notes ? " Note: {$notes}" : ''),
                    'link'       => '/solar/hr/portal/home',
                    'source_id'  => $reg->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Regularization employee notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "Request has been finalized as {$status} by HR.",
            'data'    => $reg->load(['attendance', 'reviewer', 'managerReviewer']),
        ]);
    }

    // ── Remote Attendance (Clock-In & Clock-Out with 2-Tier Approval) ─────────

    /**
     * Get employee's remote clock-in and clock-out status for today
     */
    public function myTodayRemoteRequests(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) {
            return response()->json([
                'clock_in'  => null,
                'clock_out' => null,
            ]);
        }

        $today = Carbon::today()->toDateString();
        $clockInReq = HrRemoteAttendanceRequest::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('request_type', 'clock_in')
            ->latest()
            ->first();

        $clockOutReq = HrRemoteAttendanceRequest::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where('request_type', 'clock_out')
            ->latest()
            ->first();

        return response()->json([
            'clock_in'  => $clockInReq,
            'clock_out' => $clockOutReq,
        ]);
    }

    /**
     * Submit a remote clock-in or remote clock-out request
     */
    public function requestRemoteAttendance(Request $request)
    {
        $request->validate([
            'request_type'    => 'required|in:clock_in,clock_out',
            'latitude'        => 'required|numeric|between:-90,90',
            'longitude'       => 'required|numeric|between:-180,180',
            'accuracy_meters' => 'nullable|numeric|min:0',
            'location_name'   => 'required|string|max:255',
            'address'         => 'nullable|string|max:500',
            'reason_category' => 'required|string|max:100',
            'reason_notes'    => 'required|string|max:1000',
            'evidence_photo'  => 'nullable|image|max:10240', // max 10MB
        ]);

        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found.'], 404);
        }

        $today = Carbon::today()->toDateString();
        $now = Carbon::now();
        $requestType = $request->input('request_type');

        $att = HrAttendance::where('employee_id', $employee->id)->where('date', $today)->first();

        if ($requestType === 'clock_in') {
            if ($att?->clock_in_time) {
                return response()->json(['message' => 'You have already clocked in today.'], 400);
            }

            $existingPending = HrRemoteAttendanceRequest::where('employee_id', $employee->id)
                ->where('date', $today)
                ->where('request_type', 'clock_in')
                ->whereIn('status', ['pending', 'manager_approved'])
                ->first();

            if ($existingPending) {
                return response()->json(['message' => 'You already have a remote clock-in request pending review.'], 400);
            }
        } else { // clock_out
            // Must have clock in (either direct or existing remote clock in)
            $hasExistingRemoteIn = HrRemoteAttendanceRequest::where('employee_id', $employee->id)
                ->where('date', $today)
                ->where('request_type', 'clock_in')
                ->whereIn('status', ['pending', 'manager_approved', 'approved'])
                ->exists();

            if (!$att?->clock_in_time && !$hasExistingRemoteIn) {
                return response()->json(['message' => 'You must clock in before requesting remote clock-out.'], 400);
            }

            if ($att?->clock_out_time) {
                return response()->json(['message' => 'You have already clocked out today.'], 400);
            }

            $existingPending = HrRemoteAttendanceRequest::where('employee_id', $employee->id)
                ->where('date', $today)
                ->where('request_type', 'clock_out')
                ->whereIn('status', ['pending', 'manager_approved'])
                ->first();

            if ($existingPending) {
                return response()->json(['message' => 'You already have a remote clock-out request pending review.'], 400);
            }
        }

        $photoPath = null;
        if ($request->hasFile('evidence_photo')) {
            $photoPath = $request->file('evidence_photo')->store('hr/remote_attendance', 'public');
        }

        $remoteReq = HrRemoteAttendanceRequest::create([
            'employee_id'         => $employee->id,
            'attendance_id'       => $att?->id,
            'date'                => $today,
            'request_type'        => $requestType,
            'requested_time'      => $now,
            'latitude'            => (float) $request->input('latitude'),
            'longitude'           => (float) $request->input('longitude'),
            'accuracy_meters'     => $request->filled('accuracy_meters') ? (float) $request->input('accuracy_meters') : null,
            'location_name'       => trim($request->input('location_name')),
            'address'             => $request->input('address') ? trim($request->input('address')) : null,
            'reason_category'     => $request->input('reason_category'),
            'reason_notes'        => trim($request->input('reason_notes')),
            'evidence_photo_path' => $photoPath,
            'status'              => 'pending',
        ]);

        // Dispatch notification to assigned Approval Managers
        try {
            $mgrSettings = HrSettingController::getApprovalManagerSettings();
            $approverUsers = User::where(function($q) use ($mgrSettings) {
                $q->whereIn('id', $mgrSettings['manager_user_ids'] ?? [])
                  ->orWhereIn('email', $mgrSettings['manager_emails'] ?? []);
            })->get();

            $actionLabel = $requestType === 'clock_in' ? 'Clock-In' : 'Clock-Out';
            $timeStr = $now->timezone('Asia/Colombo')->format('h:i A');

            foreach ($approverUsers as $mgr) {
                $mgr->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => 'warning',
                    'title'      => "Remote {$actionLabel} Request",
                    'message'    => "{$employee->full_name} requested remote {$actionLabel} at {$remoteReq->location_name} ({$timeStr}). Awaiting Manager review.",
                    'link'       => '/solar/hr/portal/attendance?tab=remote-approvals',
                    'source_id'  => $remoteReq->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Remote attendance notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Remote ' . ($requestType === 'clock_in' ? 'Clock-In' : 'Clock-Out') . ' request submitted for manager review.',
            'data'    => $remoteReq->load('employee.department'),
        ], 201);
    }

    /**
     * List remote attendance requests (scoped for employees or managers/HR)
     */
    public function listRemoteAttendanceRequests(Request $request)
    {
        $user = $request->user();
        $scope = $request->get('scope', 'all');
        $isHR = $user->hasRole('super_admin') || $user->hasRole('solar_hr_admin');
        $isMgr = HrSettingController::isApprovalManager($user);

        $myEmp = HrEmployee::where('user_id', $user->id)->first();

        if ($scope === 'my') {
            if (!$myEmp) return response()->json(['data' => [], 'counts' => []]);
            $query = HrRemoteAttendanceRequest::where('employee_id', $myEmp->id);
        } else {
            if (!$isHR && !$isMgr) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $query = HrRemoteAttendanceRequest::query();
        }

        $query->with([
            'employee.department',
            'employee.designation',
            'managerReviewer:id,name,email',
            'hrReviewer:id,name,email',
            'attendance',
        ])->orderByDesc('created_at');

        $status = $request->get('status', 'all');
        if ($status && $status !== 'all') {
            if ($status === 'rejected') {
                $query->whereIn('status', ['rejected', 'manager_rejected']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('request_type')) {
            $query->where('request_type', $request->get('request_type'));
        }

        if ($request->filled('date')) {
            $query->where('date', $request->get('date'));
        }

        if ($request->filled('month')) {
            $query->where('date', 'like', $request->get('month') . '%');
        }

        $records = $query->get();

        // Summary counts
        $baseCountQuery = HrRemoteAttendanceRequest::query();
        if ($scope === 'my' && $myEmp) {
            $baseCountQuery->where('employee_id', $myEmp->id);
        }

        $pendingCount = (clone $baseCountQuery)->where('status', 'pending')->count();
        $mgrApprovedCount = (clone $baseCountQuery)->where('status', 'manager_approved')->count();
        $approvedCount = (clone $baseCountQuery)->where('status', 'approved')->count();
        $rejectedCount = (clone $baseCountQuery)->whereIn('status', ['rejected', 'manager_rejected'])->count();

        return response()->json([
            'data'                   => $records,
            'pending_count'          => $pendingCount,
            'manager_approved_count' => $mgrApprovedCount,
            'approved_count'         => $approvedCount,
            'rejected_count'         => $rejectedCount,
        ]);
    }

    /**
     * Review remote attendance request (Stage 1: Manager; Stage 2: HR)
     */
    public function reviewRemoteAttendanceRequest(Request $request, $id)
    {
        $user = $request->user();
        $isHR = $user->hasRole('super_admin') || $user->hasRole('solar_hr_admin');
        $isMgr = HrSettingController::isApprovalManager($user);

        if (!$isHR && !$isMgr) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:manager_approved,manager_rejected,approved,rejected',
            'notes'  => 'nullable|string|max:500',
        ]);

        $status = $validated['status'];
        $notes = $validated['notes'] ?? null;

        $remoteReq = HrRemoteAttendanceRequest::with(['employee.user', 'attendance'])->findOrFail($id);
        $emp = $remoteReq->employee;

        // Stage 1: Manager Review (manager_approved, manager_rejected)
        if (str_starts_with($status, 'manager_')) {
            if (!$isMgr) {
                return response()->json(['message' => 'Unauthorized. Approval Manager privileges required.'], 403);
            }

            if ($remoteReq->status !== 'pending') {
                return response()->json(['message' => 'This request is not pending manager review.'], 422);
            }

            $remoteReq->update([
                'status'              => $status,
                'manager_approved_by' => $user->id,
                'manager_approved_at' => Carbon::now(),
                'manager_notes'       => $notes,
            ]);

            // Notify HR or Employee
            try {
                $actionLabel = $remoteReq->request_type === 'clock_in' ? 'Clock-In' : 'Clock-Out';
                $dateStr = Carbon::parse($remoteReq->date)->format('d M');

                if ($status === 'manager_approved') {
                    $hrAdmins = User::where(function($q) {
                        $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                          ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
                    })->get();

                    Notification::send($hrAdmins, new HrNotification([
                        'division'   => 'hr',
                        'category'   => 'attendance',
                        'severity'   => 'info',
                        'title'      => "Remote {$actionLabel} Manager-Approved",
                        'message'    => "{$emp->full_name}'s remote {$actionLabel} for {$dateStr} at {$remoteReq->location_name} was approved by {$user->name}. Awaiting HR finalization.",
                        'link'       => '/solar/hr/admin/attendance',
                        'source_id'  => $remoteReq->id,
                    ]));
                } else {
                    if ($emp?->user) {
                        $emp->user->notify(new HrNotification([
                            'division'   => 'hr',
                            'category'   => 'attendance',
                            'severity'   => 'danger',
                            'title'      => "Remote {$actionLabel} Rejected",
                            'message'    => "Your remote {$actionLabel} for {$dateStr} was rejected by Manager." . ($notes ? " Note: {$notes}" : ''),
                            'link'       => '/solar/hr/portal/attendance',
                            'source_id'  => $remoteReq->id,
                        ]));
                    }
                }
            } catch (\Throwable $e) {
                Log::error('Remote attendance manager review notification error: ' . $e->getMessage());
            }

            return response()->json([
                'message' => $status === 'manager_approved' 
                    ? 'Remote attendance approved and forwarded to HR for finalization.'
                    : 'Remote attendance rejected by manager.',
                'data'    => $remoteReq->fresh(['managerReviewer', 'hrReviewer', 'employee']),
            ]);
        }

        // Stage 2: HR Final Review (approved, rejected)
        if (!$isHR) {
            return response()->json(['message' => 'Unauthorized for HR finalization.'], 403);
        }

        // Allow super admin to approve directly; HR Admin requires manager_approved
        if ($remoteReq->status !== 'manager_approved' && !$user->hasRole('super_admin')) {
            return response()->json(['message' => 'Manager approval is required before HR finalization.'], 422);
        }

        if ($status === 'approved') {
            // Officially write/update shift into hr_attendances table
            $att = HrAttendance::firstOrNew([
                'employee_id' => $remoteReq->employee_id,
                'date'        => $remoteReq->date,
            ]);

            $fullLocation = $remoteReq->location_name . ($remoteReq->address ? ' (' . $remoteReq->address . ')' : '');

            if ($remoteReq->request_type === 'clock_in') {
                $att->clock_in_time      = $remoteReq->requested_time;
                $att->clock_in_lat       = $remoteReq->latitude;
                $att->clock_in_lng       = $remoteReq->longitude;
                $att->clock_in_address   = $fullLocation;
                $att->is_remote          = true;
                $att->is_remote_clock_in = true;
                $att->status             = $remoteReq->reason_category === 'work_from_home' ? 'wfh' : 'present';
                $att->notes              = 'Remote Clock-In Approved: ' . $remoteReq->reason_notes;
            } else { // clock_out
                $att->clock_out_time      = $remoteReq->requested_time;
                $att->clock_out_lat       = $remoteReq->latitude;
                $att->clock_out_lng       = $remoteReq->longitude;
                $att->clock_out_address   = $fullLocation;
                $att->is_remote           = true;
                $att->is_remote_clock_out = true;

                if ($att->clock_in_time) {
                    $hoursWorked = round(Carbon::parse($att->clock_in_time)->diffInMinutes(Carbon::parse($att->clock_out_time)) / 60, 2);
                    $att->working_hours = $hoursWorked;
                }

                $appendNote = 'Remote Clock-Out Approved: ' . $remoteReq->reason_notes;
                $att->notes = $att->notes ? ($att->notes . ' | ' . $appendNote) : $appendNote;
            }

            $att->is_manual_override = true;
            $att->approved_by = $user->id;
            $att->save();

            $remoteReq->attendance_id = $att->id;
        }

        $remoteReq->update([
            'status'         => $status,
            'hr_approved_by' => $user->id,
            'hr_approved_at' => Carbon::now(),
            'hr_notes'       => $notes,
        ]);

        // Notify employee of final outcome
        try {
            if ($emp?->user) {
                $actionLabel = $remoteReq->request_type === 'clock_in' ? 'Clock-In' : 'Clock-Out';
                $dateStr = Carbon::parse($remoteReq->date)->format('d M');
                $isApp = $status === 'approved';

                $emp->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => $isApp ? 'success' : 'danger',
                    'title'      => $isApp ? "Remote {$actionLabel} Officially Approved" : "Remote {$actionLabel} Rejected by HR",
                    'message'    => $isApp 
                        ? "HR officially approved your remote {$actionLabel} for {$dateStr}."
                        : "HR rejected your remote {$actionLabel} for {$dateStr}." . ($notes ? " Note: {$notes}" : ''),
                    'link'       => '/solar/hr/portal/attendance',
                    'source_id'  => $remoteReq->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Remote attendance employee notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "Remote attendance request finalized as {$status} by HR.",
            'data'    => $remoteReq->fresh(['attendance', 'managerReviewer', 'hrReviewer', 'employee']),
        ]);
    }
}
