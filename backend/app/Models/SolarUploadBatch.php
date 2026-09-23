<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarUploadBatch extends Model
{
    protected $fillable = [
        'solar_section_id', 'sub_section', 'phase', 'table_number',
        'work_date', 'work_time', 'participants', 'uploaded_by', 'programme',
        'weather', 'has_issue', 'issue_description',
    ];

    protected $casts = [
        'work_date' => 'date',
        'has_issue' => 'boolean',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(SolarSection::class, 'solar_section_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(SolarImage::class);
    }
}
