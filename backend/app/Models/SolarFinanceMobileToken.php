<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolarFinanceMobileToken extends Model
{
    protected $table = 'solar_finance_mobile_tokens';

    protected $fillable = [
        'user_id',
        'token',
        'expires_at',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active'  => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
