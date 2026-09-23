<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SolarDailyUpdate extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'report_date' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(SolarProject::class, 'solar_project_id');
    }

    public function images()
    {
        return $this->hasMany(SolarDailyUpdateImage::class, 'solar_daily_update_id');
    }
}
