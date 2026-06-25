<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Events\VehicleLocationUpdated;
use Carbon\Carbon;
use App\Models\Vehicle;
use App\Models\Geofence;

class GpsWebhookController extends Controller
{
    public function handleTraccarWebhook(Request $request)
    {
        // Traccar sends a JSON payload. We extract device and position.
        $device = $request->input('device');
        $position = $request->input('position');

        if (!$device || !$position) {
            return response()->json(['status' => 'ignored', 'reason' => 'missing data'], 400);
        }

        $imei = $device['uniqueId'];

        // Find the vehicle by IMEI
        $vehicle = DB::table('vehicles')->where('imei', $imei)->first();

        if (!$vehicle) {
            return response()->json(['status' => 'ignored', 'reason' => 'vehicle not found'], 404);
        }

        // Prepare the GPS log data
        $gpsData = [
            'vehicle_id' => $vehicle->id,
            'latitude' => $position['latitude'],
            'longitude' => $position['longitude'],
            'speed' => $position['speed'] * 1.852, // Convert knots to km/h
            'ignition_status' => $position['attributes']['ignition'] ?? false,
            'timestamp' => Carbon::parse($position['deviceTime'])->toDateTimeString(),
        ];

        // Get previous log to determine enter/exit state
        $previousLog = DB::table('gps_logs')->where('vehicle_id', $vehicle->id)->orderBy('id', 'desc')->first();

        // Insert into database
        $logId = DB::table('gps_logs')->insertGetId($gpsData);
        $gpsData['id'] = $logId;
        $gpsData['vehicle_number'] = $vehicle->vehicle_number;

        // Check Geofences
        if ($previousLog) {
            \App\Services\GeofenceService::checkGeofences(
                $vehicle->id, 
                $vehicle->vehicle_number, 
                $previousLog->latitude, 
                $previousLog->longitude, 
                $gpsData['latitude'], 
                $gpsData['longitude']
            );
        }

        // Broadcast the event to WebSockets
        broadcast(new VehicleLocationUpdated($gpsData))->toOthers();

        return response()->json(['status' => 'success']);
    }
}
