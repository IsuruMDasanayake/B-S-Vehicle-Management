<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HrLocation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'latitude',
        'longitude',
        'radius_meters',
        'status', // active, inactive
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'radius_meters' => 'integer',
    ];
}
