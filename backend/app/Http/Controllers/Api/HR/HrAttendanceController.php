<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAttendance;
use App\Models\HrAttendanceRegularization;
use App\Models\HrEmployee;
use App\Models\HrLeave;
use App\Models\HrLocation;
use App\Models\User;
use App\Notifications\HrNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class HrAttendanceController extends Controller
{
    // ── Company Shift Configuration ────────────────────────────────────────────
    const SHIFT_START  = '09:00:00'; // Official shift start
    const GRACE_END    = '09:10:00'; // Late after this (grace period 9–9:10 AM)
    const SHIFT_END    = '17:30:00'; // Official end (5:30 PM)
    const HALF_DAY_HRS = 4.5;        // Below this = half day

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

        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $attendances = HrAttendance::with('clockInLocation')
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

        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $attendances = HrAttendance::with('clockInLocation')
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
        $date   = $request->get('date', Carbon::today()->toDateString());
        $deptId = $request->get('department_id');

        $query = HrEmployee::with(['department', 'designation'])
            ->with([
                'attendances' => fn($q) => $q->where('date', $date)->with('clockInLocation'),
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

        $validated = $request->validate([
            'employee_id'    => 'required|exists:hr_employees,id',
            'date'           => 'required|date',
            'clock_in_time'  => 'nullable|date',
            'clock_out_time' => 'nullable|date',
            'status'         => 'required|in:present,absent,late,half_day,wfh,leave',
            'notes'          => 'nullable|string',
        ]);

        $att = HrAttendance::updateOrCreate(
            ['employee_id' => $validated['employee_id'], 'date' => $validated['date']],
            array_merge($validated, [
                'is_manual_override' => true,
                'approved_by'        => $request->user()->id,
            ])
        );

        if ($att->clock_in_time && $att->clock_out_time) {
            $clockIn  = Carbon::parse($att->clock_in_time);
            $clockOut = Carbon::parse($att->clock_out_time);
            $att->update(['working_hours' => round($clockIn->diffInMinutes($clockOut) / 60, 2)]);
        }

        return response()->json(['message' => 'Attendance record saved', 'data' => $att], 201);
    }

    // ── HR Admin: Correct attendance ──────────────────────────────────────────
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'clock_in_time'  => 'nullable|date',
            'clock_out_time' => 'nullable|date',
            'status'         => 'required|in:present,absent,late,half_day,wfh,leave',
            'notes'          => 'nullable|string',
        ]);

        $att = HrAttendance::findOrFail($id);
        $validated['is_manual_override'] = true;
        $validated['approved_by']        = $request->user()->id;

        if (!empty($validated['clock_in_time']) && !empty($validated['clock_out_time'])) {
            $clockIn  = Carbon::parse($validated['clock_in_time']);
            $clockOut = Carbon::parse($validated['clock_out_time']);
            $validated['working_hours'] = round($clockIn->diffInMinutes($clockOut) / 60, 2);
        }

        $att->update($validated);

        return response()->json(['message' => 'Attendance corrected', 'data' => $att]);
    }

    // ── HR Admin: Monthly Calendar Data ───────────────────────────────────────
    public function calendar(Request $request)
    {
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

            $attended = $att->whereIn('status', ['present', 'late', 'wfh'])->count();
            return [
                'employee_id'          => $emp->employee_id,
                'name'                 => $emp->full_name,
                'department'           => $emp->department?->name ?? 'N/A',
                'working_days'         => $workingDays,
                'present'              => $att->where('status', 'present')->count(),
                'late'                 => $att->where('status', 'late')->count(),
                'half_day'             => $att->where('status', 'half_day')->count(),
                'wfh'                  => $att->where('status', 'wfh')->count(),
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

    /**
     * Self-heal unclosed past attendances for an employee
     */
    private function autoClosePastAttendances(int $employeeId): void
    {
        $today = Carbon::today('Asia/Colombo')->toDateString();
        $unclosed = HrAttendance::where('employee_id', $employeeId)
            ->where('date', '<', $today)
            ->whereNotNull('clock_in_time')
            ->whereNull('clock_out_time')
            ->get();

        foreach ($unclosed as $att) {
            $dateStr = Carbon::parse($att->date)->toDateString();
            $clockIn = Carbon::parse($att->clock_in_time);
            $clockOut = Carbon::parse($dateStr . ' ' . self::SHIFT_END, 'Asia/Colombo')->utc();
            if ($clockIn->greaterThan($clockOut)) {
                $clockOut = $clockIn->copy()->addHour();
            }
            $hoursWorked = round($clockIn->diffInMinutes($clockOut) / 60, 2);
            $status = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $att->status;

            $att->update([
                'clock_out_time'    => $clockOut,
                'working_hours'     => $hoursWorked,
                'status'            => $status,
                'is_auto_clock_out' => true,
                'notes'             => trim(($att->notes ? $att->notes . ' | ' : '') . 'Auto clocked-out at 5:30 PM (System fallback: employee forgot to clock out)'),
            ]);
        }
    }

    /**
     * Employee: Fetch past unclosed or auto-clocked-out attendances eligible for time adjustment
     */
    public function unclosedOrAutoAttendances(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $this->autoClosePastAttendances($employee->id);

        $today = Carbon::today('Asia/Colombo')->toDateString();
        $cutoff = Carbon::now('Asia/Colombo')->subDays(14)->toDateString();
        $records = HrAttendance::with(['regularization', 'clockInLocation'])
            ->where('employee_id', $employee->id)
            ->where('date', '<', $today)
            ->where('date', '>=', $cutoff)
            ->where('is_auto_clock_out', true)
            ->orderByDesc('date')
            ->get();

        return response()->json($records);
    }

    /**
     * Employee: Request clock-out adjustment/regularization
     */
    public function requestRegularization(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee profile not found.'], 404);

        $validated = $request->validate([
            'attendance_id'            => 'required|exists:hr_attendances,id',
            'requested_clock_out_time' => 'required|date',
            'reason'                   => 'required|string|max:500',
        ]);

        $att = HrAttendance::where('id', $validated['attendance_id'])
            ->where('employee_id', $employee->id)
            ->firstOrFail();

        $requestedTime = Carbon::parse($validated['requested_clock_out_time'], 'Asia/Colombo')->utc();

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
                'reason'                   => $validated['reason'],
                'status'                   => 'pending',
                'reviewed_by'              => null,
                'admin_notes'              => null,
            ]
        );

        try {
            $adminUsers = User::where(function($q) {
                $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                  ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
            })->get();

            $dateFormatted = Carbon::parse($att->date)->format('d M');
            $timeFormatted = $requestedTime->format('h:i A');

            Notification::send($adminUsers, new HrNotification([
                'division'   => 'hr',
                'category'   => 'attendance',
                'severity'   => 'warning',
                'title'      => 'Clock-Out Adjustment Request',
                'message'    => "{$employee->full_name} submitted a clock-out adjustment for {$dateFormatted} ({$timeFormatted}).",
                'link'       => '/solar/hr/admin/attendance',
                'source_id'  => $regularization->id,
            ]));
        } catch (\Throwable $e) {
            Log::error('Regularization notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Clock-out adjustment request submitted successfully.',
            'data'    => $regularization->load('attendance'),
        ], 201);
    }

    /**
     * HR Admin: List regularization requests
     */
    public function listRegularizations(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $status = $request->get('status', 'pending');

        $query = HrAttendanceRegularization::with([
            'employee.department',
            'attendance.clockInLocation',
            'reviewer',
        ])->orderByDesc('created_at');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $records = $query->get();
        $pendingCount = HrAttendanceRegularization::where('status', 'pending')->count();

        return response()->json([
            'data'          => $records,
            'pending_count' => $pendingCount,
        ]);
    }

    /**
     * HR Admin: Approve or reject clock-out adjustment
     */
    public function updateRegularization(Request $request, $id)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status'      => 'required|in:approved,rejected',
            'admin_notes' => 'nullable|string|max:500',
        ]);

        $reg = HrAttendanceRegularization::with(['attendance', 'employee.user'])->findOrFail($id);

        if ($reg->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed.'], 422);
        }

        $att = $reg->attendance;
        $emp = $reg->employee;

        if ($validated['status'] === 'approved') {
            $newClockOut = Carbon::parse($reg->requested_clock_out_time);
            $clockIn = Carbon::parse($att->clock_in_time);
            $hoursWorked = round($clockIn->diffInMinutes($newClockOut) / 60, 2);

            $localClockOut = $newClockOut->copy()->timezone('Asia/Colombo');
            $shiftEnd = Carbon::parse($localClockOut->toDateString() . ' ' . self::SHIFT_END, 'Asia/Colombo');
            $earlyDepart = $localClockOut->lessThan($shiftEnd);
            $status = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $att->status;

            $att->update([
                'clock_out_time'     => $newClockOut,
                'working_hours'      => $hoursWorked,
                'early_departure'    => $earlyDepart && $hoursWorked >= self::HALF_DAY_HRS,
                'status'             => $status,
                'is_manual_override' => true,
                'is_auto_clock_out'  => false,
                'approved_by'        => $request->user()->id,
                'notes'              => trim(($att->notes ? $att->notes . ' | ' : '') . 'Regularized by HR: ' . $reg->reason),
            ]);
        }

        $reg->update([
            'status'      => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'admin_notes' => $validated['admin_notes'] ?? null,
        ]);

        // Notify employee
        try {
            if ($emp?->user) {
                $dateStr = Carbon::parse($att->date)->format('d M');
                $isApp = $validated['status'] === 'approved';
                $emp->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'attendance',
                    'severity'   => $isApp ? 'success' : 'danger',
                    'title'      => $isApp ? 'Clock-Out Adjustment Approved' : 'Clock-Out Adjustment Rejected',
                    'message'    => $isApp 
                        ? "HR approved your clock-out adjustment for {$dateStr}."
                        : "HR rejected your clock-out adjustment for {$dateStr}." . ($validated['admin_notes'] ? " Note: {$validated['admin_notes']}" : ''),
                    'link'       => '/solar/hr/portal/home',
                    'source_id'  => $reg->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Regularization employee notification error: ' . $e->getMessage());
        }

        return response()->json([
            'message' => "Request has been {$validated['status']}.",
            'data'    => $reg->load(['attendance', 'reviewer']),
        ]);
    }
}
