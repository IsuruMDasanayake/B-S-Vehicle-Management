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
        
        $presentToday = \App\Models\HrAttendance::where('date', $today->toDateString())
            ->whereIn('status', ['present', 'half_day', 'late', 'wfh'])->count();
        $lateToday = \App\Models\HrAttendance::where('date', $today->toDateString())
            ->where('status', 'late')->count();
        $absentToday = \App\Models\HrAttendance::where('date', $today->toDateString())
            ->where('status', 'absent')->count();
        
        $pendingLeaves = \App\Models\HrLeave::where('status', 'pending')->count();
        $onLeaveToday = \App\Models\HrLeave::whereIn('status', ['manager_approved', 'approved'])
            ->where('start_date', '<=', $today->toDateString())
            ->where('end_date', '>=', $today->toDateString())
            ->count();

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

        // Headcount Growth (Last 6 Months)
        $headcountTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i)->endOfMonth();
            $count = HrEmployee::where('joined_date', '<=', $date)->where(function($q) use ($date) {
                $q->whereNull('deleted_at')->orWhere('deleted_at', '>', $date);
            })->whereIn('status', ['active', 'probation', 'on_leave'])->count();
            $headcountTrend[] = ['month' => $date->format('M'), 'count' => $count];
        }

        // Leave Trend Monthly (Last 6 Months)
        $leaveMonthly = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $month = $date->format('Y-m');
            $leaves = \App\Models\HrLeave::whereIn('status', ['approved', 'manager_approved'])
                ->where('start_date', 'like', $month . '%')->get();
            $leaveMonthly[] = [
                'month' => $date->format('M'),
                'annual' => $leaves->where('leave_type', 'annual')->count(),
                'casual' => $leaves->where('leave_type', 'casual')->count(),
                'medical' => $leaves->where('leave_type', 'medical')->count(),
            ];
        }

        // Attendance Trend (Last 15 days)
        $attendanceTrend = [];
        for ($i = 14; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->toDateString();
            $atts = \App\Models\HrAttendance::where('date', $date)->get();
            $attendanceTrend[] = [
                'day' => Carbon::parse($date)->format('d M'),
                'present' => $atts->whereIn('status', ['present', 'half_day', 'late', 'wfh'])->count(),
                'absent' => $atts->where('status', 'absent')->count(),
                'leave' => \App\Models\HrLeave::whereIn('status', ['manager_approved', 'approved'])
                    ->where('start_date', '<=', $date)
                    ->where('end_date', '>=', $date)
                    ->count(),
            ];
        }

        return response()->json([
            'total_employees'         => $total,
            'present_today'           => $presentToday,
            'absent_today'            => $absentToday,
            'on_leave_today'          => $onLeaveToday,
            'late_arrivals'           => $lateToday,
            'new_this_month'          => $newThisMonth,
            'birthdays_this_week'     => $birthdays,
            'contracts_expiring'      => $contractsExpiring,
            'pending_leave_requests'  => $pendingLeaves,
            'payroll_status'          => 'Pending',

            // Charts Data
            'attendance_trend'        => $attendanceTrend,
            'leave_monthly'           => $leaveMonthly,
            'headcount_trend'         => $headcountTrend,

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
