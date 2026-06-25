<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Trip extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['trip_code','vehicle_id','driver_id','route_id','start_location','destination','start_time','end_time','distance_km','start_odometer','end_odometer','purpose','status','notes'];
    protected $casts = ['start_time'=>'datetime','end_time'=>'datetime','distance_km'=>'decimal:2','start_odometer'=>'decimal:2','end_odometer'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function route() { return $this->belongsTo(Route::class); }
}
