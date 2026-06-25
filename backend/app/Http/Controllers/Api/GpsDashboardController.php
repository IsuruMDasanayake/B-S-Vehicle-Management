<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Vehicle;
use App\Models\GpsLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class GpsDashboardController extends Controller
{
    /**
     * Get the latest known locations for all vehicles.
     * Also calculates high-level status counts.
     */
    public function currentLocations(Request $request)
    {
        // To get the latest log per vehicle, we can use a subquery or distinct on vehicle_id
        // For MySQL, a common pattern is to join with a subquery of max(id) or max(logged_at)
        
        $latestLogsSubquery = DB::table('gps_logs')
            ->select('vehicle_id', DB::raw('MAX(id) as max_id'))
            ->groupBy('vehicle_id');

        $latestLogs = GpsLog::joinSub($latestLogsSubquery, 'latest', function ($join) {
                $join->on('gps_logs.id', '=', 'latest.max_id');
            })
            ->with('vehicle:id,vehicle_number,brand,model')
            ->get();

        $stats = [
            'total' => $latestLogs->count(),
            'moving' => 0,
            'idling' => 0,   // Engine on but not moving
            'stopped' => 0,  // Engine off, not moving
            'offline' => 0,  // No update in last 10 minutes
        ];

        // Calculate today's distance for each vehicle
        $todayLogs = GpsLog::whereDate('logged_at', Carbon::today())
            ->orderBy('logged_at', 'asc')
            ->get()
            ->groupBy('vehicle_id');

        $distances = [];
        foreach ($todayLogs as $vId => $logs) {
            $logsArr = $logs->values();
            $d = 0;
            for ($i = 1; $i < count($logsArr); $i++) {
                $d += $this->calculateHaversineDistance(
                    $logsArr[$i-1]->latitude, $logsArr[$i-1]->longitude,
                    $logsArr[$i]->latitude, $logsArr[$i]->longitude
                );
            }
            $distances[$vId] = $d;
        }

        $now = Carbon::now();

        $locations = $latestLogs->map(function ($log) use (&$stats, $now, $distances) {
            $isOffline = $log->logged_at->diffInMinutes($now) > 10;
            
            $status = 'offline';
            if (!$isOffline) {
                if ($log->speed > 0) {
                    $status = 'moving';
                    $stats['moving']++;
                } else if ($log->speed == 0 && $log->ignition_status) {
                    $status = 'idling';
                    $stats['idling']++;
                } else {
                    $status = 'stopped';
                    $stats['stopped']++;
                }
            } else {
                $stats['offline']++;
            }

            return [
                'vehicle_id' => $log->vehicle_id,
                'vehicle_number' => $log->vehicle->vehicle_number ?? 'Unknown',
                'brand' => $log->vehicle->brand ?? '',
                'model' => $log->vehicle->model ?? '',
                'latitude' => $log->latitude,
                'longitude' => $log->longitude,
                'speed' => $log->speed,
                'ignition_status' => $log->ignition_status,
                'logged_at' => $log->logged_at,
                'status' => $status,
                'today_distance' => round($distances[$log->vehicle_id] ?? 0, 2),
            ];
        });

        return response()->json([
            'stats' => $stats,
            'locations' => $locations,
        ]);
    }

    /**
     * Get historical GPS logs for a specific vehicle.
     * Default to today's logs if no date is provided.
     */
    public function history(Request $request, $vehicleId)
    {
        $fromDate = $request->input('from_date', Carbon::today()->toDateString());
        $toDate = $request->input('to_date', Carbon::today()->toDateString());
        $fromTime = $request->filled('from_time') ? $request->input('from_time') : '00:00:00';
        $toTime = $request->filled('to_time') ? $request->input('to_time') : '23:59:59';
        $minSpeed = $request->input('min_speed', 0);

        $startDateTime = Carbon::parse($fromDate . ' ' . $fromTime);
        $endDateTime = Carbon::parse($toDate . ' ' . $toTime);

        $query = GpsLog::where('vehicle_id', $vehicleId)
            ->whereBetween('logged_at', [$startDateTime, $endDateTime])
            ->orderBy('logged_at', 'asc');
            
        if ($minSpeed > 0) {
            $query->where('speed', '>=', $minSpeed);
        }

        $logs = $query->get();

        $distanceKm = 0;
        $events = [];
        $currentEvent = null;

        for ($i = 0; $i < count($logs); $i++) {
            $log = $logs[$i];

            if ($i > 0) {
                $distanceKm += $this->calculateHaversineDistance(
                    $logs[$i-1]->latitude, $logs[$i-1]->longitude,
                    $log->latitude, $log->longitude
                );
            }

            if ($minSpeed == 0) {
                if ($log->speed == 0) {
                    if (!$currentEvent) {
                        $currentEvent = [
                            'type' => $log->ignition_status ? 'idling' : 'parking',
                            'lat' => $log->latitude,
                            'lng' => $log->longitude,
                            'start_time' => $log->logged_at,
                            'end_time' => $log->logged_at,
                        ];
                    } else {
                        $currentEvent['end_time'] = $log->logged_at;
                        if ($currentEvent['type'] == 'parking' && $log->ignition_status) {
                            $currentEvent['type'] = 'idling';
                        }
                    }
                } else {
                    if ($currentEvent) {
                        $duration = $currentEvent['start_time']->diffInMinutes($currentEvent['end_time']);
                        if ($duration >= 1) {
                            $events[] = [
                                'type' => $currentEvent['type'],
                                'lat' => $currentEvent['lat'],
                                'lng' => $currentEvent['lng'],
                                'start_time' => $currentEvent['start_time']->toDateTimeString(),
                                'end_time' => $currentEvent['end_time']->toDateTimeString(),
                                'duration_mins' => $duration
                            ];
                        }
                        $currentEvent = null;
                    }
                }
            }
        }

        if ($currentEvent && $minSpeed == 0) {
            $duration = $currentEvent['start_time']->diffInMinutes($currentEvent['end_time']);
            if ($duration >= 1) {
                $events[] = [
                    'type' => $currentEvent['type'],
                    'lat' => $currentEvent['lat'],
                    'lng' => $currentEvent['lng'],
                    'start_time' => $currentEvent['start_time']->toDateTimeString(),
                    'end_time' => $currentEvent['end_time']->toDateTimeString(),
                    'duration_mins' => $duration
                ];
            }
        }

        return response()->json([
            'date_range' => ['from' => $startDateTime->toDateTimeString(), 'to' => $endDateTime->toDateTimeString()],
            'total_points' => $logs->count(),
            'distance_km' => round($distanceKm, 2),
            'events' => $events,
            'path' => $logs->map(function ($log) {
                return [
                    'lat' => $log->latitude,
                    'lng' => $log->longitude,
                    'speed' => $log->speed,
                    'ignition' => $log->ignition_status,
                    'time' => $log->logged_at->toDateTimeString(),
                ];
            })
        ]);
    }

    /**
     * Get general dashboard statistics (e.g., total distance traveled today).
     */
    public function statistics(Request $request)
    {
        // We will calculate the total distance traveled by ALL vehicles today
        // By fetching all logs for today, grouping by vehicle, and calculating distance.
        $todayLogs = GpsLog::whereDate('logged_at', Carbon::today())
            ->orderBy('logged_at', 'asc')
            ->get()
            ->groupBy('vehicle_id');

        $totalDistanceToday = 0;

        foreach ($todayLogs as $vehicleId => $logs) {
            $logsArr = $logs->values();
            for ($i = 1; $i < count($logsArr); $i++) {
                $totalDistanceToday += $this->calculateHaversineDistance(
                    $logsArr[$i-1]->latitude, $logsArr[$i-1]->longitude,
                    $logsArr[$i]->latitude, $logsArr[$i]->longitude
                );
            }
        }

        // Active vehicles today
        $activeVehiclesCount = $todayLogs->count();

        return response()->json([
            'total_distance_today_km' => round($totalDistanceToday, 2),
            'active_vehicles_today' => $activeVehiclesCount,
        ]);
    }

    /**
     * Helper to calculate distance
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
