<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrAppraisal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id',
        'evaluator_id',
        'period_month',
        'status',
        'objective_score',
        'attendance_deduction',
        'attendance_deduction_notes',
        'misconduct_deduction',
        'misconduct_severity',
        'misconduct_deduction_notes',
        'final_score',
        'grade',
        'performance_level',
        'variable_pay_adjustment',
        'employee_comments',
        'manager_comments',
        'manager_recommended_grade',
        'manager_evaluated_at',
        'hr_comments',
        'hr_reviewed_by',
        'hr_reviewed_at',
        'director_comments',
        'director_approved_by',
        'director_approved_at',
    ];

    protected $casts = [
        'objective_score'      => 'decimal:2',
        'attendance_deduction' => 'decimal:2',
        'misconduct_deduction' => 'decimal:2',
        'final_score'          => 'decimal:2',
        'manager_evaluated_at' => 'datetime',
        'hr_reviewed_at'       => 'datetime',
        'director_approved_at' => 'datetime',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }

    public function evaluator()
    {
        return $this->belongsTo(HrEmployee::class, 'evaluator_id');
    }

    public function objectives()
    {
        return $this->hasMany(HrAppraisalObjective::class, 'appraisal_id')->orderBy('order_num');
    }

    public function hrReviewedBy()
    {
        return $this->belongsTo(User::class, 'hr_reviewed_by');
    }

    public function directorApprovedBy()
    {
        return $this->belongsTo(User::class, 'director_approved_by');
    }

    // ─── Business Logic & Calculations ────────────────────────────────────────

    /**
     * Recompute objective score, final score, grade, and variable pay adjustment
     */
    public function recalculateScores(): void
    {
        // 1. Objective score sum
        $objScore = 0;
        foreach ($this->objectives as $obj) {
            if ($obj->marks !== null) {
                $weighted = round(($obj->marks * $obj->weight) / 100, 2);
                $obj->weighted_marks = $weighted;
                $obj->save();
                $objScore += $weighted;
            }
        }
        $this->objective_score = round(min(100, max(0, $objScore)), 2);

        // 2. Final score = Objective Score - Attendance Deduction - Misconduct Deduction
        $attDed = floatval($this->attendance_deduction ?? 0);
        $misDed = floatval($this->misconduct_deduction ?? 0);
        
        $final = max(0, min(100, $this->objective_score - $attDed - $misDed));
        $this->final_score = round($final, 2);

        // 3. Grade & Performance Level Determination (Policy Section 2.6 & 2.9)
        $meta = self::determineGradeDetails($this->final_score);
        $this->grade = $meta['grade'];
        $this->performance_level = $meta['performance_level'];
        $this->variable_pay_adjustment = $meta['variable_pay_adjustment'];

        $this->save();
    }

    /**
     * Map numerical score (0 - 100) to policy grade, performance level & variable pay %
     */
    public static function determineGradeDetails(float $score): array
    {
        if ($score >= 96.00) {
            return [
                'grade'                   => 'S1',
                'performance_level'       => 'Outstanding',
                'variable_pay_adjustment' => '116% - 120%',
            ];
        } elseif ($score >= 90.00) {
            return [
                'grade'                   => 'S2',
                'performance_level'       => 'Excellent',
                'variable_pay_adjustment' => '110% - 115%',
            ];
        } elseif ($score >= 75.00) {
            return [
                'grade'                   => 'A1',
                'performance_level'       => 'Meets Expectations',
                'variable_pay_adjustment' => '95% - 109%',
            ];
        } elseif ($score >= 60.00) {
            return [
                'grade'                   => 'A2',
                'performance_level'       => 'Needs Improvement',
                'variable_pay_adjustment' => '80% - 94%',
            ];
        } else {
            return [
                'grade'                   => 'C',
                'performance_level'       => 'Unacceptable',
                'variable_pay_adjustment' => '0%',
            ];
        }
    }
}
