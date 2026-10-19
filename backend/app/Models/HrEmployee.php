<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrEmployee extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'employee_id', 'user_id', 'department_id', 'designation_id', 'manager_id',
        'full_name', 'photo', 'nic', 'dob', 'gender',
        'phone', 'personal_email', 'company_email', 'address',
        'emergency_contact_name', 'emergency_contact_phone',
        'epf_no', 'employment_type', 'joined_date', 'probation_end_date',
        'work_location', 'status', 'basic_salary',
    ];

    protected $casts = [
        'dob'               => 'date',
        'joined_date'       => 'date',
        'probation_end_date'=> 'date',
        'basic_salary'      => 'decimal:2',
    ];

    protected $appends = ['photo_url'];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function department()
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    public function designation()
    {
        return $this->belongsTo(HrDesignation::class, 'designation_id');
    }

    public function manager()
    {
        return $this->belongsTo(HrEmployee::class, 'manager_id');
    }

    public function subordinates()
    {
        return $this->hasMany(HrEmployee::class, 'manager_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attendances()
    {
        return $this->hasMany(HrAttendance::class, 'employee_id');
    }

    public function attendanceRegularizations()
    {
        return $this->hasMany(HrAttendanceRegularization::class, 'employee_id');
    }

    public function appraisals()
    {
        return $this->hasMany(HrAppraisal::class, 'employee_id');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function getPhotoUrlAttribute(): ?string
    {
        if (!$this->photo) return null;
        return asset('storage/' . $this->photo);
    }

    /**
     * Auto-generate next employee ID: CE-001, CE-002 …
     * Scans all existing records (including soft-deleted) to find the true maximum CE- number.
     */
    public static function generateEmployeeId(): string
    {
        $existingCodes = static::withTrashed()
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->toArray();

        $maxNum = 0;
        foreach ($existingCodes as $code) {
            if (preg_match('/^CE-(\d+)$/i', trim($code), $matches)) {
                $num = (int) $matches[1];
                if ($num > $maxNum) {
                    $maxNum = $num;
                }
            }
        }

        $nextNum = $maxNum + 1;
        $candidate = 'CE-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);

        // Keep incrementing if candidate somehow already exists
        while (in_array($candidate, $existingCodes, true)) {
            $nextNum++;
            $candidate = 'CE-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }
}
