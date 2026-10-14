<?php

namespace App\Console\Commands;

use App\Models\HrAttendance;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class AutoClockOut extends Command
{
    protected $signature = 'hr:auto-clock-out {--date= : Specific date to process (YYYY-MM-DD)}';
    protected $description = 'Automatically clocks out employees who forgot to clock out at the end of their shift';

    const SHIFT_END = '17:30:00';
    const HALF_DAY_HRS = 4.5;

    public function handle(): int
    {
        $specificDate = $this->option('date');
        $query = HrAttendance::whereNotNull('clock_in_time')
            ->whereNull('clock_out_time');

        if ($specificDate) {
            $query->where('date', $specificDate);
        } else {
            // By default, process all unclosed attendances up to yesterday (or today if after 11 PM)
            $nowLocal = Carbon::now('Asia/Colombo');
            $cutoffDate = $nowLocal->hour >= 23 
                ? $nowLocal->toDateString() 
                : $nowLocal->subDay()->toDateString();

            $query->where('date', '<=', $cutoffDate);
        }

        $records = $query->get();
        $this->info("Found {$records->count()} attendance record(s) with missing clock-out.");

        $processed = 0;
        foreach ($records as $att) {
            $dateStr = Carbon::parse($att->date)->toDateString();
            $clockIn = Carbon::parse($att->clock_in_time);
            
            // Default auto clock-out time: 17:30:00 (5:30 PM) on that shift day in Sri Lanka timezone
            // Stored as UTC (12:00:00 UTC) so that client browsers in Sri Lanka render 17:30 (5:30 PM)
            $clockOut = Carbon::parse($dateStr . ' ' . self::SHIFT_END, 'Asia/Colombo')->utc();

            // If employee clocked in after 17:30, set clock out to clock in + 1 hour as safety fallback
            if ($clockIn->greaterThan($clockOut)) {
                $clockOut = $clockIn->copy()->addHour();
            }

            $hoursWorked = round($clockIn->diffInMinutes($clockOut) / 60, 2);
            $status = $hoursWorked < self::HALF_DAY_HRS ? 'half_day' : $att->status;

            $att->update([
                'clock_out_time'    => $clockOut,
                'working_hours'     => $hoursWorked,
                'status'            => $status,
                'is_auto_clock_out' => true,
                'notes'             => trim(($att->notes ? $att->notes . ' | ' : '') . 'Auto clocked-out at 5:30 PM (System fallback: employee forgot to clock out)'),
            ]);

            $processed++;
        }

        $this->info("Successfully auto clocked-out {$processed} record(s).");
        Log::info("hr:auto-clock-out completed: {$processed} records updated.");
        return Command::SUCCESS;
    }
}
