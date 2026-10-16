<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAppraisal;
use App\Models\HrAppraisalObjective;
use App\Models\HrEmployee;
use App\Models\HrAttendance;
use App\Models\HrLeave;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HrAppraisalController extends Controller
{
    public static array $directorEmails = [
        'hasintha@circlegroup.lk',
        'eranda@circlegroup.lk',
    ];

    public static function isProjectDirector(?object $user): bool
    {
        if (!$user || empty($user->email)) return false;
        return in_array(strtolower(trim($user->email)), self::$directorEmails, true)
            || ($user->role === 'super_admin')
            || (method_exists($user, 'hasRole') && $user->hasRole('super_admin'));
    }

    // ── Helper: Resolve current employee from user ─────────────────────────────
    private function resolveEmployee(Request $request): ?HrEmployee
    {
        $user = $request->user();
        if (!$user) return null;

        $employee = HrEmployee::where('user_id', $user->id)->first();
        if (!$employee && !empty($user->email)) {
            $employee = HrEmployee::where('company_email', $user->email)
                ->orWhere('personal_email', $user->email)
                ->first();
        }
        return $employee;
    }

    // ── Employee: View my appraisals (current & history) ──────────────────────
    public function myAppraisals(Request $request)
    {
        $employee = $this->resolveEmployee($request);
        if (!$employee) return response()->json([]);

        $appraisals = HrAppraisal::with(['objectives', 'evaluator.designation', 'directorApprovedBy'])
            ->where('employee_id', $employee->id)
            ->orderByDesc('period_month')
            ->get();

        return response()->json($appraisals);
    }

    // ── Employee/Manager: Get or initialize appraisal for a given month ────────
    public function getOrInitialize(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $targetEmployeeId = $request->get('employee_id');

        $currentEmployee = $this->resolveEmployee($request);

        // If target employee specified, check permissions (Manager / HR / Director)
        if ($targetEmployeeId) {
            $user = $request->user();
            $isDirector = self::isProjectDirector($user);
            $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));
            
            $targetEmp = HrEmployee::findOrFail($targetEmployeeId);
            $isManager = $currentEmployee && $targetEmp->manager_id === $currentEmployee->id;

            if (!$isDirector && !$isHr && !$isManager && ($currentEmployee?->id !== $targetEmp->id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $employee = $targetEmp;
        } else {
            $employee = $currentEmployee;
        }

        if (!$employee) {
            return response()->json(['message' => 'Employee profile not found'], 404);
        }

        $appraisal = HrAppraisal::with(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation'])
            ->where('employee_id', $employee->id)
            ->where('period_month', $month)
            ->first();

        if (!$appraisal) {
            // Find evaluator (line manager or department head)
            $evaluatorId = $employee->manager_id;
            if (!$evaluatorId && $employee->department_id) {
                $deptHead = HrEmployee::where('department_id', $employee->department_id)
                    ->where('id', '!=', $employee->id)
                    ->whereHas('designation', fn($q) => $q->whereIn('level', ['Senior', 'Lead', 'C_Level']))
                    ->first();
                $evaluatorId = $deptHead?->id;
            }

            $appraisal = HrAppraisal::create([
                'employee_id'  => $employee->id,
                'evaluator_id' => $evaluatorId,
                'period_month' => $month,
                'status'       => 'draft',
            ]);
            $appraisal->load(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation']);
        }

        return response()->json($appraisal);
    }

    // ── Manager / Employee: Save objectives (max 5, must sum to 100% on confirm)
    public function saveObjectives(Request $request, $id)
    {
        $appraisal = HrAppraisal::with('objectives')->findOrFail($id);
        $user = $request->user();
        $currEmp = $this->resolveEmployee($request);
        
        $isDirector = self::isProjectDirector($user);
        $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));
        $isManager = $currEmp && ($appraisal->evaluator_id === $currEmp->id || $appraisal->employee->manager_id === $currEmp->id);
        $isSelf = $currEmp && $appraisal->employee_id === $currEmp->id;

        if (!$isDirector && !$isHr && !$isManager && !$isSelf) {
            return response()->json(['message' => 'Unauthorized to modify objectives'], 403);
        }

        // Only allowed in draft, objectives_confirmed, or revision_requested
        if (!in_array($appraisal->status, ['draft', 'objectives_confirmed', 'revision_requested'])) {
            return response()->json(['message' => 'Objectives cannot be modified after self-appraisal submission'], 422);
        }

        $validated = $request->validate([
            'objectives'             => 'required|array|min:1|max:5',
            'objectives.*.title'     => 'required|string|max:255',
            'objectives.*.description'=> 'nullable|string',
            'objectives.*.weight'    => 'required|numeric|min:1|max:100',
            'objectives.*.deadline'  => 'required|date',
            'objectives.*.target_kpi'=> 'nullable|string',
            'objectives.*.status'    => 'nullable|string|in:not_started,in_progress,completed',
            'confirm'                => 'nullable|boolean', // Lock objectives for the month
        ]);

        $totalWeight = array_sum(array_column($validated['objectives'], 'weight'));

        // If confirming/locking targets, total weight MUST be exactly 100% (Policy Section 2.4)
        if (!empty($validated['confirm'])) {
            if (abs($totalWeight - 100.0) > 0.01) {
                return response()->json([
                    'message' => "Total weight of all objectives must equal 100%. Current sum: {$totalWeight}%"
                ], 422);
            }
        }

        DB::transaction(function () use ($appraisal, $validated) {
            // Delete existing objectives and insert new set
            $appraisal->objectives()->delete();

            $order = 1;
            foreach ($validated['objectives'] as $obj) {
                $appraisal->objectives()->create([
                    'order_num'   => $order++,
                    'title'       => $obj['title'],
                    'description' => $obj['description'] ?? null,
                    'weight'      => $obj['weight'],
                    'deadline'    => $obj['deadline'],
                    'target_kpi'  => $obj['target_kpi'] ?? null,
                    'status'      => $obj['status'] ?? 'in_progress',
                ]);
            }

            if (!empty($validated['confirm'])) {
                $appraisal->update(['status' => 'objectives_confirmed']);
            }
        });

        $appraisal->load(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation']);
        return response()->json([
            'message' => !empty($validated['confirm']) ? 'Objectives confirmed and locked for the month!' : 'Draft objectives saved',
            'data'    => $appraisal
        ]);
    }

    // ── Employee: Submit end-of-month actual achievements ─────────────────────
    public function submitSelfAppraisal(Request $request, $id)
    {
        $appraisal = HrAppraisal::with('objectives')->findOrFail($id);
        $currEmp = $this->resolveEmployee($request);

        if (!$currEmp || $appraisal->employee_id !== $currEmp->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($appraisal->status, ['objectives_confirmed', 'revision_requested', 'draft'])) {
            return response()->json(['message' => 'Appraisal is not in a submittable state'], 422);
        }

        $validated = $request->validate([
            'objectives'                 => 'required|array',
            'objectives.*.id'            => 'required|exists:hr_appraisal_objectives,id',
            'objectives.*.achievement'   => 'required|string',
            'objectives.*.status'        => 'required|in:completed,in_progress,not_completed',
            'objectives.*.evidence_notes'=> 'nullable|string',
            'employee_comments'          => 'nullable|string',
        ]);

        DB::transaction(function () use ($appraisal, $validated) {
            foreach ($validated['objectives'] as $objData) {
                HrAppraisalObjective::where('id', $objData['id'])
                    ->where('appraisal_id', $appraisal->id)
                    ->update([
                        'achievement'    => $objData['achievement'],
                        'status'         => $objData['status'],
                        'evidence_notes' => $objData['evidence_notes'] ?? null,
                    ]);
            }

            $appraisal->update([
                'employee_comments' => $validated['employee_comments'] ?? null,
                'status'            => 'self_submitted',
            ]);
        });

        // Notify line manager if assigned
        try {
            $mgr = $appraisal->evaluator;
            if ($mgr && $mgr->user) {
                $mgr->user->notify(new \App\Notifications\HrNotification([
                    'division'  => 'hr',
                    'category'  => 'appraisal',
                    'severity'  => 'info',
                    'title'     => 'Monthly Appraisal Submitted',
                    'message'   => "{$currEmp->full_name} submitted achievements for {$appraisal->period_month}.",
                    'link'      => '/solar/hr/portal/appraisals?tab=team',
                    'source_id' => $appraisal->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Appraisal notification error: ' . $e->getMessage());
        }

        $appraisal->load(['objectives', 'evaluator.designation', 'employee']);
        return response()->json([
            'message' => 'Performance achievements submitted to your Line Manager!',
            'data'    => $appraisal
        ]);
    }

    // ── Manager: List team members to evaluate ────────────────────────────────
    public function teamAppraisals(Request $request)
    {
        $user = $request->user();
        $currEmp = $this->resolveEmployee($request);
        $month = $request->get('month', Carbon::now()->format('Y-m'));

        $isDirector = self::isProjectDirector($user);
        $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));

        $query = HrAppraisal::with(['employee.department', 'employee.designation', 'objectives', 'evaluator'])
            ->where('period_month', $month);

        if (!$isDirector && !$isHr) {
            if (!$currEmp) return response()->json([]);
            // Show subordinates where manager_id == current employee OR evaluator_id == current employee
            $query->where(function ($q) use ($currEmp) {
                $q->where('evaluator_id', $currEmp->id)
                  ->orWhereHas('employee', fn($eq) => $eq->where('manager_id', $currEmp->id));
            });
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $request->department_id));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->get());
    }

    // ── Manager: Evaluate & score each objective (0 to 100) ────────────────────
    public function evaluateAppraisal(Request $request, $id)
    {
        $appraisal = HrAppraisal::with('objectives')->findOrFail($id);
        $user = $request->user();
        $currEmp = $this->resolveEmployee($request);

        $isDirector = self::isProjectDirector($user);
        $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));
        $isManager = $currEmp && ($appraisal->evaluator_id === $currEmp->id || $appraisal->employee->manager_id === $currEmp->id);

        if (!$isDirector && !$isHr && !$isManager) {
            return response()->json(['message' => 'Unauthorized to evaluate this employee'], 403);
        }

        $validated = $request->validate([
            'objectives'                   => 'required|array',
            'objectives.*.id'              => 'required|exists:hr_appraisal_objectives,id',
            'objectives.*.marks'           => 'required|numeric|min:0|max:100',
            'objectives.*.manager_comments'=> 'nullable|string',
            'manager_comments'             => 'required|string',
            'manager_recommended_grade'    => 'nullable|string|in:S1,S2,A1,A2,C',
        ]);

        DB::transaction(function () use ($appraisal, $validated, $currEmp) {
            foreach ($validated['objectives'] as $objData) {
                $obj = HrAppraisalObjective::where('id', $objData['id'])
                    ->where('appraisal_id', $appraisal->id)
                    ->first();
                if ($obj) {
                    $obj->marks = $objData['marks'];
                    $obj->weighted_marks = round(($objData['marks'] * $obj->weight) / 100, 2);
                    $obj->manager_comments = $objData['manager_comments'] ?? null;
                    $obj->save();
                }
            }

            $appraisal->manager_comments = $validated['manager_comments'];
            $appraisal->manager_recommended_grade = $validated['manager_recommended_grade'] ?? null;
            $appraisal->manager_evaluated_at = Carbon::now();
            $ifEvaluatorNull = $appraisal->evaluator_id ?? $currEmp?->id;
            $appraisal->evaluator_id = $ifEvaluatorNull;
            $appraisal->status = 'manager_evaluated';

            // Calculate objective score
            $appraisal->recalculateScores();
        });

        // Notify HR Admins
        try {
            $hrUsers = User::where(function($q) {
                $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                  ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
            })->get();

            foreach ($hrUsers as $hrUser) {
                $hrUser->notify(new \App\Notifications\HrNotification([
                    'division'  => 'hr',
                    'category'  => 'appraisal',
                    'severity'  => 'info',
                    'title'     => 'Appraisal Evaluated by Manager',
                    'message'   => "Manager scored {$appraisal->employee->full_name}'s appraisal for {$appraisal->period_month}.",
                    'link'      => '/solar/hr/admin/appraisals',
                    'source_id' => $appraisal->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('HR Notification error on evaluation: ' . $e->getMessage());
        }

        $appraisal->load(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation']);
        return response()->json([
            'message' => 'Manager evaluation recorded successfully! Forwarded to HR review.',
            'data'    => $appraisal
        ]);
    }

    // ── HR: Auto-suggest attendance deductions based on clock records ─────────
    public function suggestAttendanceDeduction(Request $request, $id)
    {
        $appraisal = HrAppraisal::with('employee')->findOrFail($id);
        $month = $appraisal->period_month; // YYYY-MM
        $empId = $appraisal->employee_id;

        // 1. Query attendance records for that specific month
        $attendances = HrAttendance::where('employee_id', $empId)
            ->where('date', 'like', "{$month}%")
            ->get();

        $lateCount = $attendances->where('status', 'late')->count();
        $absentCount = $attendances->where('status', 'absent')->count();
        $halfDayCount = $attendances->where('status', 'half_day')->count();
        $unclosedCount = $attendances->where('is_auto_clock_out', true)->count();

        // 2. Short leaves from hr_leaves
        $shortLeaveHours = HrLeave::where('employee_id', $empId)
            ->where('status', 'approved')
            ->where('leave_type', 'short')
            ->where('start_date', 'like', "{$month}%")
            ->sum('hours_count');

        // 3. Deduction Calculation Formula (Policy Section 2.4: 0 to 10 marks)
        // Late arrivals: 0.5 marks per late occurrence
        // Unauthorized absences: 2.0 marks per absent day
        // Auto / missed punch-outs: 0.5 marks per occurrence
        // Excessive short leaves (>4 hrs monthly limit): 0.5 per extra hour
        $calcDeduction = ($lateCount * 0.5) 
                       + ($absentCount * 2.0) 
                       + ($unclosedCount * 0.5)
                       + (max(0, $shortLeaveHours - 4) * 0.5);

        // Cap strictly at 10.00 marks as per Policy
        $suggestedDeduction = round(min(10.0, max(0.0, $calcDeduction)), 1);

        $notesBreakdown = [];
        if ($lateCount > 0) $notesBreakdown[] = "{$lateCount} late arrival(s)";
        if ($absentCount > 0) $notesBreakdown[] = "{$absentCount} absent day(s)";
        if ($unclosedCount > 0) $notesBreakdown[] = "{$unclosedCount} auto clock-out(s)";
        if ($shortLeaveHours > 4) $notesBreakdown[] = "Excess short leave (" . ($shortLeaveHours - 4) . "h over limit)";

        $generatedNote = empty($notesBreakdown) 
            ? "Clean attendance record for {$month}. No deductions suggested."
            : "Suggested based on: " . implode(', ', $notesBreakdown);

        return response()->json([
            'suggested_deduction' => $suggestedDeduction,
            'suggested_notes'     => $generatedNote,
            'details' => [
                'total_records'       => $attendances->count(),
                'late_count'          => $lateCount,
                'absent_count'        => $absentCount,
                'half_day_count'      => $halfDayCount,
                'auto_clockout_count' => $unclosedCount,
                'short_leave_hours'   => $shortLeaveHours,
            ]
        ]);
    }

    // ── HR: Apply Attendance & Misconduct Deductions ───────────────────────────
    public function applyDeductions(Request $request, $id)
    {
        $user = $request->user();
        if ($user->role !== 'solar_hr_admin' && !self::isProjectDirector($user)) {
            return response()->json(['message' => 'Unauthorized. Only HR Admin or Project Director can apply deductions.'], 403);
        }

        $appraisal = HrAppraisal::with('objectives')->findOrFail($id);

        $validated = $request->validate([
            'attendance_deduction'       => 'required|numeric|min:0|max:10', // Max 10 (Section 2.4)
            'attendance_deduction_notes' => 'nullable|string',
            'misconduct_deduction'       => 'required|numeric|min:0|max:30', // Max 30 (Section 2.4)
            'misconduct_severity'        => 'required|in:none,minor,moderate,serious',
            'misconduct_deduction_notes' => 'nullable|string',
            'hr_comments'                => 'nullable|string',
        ]);

        // Policy Section 2.4 verification:
        // Minor: 0-10, Moderate: 11-19, Serious: 20-30
        $misMarks = floatval($validated['misconduct_deduction']);
        if ($validated['misconduct_severity'] === 'minor' && $misMarks > 10) {
            return response()->json(['message' => 'Minor misconduct deduction cannot exceed 10 marks.'], 422);
        }
        if ($validated['misconduct_severity'] === 'moderate' && ($misMarks < 11 || $misMarks > 19)) {
            return response()->json(['message' => 'Moderate misconduct deduction must be between 11 and 19 marks.'], 422);
        }
        if ($validated['misconduct_severity'] === 'serious' && ($misMarks < 20 || $misMarks > 30)) {
            return response()->json(['message' => 'Serious misconduct deduction must be between 20 and 30 marks.'], 422);
        }

        DB::transaction(function () use ($appraisal, $validated, $user) {
            $appraisal->attendance_deduction = $validated['attendance_deduction'];
            $appraisal->attendance_deduction_notes = $validated['attendance_deduction_notes'] ?? null;
            $appraisal->misconduct_deduction = $validated['misconduct_deduction'];
            $appraisal->misconduct_severity = $validated['misconduct_severity'];
            $appraisal->misconduct_deduction_notes = $validated['misconduct_deduction_notes'] ?? null;
            $appraisal->hr_comments = $validated['hr_comments'] ?? null;
            $appraisal->hr_reviewed_by = $user->id;
            $appraisal->hr_reviewed_at = Carbon::now();
            $appraisal->status = 'hr_reviewed';

            // Recalculate final score, grade and variable pay %
            $appraisal->recalculateScores();
        });

        // Notify Project Director for final approval
        try {
            $directors = User::where(function($q) {
                $q->whereIn('email', self::$directorEmails)
                  ->orWhere('role', 'super_admin');
            })->get();

            foreach ($directors as $dirUser) {
                $dirUser->notify(new \App\Notifications\HrNotification([
                    'division'  => 'hr',
                    'category'  => 'appraisal',
                    'severity'  => 'warning',
                    'title'     => 'Appraisal Ready for Final Approval',
                    'message'   => "HR reviewed {$appraisal->employee->full_name}'s appraisal. Pending Project Director sign-off.",
                    'link'      => '/solar/hr/portal/appraisals?tab=director',
                    'source_id' => $appraisal->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Notification error on HR review: ' . $e->getMessage());
        }

        $appraisal->load(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation']);
        return response()->json([
            'message' => 'Deductions applied and submitted to Project Director for final evaluation!',
            'data'    => $appraisal
        ]);
    }

    // ── Project Director: Final Evaluation, Grade Moderation & Approval ───────
    public function directorApproval(Request $request, $id)
    {
        $user = $request->user();
        if (!self::isProjectDirector($user)) {
            return response()->json(['message' => 'Unauthorized. Only Project Director can finalize grades.'], 403);
        }

        $appraisal = HrAppraisal::with('employee.user')->findOrFail($id);

        $validated = $request->validate([
            'action'            => 'required|in:approve,override_grade,revision_requested',
            'grade'             => 'required_if:action,override_grade|nullable|in:S1,S2,A1,A2,C',
            'director_comments' => 'nullable|string',
        ]);

        if ($validated['action'] === 'revision_requested') {
            $appraisal->update([
                'status'            => 'revision_requested',
                'director_comments' => $validated['director_comments'] ?? 'Revision requested by Project Director',
            ]);
            return response()->json(['message' => 'Appraisal returned for revision', 'data' => $appraisal]);
        }

        // Grade override or approval
        if ($validated['action'] === 'override_grade' && !empty($validated['grade'])) {
            $appraisal->grade = $validated['grade'];
            $levels = [
                'S1' => ['level' => 'Outstanding', 'pay' => '116% - 120%'],
                'S2' => ['level' => 'Excellent', 'pay' => '110% - 115%'],
                'A1' => ['level' => 'Meets Expectations', 'pay' => '95% - 109%'],
                'A2' => ['level' => 'Needs Improvement', 'pay' => '80% - 94%'],
                'C'  => ['level' => 'Unacceptable', 'pay' => '0%'],
            ];
            $appraisal->performance_level = $levels[$validated['grade']]['level'] ?? 'Meets Expectations';
            $appraisal->variable_pay_adjustment = $levels[$validated['grade']]['pay'] ?? '100%';
        }

        $appraisal->director_comments = $validated['director_comments'] ?? null;
        $appraisal->director_approved_by = $user->id;
        $appraisal->director_approved_at = Carbon::now();
        $appraisal->status = 'approved';
        $appraisal->save();

        // Notify the employee of official monthly grade publication
        try {
            $empUser = $appraisal->employee?->user;
            if ($empUser) {
                $empUser->notify(new \App\Notifications\HrNotification([
                    'division'  => 'hr',
                    'category'  => 'appraisal',
                    'severity'  => in_array($appraisal->grade, ['S1', 'S2']) ? 'success' : 'info',
                    'title'     => "Monthly Performance Grade: {$appraisal->grade}",
                    'message'   => "Your official appraisal for {$appraisal->period_month} has been approved ({$appraisal->performance_level} · {$appraisal->variable_pay_adjustment} Variable Pay).",
                    'link'      => '/solar/hr/portal/appraisals',
                    'source_id' => $appraisal->id,
                ]));
            }
        } catch (\Throwable $e) {
            Log::error('Employee notification error: ' . $e->getMessage());
        }

        $appraisal->load(['objectives', 'evaluator.designation', 'employee.department', 'employee.designation']);
        return response()->json([
            'message' => "Appraisal officially approved! Grade {$appraisal->grade} published.",
            'data'    => $appraisal
        ]);
    }

    // ── Project Director: 1-Click Batch Approval ─────────────────────────────
    public function batchDirectorApproval(Request $request)
    {
        $user = $request->user();
        if (!self::isProjectDirector($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'appraisal_ids'     => 'required|array|min:1',
            'appraisal_ids.*'   => 'exists:hr_appraisals,id',
            'director_comments' => 'nullable|string',
        ]);

        $appraisals = HrAppraisal::whereIn('id', $validated['appraisal_ids'])
            ->whereIn('status', ['hr_reviewed', 'manager_evaluated'])
            ->get();

        $count = 0;
        foreach ($appraisals as $appraisal) {
            $appraisal->update([
                'director_comments'    => $validated['director_comments'] ?? 'Approved by Project Director',
                'director_approved_by' => $user->id,
                'director_approved_at' => Carbon::now(),
                'status'               => 'approved',
            ]);
            $count++;
        }

        return response()->json([
            'message' => "Successfully approved {$count} employee appraisal(s)!",
            'approved_count' => $count
        ]);
    }

    // ── HR Admin / Project Director: Organization Stats, Bell Curve & Underperformance Alerts
    public function stats(Request $request)
    {
        $user = $request->user();
        $isDirector = self::isProjectDirector($user);
        $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));

        if (!$isDirector && !$isHr) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $month = $request->get('month', Carbon::now()->format('Y-m'));

        $base = HrAppraisal::where('period_month', $month);
        $totalAppraised = (clone $base)->count();
        $approved = (clone $base)->where('status', 'approved')->get();
        $approvedCount = $approved->count();

        // Grade Distribution (Policy Section 2.7: S1 <= 5%, S2 5-10%)
        $gradeCounts = [
            'S1' => $approved->where('grade', 'S1')->count(),
            'S2' => $approved->where('grade', 'S2')->count(),
            'A1' => $approved->where('grade', 'A1')->count(),
            'A2' => $approved->where('grade', 'A2')->count(),
            'C'  => $approved->where('grade', 'C')->count(),
        ];

        $s1Pct = $approvedCount > 0 ? round(($gradeCounts['S1'] / $approvedCount) * 100, 1) : 0;
        $s2Pct = $approvedCount > 0 ? round(($gradeCounts['S2'] / $approvedCount) * 100, 1) : 0;

        // Policy Section 2.8: Underperformance & PIP Monitoring
        // Check employees with 3 consecutive A2s or 2 consecutive Cs
        $allActiveEmployees = HrEmployee::where('status', 'active')->get();
        $underperformanceAlerts = [];

        foreach ($allActiveEmployees as $emp) {
            $recent = HrAppraisal::where('employee_id', $emp->id)
                ->where('status', 'approved')
                ->orderByDesc('period_month')
                ->take(3)
                ->pluck('grade')
                ->toArray();

            // 1. Two consecutive C grades
            if (count($recent) >= 2 && $recent[0] === 'C' && $recent[1] === 'C') {
                $underperformanceAlerts[] = [
                    'employee_id' => $emp->id,
                    'full_name'   => $emp->full_name,
                    'department'  => $emp->department?->name,
                    'severity'    => 'critical',
                    'consecutive' => '2 Months Unacceptable (C)',
                    'action'      => 'Immediate Disciplinary / Termination Review (Section 2.8)',
                    'grades'      => array_slice($recent, 0, 2),
                ];
            }
            // 2. Three consecutive A2 grades
            elseif (count($recent) >= 3 && $recent[0] === 'A2' && $recent[1] === 'A2' && $recent[2] === 'A2') {
                $underperformanceAlerts[] = [
                    'employee_id' => $emp->id,
                    'full_name'   => $emp->full_name,
                    'department'  => $emp->department?->name,
                    'severity'    => 'warning',
                    'consecutive' => '3 Months Needs Improvement (A2)',
                    'action'      => 'Formal Performance Management / PIP Review (Section 2.8)',
                    'grades'      => $recent,
                ];
            }
        }

        return response()->json([
            'period_month'         => $month,
            'total_appraisals'     => $totalAppraised,
            'approved_count'       => $approvedCount,
            'pending_director'     => (clone $base)->where('status', 'hr_reviewed')->count(),
            'pending_hr'           => (clone $base)->where('status', 'manager_evaluated')->count(),
            'pending_manager'      => (clone $base)->where('status', 'self_submitted')->count(),
            'draft_or_goals'       => (clone $base)->whereIn('status', ['draft', 'objectives_confirmed'])->count(),
            'grade_counts'         => $gradeCounts,
            'bell_curve' => [
                's1_percentage'        => $s1Pct,
                's1_quota_warning'     => $s1Pct > 5.0, // Alert if exceeds 5%
                's2_percentage'        => $s2Pct,
                's2_quota_warning'     => $s2Pct > 10.0, // Alert if exceeds 10%
            ],
            'underperformance_alerts' => $underperformanceAlerts,
        ]);
    }

    // ── HR Admin: Full Index with search & filters ────────────────────────────
    public function index(Request $request)
    {
        $user = $request->user();
        $isDirector = self::isProjectDirector($user);
        $isHr = $user->role === 'solar_hr_admin' || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));

        if (!$isDirector && !$isHr) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = HrAppraisal::with(['employee.department', 'employee.designation', 'evaluator', 'objectives', 'directorApprovedBy'])
            ->orderByDesc('period_month')
            ->orderBy('employee_id');

        if ($request->filled('month')) {
            $query->where('period_month', $request->month);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('grade')) {
            $query->where('grade', $request->grade);
        }
        if ($request->filled('department_id')) {
            $query->whereHas('employee', fn($q) => $q->where('department_id', $request->department_id));
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('employee', fn($q) => 
                $q->where('full_name', 'like', "%{$s}%")
                  ->orWhere('employee_id', 'like', "%{$s}%")
            );
        }

        return response()->json($query->paginate(25));
    }
}
