<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrDesignation extends Model
{
    protected $fillable = ['title', 'department_id', 'level'];

    public function department()
    {
        return $this->belongsTo(HrDepartment::class, 'department_id');
    }

    public function employees()
    {
        return $this->hasMany(HrEmployee::class, 'designation_id');
    }

    public function getEmployeeCountAttribute(): int
    {
        return $this->employees()->whereIn('status', ['active', 'probation', 'on_leave'])->count();
    }
}
