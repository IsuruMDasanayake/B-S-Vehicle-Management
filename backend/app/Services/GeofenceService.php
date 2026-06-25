<?php

namespace App\Services;

use App\Models\Vehicle;
use App\Models\User;
use App\Notifications\SystemAlertNotification;
use App\Events\SystemAlertGenerated;
use Illuminate\Support\Facades\Notification;

class GeofenceService
{
    public static function checkGeofences($vehicleId, $vehicleNumber, $prevLat, $prevLng, $currLat, $currLng)
    {
        if ($prevLat === null || $prevLng === null) return;

        $vehicle = Vehicle::with('geofences')->find($vehicleId);
        if (!$vehicle) return;

        foreach ($vehicle->geofences as $geofence) {
            if (!$geofence->is_active) continue;

            $wasInside = self::isInsideGeofence($prevLat, $prevLng, $geofence);
            $isInside = self::isInsideGeofence($currLat, $currLng, $geofence);

            $transition = null;
            if (!$wasInside && $isInside) {
                $transition = 'entry';
            } elseif ($wasInside && !$isInside) {
                $transition = 'exit';
            }

            if ($transition) {
                if ($geofence->alert_type === 'both' || $geofence->alert_type === $transition) {
                    $actionText = $transition === 'entry' ? 'entered' : 'exited';
                    $message = "Vehicle $vehicleNumber has $actionText the geofence '{$geofence->name}'.";
                    
                    $notifiableUsers = User::role(['super_admin', 'fleet_manager'])->get();
                    if ($notifiableUsers->isNotEmpty()) {
                        $alertData = [
                            'title' => 'Geofence Alert',
                            'message' => $message,
                            'type' => 'info',
                            'source_type' => 'geofence',
                            'source_id' => $geofence->id,
                        ];
                        
                        Notification::send($notifiableUsers, new SystemAlertNotification($alertData));
                        
                        // Broadcast public event so UI can listen without Auth context
                        broadcast(new SystemAlertGenerated($alertData))->toOthers();
                    }
                }
            }
        }
    }

    public static function isInsideGeofence($lat, $lng, $geofence)
    {
        $coords = $geofence->coordinates;
        
        if ($geofence->type === 'circle') {
            $centerLat = $coords[0];
            $centerLng = $coords[1];
            
            $earthRadius = 6371000;
            $dLat = deg2rad($lat - $centerLat);
            $dLng = deg2rad($lng - $centerLng);
            $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($centerLat)) * cos(deg2rad($lat)) * sin($dLng/2) * sin($dLng/2);
            $c = 2 * asin(sqrt($a));
            $distance = $earthRadius * $c;
            
            return $distance <= $geofence->radius;
        } 
        
        if ($geofence->type === 'polygon') {
            $inside = false;
            $x = $lng;
            $y = $lat;
            $j = count($coords) - 1;
            
            for ($i = 0; $i < count($coords); $i++) {
                $xi = $coords[$i][1];
                $yi = $coords[$i][0];
                $xj = $coords[$j][1];
                $yj = $coords[$j][0];

                $intersect = (($yi > $y) != ($yj > $y)) && ($x < ($xj - $xi) * ($y - $yi) / ($yj - $yi) + $xi);
                if ($intersect) $inside = !$inside;
                
                $j = $i;
            }
            return $inside;
        }
        
        return false;
    }
}
