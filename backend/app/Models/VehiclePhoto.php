<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VehiclePhoto extends Model
{
    protected $fillable = ['vehicle_id','file_path','caption','is_primary'];
    protected $casts = ['is_primary'=>'boolean'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
