<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Audit trail for every objective added / changed / removed by the Appraiser
 * after objectives were first assigned.
 */
class HrAppraisalObjectiveRevision extends Model
{
    protected $fillable = [
        'appraisal_id',
        'objective_id',
        'action',
        'old_values',
        'new_values',
        'reason',
        'changed_by',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function appraisal()
    {
        return $this->belongsTo(HrAppraisal::class, 'appraisal_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
