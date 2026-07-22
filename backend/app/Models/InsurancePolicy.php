<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;

class InsurancePolicy extends Model
{
    use LogsActivity;

    use HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','vendor_id','insurance_company','policy_number','coverage_type','start_date','expiry_date','premium_amount','document_path','notes','status'];
    protected $casts = ['start_date'=>'date','expiry_date'=>'date','premium_amount'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function vendor() { return $this->belongsTo(Vendor::class); }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('insurance_policy');
    }
}
