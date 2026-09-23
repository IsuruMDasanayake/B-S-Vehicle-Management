<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SolarProject extends Model
{
    protected $fillable = [
        'solar_site_id', 'name', 'client_name', 'status',
        'start_date', 'expected_completion', 'assigned_supervisors', 'notes',
    ];

    protected $casts = [
        'assigned_supervisors' => 'array',
        'start_date'           => 'date',
        'expected_completion'  => 'date',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(SolarSite::class, 'solar_site_id');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(SolarSection::class)->orderBy('sort_order');
    }

    public function projectTables(): HasMany
    {
        return $this->hasMany(SolarProjectTable::class)->orderBy('table_number');
    }
}
