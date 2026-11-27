<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarCashRequest extends Model
{
    protected $table = 'solar_cash_requests';

    protected $fillable = [
        'request_no',
        'requester_id',
        'solar_project_id',
        'amount_requested',
        'amount_approved',
        'category',
        'purpose',
        'urgency',
        'receipt_proof_url',
        'status',
        'current_approver_role',
        'disbursed_at',
        'settled_at',
        'settled_amount',
        'returned_cash_amount',
    ];

    protected $casts = [
        'amount_requested'     => 'decimal:2',
        'amount_approved'      => 'decimal:2',
        'settled_amount'       => 'decimal:2',
        'returned_cash_amount' => 'decimal:2',
        'disbursed_at'         => 'datetime',
        'settled_at'           => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(SolarProject::class, 'solar_project_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(SolarCashRequestApproval::class, 'cash_request_id');
    }
}
