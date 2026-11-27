<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolarFinanceUserRole extends Model
{
    protected $table = 'solar_finance_user_roles';

    protected $fillable = [
        'user_id',
        'finance_role',
        'max_request_limit',
        'approval_tier',
        'can_approve',
        'assigned_by',
        'notes',
    ];

    protected $casts = [
        'max_request_limit' => 'decimal:2',
        'approval_tier'     => 'integer',
        'can_approve'       => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
