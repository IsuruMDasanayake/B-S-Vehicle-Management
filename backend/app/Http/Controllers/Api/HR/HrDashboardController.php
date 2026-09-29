<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Models\HrEmployee;
use Carbon\Carbon;

class HrDashboardController extends Controller
{
    public function stats()
    {
        $today      = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();

        $total      = HrEmployee::whereIn('status', ['active', 'probation', 'on_leave'])->count();
        $onLeave    = HrEmployee::where('status', 'on_leave')->count();
        $newThisMonth = HrEmployee::where('joined_date', '>=', $monthStart)->count();

        // Birthdays this week
        $weekStart  = Carbon::now()->startOfWeek();
        $weekEnd    = Carbon::now()->endOfWeek();
        $birthdays  = HrEmployee::whereNotNull('dob')
            ->whereRaw('DATE_FORMAT(dob, "%m-%d") BETWEEN ? AND ?', [
                $weekStart->format('m-d'),
                $weekEnd->format('m-d'),
            ])->count();

        // Probation employees whose probation end date is within 30 days (contracts expiring)
        $contractsExpiring = HrEmployee::where('status', 'probation')
            ->whereNotNull('probation_end_date')
            ->whereBetween('probation_end_date', [$today, $today->copy()->addDays(30)])
            ->count();

        return response()->json([
            'total_employees'         => $total,
            'present_today'           => 0,   // Will populate from attendance module
            'absent_today'            => 0,   // Will populate from attendance module
            'on_leave_today'          => $onLeave,
            'late_arrivals'           => 0,   // Will populate from attendance module
            'new_this_month'          => $newThisMonth,
            'birthdays_this_week'     => $birthdays,
            'contracts_expiring'      => $contractsExpiring,
            'pending_leave_requests'  => 0,   // Will populate from leave module
            'payroll_status'          => 'Pending',

            // Department breakdown for chart
            'by_department' => HrEmployee::with('department')
                ->whereIn('status', ['active', 'probation', 'on_leave'])
                ->get()
                ->groupBy('department.name')
                ->map->count()
                ->map(fn($count, $name) => ['name' => $name ?? 'Unassigned', 'value' => $count])
                ->values(),
        ]);
    }
}
