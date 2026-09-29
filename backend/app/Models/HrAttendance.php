<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrAttendance extends Model
{
    use SoftDeletes;

    protected $table = 'hr_attendances';

    protected $fillable = [
        'employee_id',
        'date',
        'clock_in_time',
        'clock_in_lat',
        'clock_in_lng',
        'clock_in_address',
        'clock_in_location_id',
        'clock_out_time',
        'clock_out_lat',
        'clock_out_lng',
        'clock_out_address',
        'working_hours',
        'early_departure',
        'status', // present, absent, late, half_day, wfh
        'notes',
        'is_manual_override',
        'approved_by',
    ];

    protected $casts = [
        'date' => 'date',
        'clock_in_time' => 'datetime',
        'clock_out_time' => 'datetime',
        'working_hours' => 'decimal:2',
        'clock_in_lat' => 'decimal:8',
        'clock_in_lng' => 'decimal:8',
        'clock_out_lat' => 'decimal:8',
        'clock_out_lng' => 'decimal:8',
        'is_manual_override' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }

    public function clockInLocation()
    {
        return $this->belongsTo(HrLocation::class, 'clock_in_location_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
