<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class HrTrainingLesson extends Model
{
    use SoftDeletes;

    protected $table = 'hr_training_lessons';

    protected $fillable = [
        'title',
        'description',
        'category',
        'video_path',
        'video_filename',
        'file_size_bytes',
        'duration_seconds',
        'min_watch_percentage',
        'is_mandatory',
        'due_date',
        'target_type',
        'status',
        'created_by',
    ];

    protected $casts = [
        'file_size_bytes'      => 'integer',
        'duration_seconds'     => 'integer',
        'min_watch_percentage' => 'integer',
        'is_mandatory'         => 'boolean',
        'due_date'             => 'date:Y-m-d',
    ];

    protected $appends = ['video_url', 'formatted_duration', 'formatted_size'];

    public function targets()
    {
        return $this->hasMany(HrTrainingTarget::class, 'lesson_id');
    }

    public function progress()
    {
        return $this->hasMany(HrTrainingProgress::class, 'lesson_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getVideoUrlAttribute(): ?string
    {
        if (!$this->video_path) {
            return null;
        }
        return Storage::disk('public')->url($this->video_path);
    }

    public function getFormattedDurationAttribute(): string
    {
        $secs = (int) $this->duration_seconds;
        if ($secs <= 0) {
            return '—';
        }
        $mins = intdiv($secs, 60);
        $rem = $secs % 60;
        if ($mins >= 60) {
            $hrs = intdiv($mins, 60);
            $mins = $mins % 60;
            return sprintf('%dh %02dm %02ds', $hrs, $mins, $rem);
        }
        return sprintf('%02dm %02ds', $mins, $rem);
    }

    public function getFormattedSizeAttribute(): string
    {
        $bytes = (int) $this->file_size_bytes;
        if ($bytes <= 0) {
            return '—';
        }
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' MB';
        }
        return round($bytes / 1024, 1) . ' KB';
    }
}

