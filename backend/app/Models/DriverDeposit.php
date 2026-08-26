<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DriverDeposit extends Model
{
    use HasFactory, \App\Traits\HasAttachments;

    protected $fillable = [
        'driver_id',
        'date',
        'amount',
        'status',
        'notes',
    ];

    protected $with = ['attachments'];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
