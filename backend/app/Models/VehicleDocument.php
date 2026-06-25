<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class VehicleDocument extends Model
{
    protected $fillable = ['vehicle_id','document_type','file_path','file_name','expiry_date','notes'];
    protected $casts = ['expiry_date'=>'date'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
