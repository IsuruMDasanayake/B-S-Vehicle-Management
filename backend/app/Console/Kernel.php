<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Get the timezone that should be used by default for scheduled events.
     */
    protected function scheduleTimezone(): \DateTimeZone|string|null
    {
        return 'Asia/Colombo';
    }

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('alerts:generate')->everyMinute();
        $schedule->command('payments:generate-weekends')->dailyAt('00:05')->timezone('Asia/Colombo');

        // HR Attendance Reminders & Auto Clock-Out (Sri Lanka Standard Time)
        $schedule->command('hr:remind-clock-out')->dailyAt('17:30')->timezone('Asia/Colombo');
        $schedule->command('hr:auto-clock-out')->dailyAt('23:59')->timezone('Asia/Colombo');
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
