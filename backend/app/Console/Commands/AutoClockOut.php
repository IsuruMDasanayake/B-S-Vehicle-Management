<?php

namespace App\Console\Commands;

use App\Models\HrAttendance;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoClockOut extends Command
{
    protected $signature = 'hr:auto-clock-out {--date= : Specific date to process (YYYY-MM-DD)}';
    protected $description = 'Marks employees who forgot to clock out at the end of their shift as Missing Attendance with blank clock-out time';

    public function handle(): int
    {
        // Ensure status column can store 'missing' even if originally created as an ENUM
        try {
            DB::statement("ALTER TABLE hr_attendances MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'present'");
        } catch (\Throwable $e) {
            // Ignore if already VARCHAR or SQLite
        }

        $specificDate = $this->option('date');
        $query = HrAttendance::whereNotNull('clock_in_time')
            ->whereNull('clock_out_time')
            ->where('status', '!=', 'missing');

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
            $att->update([
                'clock_out_time'    => null,
                'working_hours'     => null,
                'status'            => 'missing',
                'is_auto_clock_out' => true,
                'notes'             => 'Missing clock-out (Clock-out left blank — employee must submit time & reason before month end)',
            ]);

            $processed++;
        }

        $this->info("Marked {$processed} record(s) as Missing Attendance (blank clock-out).");
        Log::info("hr:auto-clock-out completed: {$processed} records marked as missing attendance.");
        return Command::SUCCESS;
    }
}
