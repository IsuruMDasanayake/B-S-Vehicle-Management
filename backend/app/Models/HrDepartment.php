<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HrDepartment extends Model
{
    protected $fillable = ['name', 'description'];

    public function designations()
    {
        return $this->hasMany(HrDesignation::class, 'department_id');
    }

    public function employees()
    {
        return $this->hasMany(HrEmployee::class, 'department_id');
    }

    // Virtual: count active employees
    public function getEmployeeCountAttribute(): int
    {
        return $this->employees()->whereIn('status', ['active', 'probation', 'on_leave'])->count();
    }
}
