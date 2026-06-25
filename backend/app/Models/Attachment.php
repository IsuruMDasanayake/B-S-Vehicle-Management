<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'file_path',
        'file_name',
        'file_type',
        'file_size',
    ];

    /**
     * Get the parent attachable model (vehicle, driver, breakdown, etc.).
     */
    public function attachable()
    {
        return $this->morphTo();
    }
}
