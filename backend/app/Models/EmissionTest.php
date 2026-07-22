<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EmissionTest extends Model
{
    use HasFactory, HasAttachments, LogsActivity;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','test_date','result','expiry_date','test_center','certificate_number','document_path','notes','cost'];
    protected $casts = ['test_date'=>'date','expiry_date'=>'date'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('emission_test');
    }
}
