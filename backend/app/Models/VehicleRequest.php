<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasAttachments;

class VehicleRequest extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['requester_id','vehicle_id','department_id','request_date','return_date','purpose','destination','approval_status','approved_by','rejection_reason','approved_at'];
    protected $casts = ['request_date'=>'date','return_date'=>'date','approved_at'=>'datetime'];
    public function requester() { return $this->belongsTo(User::class,'requester_id'); }
    public function approver() { return $this->belongsTo(User::class,'approved_by'); }
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function department() { return $this->belongsTo(Department::class); }
}
