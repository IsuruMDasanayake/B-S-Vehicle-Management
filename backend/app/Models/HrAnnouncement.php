<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrAnnouncement extends Model
{
    protected $table = 'hr_announcements';

    protected $fillable = [
        'title', 'body', 'priority', 'published_at', 'expires_at', 'created_by',
    ];

    protected $casts = [
        'published_at' => 'date',
        'expires_at'   => 'date',
    ];

    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }
}
