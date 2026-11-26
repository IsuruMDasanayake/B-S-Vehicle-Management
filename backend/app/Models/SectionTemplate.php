<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SectionTemplate extends Model
{
    protected $fillable = [
        'name', 'category', 'unit', 'target_qty', 'sort_order', 'has_before_after',
        'has_table_tracking', 'sub_sections', 'checklist_rules', 'expected_images', 'notes',
    ];

    protected $casts = [
        'has_before_after'    => 'boolean',
        'has_table_tracking'  => 'boolean',
        'sub_sections'        => 'array',
        'checklist_rules'     => 'array',
        'target_qty'          => 'float',
    ];
}
