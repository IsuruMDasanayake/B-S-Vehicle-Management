<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SolarDailyUpdateImage extends Model
{
    use HasFactory;

    protected $guarded = [];

    public function dailyUpdate()
    {
        return $this->belongsTo(SolarDailyUpdate::class, 'solar_daily_update_id');
    }
}
