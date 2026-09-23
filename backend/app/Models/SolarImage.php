<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolarImage extends Model
{
    protected $fillable = [
        'solar_upload_batch_id', 'image_path', 'image_url',
        'original_name', 'file_size', 'is_flagged', 'flag_reason',
    ];

    protected $casts = [
        'is_flagged' => 'boolean',
        'file_size'  => 'integer',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(SolarUploadBatch::class, 'solar_upload_batch_id');
    }
}
