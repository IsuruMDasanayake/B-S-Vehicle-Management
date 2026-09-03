<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\InsurancePolicy;
use App\Models\RevenueLicense;
use App\Models\EmissionTest;
use App\Models\MaintenanceRecord;
use App\Models\User;
use App\Notifications\SystemAlertNotification;
use Illuminate\Support\Facades\Notification;
use Carbon\Carbon;

class GenerateSystemAlerts extends Command
{
    protected $signature = 'alerts:generate';
    protected $description = 'Generate automatic system alerts for expiries and simulated events';

    public function handle()
    {
        $this->info('Starting alert generation...');
        $now = now();
        $notifiableUsers = User::role(['super_admin', 'fleet_manager'])->get();

        if ($notifiableUsers->isEmpty()) {
            $this->warn('No users found to notify.');
            return;
        }

        $documentThresholds = [30, 14, 7, 2, 1];
        $serviceThresholds = [14, 7, 2, 1];

        // 1. Insurance Expiry
        foreach ($documentThresholds as $days) {
            $targetDate = $now->copy()->addDays($days)->toDateString();
            $policies = InsurancePolicy::whereDate('expiry_date', $targetDate)->where('status', 'active')->with('vehicle')->get();
            foreach ($policies as $policy) {
                $vehicleNumber = $policy->vehicle ? $policy->vehicle->vehicle_number : 'Unknown Vehicle';
                $this->dispatchAlert($notifiableUsers, [
                    'title' => 'Insurance Expiry Warning',
                    'message' => "Insurance for vehicle {$vehicleNumber} will expire in {$days} days.",
                    'type' => 'warning',
                    'source_type' => 'insurance',
                    'source_id' => $policy->id,
                ]);
            }
        }

        // 2. Revenue License Renewal
        foreach ($documentThresholds as $days) {
            $targetDate = $now->copy()->addDays($days)->toDateString();
            $licenses = RevenueLicense::whereDate('expiry_date', $targetDate)->where('status', 'active')->with('vehicle')->get();
            foreach ($licenses as $license) {
                $vehicleNumber = $license->vehicle ? $license->vehicle->vehicle_number : 'Unknown Vehicle';
                $this->dispatchAlert($notifiableUsers, [
                    'title' => 'Revenue License Expiry',
                    'message' => "Revenue license for vehicle {$vehicleNumber} will expire in {$days} days.",
                    'type' => 'warning',
                    'source_type' => 'revenue_license',
                    'source_id' => $license->id,
                ]);
            }
        }

        // 3. Emission Test Due
        foreach ($documentThresholds as $days) {
            $targetDate = $now->copy()->addDays($days)->toDateString();
            $tests = EmissionTest::whereDate('expiry_date', $targetDate)->with('vehicle')->get();
            foreach ($tests as $test) {
                // Ensure it's the latest test for this vehicle
                $latestTest = EmissionTest::where('vehicle_id', $test->vehicle_id)->orderByDesc('expiry_date')->first();
                if ($latestTest && $latestTest->id !== $test->id) continue;

                $vehicleNumber = $test->vehicle ? $test->vehicle->vehicle_number : 'Unknown Vehicle';
                $this->dispatchAlert($notifiableUsers, [
                    'title' => 'Emission Test Expiry',
                    'message' => "Emission test for vehicle {$vehicleNumber} will expire in {$days} days.",
                    'type' => 'warning',
                    'source_type' => 'emission_test',
                    'source_id' => $test->id,
                ]);
            }
        }

        // 4. Driver License Expiry
        foreach ($documentThresholds as $days) {
            $targetDate = $now->copy()->addDays($days)->toDateString();
            $drivers = Driver::whereDate('license_expiry_date', $targetDate)->get();
            foreach ($drivers as $driver) {
                $this->dispatchAlert($notifiableUsers, [
                    'title' => 'Driver License Expiry',
                    'message' => "License for driver {$driver->name} will expire in {$days} days.",
                    'type' => 'warning',
                    'source_type' => 'driver',
                    'source_id' => $driver->id,
                ]);
            }
        }

        // 5. Service Due
        foreach ($serviceThresholds as $days) {
            $targetDate = $now->copy()->addDays($days)->toDateString();
            $records = MaintenanceRecord::whereDate('next_service_date', $targetDate)->with('vehicle')->get();
            foreach ($records as $record) {
                $vehicleNumber = $record->vehicle ? $record->vehicle->vehicle_number : 'Unknown Vehicle';
                $this->dispatchAlert($notifiableUsers, [
                    'title' => 'Service Due',
                    'message' => "Maintenance service for vehicle {$vehicleNumber} is due in {$days} days.",
                    'type' => 'info',
                    'source_type' => 'maintenance',
                    'source_id' => $record->id,
                ]);
            }
        }

        // 6. Expired Documents
        $today = $now->toDateString();
        
        // Expired Insurance (Auto update status and alert)
        $expiredPolicies = InsurancePolicy::whereDate('expiry_date', '<', $today)->where('status', 'active')->with('vehicle')->get();
        foreach ($expiredPolicies as $policy) {
            $policy->update(['status' => 'expired']);
            $vehicleNumber = $policy->vehicle ? $policy->vehicle->vehicle_number : 'Unknown';
            $this->dispatchAlert($notifiableUsers, [
                'title' => 'Insurance Expired',
                'message' => "Insurance for vehicle {$vehicleNumber} has EXPIRED.",
                'type' => 'danger',
                'source_type' => 'insurance',
                'source_id' => $policy->id,
            ]);
        }

        // Expired Revenue License (Auto update status and alert)
        $expiredLicenses = RevenueLicense::whereDate('expiry_date', '<', $today)->where('status', 'active')->with('vehicle')->get();
        foreach ($expiredLicenses as $license) {
            $license->update(['status' => 'expired']);
            $vehicleNumber = $license->vehicle ? $license->vehicle->vehicle_number : 'Unknown';
            $this->dispatchAlert($notifiableUsers, [
                'title' => 'Revenue License Expired',
                'message' => "Revenue license for vehicle {$vehicleNumber} has EXPIRED.",
                'type' => 'danger',
                'source_type' => 'revenue_license',
                'source_id' => $license->id,
            ]);
        }

        // Expired Emission Test (Alert only for the latest one if it's expired)
        $expiredTests = EmissionTest::whereDate('expiry_date', '<', $today)->with('vehicle')->get();
        foreach ($expiredTests as $test) {
            $latestTest = EmissionTest::where('vehicle_id', $test->vehicle_id)->orderByDesc('expiry_date')->first();
            if ($latestTest && $latestTest->id !== $test->id) continue;

            $vehicleNumber = $test->vehicle ? $test->vehicle->vehicle_number : 'Unknown';
            $this->dispatchAlert($notifiableUsers, [
                'title' => 'Emission Test Expired',
                'message' => "Emission test for vehicle {$vehicleNumber} has EXPIRED.",
                'type' => 'danger',
                'source_type' => 'emission_test',
                'source_id' => $test->id,
            ]);
        }

        // 7. Pending Payments
        $pendingPayments = \App\Models\VehiclePayment::where('status', 'pending')->with('vehicle')->get();
        foreach ($pendingPayments as $payment) {
            $vehicleNumber = $payment->vehicle ? $payment->vehicle->vehicle_number : 'Unknown';
            $this->dispatchAlert($notifiableUsers, [
                'title' => 'Pending Payment',
                'message' => "Payment of LKR {$payment->amount} for vehicle {$vehicleNumber} ({$payment->rental_period}) is still pending.",
                'type' => 'danger',
                'source_type' => 'vehicle_payment',
                'source_id' => $payment->id,
            ]);
        }

        // 8 & 9. Simulated Low Fuel and Over-Speed Alerts
        $activeVehicles = Vehicle::where('current_status', 'active')->get();
        if ($activeVehicles->count() > 0) {
            foreach ($activeVehicles as $vehicle) {
                // 5% chance of Low Fuel
                if (rand(1, 100) <= 5) {
                    $this->dispatchAlert($notifiableUsers, [
                        'title' => 'Low Fuel Alert',
                        'message' => "Vehicle {$vehicle->vehicle_number} is running critically low on fuel.",
                        'type' => 'danger',
                        'source_type' => 'vehicle',
                        'source_id' => $vehicle->id,
                    ]);
                }
                // 5% chance of Over-Speed
                if (rand(1, 100) <= 5) {
                    $speed = rand(90, 130);
                    $this->dispatchAlert($notifiableUsers, [
                        'title' => 'Over-Speed Detected',
                        'message' => "Vehicle {$vehicle->vehicle_number} exceeded speed limit ({$speed} km/h).",
                        'type' => 'danger',
                        'source_type' => 'vehicle',
                        'source_id' => $vehicle->id,
                    ]);
                }
            }
        }

        $this->info('Alert generation complete.');
    }

    private function dispatchAlert($users, $data)
    {
        $signature = md5(json_encode($data));
        $cacheKey = "system_alert_{$signature}";
        
        $isSimulated = in_array($data['source_type'] ?? '', ['vehicle']);
        $cooldownMinutes = $isSimulated ? 60 : 1440;

        if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            foreach ($users as $user) {
                // Check if user already has an unread notification for this source
                $existingUnread = $user->unreadNotifications()
                    ->where('type', SystemAlertNotification::class)
                    ->where('data->source_type', $data['source_type'])
                    ->where('data->source_id', $data['source_id'])
                    ->exists();

                if (!$existingUnread) {
                    $user->notify(new SystemAlertNotification($data));
                }
            }
            \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addMinutes($cooldownMinutes));
        }
    }
}
