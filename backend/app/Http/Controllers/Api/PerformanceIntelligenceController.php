<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyRideLog;
use App\Models\Driver;
use Illuminate\Http\Request;

class PerformanceIntelligenceController extends Controller
{
    public function drivers(Request $request)
    {
        $drivers = Driver::select('id', 'name')->orderBy('name')->get();
        return response()->json(['data' => $drivers]);
    }

    public function intelligence(Request $request)
    {
        $query = DailyRideLog::with(['driver', 'vehicle'])
            ->where('status', 'approved');

        if ($request->filled('driver_id')) {
            $query->where('driver_id', $request->driver_id);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $logs = $query->orderBy('date', 'asc')->get();
        $dayCount = $logs->groupBy('date')->count();

        if ($dayCount === 0) {
            return response()->json(['data' => null, 'message' => 'No approved logs found for the selected period.']);
        }

        $totalGross      = (float) $logs->sum('gross_revenue');
        $totalCommission = (float) $logs->sum('commission');
        $totalNet        = (float) $logs->sum('net_revenue');
        $totalFuel       = (float) $logs->sum('fuel_cost');
        $totalKm         = (float) $logs->sum('total_km');
        $hireKm          = (float) $logs->sum('hire_km');
        $emptyKm         = (float) $logs->sum('empty_km');
        $totalOtherExp   = (float) $logs->sum('other_expenses');

        $avgDailyGross    = round($totalGross / $dayCount, 2);
        $avgDailyNet      = round($totalNet / $dayCount, 2);
        $avgDailyFuel     = round($totalFuel / $dayCount, 2);
        $avgDailyKm       = round($totalKm / $dayCount, 2);
        $avgDailyHireKm   = round($hireKm / $dayCount, 2);
        $avgDailyEmptyKm  = round($emptyKm / $dayCount, 2);
        $avgDailyOther    = round($totalOtherExp / $dayCount, 2);

        $fuelCostPerKm    = $totalKm > 0 ? round($totalFuel / $totalKm, 2) : 0;
        $commissionRate   = $totalGross > 0 ? round($totalCommission / $totalGross * 100, 2) : 0;
        $emptyRunPercent  = $totalKm > 0 ? round($emptyKm / $totalKm * 100, 1) : 0;
        $hireKmPercent    = $totalKm > 0 ? round($hireKm / $totalKm * 100, 1) : 0;

        $dailyTrend = $logs->groupBy('date')->map(function ($group, $date) {
            return [
                'date'        => $date,
                'gross'       => (float) $group->sum('gross_revenue'),
                'net'         => (float) $group->sum('net_revenue'),
                'fuel'        => (float) $group->sum('fuel_cost'),
                'total_km'    => (float) $group->sum('total_km'),
                'commission'  => (float) $group->sum('commission'),
            ];
        })->values();

        $driverBreakdown = $logs->groupBy('driver_id')->map(function ($group) {
            $driver = $group->first()->driver;
            $driverDays = $group->groupBy('date')->count();
            $driverKm   = (float) $group->sum('total_km');
            $driverFuel = (float) $group->sum('fuel_cost');
            return [
                'driver_id'       => $driver?->id,
                'driver_name'     => $driver?->name ?? 'Unknown',
                'days_logged'     => $driverDays,
                'avg_daily_gross' => $driverDays > 0 ? round($group->sum('gross_revenue') / $driverDays, 2) : 0,
                'avg_daily_net'   => $driverDays > 0 ? round($group->sum('net_revenue') / $driverDays, 2) : 0,
                'avg_daily_km'    => $driverDays > 0 ? round($driverKm / $driverDays, 2) : 0,
                'total_net'       => (float) $group->sum('net_revenue'),
                'total_fuel'      => $driverFuel,
                'fuel_per_km'     => $driverKm > 0 ? round($driverFuel / $driverKm, 2) : 0,
                'empty_run_pct'   => $driverKm > 0 ? round($group->sum('empty_km') / $driverKm * 100, 1) : 0,
            ];
        })->values();

        return response()->json([
            'data' => [
                'period_days'          => $dayCount,
                'log_count'            => $logs->count(),
                'total_gross'          => $totalGross,
                'total_commission'     => $totalCommission,
                'total_net'            => $totalNet,
                'total_fuel'           => $totalFuel,
                'total_km'             => $totalKm,
                'hire_km'              => $hireKm,
                'empty_km'             => $emptyKm,
                'total_other_expenses' => $totalOtherExp,
                'avg_daily_gross'      => $avgDailyGross,
                'avg_daily_net'        => $avgDailyNet,
                'avg_daily_fuel'       => $avgDailyFuel,
                'avg_daily_km'         => $avgDailyKm,
                'avg_daily_hire_km'    => $avgDailyHireKm,
                'avg_daily_empty_km'   => $avgDailyEmptyKm,
                'avg_daily_other'      => $avgDailyOther,
                'fuel_cost_per_km'     => $fuelCostPerKm,
                'commission_rate'      => $commissionRate,
                'empty_run_percent'    => $emptyRunPercent,
                'hire_km_percent'      => $hireKmPercent,
                'daily_trend'          => $dailyTrend,
                'driver_breakdown'     => $driverBreakdown,
            ]
        ]);
    }
}
