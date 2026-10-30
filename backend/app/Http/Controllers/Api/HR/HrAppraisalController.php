<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrAppraisal;
use App\Models\HrAppraisalObjective;
use App\Models\HrAppraisalObjectiveRevision;
use App\Models\HrAttendance;
use App\Models\HrEmployee;
use App\Models\HrLeave;
use App\Models\User;
use App\Notifications\HrNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Monthly Performance Appraisal — Simplified "Single Appraisal Sheet".
 *
 * One sheet per employee per month. Role-based cells:
 *  ┌──────────────────────────────┬───────────┬──────────┬─────┐
 *  │ Cell                         │ Appraiser │ Employee │ HR  │
 *  ├──────────────────────────────┼───────────┼──────────┼─────┤
 *  │ Objective / Weight / Deadline│ edit      │ view     │ view│
 *  │ Achievement / Status         │ view      │ edit     │ view│
 *  │ Actual Marks / Comments      │ edit      │ view     │ view│
 *  │ Attendance / Misconduct      │ view      │ view     │ edit│
 *  │ Finalize / Return / Reopen   │ yes       │ -        │ -   │
 *  └──────────────────────────────┴───────────┴──────────┴─────┘
 *
 * Workflow: open -> submitted -> finalized
 * Objectives may be changed by the Appraiser any time before Finalize.
 * After first assignment, each change requires a reason and is logged.
 */
class HrAppraisalController extends Controller
{
    /** Appraisers (Hasintha = GM / Project Director, Eranda = CEO as backup). */
    public static array $directorEmails = [
        'hasintha@circlegroup.lk',
        'eranda@circlegroup.lk',
    ];

    private const OBJ_STATUSES = ['not_started', 'in_progress', 'completed'];

    // ═════════════════════════════════════════════════════════════════════════
    //  Role helpers
    // ═════════════════════════════════════════════════════════════════════════

    private static function isSuperAdmin(?object $user): bool
    {
        if (!$user) return false;
        return $user->role === 'super_admin'
            || (method_exists($user, 'hasRole') && $user->hasRole('super_admin'));
    }

    /** Legacy helper kept for compatibility */
    public static function isProjectDirector(?object $user): bool
    {
        if (!$user || empty($user->email)) return false;
        return in_array(strtolower(trim($user->email)), self::$directorEmails, true)
            || self::isSuperAdmin($user);
    }

    private static function isHr(?object $user): bool
    {
        if (!$user) return false;
        return $user->role === 'solar_hr_admin'
            || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'))
            || self::isSuperAdmin($user);
    }

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

    /** Check whether the employee is a Reporting Manager for at least one employee */
    private function isReportingManager(?HrEmployee $me): bool
    {
        if (!$me) return false;
        return HrEmployee::where('manager_id', $me->id)
            ->whereIn('status', ['active', 'probation', 'on_leave'])
            ->exists();
    }

    /**
     * Dynamic Appraiser check for a target employee:
     * Appraiser is the employee's Reporting Manager ($employee->manager_id === $me->id) OR HR / Super Admin.
     */
    private function isAppraiserFor(Request $request, HrEmployee $employee): bool
    {
        $user = $request->user();
        if (!$user) return false;

        if (self::isSuperAdmin($user)) {
            return true;
        }

        $me = $this->resolveEmployee($request);
        $isSelf = $me && (int) $me->id === (int) $employee->id;

        // Reporting Manager of this employee
        if ($me && $employee->manager_id && (int) $employee->manager_id === (int) $me->id && !$isSelf) {
            return true;
        }

        // HR Admin also has Appraiser privileges (except on their own sheet)
        if (self::isHr($user) && !$isSelf) {
            return true;
        }

        return false;
    }

    /** Can the current user view this employee's appraisal? */
    private function canView(Request $request, int $employeeId): bool
    {
        $user = $request->user();
        if (self::isHr($user)) return true;

        $me = $this->resolveEmployee($request);
        if (!$me) return false;
        if ((int) $me->id === (int) $employeeId) return true;

        $target = HrEmployee::find($employeeId);
        if ($target && (int) $target->manager_id === (int) $me->id) {
            return true;
        }

        return false;
    }

    private function sheetRelations(): array
    {
        return [
            'objectives',
            'evaluator.designation',
            'employee.department',
            'employee.designation',
            'employee.manager.designation',
            'finalizedBy:id,name',
        ];
    }

    /** Default appraiser profile (Employee's Reporting Manager, or HR fallback) when none recorded yet. */
    private function defaultAppraiser(?HrEmployee $employee = null): ?HrEmployee
    {
        if ($employee && $employee->manager_id) {
            $manager = $employee->relationLoaded('manager')
                ? $employee->manager
                : HrEmployee::with('designation')->find($employee->manager_id);
            if ($manager) {
                $manager->loadMissing('designation');
                return $manager;
            }
        }

        return HrEmployee::with('designation')
            ->whereHas('user', fn($q) => $q->whereIn('role', ['solar_hr_admin', 'super_admin']))
            ->first();
    }

    /** Role permissions for a given sheet (null = not yet created). */
    private function permissionsFor(Request $request, ?HrAppraisal $sheet, HrEmployee $employee): array
    {
        $user = $request->user();
        $me = $this->resolveEmployee($request);

        $isAppraiser = $this->isAppraiserFor($request, $employee);
        $isHr = self::isHr($user);
        $isSelf = $me && (int) $me->id === (int) $employee->id;

        $status = $sheet?->status;
        $notFinal = $status !== HrAppraisal::STATUS_FINALIZED;
        $hasObjectives = $sheet && $sheet->objectives->isNotEmpty();
        $allMarked = $hasObjectives && $sheet->objectives->every(fn($o) => $o->actual_marks !== null);

        return [
            'is_appraiser'          => $isAppraiser,
            'is_hr'                 => $isHr,
            'is_self'               => $isSelf,
            'can_edit_objectives'   => $isAppraiser && $notFinal,
            'can_edit_achievements' => $isSelf && $hasObjectives && $status === HrAppraisal::STATUS_OPEN,
            'can_edit_marks'        => $isAppraiser && $hasObjectives && $notFinal,
            // HR cannot set deductions on their own sheet (unless super admin)
            'can_edit_deductions'   => $isHr && $sheet && $notFinal && (!$isSelf || self::isSuperAdmin($user)),
            'can_finalize'          => $isAppraiser && $allMarked && $notFinal,
            'can_return'            => $isAppraiser && $status === HrAppraisal::STATUS_SUBMITTED,
            'can_reopen'            => $isAppraiser && $status === HrAppraisal::STATUS_FINALIZED,
            'can_print'             => $isHr || $isAppraiser,
        ];
    }

    private function sheetResponse(Request $request, HrEmployee $employee, ?HrAppraisal $sheet, ?string $message = null)
    {
        $employee->loadMissing(['department', 'designation', 'manager.designation']);

        if ($sheet) {
            $sheet->load($this->sheetRelations());
            $sheet->loadCount('revisions');
        }

        $appraiser = $sheet?->evaluator ?? $this->defaultAppraiser($employee);

        $payload = [
            'employee' => [
                'id'          => $employee->id,
                'full_name'   => $employee->full_name,
                'employee_id' => $employee->employee_id,
                'epf_no'      => $employee->epf_no,
                'department'  => $employee->department?->name,
                'designation' => $employee->designation?->title,
                'photo_url'   => $employee->photo_url,
                'manager_id'  => $employee->manager_id,
                'manager'     => $employee->manager ? [
                    'id'          => $employee->manager->id,
                    'full_name'   => $employee->manager->full_name,
                    'designation' => $employee->manager->designation?->title,
                ] : null,
            ],
            'appraiser' => $appraiser ? [
                'id'          => $appraiser->id,
                'full_name'   => $appraiser->full_name,
                'designation' => $appraiser->designation?->title,
            ] : null,
            'sheet'       => $sheet,
            'permissions' => $this->permissionsFor($request, $sheet, $employee),
        ];

        if ($message) $payload['message'] = $message;

        return response()->json($payload);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Notifications
    // ═════════════════════════════════════════════════════════════════════════

    private function userForEmployee(?HrEmployee $emp): ?User
    {
        if (!$emp) return null;
        if ($emp->user) return $emp->user;
        return !empty($emp->company_email) ? User::where('email', $emp->company_email)->first() : null;
    }

    private function notify(?User $user, string $title, string $message, string $link, $sourceId, string $severity = 'info'): void
    {
        if (!$user) return;
        try {
            $user->notify(new HrNotification([
                'division'  => 'hr',
                'category'  => 'appraisal',
                'severity'  => $severity,
                'title'     => $title,
                'message'   => $message,
                'link'      => $link,
                'source_id' => $sourceId,
            ]));
        } catch (\Throwable $e) {
            Log::error('Appraisal notification error: ' . $e->getMessage());
        }
    }

    private function notifyAppraisersForEmployee(HrEmployee $employee, string $title, string $message, $sourceId): void
    {
        $recipients = collect();

        // 1. Employee's Reporting Manager
        if ($employee->manager_id) {
            $manager = $employee->relationLoaded('manager')
                ? $employee->manager
                : HrEmployee::with('user')->find($employee->manager_id);
            $managerUser = $this->userForEmployee($manager);
            if ($managerUser) {
                $recipients->push($managerUser);
            }
        }

        // 2. HR Admins & Super Admins
        $hrUsers = User::whereIn('role', ['solar_hr_admin', 'super_admin'])->get();
        $recipients = $recipients->concat($hrUsers)->unique('id');

        foreach ($recipients as $u) {
            $link = in_array($u->role, ['solar_hr_admin', 'super_admin'], true)
                ? "/solar/hr/admin/appraisals"
                : "/solar/hr/portal/appraisals?tab=team";
            $this->notify($u, $title, $message, $link, $sourceId);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Read endpoints
    // ═════════════════════════════════════════════════════════════════════════

    /** GET appraisals/sheet?employee_id=&month= (employee_id omitted = my own sheet) */
    public function sheet(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            return response()->json(['message' => 'Invalid month'], 422);
        }

        if ($request->filled('employee_id')) {
            $employee = HrEmployee::with(['department', 'designation', 'manager.designation'])->findOrFail($request->employee_id);
            if (!$this->canView($request, $employee->id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } else {
            $employee = $this->resolveEmployee($request);
            if (!$employee) {
                return response()->json(['message' => 'Employee profile not found'], 404);
            }
            $employee->load(['department', 'designation', 'manager.designation']);
        }

        $sheet = HrAppraisal::where('employee_id', $employee->id)
            ->where('period_month', $month)
            ->first();

        return $this->sheetResponse($request, $employee, $sheet);
    }

    /** GET appraisals/my — my appraisal history (for month quick-switch) */
    public function myAppraisals(Request $request)
    {
        $employee = $this->resolveEmployee($request);
        if (!$employee) return response()->json([]);

        return response()->json(
            HrAppraisal::where('employee_id', $employee->id)
                ->orderByDesc('period_month')
                ->get(['id', 'period_month', 'status', 'final_score', 'grade', 'performance_level'])
        );
    }

    /** GET appraisals/board?month=&search=&department_id= — Reporting Manager / HR overview of employees */
    public function board(Request $request)
    {
        $user = $request->user();
        $me = $this->resolveEmployee($request);
        $isHr = self::isHr($user);
        $isManager = $this->isReportingManager($me);

        if (!$isHr && !$isManager) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $month = $request->get('month', Carbon::now()->format('Y-m'));

        $empQuery = HrEmployee::with(['department', 'designation', 'manager.designation'])
            ->where('status', 'active')
            ->orderBy('full_name');

        // Reporting Managers (who are not HR/Super Admin) only see employees who report to them
        if (!$isHr && $me) {
            $empQuery->where('manager_id', $me->id);
        }

        if ($request->filled('department_id')) {
            $empQuery->where('department_id', $request->department_id);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $empQuery->where(fn($q) => $q->where('full_name', 'like', "%{$s}%")->orWhere('employee_id', 'like', "%{$s}%"));
        }

        $employees = $empQuery->get();

        $sheets = HrAppraisal::with(['objectives:id,appraisal_id,weight,actual_marks,status', 'evaluator.designation'])
            ->where('period_month', $month)
            ->whereIn('employee_id', $employees->pluck('id'))
            ->get()
            ->keyBy('employee_id');

        $summary = ['total' => $employees->count(), 'not_assigned' => 0, 'open' => 0, 'submitted' => 0, 'finalized' => 0, 'hr_pending' => 0];

        $rows = $employees->map(function ($emp) use ($sheets, &$summary) {
            $sheet = $sheets->get($emp->id);
            $objCount = $sheet ? $sheet->objectives->count() : 0;

            if (!$sheet || $objCount === 0) {
                $summary['not_assigned']++;
            } else {
                $summary[$sheet->status] = ($summary[$sheet->status] ?? 0) + 1;
                if (!$sheet->hr_reviewed_at && $sheet->status !== HrAppraisal::STATUS_FINALIZED) {
                    $summary['hr_pending']++;
                }
            }

            $appraiser = $sheet?->evaluator ?? $emp->manager;

            return [
                'employee' => [
                    'id'          => $emp->id,
                    'full_name'   => $emp->full_name,
                    'employee_id' => $emp->employee_id,
                    'epf_no'      => $emp->epf_no,
                    'department'  => $emp->department?->name,
                    'designation' => $emp->designation?->title,
                    'photo_url'   => $emp->photo_url,
                    'manager_id'  => $emp->manager_id,
                    'manager'     => $emp->manager ? [
                        'id'          => $emp->manager->id,
                        'full_name'   => $emp->manager->full_name,
                        'designation' => $emp->manager->designation?->title,
                    ] : null,
                    'appraiser'   => $appraiser ? [
                        'id'          => $appraiser->id,
                        'full_name'   => $appraiser->full_name,
                        'designation' => $appraiser->designation?->title,
                    ] : null,
                ],
                'sheet' => $sheet ? [
                    'id'               => $sheet->id,
                    'status'           => $objCount === 0 ? 'not_assigned' : $sheet->status,
                    'objectives_count' => $objCount,
                    'completed_count'  => $sheet->objectives->where('status', 'completed')->count(),
                    'marks_entered'    => $sheet->objectives->whereNotNull('actual_marks')->count(),
                    'objective_score'  => (float) $sheet->objective_score,
                    'attendance_deduction' => (float) $sheet->attendance_deduction,
                    'misconduct_deduction' => (float) $sheet->misconduct_deduction,
                    'final_score'      => (float) $sheet->final_score,
                    'grade'            => $sheet->grade,
                    'hr_reviewed'      => (bool) $sheet->hr_reviewed_at,
                    'submitted_at'     => $sheet->submitted_at,
                    'finalized_at'     => $sheet->finalized_at,
                ] : null,
            ];
        })->values();

        return response()->json(['month' => $month, 'summary' => $summary, 'rows' => $rows]);
    }

    /** GET appraisals/{id} — full sheet (printable scorecard) */
    public function show(Request $request, $id)
    {
        $appraisal = HrAppraisal::with($this->sheetRelations())->findOrFail($id);
        if (!$this->canView($request, $appraisal->employee_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (!$appraisal->evaluator) {
            $appraisal->setRelation('evaluator', $this->defaultAppraiser($appraisal->employee));
        }
        return response()->json($appraisal);
    }

    /** GET appraisals/{id}/revisions — objective change history */
    public function revisions(Request $request, $id)
    {
        $appraisal = HrAppraisal::findOrFail($id);
        if (!$this->canView($request, $appraisal->employee_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(
            HrAppraisalObjectiveRevision::with('changedBy:id,name')
                ->where('appraisal_id', $appraisal->id)
                ->latest()
                ->get()
        );
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Appraiser: Objectives (Objective / Weight / Deadline)
    // ═════════════════════════════════════════════════════════════════════════

    /** PUT appraisals/objectives — body: employee_id, month, objectives[], reason */
    public function saveObjectives(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'employee_id'            => 'required|exists:hr_employees,id',
            'month'                  => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'objectives'             => 'required|array|min:1|max:5',
            'objectives.*.id'        => 'nullable|integer',
            'objectives.*.title'     => 'required|string|max:255',
            'objectives.*.weight'    => 'required|numeric|min:1|max:100',
            'objectives.*.deadline'  => 'nullable|date',
            'reason'                 => 'nullable|string|max:1000',
        ], [
            'objectives.*.title.required'  => 'Every objective needs a title.',
            'objectives.*.weight.required' => 'Every objective needs a weight.',
            'objectives.max'               => 'Maximum 5 objectives allowed.',
        ]);

        $employee = HrEmployee::findOrFail($validated['employee_id']);
        if (!$this->isAppraiserFor($request, $employee)) {
            return response()->json(['message' => 'Only the employee\'s Reporting Manager or HR can set objectives.'], 403);
        }

        $totalWeight = round(array_sum(array_map(fn($o) => (float) $o['weight'], $validated['objectives'])), 2);
        if (abs($totalWeight - 100.0) > 0.01) {
            return response()->json(['message' => "Total weight must equal 100%. Current total: {$totalWeight}%"], 422);
        }

        $appraiserEmp = $this->resolveEmployee($request);

        $sheet = HrAppraisal::firstOrCreate(
            ['employee_id' => $employee->id, 'period_month' => $validated['month']],
            ['status' => HrAppraisal::STATUS_OPEN, 'evaluator_id' => $appraiserEmp?->id ?? $employee->manager_id]
        );

        if ($sheet->status === HrAppraisal::STATUS_FINALIZED) {
            return response()->json(['message' => 'This appraisal is finalized. Reopen it to change objectives.'], 422);
        }

        $existing = $sheet->objectives()->get()->keyBy('id');
        $wasAssigned = $existing->isNotEmpty();

        // ── Build change set ──
        $snapshot = fn($o) => [
            'title'    => $o['title'],
            'weight'   => round((float) $o['weight'], 2),
            'deadline' => !empty($o['deadline']) ? Carbon::parse($o['deadline'])->format('Y-m-d') : null,
        ];

        $changes = [];
        $keptIds = [];
        foreach ($validated['objectives'] as $idx => $incoming) {
            $new = $snapshot($incoming);
            $id = $incoming['id'] ?? null;

            if ($id && $existing->has($id)) {
                $keptIds[] = $id;
                $cur = $existing->get($id);
                $old = [
                    'title'    => $cur->title,
                    'weight'   => round((float) $cur->weight, 2),
                    'deadline' => $cur->deadline?->format('Y-m-d'),
                ];
                if ($old !== $new) {
                    $changes[] = ['action' => 'updated', 'id' => $id, 'old' => $old, 'new' => $new, 'order' => $idx + 1];
                } else {
                    $changes[] = ['action' => 'unchanged', 'id' => $id, 'order' => $idx + 1];
                }
            } else {
                $changes[] = ['action' => 'added', 'id' => null, 'old' => null, 'new' => $new, 'order' => $idx + 1];
            }
        }
        foreach ($existing as $id => $cur) {
            if (!in_array($id, $keptIds, true)) {
                $changes[] = [
                    'action' => 'removed', 'id' => $id, 'order' => null, 'new' => null,
                    'old' => ['title' => $cur->title, 'weight' => round((float) $cur->weight, 2), 'deadline' => $cur->deadline?->format('Y-m-d')],
                ];
            }
        }

        $realChanges = array_values(array_filter($changes, fn($c) => $c['action'] !== 'unchanged'));
        $reason = trim($validated['reason'] ?? '');

        if ($wasAssigned && empty($realChanges)) {
            return $this->sheetResponse($request, $employee, $sheet, 'No changes to save.');
        }
        if ($wasAssigned && $reason === '') {
            return response()->json(['message' => 'Please enter a reason for changing the objectives.'], 422);
        }

        DB::transaction(function () use ($sheet, $changes, $wasAssigned, $reason, $user) {
            foreach ($changes as $c) {
                if ($c['action'] === 'unchanged') {
                    HrAppraisalObjective::where('id', $c['id'])->update(['order_num' => $c['order']]);
                    continue;
                }

                if ($c['action'] === 'added') {
                    $obj = $sheet->objectives()->create([
                        'order_num' => $c['order'],
                        'title'     => $c['new']['title'],
                        'weight'    => $c['new']['weight'],
                        'deadline'  => $c['new']['deadline'],
                        'status'    => 'not_started',
                    ]);
                    $objectiveId = $obj->id;
                } elseif ($c['action'] === 'updated') {
                    $obj = HrAppraisalObjective::find($c['id']);
                    $obj->fill([
                        'order_num' => $c['order'],
                        'title'     => $c['new']['title'],
                        'weight'    => $c['new']['weight'],
                        'deadline'  => $c['new']['deadline'],
                    ]);
                    // Marks above the new weight are no longer valid
                    if ($obj->actual_marks !== null && (float) $obj->actual_marks > (float) $c['new']['weight']) {
                        $obj->actual_marks = null;
                    }
                    $obj->save();
                    $objectiveId = $obj->id;
                } else { // removed
                    HrAppraisalObjective::where('id', $c['id'])->delete();
                    $objectiveId = $c['id'];
                }

                if ($wasAssigned) {
                    HrAppraisalObjectiveRevision::create([
                        'appraisal_id' => $sheet->id,
                        'objective_id' => $objectiveId,
                        'action'       => $c['action'],
                        'old_values'   => $c['old'],
                        'new_values'   => $c['new'],
                        'reason'       => $reason,
                        'changed_by'   => $user->id,
                    ]);
                }
            }

            // Objectives changed after the employee submitted -> back to Open for review
            if ($wasAssigned && $sheet->status === HrAppraisal::STATUS_SUBMITTED) {
                $sheet->status = HrAppraisal::STATUS_OPEN;
                $sheet->submitted_at = null;
            }

            $sheet->recalculateScores();
        });

        $monthLabel = Carbon::parse($sheet->period_month . '-01')->format('F Y');
        $empUser = $this->userForEmployee($employee);
        if ($wasAssigned) {
            $this->notify($empUser, 'Objectives Updated',
                "Your objectives for {$monthLabel} were updated. Reason: {$reason}",
                '/solar/hr/portal/appraisals', $sheet->id, 'warning');
        } else {
            $this->notify($empUser, 'Monthly Objectives Assigned',
                "Your objectives for {$monthLabel} have been assigned. Please review them.",
                '/solar/hr/portal/appraisals', $sheet->id);
        }

        return $this->sheetResponse($request, $employee, $sheet->fresh(),
            $wasAssigned ? 'Objectives updated and change recorded.' : 'Objectives assigned successfully.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Employee: Achievement & Status
    // ═════════════════════════════════════════════════════════════════════════

    /** PUT appraisals/{id}/achievements — body: objectives[{id, achievement, status}], employee_comments, submit */
    public function saveAchievements(Request $request, $id)
    {
        $sheet = HrAppraisal::with(['objectives', 'employee.manager.user'])->findOrFail($id);
        $me = $this->resolveEmployee($request);

        if (!$me || $sheet->employee_id !== $me->id) {
            return response()->json(['message' => 'Only the employee can fill achievements.'], 403);
        }
        if ($sheet->status !== HrAppraisal::STATUS_OPEN) {
            return response()->json(['message' => 'This appraisal has already been submitted.'], 422);
        }

        $validated = $request->validate([
            'objectives'               => 'required|array',
            'objectives.*.id'          => 'required|integer',
            'objectives.*.achievement' => 'nullable|string|max:5000',
            'objectives.*.status'      => 'required|in:' . implode(',', self::OBJ_STATUSES),
            'employee_comments'        => 'nullable|string|max:5000',
            'submit'                   => 'nullable|boolean',
        ]);

        $submit = !empty($validated['submit']);
        $objectives = $sheet->objectives->keyBy('id');

        if ($submit) {
            foreach ($validated['objectives'] as $o) {
                $obj = $objectives->get($o['id']);
                if ($obj && $o['status'] !== 'not_started' && trim($o['achievement'] ?? '') === '') {
                    return response()->json(['message' => "Please describe your achievement for \"{$obj->title}\"."], 422);
                }
            }
        }

        DB::transaction(function () use ($sheet, $validated, $objectives, $submit) {
            foreach ($validated['objectives'] as $o) {
                if (!$objectives->has($o['id'])) continue;
                HrAppraisalObjective::where('id', $o['id'])->update([
                    'achievement' => $o['achievement'] ?? null,
                    'status'      => $o['status'],
                ]);
            }

            $sheet->employee_comments = $validated['employee_comments'] ?? $sheet->employee_comments;
            if ($submit) {
                $sheet->status = HrAppraisal::STATUS_SUBMITTED;
                $sheet->submitted_at = Carbon::now();
            }
            $sheet->save();
        });

        if ($submit) {
            $monthLabel = Carbon::parse($sheet->period_month . '-01')->format('F Y');
            $this->notifyAppraisersForEmployee($sheet->employee, 'Appraisal Submitted',
                "{$sheet->employee->full_name} submitted achievements for {$monthLabel}. Ready for marks.",
                $sheet->id);
        }

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(),
            $submit ? 'Submitted to your Appraiser.' : 'Progress saved.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Appraiser: Actual Marks & Comments
    // ═════════════════════════════════════════════════════════════════════════

    /** PUT appraisals/{id}/marks — body: objectives[{id, actual_marks}], appraiser_comments */
    public function saveMarks(Request $request, $id)
    {
        $sheet = HrAppraisal::with(['objectives', 'employee'])->findOrFail($id);
        if (!$this->isAppraiserFor($request, $sheet->employee)) {
            return response()->json(['message' => 'Only the employee\'s Reporting Manager or HR can enter marks.'], 403);
        }
        if ($sheet->status === HrAppraisal::STATUS_FINALIZED) {
            return response()->json(['message' => 'This appraisal is finalized. Reopen it to change marks.'], 422);
        }

        $validated = $request->validate([
            'objectives'                => 'required|array',
            'objectives.*.id'           => 'required|integer',
            'objectives.*.actual_marks' => 'nullable|numeric|min:0',
            'appraiser_comments'        => 'nullable|string|max:5000',
        ]);

        $objectives = $sheet->objectives->keyBy('id');
        foreach ($validated['objectives'] as $o) {
            $obj = $objectives->get($o['id']);
            if (!$obj) continue;
            if ($o['actual_marks'] !== null && (float) $o['actual_marks'] > (float) $obj->weight) {
                return response()->json([
                    'message' => "Marks for \"{$obj->title}\" cannot exceed its weight (" . (float) $obj->weight . ").",
                ], 422);
            }
        }

        $appraiserEmp = $this->resolveEmployee($request);

        DB::transaction(function () use ($sheet, $validated, $objectives, $appraiserEmp) {
            foreach ($validated['objectives'] as $o) {
                if (!$objectives->has($o['id'])) continue;
                HrAppraisalObjective::where('id', $o['id'])->update([
                    'actual_marks' => $o['actual_marks'] !== null ? round((float) $o['actual_marks'], 2) : null,
                ]);
            }
            $sheet->manager_comments = $validated['appraiser_comments'] ?? null;
            $sheet->manager_evaluated_at = Carbon::now();
            if ($appraiserEmp) {
                $sheet->evaluator_id = $appraiserEmp->id;
            } elseif (!$sheet->evaluator_id && $sheet->employee?->manager_id) {
                $sheet->evaluator_id = $sheet->employee->manager_id;
            }
            $sheet->recalculateScores();
        });

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(), 'Marks saved.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  HR: Attendance & Misconduct
    // ═════════════════════════════════════════════════════════════════════════

    /** PUT appraisals/{id}/deductions */
    public function saveDeductions(Request $request, $id)
    {
        $user = $request->user();
        $sheet = HrAppraisal::with(['objectives', 'employee'])->findOrFail($id);
        $perms = $this->permissionsFor($request, $sheet, $sheet->employee);

        if (!$perms['is_hr']) {
            return response()->json(['message' => 'Only HR can enter attendance & misconduct.'], 403);
        }
        if (!$perms['can_edit_deductions']) {
            return response()->json(['message' => 'Deductions cannot be changed on this appraisal.'], 422);
        }

        $validated = $request->validate([
            'attendance_deduction'       => 'required|numeric|min:0|max:10',
            'attendance_deduction_notes' => 'nullable|string|max:2000',
            'misconduct_deduction'       => 'required|numeric|min:0|max:30',
            'misconduct_deduction_notes' => 'nullable|string|max:2000',
        ]);

        $sheet->fill($validated);
        $sheet->misconduct_severity = match (true) {
            (float) $validated['misconduct_deduction'] <= 0  => 'none',
            (float) $validated['misconduct_deduction'] <= 10 => 'minor',
            (float) $validated['misconduct_deduction'] < 20  => 'moderate',
            default                                         => 'serious',
        };
        $sheet->hr_reviewed_by = $user->id;
        $sheet->hr_reviewed_at = Carbon::now();
        $sheet->recalculateScores();

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(), 'Attendance & misconduct saved.');
    }

    /** GET appraisals/{id}/suggest-attendance — HR helper based on clock records */
    public function suggestAttendanceDeduction(Request $request, $id)
    {
        $user = $request->user();
        if (!self::isHr($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appraisal = HrAppraisal::findOrFail($id);
        $month = $appraisal->period_month;
        $empId = $appraisal->employee_id;

        $attendances = HrAttendance::where('employee_id', $empId)
            ->where('date', 'like', "{$month}%")
            ->get();

        $lateCount = $attendances->where('status', 'late')->count();
        $absentCount = $attendances->where('status', 'absent')->count();
        $unclosedCount = $attendances->where('is_auto_clock_out', true)->count();

        $shortLeaveHours = HrLeave::where('employee_id', $empId)
            ->where('status', 'approved')
            ->where('leave_type', 'short')
            ->where('start_date', 'like', "{$month}%")
            ->sum('hours_count');

        // 0.5 per late, 2.0 per absence, 0.5 per auto clock-out, 0.5 per short-leave hour above 4h. Cap 10.
        $calc = ($lateCount * 0.5) + ($absentCount * 2.0) + ($unclosedCount * 0.5) + (max(0, $shortLeaveHours - 4) * 0.5);
        $suggested = round(min(10.0, max(0.0, $calc)), 1);

        $parts = [];
        if ($lateCount > 0) $parts[] = "{$lateCount} late arrival(s)";
        if ($absentCount > 0) $parts[] = "{$absentCount} absent day(s)";
        if ($unclosedCount > 0) $parts[] = "{$unclosedCount} missed clock-out(s)";
        if ($shortLeaveHours > 4) $parts[] = 'Excess short leave (' . ($shortLeaveHours - 4) . 'h over limit)';

        return response()->json([
            'suggested_deduction' => $suggested,
            'suggested_notes'     => empty($parts) ? "Clean attendance record for {$month}." : implode(', ', $parts),
        ]);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Appraiser: Finalize / Return / Reopen
    // ═════════════════════════════════════════════════════════════════════════

    public function finalize(Request $request, $id)
    {
        $user = $request->user();
        $sheet = HrAppraisal::with(['objectives', 'employee'])->findOrFail($id);
        $perms = $this->permissionsFor($request, $sheet, $sheet->employee);

        if (!$perms['is_appraiser']) {
            return response()->json(['message' => 'Only the employee\'s Reporting Manager or HR can finalize.'], 403);
        }
        if (!$perms['can_finalize']) {
            return response()->json(['message' => 'Enter Actual Marks for every objective before finalizing.'], 422);
        }

        $appraiserEmp = $this->resolveEmployee($request);
        if (!$sheet->evaluator_id && $appraiserEmp) {
            $sheet->evaluator_id = $appraiserEmp->id;
        }

        $sheet->status = HrAppraisal::STATUS_FINALIZED;
        $sheet->finalized_by = $user->id;
        $sheet->finalized_at = Carbon::now();
        $sheet->recalculateScores();

        $monthLabel = Carbon::parse($sheet->period_month . '-01')->format('F Y');
        $this->notify($this->userForEmployee($sheet->employee),
            "Monthly Performance Grade: {$sheet->grade}",
            "Your appraisal for {$monthLabel} is finalized. Total: " . (float) $sheet->final_score . " ({$sheet->performance_level}).",
            '/solar/hr/portal/appraisals', $sheet->id,
            in_array($sheet->grade, ['S1', 'S2']) ? 'success' : 'info');

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(), "Appraisal finalized — Grade {$sheet->grade}.");
    }

    public function returnToEmployee(Request $request, $id)
    {
        $sheet = HrAppraisal::with(['objectives', 'employee'])->findOrFail($id);
        $perms = $this->permissionsFor($request, $sheet, $sheet->employee);
        if (!$perms['can_return']) {
            return response()->json(['message' => 'This appraisal cannot be returned.'], 422);
        }

        $note = trim((string) $request->input('note', ''));
        $sheet->update(['status' => HrAppraisal::STATUS_OPEN, 'submitted_at' => null]);

        $monthLabel = Carbon::parse($sheet->period_month . '-01')->format('F Y');
        $this->notify($this->userForEmployee($sheet->employee), 'Appraisal Returned',
            "Your {$monthLabel} appraisal was returned for updates." . ($note ? " Note: {$note}" : ''),
            '/solar/hr/portal/appraisals', $sheet->id, 'warning');

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(), 'Returned to employee.');
    }

    public function reopen(Request $request, $id)
    {
        $sheet = HrAppraisal::with(['objectives', 'employee'])->findOrFail($id);
        $perms = $this->permissionsFor($request, $sheet, $sheet->employee);
        if (!$perms['can_reopen']) {
            return response()->json(['message' => 'Only a finalized appraisal can be reopened.'], 422);
        }

        $sheet->update([
            'status'       => HrAppraisal::STATUS_SUBMITTED,
            'finalized_by' => null,
            'finalized_at' => null,
        ]);

        return $this->sheetResponse($request, $sheet->employee, $sheet->fresh(), 'Appraisal reopened for changes.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Trend & Reminders
    // ═════════════════════════════════════════════════════════════════════════

    /** GET appraisals/employee/{employeeId}/trend — last 6 finalized months */
    public function employeeTrend(Request $request, $employeeId)
    {
        $targetEmp = HrEmployee::with(['department', 'designation'])->findOrFail($employeeId);
        if (!$this->canView($request, $targetEmp->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appraisals = HrAppraisal::with(['objectives', 'evaluator.designation'])
            ->where('employee_id', $employeeId)
            ->where('status', HrAppraisal::STATUS_FINALIZED)
            ->orderBy('period_month', 'desc')
            ->limit(6)
            ->get()
            ->reverse()
            ->values();

        $scores = $appraisals->pluck('final_score')->map(fn($s) => (float) $s)->all();
        $avgScore = count($scores) > 0 ? round(array_sum($scores) / count($scores), 1) : null;

        $trajectory = 'neutral';
        $delta = 0;
        if (count($scores) >= 2) {
            $delta = round(end($scores) - $scores[0], 1);
            $trajectory = $delta >= 2.0 ? 'improving' : ($delta <= -2.0 ? 'declining' : 'stable');
        }

        return response()->json([
            'employee'   => [
                'id'          => $targetEmp->id,
                'name'        => $targetEmp->full_name,
                'employee_id' => $targetEmp->employee_id,
                'department'  => $targetEmp->department?->name,
                'designation' => $targetEmp->designation?->title,
            ],
            'trend'      => $appraisals,
            'scores'     => $scores,
            'average'    => $avgScore,
            'delta'      => $delta,
            'trajectory' => $trajectory,
        ]);
    }

    /** POST appraisals/send-reminder — type: employee | manager | appraiser | objectives */
    public function triggerReminders(Request $request)
    {
        $user = $request->user();
        $me = $this->resolveEmployee($request);
        if (!self::isHr($user) && !$this->isReportingManager($me)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $type = $request->input('type', 'employee');
        $month = $request->input('month');

        $params = ['--type' => $type];
        if ($month) {
            $params['--month'] = $month;
        }

        Artisan::call('hr:remind-mbo-appraisal', $params);

        return response()->json([
            'message' => 'Reminder notifications dispatched successfully.',
            'output'  => trim(Artisan::output()),
        ]);
    }

    /** POST appraisals/{id}/remind-appraiser — HR sends targeted reminder to the employee's Reporting Manager / Appraiser */
    public function remindAppraiserForSheet(Request $request, int $id)
    {
        $user = $request->user();
        if (!self::isHr($user)) {
            return response()->json(['message' => 'Only HR administrators can send this reminder.'], 403);
        }

        $sheet = HrAppraisal::with(['employee.manager.user', 'evaluator.user'])->findOrFail($id);
        $empName = $sheet->employee?->full_name ?? 'Employee';
        $month = $sheet->period_month;
        $monthName = Carbon::parse($month . '-01')->format('F Y');

        $appraiserEmp = $sheet->employee?->manager ?? $sheet->evaluator;
        $targetUser = $this->userForEmployee($appraiserEmp);

        if ($targetUser) {
            $this->notify(
                $targetUser,
                "🎯 HR Reminder: Evaluation Pending for {$empName}",
                "HR Reminder: {$empName} has submitted their MBO sheet for {$monthName}. Please review achievements and assign marks.",
                "/solar/hr/portal/appraisals?tab=team&employee_id={$sheet->employee_id}",
                "mbo-nudge-{$sheet->id}-" . time(),
                'warning'
            );
            $appraiserName = $appraiserEmp?->full_name ?? $targetUser->name;
            return response()->json([
                'message' => "Reminder notification sent to {$appraiserName} (Reporting Manager) for {$empName}.",
            ]);
        }

        return response()->json([
            'message' => "No Reporting Manager account found for {$empName}. Please assign a Reporting Manager in Employee Profile.",
        ], 422);
    }
}
