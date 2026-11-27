<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SolarCashRequestApproval extends Model
{
    protected $table = 'solar_cash_request_approvals';

    protected $fillable = [
        'cash_request_id',
        'approver_id',
        'approver_role',
        'action',
        'comments',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SolarCashRequest::class, 'cash_request_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
