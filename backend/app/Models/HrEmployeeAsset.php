<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrEmployeeAsset extends Model
{
    protected $fillable = ['hr_employee_id', 'name', 'asset_id', 'assigned_date', 'status'];

    protected $casts = [
        'assigned_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'hr_employee_id');
    }
}
