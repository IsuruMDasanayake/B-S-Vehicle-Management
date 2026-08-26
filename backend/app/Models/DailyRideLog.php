<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;

class DailyRideLog extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];

    protected $fillable = [
        'vehicle_id',
        'driver_id',
        'date',
        'platform',
        'morning_odo',
        'night_odo',
        'hire_km',
        'gross_revenue',
        'commission',
        'net_revenue',
        'wallet_balance',
        'extra_earnings',
        'fuel_cost',
        'other_expenses',
        'cash_on_hand',
        'status',
        'notes'
    ];

    protected $casts = [
        'date' => 'date',
        'morning_odo' => 'decimal:2',
        'night_odo' => 'decimal:2',
        'hire_km' => 'decimal:2',
        'gross_revenue' => 'decimal:2',
        'commission' => 'decimal:2',
        'net_revenue' => 'decimal:2',
        'wallet_balance' => 'decimal:2',
        'extra_earnings' => 'decimal:2',
        'fuel_cost' => 'decimal:2'
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
