<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\MaintenanceRecord;
use App\Models\Trip;
use App\Models\InsurancePolicy;
use App\Models\RevenueLicense;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $totalVehicles = Vehicle::count();
        $activeVehicles = Vehicle::where('current_status', 'available')->orWhere('current_status', 'in_use')->count();
        $underMaintenance = Vehicle::where('current_status', 'under_maintenance')->count();
        $onTrip = Trip::where('status', 'ongoing')->count();
        
        $activeDrivers = Driver::where('status', 'active')->count();

        // Pending Alerts
        $insuranceExpiry = InsurancePolicy::where('expiry_date', '<=', now()->addDays(30))
            ->where('status', 'active')
            ->with('vehicle:id,vehicle_number')
            ->get();

        $licenseExpiry = RevenueLicense::where('expiry_date', '<=', now()->addDays(30))
            ->where('status', 'active')
            ->with('vehicle:id,vehicle_number')
            ->get();
            
        $serviceDue = MaintenanceRecord::where('status', 'scheduled')
            ->where(function($q) {
                $q->where('next_service_date', '<=', now()->addDays(7))
                  ->orWhereRaw('next_service_km <= (SELECT current_odometer FROM vehicles WHERE vehicles.id = maintenance_records.vehicle_id) + 500');
            })
            ->with('vehicle:id,vehicle_number')
            ->get();

        return response()->json([
            'stats' => [
                'total_vehicles' => $totalVehicles,
                'active_vehicles' => $activeVehicles,
                'under_maintenance' => $underMaintenance,
                'active_drivers' => $activeDrivers,
                'on_trip' => $onTrip
            ],
            'alerts' => [
                'insurance_expiry' => $insuranceExpiry,
                'license_expiry' => $licenseExpiry,
                'service_due' => $serviceDue,
            ]
        ]);
    }
}
