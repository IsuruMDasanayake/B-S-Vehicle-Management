<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;

use Laravel\Sanctum\HasApiTokens;

class Driver extends Model
{
    use HasApiTokens, HasFactory, SoftDeletes, LogsActivity, HasAttachments;

    protected $with = ['attachments'];

    protected $fillable = [
        'name','nic_number','address','contact_number','license_number',
        'license_expiry_date','photo','license_front','license_back','emergency_contact_name',
        'emergency_contact_phone','status','notes','user_id',
    ];
    protected $casts = ['license_expiry_date' => 'date'];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('driver');
    }

    public function user() { return $this->belongsTo(User::class); }
    public function assignments() { return $this->hasMany(VehicleAssignment::class); }
    public function currentAssignment() { return $this->hasOne(VehicleAssignment::class)->where('status','active')->latest(); }
    public function fuelEntries() { return $this->hasMany(FuelEntry::class); }
    public function trips() { return $this->hasMany(Trip::class); }
    public function inspections() { return $this->hasMany(Inspection::class); }

    public function isLicenseExpiringSoon(): bool
    {
        return $this->license_expiry_date && $this->license_expiry_date->diffInDays(now()) <= 60;
    }
}
