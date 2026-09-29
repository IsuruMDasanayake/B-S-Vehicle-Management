<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrEmployeeDocument extends Model
{
    protected $fillable = ['hr_employee_id', 'title', 'file_path', 'upload_date'];

    protected $casts = [
        'upload_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(HrEmployee::class, 'hr_employee_id');
    }
}
