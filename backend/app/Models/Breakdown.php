<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasAttachments;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Breakdown extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['vehicle', 'driver', 'attachments'];
    protected $fillable = ['vehicle_id','driver_id','breakdown_date','location','description','repair_status','repair_cost','repair_notes'];
    protected $casts = ['breakdown_date'=>'datetime','repair_cost'=>'decimal:2'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
}
