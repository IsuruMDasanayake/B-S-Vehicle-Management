<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class GpsLog extends Model
{
    protected $fillable = ['vehicle_id','latitude','longitude','speed','ignition_status','address','logged_at'];
    protected $casts = ['logged_at'=>'datetime','ignition_status'=>'boolean','latitude'=>'decimal:7','longitude'=>'decimal:7','speed'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
