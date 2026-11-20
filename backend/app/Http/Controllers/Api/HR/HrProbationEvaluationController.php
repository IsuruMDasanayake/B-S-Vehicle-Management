<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployee;
use App\Models\HrProbationEvaluation;
use App\Models\HrProbationEvaluatorForm;
use App\Models\User;
use App\Notifications\HrNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class HrProbationEvaluationController extends Controller
{
    public const DEFAULT_GM_EMAIL  = 'hasintha@circlegroup.lk';
    public const DEFAULT_CEO_EMAIL = 'eranda@circlegroup.lk';
    public const PASSING_THRESHOLD = 80.00;

    // ─────────────────────────────────────────────────────────────────────────
    // Permissions & Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function isSuperAdmin(?User $user): bool
    {
        if (!$user) return false;
        return $user->role === 'super_admin'
            || (method_exists($user, 'hasRole') && $user->hasRole('super_admin'));
    }

    private function isHr(?User $user): bool
    {
        if (!$user) return false;
        return $this->isSuperAdmin($user)
            || $user->role === 'solar_hr_admin'
            || (method_exists($user, 'hasRole') && $user->hasRole('solar_hr_admin'));
    }

    private function isCeo(?User $user): bool
    {
        if (!$user) return false;
        if (strtolower(trim($user->email ?? '')) === self::DEFAULT_CEO_EMAIL) return true;
        return HrSettingController::isApprovalManager($user) && str_contains(strtolower($user->name ?? ''), 'ceo');
    }

    private function isGm(?User $user): bool
    {
        if (!$user) return false;
        if (strtolower(trim($user->email ?? '')) === self::DEFAULT_GM_EMAIL) return true;
        return HrSettingController::isApprovalManager($user);
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

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Expiring Employees (For HR Initiation Dashboard)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List employees currently on probation, especially those nearing expiry (within 30 days).
     */
    public function expiringEmployees(Request $request)
    {
        if (!$this->isHr($request->user())) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $today = Carbon::today();

        // 1. Find completed confirmations so we don't list already confirmed employees
        $completedConfirmations = HrProbationEvaluation::where('status', 'completed')
            ->where('ceo_decision', 'confirm')
            ->latest('id')
            ->get()
            ->keyBy('employee_id');

        // 2. Query employees: status = 'probation' OR (has probation_end_date and status IN ('active', 'probation') not older than 180 days)
        $employees = HrEmployee::with(['department', 'designation', 'manager'])
            ->where(function ($q) use ($today) {
                $q->where('status', 'probation')
                  ->orWhere(function ($q2) use ($today) {
                      $q2->whereNotNull('probation_end_date')
                         ->whereIn('status', ['active', 'probation'])
                         ->where('probation_end_date', '>=', $today->copy()->subDays(180));
                  });
            })
            ->whereNotIn('status', ['resigned', 'terminated'])
            ->orderBy('probation_end_date', 'asc')
            ->get()
            ->reject(function ($emp) use ($completedConfirmations) {
                $conf = $completedConfirmations->get($emp->id);
                if (!$conf) return false;
                // If confirmed eval exists and emp's probation_end_date has not been extended beyond it, they are confirmed
                if ($emp->probation_end_date && $conf->probation_end_date) {
                    return Carbon::parse($conf->probation_end_date)->gte(Carbon::parse($emp->probation_end_date));
                }
                return true;
            })
            ->values();

        $activeEvals = HrProbationEvaluation::whereIn('employee_id', $employees->pluck('id'))
            ->whereIn('status', ['initiated', 'in_progress', 'pending_hr_review', 'pending_ceo_approval'])
            ->get()
            ->keyBy('employee_id');

        $data = $employees->map(function ($emp) use ($today, $activeEvals) {
            $probEnd = $emp->probation_end_date ? Carbon::parse($emp->probation_end_date) : null;
            $daysRemaining = $probEnd ? (int)$today->diffInDays($probEnd, false) : null;
            $activeEval = $activeEvals->get($emp->id);

            return [
                'id'                 => $emp->id,
                'employee_id'        => $emp->employee_id,
                'full_name'          => $emp->full_name,
                'photo_url'          => $emp->photo_url,
                'department'         => $emp->department?->name,
                'designation'        => $emp->designation?->name,
                'manager_id'         => $emp->manager_id,
                'manager_name'       => $emp->manager?->full_name,
                'joined_date'        => $emp->joined_date?->toDateString(),
                'probation_end_date' => $emp->probation_end_date?->toDateString(),
                'days_remaining'     => $daysRemaining,
                'is_expiring_soon'   => $daysRemaining !== null && $daysRemaining >= -14 && $daysRemaining <= 30,
                'has_active_eval'    => (bool)$activeEval,
                'active_eval_id'     => $activeEval?->id,
                'active_eval_status' => $activeEval?->status,
            ];
        });

        // Default GM and CEO suggestions for modal prefill
        $defaultGm  = User::where('email', self::DEFAULT_GM_EMAIL)->first(['id', 'name', 'email']);
        $defaultCeo = User::where('email', self::DEFAULT_CEO_EMAIL)->first(['id', 'name', 'email']);

        return response()->json([
            'data'        => $data,
            'default_gm'  => $defaultGm,
            'default_ceo' => $defaultCeo,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Evaluations List (HR Admin & Management View)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * List all probation evaluations with statistics.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$this->isHr($user) && !$this->isCeo($user) && !$this->isGm($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = HrProbationEvaluation::with([
            'employee.department',
            'employee.designation',
            'lineManager',
            'gmUser',
            'ceoUser',
            'hrUser',
            'forms',
        ])->latest('id');

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->whereIn('status', ['initiated', 'in_progress']);
            } else {
                $query->where('status', $request->status);
            }
        }

        // Search Filter
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->whereHas('employee', function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                  ->orWhere('employee_id', 'like', "%{$s}%");
            });
        }

        $evaluations = $query->paginate(20);

        // Compute summary counts
        $baseQuery = HrProbationEvaluation::query();
        $counts = [
            'all'                  => (clone $baseQuery)->count(),
            'active'               => (clone $baseQuery)->whereIn('status', ['initiated', 'in_progress'])->count(),
            'pending_hr_review'    => (clone $baseQuery)->where('status', 'pending_hr_review')->count(),
            'pending_ceo_approval' => (clone $baseQuery)->where('status', 'pending_ceo_approval')->count(),
            'completed'            => (clone $baseQuery)->where('status', 'completed')->count(),
        ];

        return response()->json([
            'data'   => $evaluations,
            'counts' => $counts,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Initiate Evaluation (HR Trigger)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * HR initiates 270° Probation Evaluation for an employee.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$this->isHr($user)) {
            return response()->json(['message' => 'Only HR Administrators can initiate probation evaluations.'], 403);
        }

        $request->validate([
            'employee_id'         => 'required|exists:hr_employees,id',
            'submission_deadline' => 'required|date',
            'line_manager_id'     => 'nullable|exists:hr_employees,id',
            'gm_user_id'          => 'nullable|exists:users,id',
            'ceo_user_id'         => 'nullable|exists:users,id',
        ]);

        $employee = HrEmployee::with('manager.user')->findOrFail($request->employee_id);

        // Check if an active evaluation already exists
        $existing = HrProbationEvaluation::where('employee_id', $employee->id)
            ->whereIn('status', ['initiated', 'in_progress', 'pending_hr_review', 'pending_ceo_approval'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'An active probation evaluation is already in progress for this employee.'], 422);
        }

        // Resolve Line Manager
        $lineManagerId = $request->line_manager_id ?? $employee->manager_id;
        $lineManager = $lineManagerId ? HrEmployee::with('user')->find($lineManagerId) : null;

        // Resolve GM User (default to Hasintha)
        $gmUserId = $request->gm_user_id;
        if (!$gmUserId) {
            $defaultGm = User::where('email', self::DEFAULT_GM_EMAIL)->first();
            $gmUserId = $defaultGm?->id;
        }

        // Resolve CEO User (default to Eranda)
        $ceoUserId = $request->ceo_user_id;
        if (!$ceoUserId) {
            $defaultCeo = User::where('email', self::DEFAULT_CEO_EMAIL)->first();
            $ceoUserId = $defaultCeo?->id;
        }

        DB::beginTransaction();
        try {
            $evaluation = HrProbationEvaluation::create([
                'employee_id'         => $employee->id,
                'probation_end_date'  => $employee->probation_end_date ?? Carbon::today()->addDays(14)->toDateString(),
                'initiation_date'     => Carbon::today()->toDateString(),
                'submission_deadline' => $request->submission_deadline,
                'status'              => 'initiated',
                'line_manager_id'     => $lineManager?->id,
                'gm_user_id'          => $gmUserId,
                'ceo_user_id'         => $ceoUserId,
                'hr_user_id'          => $user->id,
            ]);

            // Ensure employee status reflects probation
            if ($employee->status !== 'probation') {
                $employee->update(['status' => 'probation']);
            }

            // Create Standard Evaluator Forms:
            // 1. Employee Self-Evaluation Form
            HrProbationEvaluatorForm::create([
                'probation_evaluation_id' => $evaluation->id,
                'evaluator_role'          => 'self',
                'evaluator_employee_id'   => $employee->id,
                'evaluator_user_id'       => $employee->user_id,
                'evaluator_name'          => $employee->full_name,
                'status'                  => 'pending',
            ]);

            // 2. Line Manager Form
            if ($lineManager) {
                HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $evaluation->id,
                    'evaluator_role'          => 'line_manager',
                    'evaluator_employee_id'   => $lineManager->id,
                    'evaluator_user_id'       => $lineManager->user_id,
                    'evaluator_name'          => $lineManager->full_name,
                    'status'                  => 'pending',
                ]);
            }

            // 3. GM / Project Director Form
            if ($gmUserId) {
                $gmUser = User::find($gmUserId);
                HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $evaluation->id,
                    'evaluator_role'          => 'gm_pd',
                    'evaluator_user_id'       => $gmUserId,
                    'evaluator_name'          => $gmUser?->name ?? 'General Manager / Project Director',
                    'status'                  => 'pending',
                ]);
            }

            // 4. CEO Form
            if ($ceoUserId) {
                $ceoUser = User::find($ceoUserId);
                HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $evaluation->id,
                    'evaluator_role'          => 'ceo',
                    'evaluator_user_id'       => $ceoUserId,
                    'evaluator_name'          => $ceoUser?->name ?? 'Chief Executive Officer',
                    'status'                  => 'pending',
                ]);
            }

            // 5. HR Form
            HrProbationEvaluatorForm::create([
                'probation_evaluation_id' => $evaluation->id,
                'evaluator_role'          => 'hr',
                'evaluator_user_id'       => $user->id,
                'evaluator_name'          => $user->name . ' (HR)',
                'status'                  => 'pending',
            ]);

            DB::commit();

            // Send Notifications
            $deadlineStr = Carbon::parse($request->submission_deadline)->format('d M Y');

            // Notify Probationary Employee
            if ($employee->user) {
                $employee->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'compliance',
                    'severity'   => 'info',
                    'title'      => 'Probation Self-Evaluation Initiated',
                    'message'    => "Your 270° Probation Evaluation has been initiated. Please complete your Self-Evaluation and nominate 2–3 peers by {$deadlineStr}.",
                    'link'       => '/solar/hr/portal/probation',
                    'source_id'  => $evaluation->id,
                ]));
            }

            // Notify Line Manager
            if ($lineManager?->user) {
                $lineManager->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'compliance',
                    'severity'   => 'info',
                    'title'      => 'Probation Evaluation Request',
                    'message'    => "You have been assigned to evaluate {$employee->full_name} for employment confirmation. Submission deadline: {$deadlineStr}.",
                    'link'       => '/solar/hr/portal/probation',
                    'source_id'  => $evaluation->id,
                ]));
            }

            return response()->json([
                'message'    => '270° Probation Evaluation initiated successfully.',
                'evaluation' => $evaluation->load(['employee', 'forms']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Probation initiation error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to initiate probation evaluation: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Show Single Evaluation (With Blind Evaluation Access Control)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Show evaluation details.
     * Evaluators CANNOT see each other's score cards until finalized.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $evaluation = HrProbationEvaluation::with([
            'employee.department',
            'employee.designation',
            'lineManager',
            'gmUser',
            'ceoUser',
            'hrUser',
            'hrReviewer',
            'ceoApprover',
            'forms.evaluatorEmployee',
            'forms.evaluatorUser',
        ])->findOrFail($id);

        $isHrUser  = $this->isHr($user);
        $isCeoUser = $this->isCeo($user) || $evaluation->ceo_user_id === $user->id;
        $isGmUser  = $this->isGm($user)  || $evaluation->gm_user_id === $user->id;

        $meEmp = $this->resolveEmployee($request);
        $isProbationer = ($meEmp && $meEmp->id === $evaluation->employee_id) || ($evaluation->employee?->user_id === $user->id);

        // Security rule: "Score cannot see evaluator each other"
        // HR Admin and CEO always see full scores for summary review.
        // Once evaluation is completed, the employee sees the full summary transparently ("nothing to hide").
        // Otherwise, non-HR/non-CEO evaluators only see their OWN form.
        $canSeeFullSummary = $isHrUser || $isCeoUser || ($evaluation->status === 'completed' && $isProbationer);

        $sanitizedForms = $evaluation->forms->map(function ($f) use ($user, $canSeeFullSummary) {
            $isMyForm = ($f->evaluator_user_id === $user->id);

            if ($canSeeFullSummary || $isMyForm) {
                return $f;
            }

            // Mask scores and ratings from other evaluators
            $masked = clone $f;
            $masked->ratings = null;
            $masked->form_score = null;
            $masked->general_comments = null;
            $masked->achievements_evidence = null;
            $masked->challenges_support = null;
            $masked->recommendation = null;
            return $masked;
        });

        $evalArray = $evaluation->toArray();
        $evalArray['forms'] = $sanitizedForms;
        $evalArray['can_see_full_summary'] = $canSeeFullSummary;

        return response()->json($evalArray);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Employee Portal: My Evaluations & Tasks
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get probation tasks for logged-in user:
     * - Active evaluation where user is the probationer
     * - Evaluation forms where user is assigned as evaluator (LM, GM, CEO, Peer, HR)
     */
    public function myEvaluations(Request $request)
    {
        $user  = $request->user();
        $meEmp = $this->resolveEmployee($request);

        // 1. Where I am the probationer
        $myProbationEvaluation = null;
        if ($meEmp) {
            $myProbationEvaluation = HrProbationEvaluation::with([
                'employee.department',
                'employee.designation',
                'forms',
            ])
            ->where('employee_id', $meEmp->id)
            ->latest('id')
            ->first();
        }

        // 2. Forms assigned to me to evaluate others (exclude self-evaluation, which has its own top section)
        $pendingFormsQuery = HrProbationEvaluatorForm::with([
            'evaluation.employee.department',
            'evaluation.employee.designation',
        ])
        ->where('evaluator_role', '!=', 'self')
        ->where('status', '!=', 'submitted')
        ->where(function ($q) use ($user, $meEmp) {
            $q->where('evaluator_user_id', $user->id);
            if ($meEmp) {
                $q->orWhere('evaluator_employee_id', $meEmp->id);
            }
        })
        // For peers, form only unlocks once approved by HR
        ->where(function ($q) {
            $q->where('evaluator_role', '!=', 'peer')
              ->orWhere('peer_approval_status', 'approved');
        });

        $pendingForms = $pendingFormsQuery->get();

        // 3. Completed forms I submitted for others
        $completedForms = HrProbationEvaluatorForm::with([
            'evaluation.employee.department',
            'evaluation.employee.designation',
        ])
        ->where('evaluator_role', '!=', 'self')
        ->where('status', 'submitted')
        ->where(function ($q) use ($user, $meEmp) {
            $q->where('evaluator_user_id', $user->id);
            if ($meEmp) {
                $q->orWhere('evaluator_employee_id', $meEmp->id);
            }
        })
        ->get();

        // 4. CEO Pending Decision dossiers (for the assigned CEO or CEO / Super Admin)
        $isAssignedCeo = HrProbationEvaluation::where('ceo_user_id', $user->id)->exists();
        $isCeo = $this->isCeo($user) || $this->isSuperAdmin($user) || $isAssignedCeo;
        $ceoPendingDecisions = [];
        if ($isCeo) {
            $ceoPendingDecisions = HrProbationEvaluation::with([
                'employee.department',
                'employee.designation',
                'lineManager',
                'gmUser',
                'ceoUser',
                'hrUser',
                'forms',
            ])
            ->where(function ($q) use ($user) {
                $q->where('ceo_user_id', $user->id)
                  ->orWhereNull('ceo_user_id');
            })
            ->where('status', '!=', 'completed')
            ->latest('id')
            ->get();
        }

        return response()->json([
            'my_probation_evaluation' => $myProbationEvaluation,
            'pending_forms'           => $pendingForms,
            'completed_forms'         => $completedForms,
            'ceo_pending_decisions'   => $ceoPendingDecisions,
            'is_ceo'                  => $isCeo,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Submit Self-Evaluation & Nominate Peers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Probationary employee submits self-evaluation, peer nominations, and presentation request.
     */
    public function submitSelfEvaluation(Request $request, $id)
    {
        $user = $request->user();
        $meEmp = $this->resolveEmployee($request);

        $evaluation = HrProbationEvaluation::findOrFail($id);

        if (!$meEmp || $meEmp->id !== $evaluation->employee_id) {
            return response()->json(['message' => 'Unauthorized. Only the probationary employee can submit self-evaluation.'], 403);
        }

        $selfForm = HrProbationEvaluatorForm::where('probation_evaluation_id', $evaluation->id)
            ->where('evaluator_role', 'self')
            ->firstOrFail();

        if ($selfForm->status === 'submitted') {
            return response()->json(['message' => 'Self-evaluation has already been submitted and locked.'], 422);
        }

        $request->validate([
            'ratings'                => 'required|array|size:5',
            'ratings.*.rating'       => 'required|integer|between:1,5',
            'achievements_evidence'  => 'nullable|string|max:5000',
            'challenges_support'     => 'nullable|string|max:5000',
            'presentation_requested' => 'nullable|boolean',
            'presentation_notes'     => 'nullable|string|max:2000',
            'peer_employee_ids'      => 'required|array|min:2|max:3',
            'peer_employee_ids.*'    => 'required|exists:hr_employees,id|different:line_manager_id',
        ]);

        // Ensure peer IDs do not contain employee themselves or their manager
        $peerIds = array_unique($request->peer_employee_ids);
        if (in_array($meEmp->id, $peerIds)) {
            return response()->json(['message' => 'You cannot nominate yourself as a peer evaluator.'], 422);
        }
        if ($evaluation->line_manager_id && in_array($evaluation->line_manager_id, $peerIds)) {
            return response()->json(['message' => 'You cannot nominate your reporting Line Manager as a peer evaluator.'], 422);
        }

        DB::beginTransaction();
        try {
            // Compute score
            $score = $selfForm->computeFormScore($request->ratings);

            $selfForm->update([
                'ratings'               => $request->ratings,
                'form_score'            => $score,
                'achievements_evidence' => $request->achievements_evidence,
                'challenges_support'    => $request->challenges_support,
                'status'                => 'submitted',
                'submitted_at'          => Carbon::now(),
            ]);

            // Update presentation request on evaluation
            $presReq = (bool)$request->presentation_requested;
            $evaluation->update([
                'presentation_requested' => $presReq,
                'presentation_status'    => $presReq ? 'requested' : 'none',
                'presentation_notes'     => $presReq ? $request->presentation_notes : null,
                'status'                 => 'in_progress',
            ]);

            // Remove any previous peer forms not yet approved
            HrProbationEvaluatorForm::where('probation_evaluation_id', $evaluation->id)
                ->where('evaluator_role', 'peer')
                ->where('peer_approval_status', 'pending_hr')
                ->delete();

            // Create peer forms with status 'pending_hr'
            $peers = HrEmployee::with('user')->whereIn('id', $peerIds)->get();
            $index = 1;
            foreach ($peers as $peer) {
                HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $evaluation->id,
                    'evaluator_role'          => 'peer',
                    'evaluator_employee_id'   => $peer->id,
                    'evaluator_user_id'       => $peer->user_id,
                    'evaluator_name'          => $peer->full_name,
                    'peer_index'              => $index++,
                    'peer_approval_status'    => 'pending_hr',
                    'status'                  => 'pending',
                ]);
            }

            $evaluation->recalculateScores();

            DB::commit();

            // Notify HR that self-evaluation is submitted and peers require approval
            $hrUsers = User::where(function ($q) {
                $q->whereIn('role', ['super_admin', 'solar_hr_admin'])
                  ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['super_admin', 'solar_hr_admin']));
            })->get();

            Notification::send($hrUsers, new HrNotification([
                'division'   => 'hr',
                'category'   => 'compliance',
                'severity'   => 'info',
                'title'      => 'Self-Evaluation Submitted & Peers Nominated',
                'message'    => "{$meEmp->full_name} submitted their probation Self-Evaluation and nominated " . count($peerIds) . " peers for your approval.",
                'link'       => '/solar/hr/admin/probation',
                'source_id'  => $evaluation->id,
            ]));

            return response()->json([
                'message'   => 'Self-evaluation submitted successfully! Nominated peers have been sent to HR for verification.',
                'self_form' => $selfForm->fresh(),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Self evaluation submission error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to submit self-evaluation: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. HR Review & Approval of Nominated Peers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * HR approves or updates nominated peers.
     */
    public function reviewPeers(Request $request, $id)
    {
        $user = $request->user();
        if (!$this->isHr($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'peer_employee_ids'   => 'required|array|min:2|max:3',
            'peer_employee_ids.*' => 'required|exists:hr_employees,id',
        ]);

        $evaluation = HrProbationEvaluation::with('employee')->findOrFail($id);
        $peerIds = array_unique($request->peer_employee_ids);

        DB::beginTransaction();
        try {
            // Delete existing peer forms that are not yet submitted
            HrProbationEvaluatorForm::where('probation_evaluation_id', $evaluation->id)
                ->where('evaluator_role', 'peer')
                ->where('status', '!=', 'submitted')
                ->delete();

            $peers = HrEmployee::with('user')->whereIn('id', $peerIds)->get();
            $index = 1;

            foreach ($peers as $peer) {
                $form = HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $evaluation->id,
                    'evaluator_role'          => 'peer',
                    'evaluator_employee_id'   => $peer->id,
                    'evaluator_user_id'       => $peer->user_id,
                    'evaluator_name'          => $peer->full_name,
                    'peer_index'              => $index++,
                    'peer_approval_status'    => 'approved',
                    'status'                  => 'pending',
                ]);

                // Notify approved peer
                if ($peer->user) {
                    $peer->user->notify(new HrNotification([
                        'division'   => 'hr',
                        'category'   => 'compliance',
                        'severity'   => 'info',
                        'title'      => 'Probation Peer Evaluation Request',
                        'message'    => "You have been approved as a peer evaluator for {$evaluation->employee->full_name}'s probation evaluation.",
                        'link'       => '/solar/hr/portal/probation',
                        'source_id'  => $evaluation->id,
                    ]));
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Peer evaluators approved and notified successfully.',
                'forms'   => $evaluation->fresh('forms')->forms,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Peer approval error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to approve peers: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Schedule / Manage Presentation
    // ─────────────────────────────────────────────────────────────────────────

    public function schedulePresentation(Request $request, $id)
    {
        $user = $request->user();
        if (!$this->isHr($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'status'        => 'required|in:scheduled,declined',
            'scheduled_at'  => 'required_if:status,scheduled|nullable|date',
            'notes'         => 'nullable|string|max:1000',
        ]);

        $evaluation = HrProbationEvaluation::with('employee.user')->findOrFail($id);

        $evaluation->update([
            'presentation_status'       => $request->status,
            'presentation_scheduled_at' => $request->status === 'scheduled' ? $request->scheduled_at : null,
            'presentation_notes'        => $request->notes,
        ]);

        if ($evaluation->employee?->user) {
            $timeStr = $request->scheduled_at ? Carbon::parse($request->scheduled_at)->format('d M Y, h:i A') : '';
            $msg = $request->status === 'scheduled'
                ? "Your 10-minute probation presentation has been scheduled for {$timeStr}."
                : "Your presentation request has been noted (formal presentation not required for this cycle).";

            $evaluation->employee->user->notify(new HrNotification([
                'division'   => 'hr',
                'category'   => 'compliance',
                'severity'   => 'info',
                'title'      => 'Probation Presentation Update',
                'message'    => $msg,
                'link'       => '/solar/hr/portal/probation',
                'source_id'  => $evaluation->id,
            ]));
        }

        return response()->json([
            'message'    => 'Presentation status updated successfully.',
            'evaluation' => $evaluation,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Get Single Form to Fill
    // ─────────────────────────────────────────────────────────────────────────

    public function getForm(Request $request, $formId)
    {
        $user = $request->user();
        $meEmp = $this->resolveEmployee($request);

        $form = HrProbationEvaluatorForm::with([
            'evaluation.employee.department',
            'evaluation.employee.designation',
            'evaluation.lineManager',
        ])->findOrFail($formId);

        // Security check
        $isMyForm = ($form->evaluator_user_id === $user->id)
                 || ($meEmp && $form->evaluator_employee_id === $meEmp->id);
        $isHrUser = $this->isHr($user);

        if (!$isMyForm && !$isHrUser) {
            return response()->json(['message' => 'Unauthorized to view this evaluation form.'], 403);
        }

        return response()->json($form);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Save Form Draft
    // ─────────────────────────────────────────────────────────────────────────

    public function saveDraft(Request $request, $formId)
    {
        $user = $request->user();
        $meEmp = $this->resolveEmployee($request);

        $form = HrProbationEvaluatorForm::findOrFail($formId);

        $isMyForm = ($form->evaluator_user_id === $user->id)
                 || ($meEmp && $form->evaluator_employee_id === $meEmp->id);
        if (!$isMyForm && !$this->isHr($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($form->status === 'submitted') {
            return response()->json(['message' => 'This form is already submitted and locked.'], 422);
        }

        $form->update([
            'ratings'                 => $request->ratings,
            'recommendation'          => $request->recommendation,
            'proposed_extension_date' => $request->proposed_extension_date,
            'general_comments'        => $request->general_comments,
            'achievements_evidence'   => $request->achievements_evidence,
            'challenges_support'      => $request->challenges_support,
            'status'                  => 'draft',
        ]);

        return response()->json([
            'message' => 'Draft saved successfully.',
            'form'    => $form,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Submit Evaluator Form
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Submit and lock standardized evaluation form (LM, GM, CEO, Peer, HR).
     */
    public function submitForm(Request $request, $formId)
    {
        $user = $request->user();
        $meEmp = $this->resolveEmployee($request);

        $form = HrProbationEvaluatorForm::with('evaluation.employee')->findOrFail($formId);

        $isMyForm = ($form->evaluator_user_id === $user->id)
                 || ($meEmp && $form->evaluator_employee_id === $meEmp->id);
        if (!$isMyForm && !$this->isHr($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        if ($form->status === 'submitted') {
            return response()->json(['message' => 'This form has already been submitted and locked.'], 422);
        }

        // Validate ratings (7 criteria for evaluators)
        $expectedCount = $form->evaluator_role === 'self' ? 5 : 7;
        $request->validate([
            'ratings'                 => "required|array|size:{$expectedCount}",
            'ratings.*.rating'        => 'required|integer|between:1,5',
            'ratings.*.comments'      => 'nullable|string|max:1000',
            'recommendation'          => in_array($form->evaluator_role, ['line_manager', 'gm_pd', 'hr']) ? 'required|in:confirm,extend,do_not_confirm' : 'nullable|in:confirm,extend,do_not_confirm',
            'proposed_extension_date' => 'nullable|date',
            'general_comments'        => 'nullable|string|max:5000',
        ]);

        DB::beginTransaction();
        try {
            $score = $form->computeFormScore($request->ratings);

            $form->update([
                'ratings'                 => $request->ratings,
                'form_score'              => $score,
                'recommendation'          => $request->recommendation,
                'proposed_extension_date' => $request->proposed_extension_date,
                'general_comments'        => $request->general_comments,
                'status'                  => 'submitted',
                'submitted_at'            => Carbon::now(),
            ]);

            $evaluation = $form->evaluation;
            $evaluation->recalculateScores();

            // If CEO provides final executive decision in this submission
            if ($form->evaluator_role === 'ceo' && $request->filled('ceo_decision')) {
                $evaluation->update([
                    'ceo_decision'             => $request->ceo_decision,
                    'ceo_notes'                => $request->ceo_notes ?? $request->general_comments,
                    'ceo_approved_at'          => Carbon::now(),
                    'ceo_approved_by'          => $user->id,
                    'status'                   => 'completed',
                    'final_outcome_applied_at' => Carbon::now(),
                    'final_outcome_applied_by' => $user->id,
                ]);

                // Execute profile status update
                $emp = $evaluation->employee;
                if ($emp) {
                    if ($request->ceo_decision === 'confirm') {
                        $emp->update(['status' => 'active']);
                    } elseif ($request->ceo_decision === 'extend' && ($request->proposed_extension_date || $evaluation->proposed_extension_date)) {
                        $emp->update(['probation_end_date' => $request->proposed_extension_date ?? $evaluation->proposed_extension_date]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message'    => 'Evaluation form submitted and locked successfully.',
                'form'       => $form->fresh(),
                'evaluation' => $evaluation->fresh(),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Form submission error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to submit form: ' . $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. HR Review & Recommendation Submission
    // ─────────────────────────────────────────────────────────────────────────

    public function submitHrReview(Request $request, $id)
    {
        $user = $request->user();
        if (!$this->isHr($user)) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'hr_recommendation'       => 'required|in:confirm,extend,do_not_confirm',
            'proposed_extension_date' => 'required_if:hr_recommendation,extend|nullable|date',
            'improvement_objectives'  => 'nullable|string|max:5000',
            'hr_review_notes'         => 'nullable|string|max:5000',
        ]);

        $evaluation = HrProbationEvaluation::with('employee')->findOrFail($id);

        $evaluation->update([
            'hr_recommendation'       => $request->hr_recommendation,
            'proposed_extension_date' => $request->proposed_extension_date,
            'improvement_objectives'  => $request->improvement_objectives,
            'hr_review_notes'         => $request->hr_review_notes,
            'hr_reviewed_at'          => Carbon::now(),
            'hr_reviewed_by'          => $user->id,
            'status'                  => 'pending_ceo_approval',
        ]);

        // Notify CEO
        $ceoUser = $evaluation->ceoUser;
        if ($ceoUser) {
            $ceoUser->notify(new HrNotification([
                'division'   => 'hr',
                'category'   => 'compliance',
                'severity'   => 'warning',
                'title'      => 'Probation Dossier Awaiting CEO Approval',
                'message'    => "270° Probation Evaluation for {$evaluation->employee->full_name} is finalized (Score: {$evaluation->final_score}/100). Awaiting your final decision.",
                'link'       => '/solar/hr/admin/probation',
                'source_id'  => $evaluation->id,
            ]));
        }

        return response()->json([
            'message'    => 'HR review submitted. Dossier forwarded for CEO final approval.',
            'evaluation' => $evaluation->fresh(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 13. CEO Final Decision
    // ─────────────────────────────────────────────────────────────────────────

    public function submitCeoDecision(Request $request, $id)
    {
        $user = $request->user();
        $evaluation = HrProbationEvaluation::with(['employee.user', 'ceoUser'])->findOrFail($id);

        $isAssignedCeo = ($evaluation->ceo_user_id && (int)$evaluation->ceo_user_id === (int)$user->id);
        $isCeoUser = $this->isCeo($user) || $isAssignedCeo || $this->isSuperAdmin($user);

        if (!$isCeoUser) {
            return response()->json(['message' => 'Only the assigned Chief Executive Officer can sign off the final probation decision.'], 403);
        }

        $request->validate([
            'ceo_decision' => 'required|in:confirm,extend,do_not_confirm',
            'ceo_notes'    => 'nullable|string|max:5000',
        ]);

        DB::beginTransaction();
        try {
            $evaluation->update([
                'ceo_decision'             => $request->ceo_decision,
                'ceo_notes'                => $request->ceo_notes,
                'ceo_approved_at'          => Carbon::now(),
                'ceo_approved_by'          => $user->id,
                'status'                   => 'completed',
                'final_outcome_applied_at' => Carbon::now(),
                'final_outcome_applied_by' => $user->id,
            ]);

            // Execute profile status update
            $emp = $evaluation->employee;
            if ($request->ceo_decision === 'confirm') {
                $emp->update([
                    'status' => 'active',
                ]);
            } elseif ($request->ceo_decision === 'extend' && $evaluation->proposed_extension_date) {
                $emp->update([
                    'probation_end_date' => $evaluation->proposed_extension_date,
                ]);
            }

            DB::commit();

            // Outcome notification to employee
            $outcomeLabels = [
                'confirm'        => 'Employment Confirmed',
                'extend'         => 'Probation Period Extended',
                'do_not_confirm' => 'Probation Non-Confirmation',
            ];
            $outcomeLabel = $outcomeLabels[$request->ceo_decision] ?? $request->ceo_decision;

            if ($emp->user) {
                $emp->user->notify(new HrNotification([
                    'division'   => 'hr',
                    'category'   => 'compliance',
                    'severity'   => $request->ceo_decision === 'confirm' ? 'success' : 'warning',
                    'title'      => "Probation Evaluation Outcome: {$outcomeLabel}",
                    'message'    => "Your probation evaluation has concluded with decision: {$outcomeLabel}. Review your full summary dossier in the portal.",
                    'link'       => '/solar/hr/portal/probation',
                    'source_id'  => $evaluation->id,
                ]));
            }

            return response()->json([
                'message'    => "CEO decision recorded successfully. Employee status updated to: {$emp->status}.",
                'evaluation' => $evaluation->fresh(['employee', 'forms']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('CEO decision error: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to apply CEO decision: ' . $e->getMessage()], 500);
        }
    }
}
