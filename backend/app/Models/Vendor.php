<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Vendor extends Model
{
    use SoftDeletes;
    protected $fillable = ['vendor_type','name','contact_person','phone','email','address','notes','is_active'];
    protected $casts = ['is_active'=>'boolean'];
    public function fuelEntries() { return $this->hasMany(FuelEntry::class); }
    public function maintenanceRecords() { return $this->hasMany(MaintenanceRecord::class); }
}
