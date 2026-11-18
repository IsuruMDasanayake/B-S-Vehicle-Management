<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrProbationEvaluatorForm extends Model
{
    protected $table = 'hr_probation_evaluator_forms';

    protected $fillable = [
        'probation_evaluation_id',
        'evaluator_role',
        'evaluator_employee_id',
        'evaluator_user_id',
        'evaluator_name',
        'peer_index',
        'peer_approval_status',
        'status',
        'submitted_at',
        'ratings',
        'form_score',
        'recommendation',
        'proposed_extension_date',
        'general_comments',
        'achievements_evidence',
        'challenges_support',
    ];

    protected $casts = [
        'submitted_at'            => 'datetime',
        'proposed_extension_date' => 'date',
        'ratings'                 => 'array',
        'form_score'              => 'decimal:2',
    ];

    // Standard weights
    public const SELF_CRITERIA_WEIGHTS = [
        1 => 20, // Personal Achievements & Contributions
        2 => 20, // Overcoming Challenges
        3 => 20, // Adaptation to the Work Environment
        4 => 20, // Personal Motivation & Commitment
        5 => 20, // Readiness for Employment Confirmation
    ];

    public const EVALUATOR_CRITERIA_WEIGHTS = [
        1 => 20, // Job Knowledge & Technical Competency
        2 => 25, // Achievement of Assigned Objectives
        3 => 15, // Quality, Accuracy & Timeliness
        4 => 10, // Teamwork & Communication
        5 => 10, // Accountability, Discipline & Reliability
        6 => 10, // Initiative, Problem-Solving & Adaptability
        7 => 10, // Safety, Ethics & Company Compliance
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function evaluation()
    {
        return $this->belongsTo(HrProbationEvaluation::class, 'probation_evaluation_id');
    }

    public function evaluatorEmployee()
    {
        return $this->belongsTo(HrEmployee::class, 'evaluator_employee_id');
    }

    public function evaluatorUser()
    {
        return $this->belongsTo(User::class, 'evaluator_user_id');
    }

    // ─── Score Computation ────────────────────────────────────────────────────

    /**
     * Compute total raw score (0-100) based on ratings array.
     */
    public function computeFormScore(array $ratings): float
    {
        $isSelf = $this->evaluator_role === 'self';
        $weights = $isSelf ? self::SELF_CRITERIA_WEIGHTS : self::EVALUATOR_CRITERIA_WEIGHTS;

        $totalScore = 0.0;
        foreach ($weights as $criterionId => $weight) {
            $rating = isset($ratings[$criterionId]['rating']) ? (float)$ratings[$criterionId]['rating'] : 0.0;
            // rating is 1..5. Marks = (rating / 5) * weight
            $marks = ($rating / 5.0) * $weight;
            $totalScore += $marks;
        }

        return round($totalScore, 2);
    }
}
