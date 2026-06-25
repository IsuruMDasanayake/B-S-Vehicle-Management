<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Route extends Model
{
    protected $fillable = ['route_name','starting_point','destination','distance_km','estimated_time_minutes','description','is_active'];
    protected $casts = ['distance_km'=>'decimal:2','is_active'=>'boolean'];
}
