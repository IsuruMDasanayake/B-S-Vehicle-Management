<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrAppraisalObjective extends Model
{
    protected $fillable = [
        'appraisal_id',
        'order_num',
        'title',
        'description',
        'weight',
        'deadline',
        'target_kpi',
        'status',
        'achievement',
        'evidence_notes',
        'marks',
        'weighted_marks',
        'manager_comments',
    ];

    protected $casts = [
        'weight'         => 'decimal:2',
        'deadline'       => 'date',
        'marks'          => 'decimal:2',
        'weighted_marks' => 'decimal:2',
        'order_num'      => 'integer',
    ];

    public function appraisal()
    {
        return $this->belongsTo(HrAppraisal::class, 'appraisal_id');
    }

    /**
     * Recompute weighted marks based on marks and weight
     */
    public function updateWeightedMarks(): void
    {
        if ($this->marks !== null) {
            $this->weighted_marks = round(($this->marks * $this->weight) / 100, 2);
            $this->save();
        }
    }
}
