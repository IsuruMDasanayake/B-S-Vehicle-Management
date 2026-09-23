<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Notifications\Notifiable;

class SolarSite extends Model
{
    use Notifiable;

    protected $fillable = ['name', 'location', 'supervisor_token', 'is_active', 'notes'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public static function generateToken(): string
    {
        return Str::random(48);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(SolarProject::class);
    }
}
