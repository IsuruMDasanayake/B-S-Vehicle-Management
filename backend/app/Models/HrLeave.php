<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrLeave extends Model
{
    protected $table = 'hr_leaves';

    protected $fillable = [
        'employee_id', 'leave_type', 'start_date', 'end_date',
        'days_count', 'hours_count', 'reason', 'attachment', 'status', 'approved_by', 'hr_notes',
        'manager_approved_by', 'manager_approved_at', 'manager_notes',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date'   => 'date:Y-m-d',
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
