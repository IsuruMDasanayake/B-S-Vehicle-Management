<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrLeave;
use App\Models\HrEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HrLeaveController extends Controller
{
    // ── Employee: Get my leave balance ─────────────────────────────────────────
    public function myBalance(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $year = Carbon::now()->year;
        $balances = $this->calculateLeaveBalances($employee, $year);

        return response()->json($balances);
    }

    private function calculateLeaveBalances(HrEmployee $employee, int $targetYear)
    {
        $joinDate = Carbon::parse($employee->joined_date);
        $joinYear = $joinDate->year;
        $joinQuarter = $joinDate->quarter;
        
        $yearsOfService = $targetYear - $joinYear;

        // Calculate Entitlements
        $entitlements = [
            'annual' => 0,
            'casual' => 0,
            'medical' => 0,
            'short' => 4, // 4 hours per month, but we return the monthly limit here
        ];

        if ($yearsOfService == 0) {
            // Joining Year
            $entitlements['annual'] = 0;
            // Casual: 0.5 per completed month (up to end of year)
            $completedMonths = 12 - $joinDate->month;
            $entitlements['casual'] = $completedMonths * 0.5;
            
            if ($joinQuarter == 1) $entitlements['medical'] = 14;
            elseif ($joinQuarter == 2) $entitlements['medical'] = 10;
            elseif ($joinQuarter == 3) $entitlements['medical'] = 7;
            else $entitlements['medical'] = 4;
            
        } elseif ($yearsOfService == 1) {
            // Second Year
            if ($joinQuarter == 1) $entitlements['annual'] = 14;
            elseif ($joinQuarter == 2) $entitlements['annual'] = 10;
            elseif ($joinQuarter == 3) $entitlements['annual'] = 7;
            else $entitlements['annual'] = 4;
            
            $entitlements['casual'] = 7;
            $entitlements['medical'] = 14;
            
        } else {
            // Third Year Onwards
            $entitlements['annual'] = 14;
            $entitlements['casual'] = 7;
            $entitlements['medical'] = 14;
        }

        $balances = [];
        foreach ($entitlements as $type => $total) {
            if ($type === 'short') {
                $usedHours = HrLeave::where('employee_id', $employee->id)
                    ->where('leave_type', 'short')
                    ->whereIn('status', ['approved', 'pending', 'manager_approved'])
                    ->whereYear('start_date', $targetYear)
                    ->whereMonth('start_date', Carbon::now()->month)
                    ->sum('hours_count');
                    
                $balances[] = [
                    'type'      => 'Short Leave (Monthly)',
                    'key'       => $type,
                    'total'     => $total,
                    'used'      => (int) $usedHours,
                    'remaining' => max(0, $total - (int) $usedHours),
                    'unit'      => 'hours'
                ];
                continue;
            }

            $used = HrLeave::where('employee_id', $employee->id)
                ->where('leave_type', $type)
                ->whereIn('status', ['approved', 'pending', 'manager_approved'])
                ->whereYear('start_date', $targetYear)
                ->sum('days_count');

            $balances[] = [
                'type'      => ucfirst($type) . ' Leave',
                'key'       => $type,
                'total'     => $total,
                'used'      => (float) $used,
                'remaining' => max(0, $total - (float) $used),
                'unit'      => 'days'
            ];
        }

        return $balances;
    }

    // ── Employee: Get my leaves ────────────────────────────────────────────────
    public function myLeaves(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $leaves = HrLeave::where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($leaves);
    }

    public function store(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee not found'], 404);

        $validated = $request->validate([
            'leave_type' => 'required|in:annual,casual,medical,short',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date'   => 'required_unless:leave_type,short|date|after_or_equal:start_date|nullable',
            'days_count' => 'exclude_if:leave_type,short|required_unless:leave_type,short|numeric|min:0.5',
            'hours_count'=> 'required_if:leave_type,short|integer|min:1|max:2|nullable',
            'reason'     => 'nullable|string|max:500',
        ]);

        $year = Carbon::parse($validated['start_date'])->year;
        $balances = $this->calculateLeaveBalances($employee, $year);
        $typeStr = $validated['leave_type'];
        
        $balanceRecord = collect($balances)->firstWhere('key', $typeStr);
        if (!$balanceRecord) {
            return response()->json(['message' => 'Invalid leave type'], 400);
        }

        if ($typeStr === 'short') {
            // Check monthly constraints for short leave
            $currentMonth = Carbon::parse($validated['start_date'])->month;
            
            $occurrences = HrLeave::where('employee_id', $employee->id)
                ->where('leave_type', 'short')
                ->whereIn('status', ['approved', 'pending', 'manager_approved'])
                ->whereYear('start_date', $year)
                ->whereMonth('start_date', $currentMonth)
                ->count();
                
            if ($occurrences >= 4) {
                return response()->json(['message' => 'Maximum 4 short leave occurrences per month exceeded.'], 422);
            }

            if (($balanceRecord['used'] + $validated['hours_count']) > $balanceRecord['total']) {
                return response()->json(['message' => "Insufficient short leave balance. You have {$balanceRecord['remaining']} hours remaining this month."], 422);
            }
            
            $validated['end_date'] = $validated['start_date'];
            $validated['days_count'] = 0;
            
        } else {
            if (($balanceRecord['used'] + $validated['days_count']) > $balanceRecord['total']) {
                return response()->json(['message' => "Insufficient {$typeStr} leave balance. You have {$balanceRecord['remaining']} days remaining."], 422);
            }
            $validated['hours_count'] = null;
        }

        $leave = HrLeave::create([
            'employee_id' => $employee->id,
            'leave_type'  => $typeStr,
            'start_date'  => $validated['start_date'],
            'end_date'    => $validated['end_date'],
            'days_count'  => $validated['days_count'],
            'hours_count' => $validated['hours_count'],
            'reason'      => $validated['reason'] ?? null,
            'status'      => 'pending',
        ]);

        return response()->json(['message' => 'Leave request submitted', 'data' => $leave], 201);
    }

    // ── Employee: Cancel a pending request ────────────────────────────────────
    public function cancel(Request $request, $id)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Unauthorized'], 403);

        $leave = HrLeave::where('id', $id)->where('employee_id', $employee->id)->firstOrFail();

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be cancelled.'], 422);
        }

        $leave->update(['status' => 'cancelled']);
        return response()->json(['message' => 'Leave request cancelled']);
    }

    // ── HR Admin: All leave requests ──────────────────────────────────────────
    public function index(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = HrLeave::with(['employee.department', 'employee.designation'])
            ->orderByDesc('created_at');

        if ($request->has('status') && $request->status !== '') $query->where('status', $request->status);
        if ($request->has('employee_id') && $request->employee_id !== '') $query->where('employee_id', $request->employee_id);
        if ($request->has('leave_type') && $request->leave_type !== '') $query->where('leave_type', $request->leave_type);
        if ($request->has('department_id') && $request->department_id !== '') {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $request->department_id));
        }
        if ($request->has('month') && $request->month !== '') {
            $query->whereYear('start_date', substr($request->month, 0, 4))
                  ->whereMonth('start_date', substr($request->month, 5, 2));
        }

        return response()->json($query->paginate(20));
    }

    // ── HR Admin: Leave statistics summary ───────────────────────────────────
    public function stats(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $year = $request->get('year', Carbon::now()->year);
        $month = $request->get('month', Carbon::now()->month);

        $base = HrLeave::whereYear('start_date', $year);

        return response()->json([
            'pending'          => (clone $base)->where('status', 'pending')->count(),
            'manager_approved' => (clone $base)->where('status', 'manager_approved')->count(),
            'approved'         => (clone $base)->where('status', 'approved')->count(),
            'rejected'         => (clone $base)->where('status', 'rejected')->count(),
            'total_this_month' => (clone $base)->whereMonth('start_date', $month)->count(),
            'by_type'          => (clone $base)->whereIn('status', ['approved', 'pending', 'manager_approved'])
                ->selectRaw('leave_type, count(*) as count')
                ->groupBy('leave_type')
                ->pluck('count', 'leave_type'),
        ]);
    }

    // ── HR Admin: All employees' leave balances ───────────────────────────────
    public function allBalances(Request $request)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $year = $request->get('year', Carbon::now()->year);
        $employees = HrEmployee::with(['department', 'designation'])
            ->where('status', 'active')
            ->orderBy('full_name')
            ->get();

        return response()->json($employees->map(fn($emp) => [
            'id'         => $emp->id,
            'name'       => $emp->full_name,
            'department' => $emp->department?->name,
            'designation'=> $emp->designation?->name,
            'joined_date'=> $emp->joined_date,
            'balances'   => $this->calculateLeaveBalances($emp, $year),
        ]));
    }

    // ── HR Admin / Manager: Approve / Reject ──────────────────────────────────
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        
        $isManager = $user->hasRole('super_admin');
        $isHR = $user->hasRole('solar_hr_admin');
        
        if (!$isManager && !$isHR) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status'   => 'required|in:manager_approved,manager_rejected,approved,rejected',
            'notes'    => 'nullable|string', // can be manager_notes or hr_notes
        ]);

        $leave = HrLeave::findOrFail($id);
        
        $updateData = ['status' => $validated['status']];
        
        if (str_starts_with($validated['status'], 'manager_')) {
            if (!$isManager && !$isHR) return response()->json(['message' => 'Unauthorized for manager approval'], 403);
            $updateData['manager_approved_by'] = $user->id;
            $updateData['manager_approved_at'] = Carbon::now();
            if (!empty($validated['notes'])) {
                $updateData['manager_notes'] = $validated['notes'];
            }
        } else {
            if (!$isHR) return response()->json(['message' => 'Unauthorized for HR finalization'], 403);
            $updateData['approved_by'] = $user->id;
            if (!empty($validated['notes'])) {
                $updateData['hr_notes'] = $validated['notes'];
            }
        }

        $leave->update($updateData);

        return response()->json(['message' => "Leave status updated to {$validated['status']}", 'data' => $leave]);
    }
}
