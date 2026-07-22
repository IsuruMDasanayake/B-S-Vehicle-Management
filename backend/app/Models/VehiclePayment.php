<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;

class VehiclePayment extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];

    protected $fillable = [
        'vehicle_id',
        'rental_period',
        'payer_name',
        'amount',
        'status',
        'payment_date',
        'notes'
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
