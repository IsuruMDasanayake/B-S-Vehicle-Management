<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\FuelEntry;
use App\Models\Expense;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $from = $request->get('from', now()->startOfMonth()->toDateString());
        $to   = $request->get('to', now()->toDateString());

        // Fuel by vehicle
        $fuelByVehicle = FuelEntry::with('vehicle:id,vehicle_number')
            ->whereBetween('date', [$from, $to])
            ->selectRaw('vehicle_id, SUM(quantity_liters) as total_litres, SUM(total_cost) as total_cost')
            ->groupBy('vehicle_id')
            ->get();

        // Fuel by day (for chart)
        $fuelByDay = FuelEntry::whereBetween('date', [$from, $to])
            ->selectRaw('date, SUM(total_cost) as total_cost, SUM(quantity_liters) as total_litres')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Expense by type
        $expenseByType = Expense::whereBetween('date', [$from, $to])
            ->selectRaw('expense_type, SUM(amount) as total')
            ->groupBy('expense_type')
            ->get();

        // Monthly maintenance cost
        $maintenanceCost = \App\Models\MaintenanceRecord::whereBetween('service_date', [$from, $to])
            ->sum('cost');

        return response()->json([
            'period' => compact('from', 'to'),
            'fuel_by_vehicle' => $fuelByVehicle,
            'fuel_by_day' => $fuelByDay,
            'expense_by_type' => $expenseByType,
            'total_fuel_cost' => FuelEntry::whereBetween('date', [$from, $to])->sum('total_cost'),
            'total_maintenance_cost' => $maintenanceCost,
            'total_expenses' => Expense::whereBetween('date', [$from, $to])->sum('amount'),
        ]);
    }
}
