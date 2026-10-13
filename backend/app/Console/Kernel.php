<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('alerts:generate')->everyMinute();
        $schedule->command('payments:generate-weekends')->dailyAt('00:05');

        // HR Attendance Reminders & Auto Clock-Out
        $schedule->command('hr:remind-clock-out')->dailyAt('17:30');
        $schedule->command('hr:auto-clock-out')->dailyAt('23:59');
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
