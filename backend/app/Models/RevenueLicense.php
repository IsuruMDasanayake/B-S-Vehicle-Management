<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class RevenueLicense extends Model
{
    use HasFactory, HasAttachments, LogsActivity;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','license_number','issue_date','expiry_date','fee','document_path','status'];
    protected $casts = ['issue_date'=>'date','expiry_date'=>'date','fee'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('revenue_license');
    }
}
