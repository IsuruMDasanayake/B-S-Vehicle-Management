<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\VehicleAssignment;
use App\Models\VehiclePayment;
use Carbon\Carbon;

class GenerateWeekendPayments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:generate-weekends';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate payment records for active weekend-only assignments';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today();
        
        // Only run if today is Saturday or Sunday (or Friday, depending on preference, but we'll stick to actual weekend)
        if (!$today->isSaturday() && !$today->isSunday()) {
            $this->info('Today is not a weekend. Skipping generation.');
            return;
        }

        $sat = $today->isSaturday() ? $today->copy() : $today->copy()->subDay();
        $sun = $sat->copy()->addDay();
        $currentWeekendStr = $sat->format('M d') . ' to ' . $sun->format('M d');

        $activeAssignments = VehicleAssignment::where('status', 'active')
            ->where('payment_frequency', 'weekends')
            ->whereNotNull('return_date')
            ->get();

        foreach ($activeAssignments as $assignment) {
            // Check if the current weekend is within the assignment period
            $start = Carbon::parse($assignment->assignment_date)->startOfDay();
            $end = Carbon::parse($assignment->return_date)->endOfDay();

            if ($sat->lt($start) || $sun->gt($end)) {
                continue; // Current weekend is outside the assignment window
            }

            // Check if payment record already exists for this weekend
            $exists = VehiclePayment::where('vehicle_id', $assignment->vehicle_id)
                ->where('rental_period', $currentWeekendStr)
                ->exists();

            if (!$exists) {
                // Calculate amount per weekend based on daily rate
                $weekendDays = 0;
                if ($sat->between($start, $end)) $weekendDays++;
                if ($sun->between($start, $end)) $weekendDays++;

                if ($weekendDays > 0) {
                    $payerName = 'Unknown';
                    if ($assignment->driver_id) {
                        $payerName = $assignment->driver()->value('name');
                    } elseif ($assignment->vehicle_request_id) {
                        $payerName = $assignment->vehicleRequest()->value('requester_name');
                    }

                    VehiclePayment::create([
                        'vehicle_id' => $assignment->vehicle_id,
                        'rental_period' => $currentWeekendStr,
                        'amount' => $assignment->amount * $weekendDays,
                        'status' => 'pending',
                        'payer_name' => $payerName,
                    ]);

                    $this->info("Created weekend payment for vehicle {$assignment->vehicle_id} for period {$currentWeekendStr}");
                }
            }
        }
    }
}
