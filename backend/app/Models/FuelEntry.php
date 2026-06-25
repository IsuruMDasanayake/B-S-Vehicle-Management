<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FuelEntry extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','driver_id','vendor_id','fuel_type','fuel_station','quantity_liters','cost_per_liter','total_cost','odometer_reading','date','receipt_number','notes'];
    protected $casts = ['date'=>'date','quantity_liters'=>'decimal:2','cost_per_liter'=>'decimal:2','total_cost'=>'decimal:2','odometer_reading'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }
}
