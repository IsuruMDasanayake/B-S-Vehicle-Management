<?php

namespace App\Services;

use App\Models\User;
use App\Models\InsurancePolicy;
use App\Models\RevenueLicense;
use App\Models\EmissionTest;
use App\Models\Vehicle;
use App\Models\MaintenanceRecord;
use App\Notifications\SystemAlertNotification;
use Carbon\Carbon;

class AlertGeneratorService
{
    /**
     * Generate all document expiry and service alerts, plus random simulation alerts.
     */
    public function generateAlerts()
    {
        $users = User::all();
        if ($users->isEmpty()) {
            return;
        }

        $this->checkDocumentExpiries($users);
        $this->checkServiceDues($users);
        $this->simulateRandomAlerts($users);
    }

    private function notifyUsers($users, $alertData)
    {
        foreach ($users as $user) {
            $user->notify(new SystemAlertNotification($alertData));
        }
    }

    private function checkDocumentExpiries($users)
    {
        $today = Carbon::today();
        $targetDays = [30, 14, 7, 2, 1];

        // 1. Insurance Policies
        $insurances = InsurancePolicy::with('vehicle')->where('status', 'active')->get();
        foreach ($insurances as $insurance) {
            if (!$insurance->expiry_date) continue;
            
            $expiry = Carbon::parse($insurance->expiry_date)->startOfDay();
            if ($expiry->isPast()) continue;

            $diffInDays = $today->diffInDays($expiry, false);

            if (in_array($diffInDays, $targetDays)) {
                $this->notifyUsers($users, [
                    'title' => 'Insurance Expiring Soon',
                    'message' => "Insurance for vehicle {$insurance->vehicle->vehicle_number} expires in {$diffInDays} day(s).",
                    'type' => $diffInDays <= 7 ? 'danger' : 'warning',
                    'source_type' => 'insurance',
                    'source_id' => $insurance->id,
                ]);
            }
        }

        // 2. Revenue Licenses
        $licenses = RevenueLicense::with('vehicle')->where('status', 'active')->get();
        foreach ($licenses as $license) {
            if (!$license->expiry_date) continue;
            
            $expiry = Carbon::parse($license->expiry_date)->startOfDay();
            if ($expiry->isPast()) continue;

            $diffInDays = $today->diffInDays($expiry, false);

            if (in_array($diffInDays, $targetDays)) {
                $this->notifyUsers($users, [
                    'title' => 'Revenue License Expiring Soon',
                    'message' => "Revenue License for vehicle {$license->vehicle->vehicle_number} expires in {$diffInDays} day(s).",
                    'type' => $diffInDays <= 7 ? 'danger' : 'warning',
                    'source_type' => 'revenue_license',
                    'source_id' => $license->id,
                ]);
            }
        }

        // 3. Emission Tests
        $emissions = EmissionTest::with('vehicle')->where('result', 'pass')->get();
        foreach ($emissions as $emission) {
            if (!$emission->expiry_date) continue;
            
            $expiry = Carbon::parse($emission->expiry_date)->startOfDay();
            if ($expiry->isPast()) continue;

            $diffInDays = $today->diffInDays($expiry, false);

            if (in_array($diffInDays, $targetDays)) {
                $this->notifyUsers($users, [
                    'title' => 'Emission Test Expiring Soon',
                    'message' => "Emission Test for vehicle {$emission->vehicle->vehicle_number} expires in {$diffInDays} day(s).",
                    'type' => $diffInDays <= 7 ? 'danger' : 'warning',
                    'source_type' => 'emission_test',
                    'source_id' => $emission->id,
                ]);
            }
        }
    }

    private function checkServiceDues($users)
    {
        // 14, 7, 2, 1 days before service due
        $today = Carbon::today();
        $targetDays = [14, 7, 2, 1];

        // Let's assume service due date is stored in Vehicle model or we just check MaintenanceRecord next_service_date.
        $records = MaintenanceRecord::with('vehicle')->whereNotNull('next_service_date')->get();
        
        foreach ($records as $record) {
            $due = Carbon::parse($record->next_service_date)->startOfDay();
            if ($due->isPast()) continue;

            $diffInDays = $today->diffInDays($due, false);

            if (in_array($diffInDays, $targetDays)) {
                $this->notifyUsers($users, [
                    'title' => 'Service Due Soon',
                    'message' => "Vehicle {$record->vehicle->vehicle_number} is due for {$record->service_type} service in {$diffInDays} day(s).",
                    'type' => $diffInDays <= 7 ? 'danger' : 'warning',
                    'source_type' => 'maintenance_record',
                    'source_id' => $record->id,
                ]);
            }
        }
    }

    private function simulateRandomAlerts($users)
    {
        $vehicles = Vehicle::inRandomOrder()->limit(3)->get();
        if ($vehicles->isEmpty()) return;

        $rand = rand(1, 100);

        // 10% chance of Over-Speed alert
        if ($rand <= 10) {
            $vehicle = $vehicles->first();
            $speed = rand(95, 130);
            $this->notifyUsers($users, [
                'title' => 'Over-Speed Alert',
                'message' => "Vehicle {$vehicle->vehicle_number} has exceeded speed limits ({$speed} km/h).",
                'type' => 'danger',
                'source_type' => 'gps_log',
                'source_id' => null,
            ]);
        }
        
        // 15% chance of Low Fuel alert
        elseif ($rand > 10 && $rand <= 25) {
            $vehicle = $vehicles->last();
            $level = rand(5, 15);
            $this->notifyUsers($users, [
                'title' => 'Low Fuel Alert',
                'message' => "Vehicle {$vehicle->vehicle_number} is running critically low on fuel ({$level}%).",
                'type' => 'warning',
                'source_type' => 'vehicle',
                'source_id' => $vehicle->id,
            ]);
        }
    }
}
