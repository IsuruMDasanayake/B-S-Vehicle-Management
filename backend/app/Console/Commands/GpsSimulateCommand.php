<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Vehicle;
use App\Models\GpsLog;
use App\Events\VehicleLocationUpdated;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GpsSimulateCommand extends Command
{
    protected $signature = 'gps:simulate';
    protected $description = 'Simulate GPS data for all vehicles every 2 seconds';

    public function handle()
    {
        $this->info('Starting GPS simulation for ALL vehicles...');

        // Initial coordinates around Colombo, Sri Lanka
        $baseLat = 6.9271;
        $baseLng = 79.8612;

        // Keep track of vehicle states in memory
        $vehicleStates = [];

        while (true) {
            $vehicles = Vehicle::all();

            if ($vehicles->isEmpty()) {
                $this->warn('No vehicles found in database. Waiting...');
                sleep(5);
                continue;
            }

            foreach ($vehicles as $vehicle) {
                // Initialize state if not exists
                if (!isset($vehicleStates[$vehicle->id])) {
                    // Try to get last known location
                    $lastLog = GpsLog::where('vehicle_id', $vehicle->id)->latest('logged_at')->first();
                    
                    if ($lastLog) {
                        $currentLat = (float)$lastLog->latitude;
                        $currentLng = (float)$lastLog->longitude;
                    } else {
                        // Spread them out slightly
                        $currentLat = $baseLat + (mt_rand(-50, 50) / 10000);
                        $currentLng = $baseLng + (mt_rand(-50, 50) / 10000);
                    }

                    // Randomly assign a role: moving or stopped
                    $isMoving = mt_rand(1, 10) > 3; // 70% chance to be moving
                    $speed = $isMoving ? mt_rand(20, 60) : 0;
                    $ignition = $isMoving ? true : (mt_rand(1, 10) > 8); // 20% chance ignition ON while stopped (idling)

                    $vehicleStates[$vehicle->id] = [
                        'lat' => $currentLat,
                        'lng' => $currentLng,
                        'isMoving' => $isMoving,
                        'speed' => $speed,
                        'ignition' => $ignition,
                        'heading_lat' => (mt_rand(-10, 10) / 100000), // Tiny step
                        'heading_lng' => (mt_rand(-10, 10) / 100000), // Tiny step
                    ];
                }

                $state = &$vehicleStates[$vehicle->id];

                // 5% chance to change state (start/stop/turn)
                if (mt_rand(1, 100) <= 5) {
                    $state['isMoving'] = !$state['isMoving'];
                    $state['heading_lat'] = (mt_rand(-10, 10) / 100000);
                    $state['heading_lng'] = (mt_rand(-10, 10) / 100000);
                }

                $state['speed'] = $state['isMoving'] ? mt_rand(20, 60) : 0;
                $state['ignition'] = $state['isMoving'] ? true : (mt_rand(1, 10) > 8);

                $oldLat = $state['lat'];
                $oldLng = $state['lng'];

                if ($state['isMoving']) {
                    $state['lat'] += $state['heading_lat'];
                    $state['lng'] += $state['heading_lng'];
                }

                // Calculate distance in km
                $distanceKm = $this->calculateHaversineDistance($oldLat, $oldLng, $state['lat'], $state['lng']);

                // Begin Transaction to update GPS and Vehicle atomicly, retry 3 times on deadlock
                DB::transaction(function () use ($vehicle, $state, $distanceKm, $oldLat, $oldLng) {
                    // 1. Save Gps Log
                    $log = GpsLog::create([
                        'vehicle_id' => $vehicle->id,
                        'latitude' => $state['lat'],
                        'longitude' => $state['lng'],
                        'speed' => $state['speed'],
                        'ignition_status' => $state['ignition'],
                        'logged_at' => Carbon::now(),
                    ]);

                    // 2. Update Vehicle Odometer
                    if ($distanceKm > 0) {
                        $newOdometer = ($vehicle->current_odometer ?? 0) + $distanceKm;
                        // Avoid triggering events if possible or just standard update
                        $vehicle->current_odometer = $newOdometer;
                        $vehicle->save();
                    }

                    // Check Geofences
                    \App\Services\GeofenceService::checkGeofences(
                        $vehicle->id, 
                        $vehicle->vehicle_number, 
                        $oldLat, 
                        $oldLng, 
                        $state['lat'], 
                        $state['lng']
                    );

                    // 3. Broadcast Event
                    $gpsData = [
                        'id' => $log->id,
                        'vehicle_id' => $vehicle->id,
                        'vehicle_number' => $vehicle->vehicle_number,
                        'latitude' => $state['lat'],
                        'longitude' => $state['lng'],
                        'speed' => $state['speed'],
                        'ignition_status' => $state['ignition'],
                        'timestamp' => $log->logged_at->toDateTimeString(),
                        'distance_added' => $distanceKm,
                    ];

                    broadcast(new VehicleLocationUpdated($gpsData))->toOthers();
                }, 3);
            }

            $this->info("Simulated GPS for " . $vehicles->count() . " vehicles at " . Carbon::now()->toDateTimeString());
            
            // Wait 2 seconds
            sleep(2);
        }
    }

    /**
     * Calculate distance between two lat/lng coordinates using Haversine formula
     * Returns distance in Kilometers
     */
    private function calculateHaversineDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371; // km

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);

        $c = 2 * atan2(sqrt($a), sqrt(1-$a));

        return $earthRadius * $c;
    }
}
