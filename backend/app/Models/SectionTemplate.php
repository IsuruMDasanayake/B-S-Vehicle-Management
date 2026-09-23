<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SectionTemplate extends Model
{
    protected $fillable = [
        'name', 'sort_order', 'has_before_after',
        'has_table_tracking', 'sub_sections', 'expected_images', 'notes',
    ];

    protected $casts = [
        'has_before_after'    => 'boolean',
        'has_table_tracking'  => 'boolean',
        'sub_sections'        => 'array',
    ];
}
