<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolarPettyCashTransaction extends Model
{
    protected $table = 'solar_petty_cash_transactions';

    protected $fillable = [
        'account_id',
        'voucher_no',
        'type',
        'amount',
        'paid_to',
        'category',
        'solar_project_id',
        'receipt_url',
        'notes',
        'recorded_by',
        'approved_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(SolarPettyCashAccount::class, 'account_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(SolarProject::class, 'solar_project_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
