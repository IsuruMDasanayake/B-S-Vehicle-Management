<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrProbationEvaluation extends Model
{
    use SoftDeletes;

    protected $table = 'hr_probation_evaluations';

    protected $fillable = [
        'employee_id',
        'probation_end_date',
        'initiation_date',
        'submission_deadline',
        'status',
        'line_manager_id',
        'gm_user_id',
        'ceo_user_id',
        'hr_user_id',
        'presentation_requested',
        'presentation_status',
        'presentation_scheduled_at',
        'presentation_notes',
        'self_score',
        'line_manager_score',
        'gm_score',
        'ceo_score',
        'peer_avg_score',
        'hr_score',
        'final_score',
        'threshold_met',
        'line_manager_recommendation',
        'gm_recommendation',
        'hr_recommendation',
        'proposed_extension_date',
        'improvement_objectives',
        'hr_review_notes',
        'hr_reviewed_at',
        'hr_reviewed_by',
        'ceo_decision',
        'ceo_notes',
        'ceo_approved_at',
        'ceo_approved_by',
        'final_outcome_applied_at',
        'final_outcome_applied_by',
    ];

    protected $casts = [
        'probation_end_date'        => 'date:Y-m-d',
        'initiation_date'           => 'date:Y-m-d',
        'submission_deadline'       => 'date:Y-m-d',
        'proposed_extension_date'   => 'date:Y-m-d',
        'presentation_requested'    => 'boolean',
        'presentation_scheduled_at' => 'datetime',
        'hr_reviewed_at'            => 'datetime',
        'ceo_approved_at'           => 'datetime',
        'final_outcome_applied_at'  => 'datetime',
        'self_score'                => 'decimal:2',
        'line_manager_score'        => 'decimal:2',
        'gm_score'                  => 'decimal:2',
        'ceo_score'                 => 'decimal:2',
        'peer_avg_score'            => 'decimal:2',
        'hr_score'                  => 'decimal:2',
        'final_score'               => 'decimal:2',
        'threshold_met'             => 'boolean',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }

    public function lineManager()
    {
        return $this->belongsTo(HrEmployee::class, 'line_manager_id');
    }

    public function gmUser()
    {
        return $this->belongsTo(User::class, 'gm_user_id');
    }

    public function ceoUser()
    {
        return $this->belongsTo(User::class, 'ceo_user_id');
    }

    public function hrUser()
    {
        return $this->belongsTo(User::class, 'hr_user_id');
    }

    public function hrReviewer()
    {
        return $this->belongsTo(User::class, 'hr_reviewed_by');
    }

    public function ceoApprover()
    {
        return $this->belongsTo(User::class, 'ceo_approved_by');
    }

    public function forms()
    {
        return $this->hasMany(HrProbationEvaluatorForm::class, 'probation_evaluation_id');
    }

    public function selfForm()
    {
        return $this->hasOne(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'self');
    }

    public function lineManagerForm()
    {
        return $this->hasOne(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'line_manager');
    }

    public function gmForm()
    {
        return $this->hasOne(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'gm_pd');
    }

    public function ceoForm()
    {
        return $this->hasOne(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'ceo');
    }

    public function peerForms()
    {
        return $this->hasMany(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'peer');
    }

    public function hrForm()
    {
        return $this->hasOne(HrProbationEvaluatorForm::class, 'probation_evaluation_id')->where('evaluator_role', 'hr');
    }

    // ─── Score Computation ────────────────────────────────────────────────────

    /**
     * Recalculate all weighted scores and threshold status from submitted forms.
     */
    public function recalculateScores(): void
    {
        $forms = $this->forms()->get();

        $selfForm = $forms->firstWhere('evaluator_role', 'self');
        $lmForm   = $forms->firstWhere('evaluator_role', 'line_manager');
        $gmForm   = $forms->firstWhere('evaluator_role', 'gm_pd');
        $ceoForm  = $forms->firstWhere('evaluator_role', 'ceo');
        $hrForm   = $forms->firstWhere('evaluator_role', 'hr');

        $peerForms = $forms->where('evaluator_role', 'peer')
                           ->where('peer_approval_status', 'approved');

        // Form results out of 100
        $selfResult = ($selfForm && $selfForm->status === 'submitted') ? (float)$selfForm->form_score : null;
        $lmResult   = ($lmForm && $lmForm->status === 'submitted') ? (float)$lmForm->form_score : null;
        $gmResult   = ($gmForm && $gmForm->status === 'submitted') ? (float)$gmForm->form_score : null;
        $ceoResult  = ($ceoForm && $ceoForm->status === 'submitted') ? (float)$ceoForm->form_score : null;
        $hrResult   = ($hrForm && $hrForm->status === 'submitted') ? (float)$hrForm->form_score : null;

        // Peer average
        $submittedPeers = $peerForms->where('status', 'submitted');
        $peerAvgResult = null;
        if ($submittedPeers->count() > 0) {
            $peerAvgResult = round($submittedPeers->avg('form_score'), 2);
        }

        // Weighted marks calculation:
        // Employee Self (10%): selfResult * 0.10
        // Line Manager (30%):  lmResult * 0.30
        // GM / PD (20%):       gmResult * 0.20
        // CEO (20%):           ceoResult * 0.20
        // Peers Avg (10%):     peerAvgResult * 0.10
        // HR (10%):            hrResult * 0.10
        $this->self_score         = $selfResult !== null ? round($selfResult * 0.10, 2) : null;
        $this->line_manager_score = $lmResult !== null ? round($lmResult * 0.30, 2) : null;
        $this->gm_score           = $gmResult !== null ? round($gmResult * 0.20, 2) : null;
        $this->ceo_score          = $ceoResult !== null ? round($ceoResult * 0.20, 2) : null;
        $this->peer_avg_score     = $peerAvgResult !== null ? round($peerAvgResult * 0.10, 2) : null;
        $this->hr_score           = $hrResult !== null ? round($hrResult * 0.10, 2) : null;

        // Recommendations sync
        if ($lmForm && $lmForm->status === 'submitted') {
            $this->line_manager_recommendation = $lmForm->recommendation;
        }
        if ($gmForm && $gmForm->status === 'submitted') {
            $this->gm_recommendation = $gmForm->recommendation;
        }
        if ($hrForm && $hrForm->status === 'submitted') {
            $this->hr_recommendation = $hrForm->recommendation;
        }

        // Check if all active forms have been submitted
        $allPeersSubmitted = ($peerForms->count() > 0 && $submittedPeers->count() === $peerForms->count());
        $allSubmitted = ($selfResult !== null) && ($lmResult !== null) && ($gmResult !== null)
                        && ($ceoResult !== null) && ($hrResult !== null) && $allPeersSubmitted;

        if ($allSubmitted) {
            $total = (float)$this->self_score
                   + (float)$this->line_manager_score
                   + (float)$this->gm_score
                   + (float)$this->ceo_score
                   + (float)$this->peer_avg_score
                   + (float)$this->hr_score;

            $this->final_score   = round($total, 2);
            $this->threshold_met = $this->final_score >= 80.00;

            if (in_array($this->status, ['initiated', 'in_progress'])) {
                $this->status = 'pending_hr_review';
            }
        }

        $this->save();
    }

    /**
     * Synchronize evaluation line_manager_id and its evaluator form with the employee's current manager.
     * Only applies to active evaluations (not finalized by CEO decision or marked completed).
     *
     * @return bool True if an update took place, false otherwise.
     */
    public function syncLineManagerWithEmployee(): bool
    {
        if ($this->ceo_decision || $this->status === 'completed') {
            return false;
        }

        $employee = $this->employee ?: HrEmployee::find($this->employee_id);
        if (!$employee) {
            return false;
        }

        $currentEmpManagerId = $employee->manager_id ? (int) $employee->manager_id : null;
        $currentEvalManagerId = $this->line_manager_id ? (int) $this->line_manager_id : null;

        $lmForm = $this->forms()->where('evaluator_role', 'line_manager')->first();

        $formMatches = false;
        if ($lmForm) {
            $formEmpId = $lmForm->evaluator_employee_id ? (int) $lmForm->evaluator_employee_id : null;
            if ($currentEmpManagerId === $formEmpId) {
                $formMatches = true;
            }
        } else if ($currentEmpManagerId === null) {
            $formMatches = true;
        }

        // If line_manager_id and form are already in sync with employee->manager_id, nothing to do
        if ($currentEmpManagerId === $currentEvalManagerId && $formMatches) {
            return false;
        }

        $newManager = $currentEmpManagerId ? HrEmployee::with('user')->find($currentEmpManagerId) : null;

        // Auto-link newManager's user_id if missing
        $newManagerUserId = $newManager?->user_id;
        if ($newManager && !$newManagerUserId && !empty($newManager->company_email)) {
            $matchedUser = User::where('email', $newManager->company_email)
                ->orWhere('email', $newManager->personal_email)
                ->first();
            if ($matchedUser) {
                $newManagerUserId = $matchedUser->id;
                $newManager->update(['user_id' => $matchedUser->id]);
            }
        }

        $this->update([
            'line_manager_id' => $newManager?->id,
        ]);

        if ($newManager) {
            if ($lmForm) {
                if ($lmForm->status !== 'submitted') {
                    $lmForm->update([
                        'evaluator_employee_id' => $newManager->id,
                        'evaluator_user_id'     => $newManagerUserId,
                        'evaluator_name'        => $newManager->full_name,
                        'status'                => 'pending',
                    ]);
                } else {
                    // Previously submitted by old manager: reset for new manager
                    $lmForm->update([
                        'evaluator_employee_id' => $newManager->id,
                        'evaluator_user_id'     => $newManagerUserId,
                        'evaluator_name'        => $newManager->full_name,
                        'status'                => 'pending',
                        'form_score'            => null,
                        'ratings'               => null,
                        'general_comments'      => null,
                        'recommendation'        => null,
                        'submitted_at'          => null,
                    ]);
                    $this->recalculateScores();
                }
            } else {
                HrProbationEvaluatorForm::create([
                    'probation_evaluation_id' => $this->id,
                    'evaluator_role'          => 'line_manager',
                    'evaluator_employee_id'   => $newManager->id,
                    'evaluator_user_id'       => $newManagerUserId,
                    'evaluator_name'          => $newManager->full_name,
                    'status'                  => 'pending',
                ]);
            }

            // Remove peer form if new line manager was previously nominated as peer
            $this->forms()
                ->where('evaluator_role', 'peer')
                ->where('evaluator_employee_id', $newManager->id)
                ->where('status', '!=', 'submitted')
                ->delete();
        } else {
            // Manager removed from employee profile
            if ($lmForm && $lmForm->status !== 'submitted') {
                $lmForm->delete();
            }
        }

        return true;
    }
}
