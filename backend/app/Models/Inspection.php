<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;

class Inspection extends Model
{
    use HasAttachments;

    protected $fillable = ['vehicle_id','driver_id','trip_id','inspection_type','tires_ok','brakes_ok','lights_ok','mirrors_ok','fuel_level_ok','engine_ok','body_ok','ac_ok','fuel_level','odometer','notes','overall_status','inspected_at'];
    protected $casts = ['inspected_at'=>'datetime','tires_ok'=>'boolean','brakes_ok'=>'boolean','lights_ok'=>'boolean','mirrors_ok'=>'boolean','fuel_level_ok'=>'boolean','engine_ok'=>'boolean','body_ok'=>'boolean','ac_ok'=>'boolean','fuel_level'=>'decimal:2','odometer'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function trip() { return $this->belongsTo(Trip::class); }
}
