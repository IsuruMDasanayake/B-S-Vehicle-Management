<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Tire extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','tire_brand','tire_size','position','installation_date','replacement_date','installation_mileage','replacement_mileage','status','notes'];
    protected $casts = ['installation_date'=>'date','replacement_date'=>'date'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
}
