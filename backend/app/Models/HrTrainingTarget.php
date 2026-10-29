<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrTrainingTarget extends Model
{
    protected $table = 'hr_training_targets';

    protected $fillable = [
        'lesson_id',
        'department_id',
        'designation_id',
        'employee_id',
    ];

    public function lesson()
    {
        return $this->belongsTo(HrTrainingLesson::class, 'lesson_id');
    }

    public function department()
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    public function designation()
    {
        return $this->belongsTo(HrDesignation::class, 'designation_id');
    }

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }
}

