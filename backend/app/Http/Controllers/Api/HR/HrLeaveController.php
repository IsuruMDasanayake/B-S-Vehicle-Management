<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrLeave;
use App\Models\HrEmployee;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HrLeaveController extends Controller
{
    // Leave balance definitions per type
    const LEAVE_ENTITLEMENTS = [
        'annual'  => 14,
        'casual'  => 7,
        'medical' => 7,
    ];

    // ── Employee: Get my leave balance ─────────────────────────────────────────
    public function myBalance(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json([]);

        $year = Carbon::now()->year;

        $balances = [];
        foreach (self::LEAVE_ENTITLEMENTS as $type => $total) {
            $used = HrLeave::where('employee_id', $employee->id)
                ->where('leave_type', $type)
                ->whereIn('status', ['approved', 'pending'])
                ->whereYear('start_date', $year)
                ->sum('days_count');

            $balances[] = [
                'type'      => ucfirst($type) . ' Leave',
                'key'       => $type,
                'total'     => $total,
                'used'      => (int) $used,
                'remaining' => max(0, $total - (int) $used),
            ];
        }

        return response()->json($balances);
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

    // ── Employee: Submit a leave request ──────────────────────────────────────
    public function store(Request $request)
    {
        $employee = HrEmployee::where('user_id', $request->user()->id)->first();
        if (!$employee) return response()->json(['message' => 'Employee not found'], 404);

        $validated = $request->validate([
            'leave_type' => 'required|in:annual,casual,medical',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:500',
        ]);

        $start  = Carbon::parse($validated['start_date']);
        $end    = Carbon::parse($validated['end_date']);
        $days   = 0;
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if (!$d->isWeekend()) $days++;
        }

        // Check balance
        $entitlement = self::LEAVE_ENTITLEMENTS[$validated['leave_type']] ?? 0;
        $used = HrLeave::where('employee_id', $employee->id)
            ->where('leave_type', $validated['leave_type'])
            ->whereIn('status', ['approved', 'pending'])
            ->whereYear('start_date', Carbon::now()->year)
            ->sum('days_count');

        if (($used + $days) > $entitlement) {
            return response()->json([
                'message' => "Insufficient {$validated['leave_type']} leave balance. You have " . max(0, $entitlement - $used) . " days remaining.",
            ], 422);
        }

        $leave = HrLeave::create([
            'employee_id' => $employee->id,
            'leave_type'  => $validated['leave_type'],
            'start_date'  => $validated['start_date'],
            'end_date'    => $validated['end_date'],
            'days_count'  => $days,
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

        $query = HrLeave::with('employee.department')
            ->orderByDesc('created_at');

        if ($request->has('status')) $query->where('status', $request->status);
        if ($request->has('employee_id')) $query->where('employee_id', $request->employee_id);

        return response()->json($query->paginate(20));
    }

    // ── HR Admin: Approve / Reject ────────────────────────────────────────────
    public function updateStatus(Request $request, $id)
    {
        if (!$request->user()->hasRole('super_admin') && !$request->user()->hasRole('solar_hr_admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status'   => 'required|in:approved,rejected',
            'hr_notes' => 'nullable|string',
        ]);

        $leave = HrLeave::findOrFail($id);
        $leave->update([
            'status'      => $validated['status'],
            'hr_notes'    => $validated['hr_notes'] ?? null,
            'approved_by' => $request->user()->id,
        ]);

        return response()->json(['message' => "Leave {$validated['status']}", 'data' => $leave]);
    }
}
