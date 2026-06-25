<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HiredVehicleDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'owner_name',
        'contact_no',
        'email',
        'address',
        'emergency_person',
        'emergency_contact',
        'monthly_amount',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
