<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class HrRemoteAttendanceRequest extends Model
{
    use SoftDeletes;

    protected $table = 'hr_remote_attendance_requests';

    protected $fillable = [
        'employee_id',
        'attendance_id',
        'date',
        'request_type', // 'clock_in', 'clock_out'
        'requested_time',
        'latitude',
        'longitude',
        'accuracy_meters',
        'location_name',
        'address',
        'reason_category',
        'reason_notes',
        'evidence_photo_path',
        'status', // 'pending', 'manager_approved', 'manager_rejected', 'approved', 'rejected'
        'manager_approved_by',
        'manager_approved_at',
        'manager_notes',
        'hr_approved_by',
        'hr_approved_at',
        'hr_notes',
    ];

    protected $casts = [
        'requested_time'      => 'datetime',
        'manager_approved_at' => 'datetime',
        'hr_approved_at'      => 'datetime',
        'latitude'            => 'float',
        'longitude'           => 'float',
        'accuracy_meters'     => 'float',
    ];

    protected $appends = [
        'evidence_photo_url',
    ];

    public function getEvidencePhotoUrlAttribute(): ?string
    {
        if (empty($this->evidence_photo_path)) {
            return null;
        }

        if (filter_var($this->evidence_photo_path, FILTER_VALIDATE_URL)) {
            return $this->evidence_photo_path;
        }

        return Storage::disk('public')->url($this->evidence_photo_path);
    }

    public function attendance()
    {
        return $this->belongsTo(HrAttendance::class, 'attendance_id');
    }

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }

    public function managerReviewer()
    {
        return $this->belongsTo(User::class, 'manager_approved_by');
    }

    public function hrReviewer()
    {
        return $this->belongsTo(User::class, 'hr_approved_by');
    }
}

