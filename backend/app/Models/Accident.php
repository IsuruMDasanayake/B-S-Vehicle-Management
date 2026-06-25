<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasAttachments;

class Accident extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','driver_id','accident_date','location','description','police_report_number','police_report_path','insurance_claim_number','repair_cost','photos','status'];
    protected $casts = ['accident_date'=>'datetime','repair_cost'=>'decimal:2','photos'=>'array'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
}
