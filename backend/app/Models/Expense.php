<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;

class Expense extends Model
{
    use HasAttachments;

    protected $fillable = ['vehicle_id','expense_type','amount','date','description','reference_id','reference_type','recorded_by','notes'];
    protected $casts = ['amount'=>'decimal:2','date'=>'date'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function recorder() { return $this->belongsTo(User::class,'recorded_by'); }
}
