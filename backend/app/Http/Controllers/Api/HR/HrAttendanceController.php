<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAttendance;
use App\Models\HrEmployee;
use App\Models\HrLocation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HrAttendanceController extends Controller
{
    // ── Company Shift Configuration ────────────────────────────────────────────
    const SHIFT_START  = '09:00:00'; // Official shift start
    const GRACE_END    = '10:00:00'; // Late after this (grace period 9–10 AM)
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
        $graceEnd = Carbon::parse($date . ' ' . self::GRACE_END);
        return $clockIn->greaterThan($graceEnd) ? 'late' : 'present';
    }

    /** Recalculate hours and status on clock-out */
    private function recalcOnClockOut(HrAttendance $att, Carbon $clockOut): array
    {
        $clockIn     = Carbon::parse($att->clock_in_time);
        $hoursWorked = round($clockIn->diffInMinutes($clockOut) / 60, 2);
        $shiftEnd    = Carbon::parse($att->date->toDateString() . ' ' . self::SHIFT_END);
        $earlyDepart = $clockOut->lessThan($shiftEnd);

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

        $today = Carbon::today()->toDateString();
        $now   = Carbon::now();

        $existing = HrAttendance::where('employee_id', $employee->id)->where('date', $today)->first();
        if ($existing?->clock_in_time) {
            return response()->json(['message' => 'You have already clocked in today.'], 400);
        }

        $clientIp = $request->ip();

        // Prevent multiple attendances from the same IP on the same day for different employees
        $ipExists = HrAttendance::where('date', $today)
            ->where('ip_address', $clientIp)
            ->where('employee_id', '!=', $employee->id)
            ->exists();

        if ($ipExists) {
            return response()->json(['message' => 'Another employee has already clocked in using this device or network.'], 403);
        }

        // Strict Geofencing check
        $location = $this->findValidLocation($request->latitude, $request->longitude);
        if (!$location) {
            return response()->json(['message' => 'You are outside the approved work zone. Clock in denied.'], 403);
        }

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

        $clientIp = $request->ip();
        
        // Prevent multiple attendances from the same IP on the same day for different employees
        $ipExists = HrAttendance::where('date', $today)
            ->where('ip_address', $clientIp)
            ->where('employee_id', '!=', $employee->id)
            ->exists();

        if ($ipExists) {
            return response()->json(['message' => 'Another employee has already used this device/network today.'], 403);
        }

        // Strict Geofencing check
        $location = $this->findValidLocation($request->latitude, $request->longitude);
        if (!$location) {
            return response()->json(['message' => 'You are outside the approved work zone. Clock out denied.'], 403);
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

        return response()->json(
            HrAttendance::with('clockInLocation')
                ->where('employee_id', $employee->id)
                ->where('date', Carbon::today()->toDateString())
                ->first()
        );
    }

    // ── Employee: Monthly History ──────────────────────────────────────────────
    public function myHistory(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $month = $request->get('month', Carbon::now()->format('Y-m'));
        return response()->json(
            HrAttendance::with('clockInLocation')
                ->where('employee_id', $employee->id)
                ->where('date', 'like', $month . '%')
                ->orderBy('date')
                ->get()
        );
    }

    // ── HR Admin: Daily View ───────────────────────────────────────────────────
    public function index(Request $request)
    {
        $date   = $request->get('date', Carbon::today()->toDateString());
        $deptId = $request->get('department_id');

        $query = HrEmployee::with(['department', 'designation'])
            ->with(['attendances' => fn($q) => $q->where('date', $date)->with('clockInLocation')])
            ->where('status', 'active');

        if ($deptId) $query->where('department_id', $deptId);

        return response()->json($query->get());
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
            'status'         => 'required|in:present,absent,late,half_day,wfh',
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
            'status'         => 'required|in:present,absent,late,half_day,wfh',
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

        $query = HrEmployee::with([
            'attendances' => fn($q) => $q->where('date', 'like', $month . '%'),
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
            $map[$emp->id] = $attMap;
        }

        return response()->json($map);
    }

    // ── HR Admin: Monthly Report ───────────────────────────────────────────────
    public function report(Request $request)
    {
        $month  = $request->get('month', Carbon::now()->format('Y-m'));
        $deptId = $request->get('department_id');

        $query = HrEmployee::with([
            'department',
            'attendances' => fn($q) => $q->where('date', 'like', $month . '%'),
        ])->where('status', 'active');

        if ($deptId) $query->where('department_id', $deptId);

        $workingDays = $this->getWorkingDaysInMonth($month);

        $report = $query->get()->map(function ($emp) use ($workingDays) {
            $att = $emp->attendances;
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
                'absent'               => $att->where('status', 'absent')->count(),
                'total_working_hours' => round($att->sum('working_hours'), 1),
                'attendance_rate'     => $workingDays > 0
                    ? round(($attended / $workingDays) * 100, 1)
                    : 0,
            ];
        });

        return response()->json($report);
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
}
