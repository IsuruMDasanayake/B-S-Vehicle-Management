<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrTrainingProgress extends Model
{
    protected $table = 'hr_training_progress';

    protected $fillable = [
        'lesson_id',
        'employee_id',
        'seconds_watched',
        'max_position_seconds',
        'last_position_seconds',
        'watch_percentage',
        'status',
        'started_at',
        'completed_at',
        'acknowledged_at',
        'employee_reply',
        'employee_notes',
    ];

    protected $casts = [
        'seconds_watched'       => 'integer',
        'max_position_seconds'  => 'integer',
        'last_position_seconds' => 'integer',
        'watch_percentage'      => 'float',
        'started_at'            => 'datetime',
        'completed_at'          => 'datetime',
        'acknowledged_at'       => 'datetime',
    ];

    public function lesson()
    {
        return $this->belongsTo(HrTrainingLesson::class, 'lesson_id');
    }

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'employee_id');
    }
}

