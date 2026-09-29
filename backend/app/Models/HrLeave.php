<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrLeave extends Model
{
    protected $table = 'hr_leaves';

    protected $fillable = [
        'employee_id', 'leave_type', 'start_date', 'end_date',
        'days_count', 'reason', 'status', 'approved_by', 'hr_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class);
    }

    public function approver()
    {
        return $this->belongsTo(\App\Models\User::class, 'approved_by');
    }
}
