<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarSection extends Model
{
    protected $fillable = [
        'solar_project_id', 'name', 'sort_order', 'has_before_after',
        'has_table_tracking', 'sub_sections', 'expected_images', 'notes',
    ];

    protected $casts = [
        'has_before_after'   => 'boolean',
        'has_table_tracking' => 'boolean',
        'sub_sections'       => 'array',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(SolarProject::class, 'solar_project_id');
    }

    public function uploadBatches(): HasMany
    {
        return $this->hasMany(SolarUploadBatch::class)->orderByDesc('created_at');
    }

    public function getImageCountAttribute(): int
    {
        return $this->uploadBatches()->withCount('images')->get()->sum('images_count');
    }
}
