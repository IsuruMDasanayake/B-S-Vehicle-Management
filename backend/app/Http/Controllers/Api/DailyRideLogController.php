<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyRideLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DailyRideLogController extends Controller
{
    public function index(Request $request)
    {
        $query = DailyRideLog::with(['vehicle', 'driver']);
        
        if ($request->has('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }
        
        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        
        if ($request->has('date')) {
            $query->where('date', $request->date);
        }
        
        // For external driver portal, restrict to their own logs
        if ($request->user() && $request->user()->tokenCan('role:driver')) {
            // Assuming driver is authenticated and we have their driver_id
            // This depends on how the driver auth is set up. We'll pass driver_id explicitly for now
            // or assume it's enforced by middleware/token.
        }

        $logs = $query->orderBy('date', 'desc')->paginate($request->per_page ?? 15);
        return response()->json($logs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|exists:vehicles,id',
            'driver_id' => 'required|exists:drivers,id',
            'date' => 'required|date',
            'platform' => 'required|string',
            'morning_odo' => 'required|numeric',
            'night_odo' => 'required|numeric',
            'hire_km' => 'required|numeric',
            'gross_revenue' => 'required|numeric',
            'commission' => 'required|numeric',
            'net_revenue' => 'required|numeric',
            'wallet_balance' => 'nullable|numeric',
            'extra_earnings' => 'nullable|numeric',
            'fuel_cost' => 'nullable|numeric',
            'notes' => 'nullable|string'
        ]);

        // Check if log already exists
        $exists = DailyRideLog::where('driver_id', $validated['driver_id'])
            ->where('date', $validated['date'])
            ->where('platform', $validated['platform'])
            ->exists();
            
        if ($exists) {
            return response()->json(['message' => 'A log for this platform on this date already exists.'], 422);
        }

        $validated['status'] = 'pending';
        $log = DailyRideLog::create($validated);
        
        if ($request->hasFile('attachments')) {
            $log->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Ride log submitted successfully', 'data' => $log->load('attachments')], 201);
    }

    public function show(DailyRideLog $dailyRideLog)
    {
        return response()->json(['data' => $dailyRideLog->load(['vehicle', 'driver', 'attachments'])]);
    }

    public function update(Request $request, DailyRideLog $dailyRideLog)
    {
        // Drivers can only update if it's pending. Admins can update anytime.
        // We'll assume the frontend restricts the form, but let's add a basic check.
        $isAdmin = $request->user() && $request->user()->tokenCan('role:admin');
        
        if (!$isAdmin && $dailyRideLog->status !== 'pending') {
            return response()->json(['message' => 'Cannot update an approved or rejected log.'], 403);
        }

        $validated = $request->validate([
            'morning_odo' => 'numeric',
            'night_odo' => 'numeric',
            'hire_km' => 'numeric',
            'gross_revenue' => 'numeric',
            'commission' => 'numeric',
            'net_revenue' => 'numeric',
            'wallet_balance' => 'nullable|numeric',
            'extra_earnings' => 'nullable|numeric',
            'fuel_cost' => 'nullable|numeric',
            'notes' => 'nullable|string'
        ]);

        $dailyRideLog->update($validated);

        if ($request->hasFile('attachments')) {
            $dailyRideLog->saveAttachments($request->file('attachments'));
        }

        return response()->json(['message' => 'Ride log updated successfully', 'data' => $dailyRideLog->fresh('attachments')]);
    }

    public function updateStatus(Request $request, DailyRideLog $dailyRideLog)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        DB::transaction(function () use ($dailyRideLog, $validated) {
            $dailyRideLog->update(['status' => $validated['status']]);
            
            // If approved and has fuel cost, create a fuel entry
            if ($validated['status'] === 'approved' && $dailyRideLog->fuel_cost > 0) {
                // Check if a fuel entry already exists for this log to prevent duplicates
                $exists = \App\Models\FuelEntry::where('vehicle_id', $dailyRideLog->vehicle_id)
                    ->where('date', $dailyRideLog->date)
                    ->where('driver_id', $dailyRideLog->driver_id)
                    ->where('total_cost', $dailyRideLog->fuel_cost)
                    ->where('notes', 'LIKE', '%Ride Log ID: ' . $dailyRideLog->id . '%')
                    ->exists();
                    
                if (!$exists) {
                    \App\Models\FuelEntry::create([
                        'vehicle_id' => $dailyRideLog->vehicle_id,
                        'driver_id' => $dailyRideLog->driver_id,
                        'fuel_type' => 'petrol', // Default or could be inferred from vehicle
                        'quantity_liters' => 0, // Unknown quantity
                        'cost_per_liter' => 0,
                        'total_cost' => $dailyRideLog->fuel_cost,
                        'odometer_reading' => $dailyRideLog->morning_odo,
                        'date' => $dailyRideLog->date,
                        'notes' => "Auto-generated from approved Ride Log ID: {$dailyRideLog->id}"
                    ]);
                }
            }
        });

        return response()->json(['message' => 'Status updated successfully', 'data' => $dailyRideLog]);
    }

    public function destroy(DailyRideLog $dailyRideLog)
    {
        $dailyRideLog->delete();
        return response()->json(['message' => 'Ride log deleted successfully']);
    }

    public function analytics(Request $request)
    {
        $query = DailyRideLog::with(['driver', 'vehicle'])->where('status', 'approved');
        
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }
        
        $logs = $query->get();
        
        $totalGross = $logs->sum('gross_revenue');
        $totalCommission = $logs->sum('commission');
        $totalNet = $logs->sum('net_revenue');
        $totalFuel = $logs->sum('fuel_cost');
        
        $totalKm = $logs->sum('total_km');
        $hireKm = $logs->sum('hire_km');
        $emptyKm = $logs->sum('empty_km');
        
        // Group by platform
        $platformStats = $logs->groupBy('platform')->map(function ($group, $platform) {
            return [
                'platform' => $platform,
                'gross_revenue' => $group->sum('gross_revenue'),
                'commission' => $group->sum('commission'),
                'net_revenue' => $group->sum('net_revenue'),
                'fuel_cost' => $group->sum('fuel_cost'),
            ];
        })->values();

        $groupByDate = $request->boolean('group_by_date', false);

        // Top Drivers
        $driverGroups = $groupByDate 
            ? $logs->groupBy(function($item) { return $item->driver_id . '_' . $item->date; })
            : $logs->groupBy('driver_id');

        $driverStats = $driverGroups->map(function ($group) {
            $driver = $group->first()->driver;
            return [
                'driver_id' => $driver ? $driver->id : null,
                'driver_name' => $driver ? $driver->name : 'Unknown',
                'date' => $group->first()->date,
                'net_revenue' => $group->sum('net_revenue'),
                'fuel_cost' => $group->sum('fuel_cost'),
                'total_km' => $group->sum('total_km')
            ];
        })->sortByDesc($groupByDate ? 'date' : 'net_revenue')->values();

        if ($request->limit !== 'all') {
            $driverStats = $driverStats->take(5);
        }

        // Top Vehicles
        $vehicleGroups = $groupByDate 
            ? $logs->groupBy(function($item) { return $item->vehicle_id . '_' . $item->date; })
            : $logs->groupBy('vehicle_id');

        $vehicleStats = $vehicleGroups->map(function ($group) {
            $vehicle = $group->first()->vehicle;
            return [
                'vehicle_id' => $vehicle ? $vehicle->id : null,
                'vehicle_number' => $vehicle ? $vehicle->vehicle_number : 'Unknown',
                'date' => $group->first()->date,
                'net_revenue' => $group->sum('net_revenue'),
                'fuel_cost' => $group->sum('fuel_cost'),
                'total_km' => $group->sum('total_km')
            ];
        })->sortByDesc($groupByDate ? 'date' : 'net_revenue')->values();

        if ($request->limit !== 'all') {
            $vehicleStats = $vehicleStats->take(5);
        }
        
        return response()->json([
            'data' => [
                'total_gross' => $totalGross,
                'total_commission' => $totalCommission,
                'total_net' => $totalNet,
                'total_fuel' => $totalFuel,
                'total_km' => $totalKm,
                'hire_km' => $hireKm,
                'empty_km' => $emptyKm,
                'platforms' => $platformStats,
                'top_drivers' => $driverStats,
                'top_vehicles' => $vehicleStats
            ]
        ]);
    }
}
