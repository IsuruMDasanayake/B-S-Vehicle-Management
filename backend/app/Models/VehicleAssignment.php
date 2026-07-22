<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasAttachments;

class VehicleAssignment extends Model
{
    use HasFactory, HasAttachments;

    protected $with = ['attachments'];
    protected $fillable = ['vehicle_id','driver_id','vehicle_request_id','assigned_by','department_id','assignment_date','return_date','purpose','amount','status','notes','payment_frequency'];
    protected $casts = ['assignment_date'=>'datetime','return_date'=>'datetime'];
    public function vehicle() { return $this->belongsTo(Vehicle::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
    public function vehicleRequest() { return $this->belongsTo(VehicleRequest::class); }
    public function assignedBy() { return $this->belongsTo(User::class,'assigned_by'); }
    public function department() { return $this->belongsTo(Department::class); }

    protected static function booted()
    {
        static::created(function ($assignment) {
            $assignment->generateInitialPayments();
        });
    }

    public function generateInitialPayments()
    {
        if (!$this->amount || $this->amount <= 0) return;

        $payerName = 'Unknown';
        if ($this->driver_id) {
            $payerName = $this->driver()->value('name');
        } elseif ($this->vehicle_request_id) {
            $payerName = $this->vehicleRequest()->value('requester_name');
        }

        if ($this->payment_frequency === 'custom') {
            $start = \Carbon\Carbon::parse($this->assignment_date);
            $end = $this->return_date ? \Carbon\Carbon::parse($this->return_date) : $start->copy();
            $days = $start->diffInDays($end) + 1;
            $startDate = $start->format('M d, Y');
            $endDate = $this->return_date ? $end->format('M d, Y') : 'Ongoing';
            
            \App\Models\VehiclePayment::create([
                'vehicle_id' => $this->vehicle_id,
                'rental_period' => $startDate . ' to ' . $endDate,
                'amount' => $this->amount * $days,
                'status' => 'pending',
                'payer_name' => $payerName,
            ]);
        } elseif ($this->payment_frequency === 'monthly') {
            \App\Models\VehiclePayment::create([
                'vehicle_id' => $this->vehicle_id,
                'rental_period' => \Carbon\Carbon::parse($this->assignment_date)->format('Y-m'),
                'amount' => $this->amount,
                'status' => 'pending',
                'payer_name' => $payerName,
            ]);
        } elseif ($this->payment_frequency === 'weekends' && $this->return_date) {
            $start = \Carbon\Carbon::parse($this->assignment_date);
            $end = \Carbon\Carbon::parse($this->return_date);
            
            $current = $start->copy();
            $firstWeekend = null;
            $firstWeekendDays = 0;
            
            // Find the first weekend in the assignment period
            while ($current->lte($end)) {
                if ($current->isSaturday() || $current->isSunday()) {
                    $sat = $current->isSaturday() ? $current->copy() : $current->copy()->subDay();
                    $sun = $sat->copy()->addDay();
                    
                    $firstWeekend = $sat->format('M d') . ' to ' . $sun->format('M d');
                    
                    // Count how many days of this specific weekend fall within the assignment
                    if ($sat->between($start, $end)) $firstWeekendDays++;
                    if ($sun->between($start, $end)) $firstWeekendDays++;
                    
                    break; // Stop after finding the first one
                }
                $current->addDay();
            }

            if ($firstWeekend && $firstWeekendDays > 0) {
                \App\Models\VehiclePayment::create([
                    'vehicle_id' => $this->vehicle_id,
                    'rental_period' => $firstWeekend,
                    'amount' => $this->amount * $firstWeekendDays,
                    'status' => 'pending',
                    'payer_name' => $payerName,
                ]);
            }
        }
    }
}
