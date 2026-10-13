<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrAttendanceRegularization extends Model
{
    use SoftDeletes;

    protected $table = 'hr_attendance_regularizations';

    protected $fillable = [
        'attendance_id',
        'employee_id',
        'requested_clock_out_time',
        'reason',
        'status', // pending, approved, rejected
        'reviewed_by',
        'admin_notes',
    ];

    protected $casts = [
        'requested_clock_out_time' => 'datetime',
    ];

    public function attendance()
    {
        return $this->belongsTo(HrAttendance::class, 'attendance_id');
    }

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
