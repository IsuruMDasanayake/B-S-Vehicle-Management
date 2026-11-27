<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarPettyCashAccount extends Model
{
    protected $table = 'solar_petty_cash_accounts';

    protected $fillable = [
        'account_name',
        'custodian_id',
        'solar_project_id',
        'initial_float',
        'current_balance',
        'min_threshold',
        'status',
    ];

    protected $casts = [
        'initial_float'   => 'decimal:2',
        'current_balance' => 'decimal:2',
        'min_threshold'   => 'decimal:2',
    ];

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(User::class, 'custodian_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(SolarProject::class, 'solar_project_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(SolarPettyCashTransaction::class, 'account_id');
    }
}
