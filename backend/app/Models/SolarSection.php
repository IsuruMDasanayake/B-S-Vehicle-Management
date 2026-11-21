<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarSection extends Model
{
    protected $fillable = [
        'solar_project_id', 'name', 'category', 'unit', 'target_qty', 'sort_order', 'has_before_after',
        'has_table_tracking', 'sub_sections', 'expected_images', 'notes',
    ];

    protected $casts = [
        'has_before_after'   => 'boolean',
        'has_table_tracking' => 'boolean',
        'sub_sections'       => 'array',
        'target_qty'         => 'float',
    ];

    protected $appends = ['image_count', 'completed_quantity', 'progress_percentage'];

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

    public function getCompletedQuantityAttribute(): float
    {
        $sumQty = (float) $this->uploadBatches()->whereNotNull('quantity_done')->sum('quantity_done');
        if ($sumQty > 0) {
            return $sumQty;
        }

        if ($this->has_table_tracking) {
            return (float) $this->uploadBatches()->whereNotNull('table_number')->distinct('table_number')->count('table_number');
        }

        return 0;
    }

    public function getProgressPercentageAttribute(): float
    {
        if (!$this->target_qty || $this->target_qty <= 0) {
            return 0;
        }
        return (float) min(100, round(($this->completed_quantity / $this->target_qty) * 100, 1));
    }
}
