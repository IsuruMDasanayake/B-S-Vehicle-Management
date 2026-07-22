<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MaintenanceRecord extends Model
{
    use HasFactory, HasAttachments, LogsActivity;

    protected $with = ['vehicle', 'attachments'];
    protected $fillable = ['vehicle_id','vendor_id','service_date','next_service_date','odometer_reading','next_service_km','service_type','maintenance_type','mechanic_name','workshop','cost','parts_replaced','notes','status'];
    protected $casts = ['service_date'=>'date','next_service_date'=>'date','parts_replaced'=>'array','cost'=>'decimal:2','odometer_reading'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('maintenance_record');
    }
}
