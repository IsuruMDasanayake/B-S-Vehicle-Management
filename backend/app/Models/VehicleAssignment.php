<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasAttachments;

class VehicleAssignment extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','driver_id','vehicle_request_id','assigned_by','department_id','assignment_date','return_date','purpose','status','notes'];
    protected $casts = ['assignment_date'=>'datetime','return_date'=>'datetime'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function vehicleRequest() { return $this->belongsTo(VehicleRequest::class); }
    public function assignedBy() { return $this->belongsTo(User::class,'assigned_by'); }
    public function department() { return $this->belongsTo(Department::class); }
}
