<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Department extends Model
{
    use SoftDeletes;
    protected $fillable = ['name','description','manager_id'];
    public function manager() { return $this->belongsTo(User::class,'manager_id'); }
    public function users() { return $this->hasMany(User::class); }
    public function assignments() { return $this->hasMany(VehicleAssignment::class); }
}
