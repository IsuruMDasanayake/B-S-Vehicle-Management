<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use App\Traits\HasAttachments;

class Vehicle extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, HasAttachments;

    protected $with = ['attachments'];

    protected $fillable = [
        'vehicle_number','registration_number','vehicle_type','vehicle_category',
        'brand','model','manufacturing_year','chassis_number','engine_number',
        'fuel_type','engine_capacity','seating_capacity','color','purchase_date','purchase_cost',
        'current_status','ownership','notes','current_odometer',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'purchase_cost' => 'decimal:2',
        'current_odometer' => 'decimal:2',
        'manufacturing_year' => 'integer',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->useLogName('vehicle');
    }

    public function hiredDetails()
    {
        return $this->hasOne(HiredVehicleDetail::class);
    }

    public function documents() { return $this->hasMany(VehicleDocument::class); }
    public function photos() { return $this->hasMany(VehiclePhoto::class); }
    public function assignments() { return $this->hasMany(VehicleAssignment::class); }
    public function currentAssignment() { return $this->hasOne(VehicleAssignment::class)->where('status','active')->latest(); }
    public function fuelEntries() { return $this->hasMany(FuelEntry::class); }
    public function maintenanceRecords() { return $this->hasMany(MaintenanceRecord::class); }
    public function breakdowns() { return $this->hasMany(Breakdown::class); }
    public function gpsLogs() { return $this->hasMany(GpsLog::class); }
    public function geofences() { return $this->belongsToMany(Geofence::class); }
    public function trips() { return $this->hasMany(Trip::class); }
    public function inspections() { return $this->hasMany(Inspection::class); }
    public function insurancePolicies() { return $this->hasMany(InsurancePolicy::class); }
    public function revenueLicenses() { return $this->hasMany(RevenueLicense::class); }
    public function emissionTests() { return $this->hasMany(EmissionTest::class); }
    public function accidents() { return $this->hasMany(Accident::class); }
    public function tires() { return $this->hasMany(Tire::class); }
    public function expenses() { return $this->hasMany(Expense::class); }
    public function requests() { return $this->hasMany(VehicleRequest::class); }

    public function latestInsurance() { return $this->hasOne(InsurancePolicy::class)->latest(); }
    public function latestRevenueLicense() { return $this->hasOne(RevenueLicense::class)->latest(); }
    public function latestEmissionTest() { return $this->hasOne(EmissionTest::class)->latest(); }
}
