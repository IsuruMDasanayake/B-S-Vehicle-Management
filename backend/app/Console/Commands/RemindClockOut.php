<?php

namespace App\Console\Commands;

use App\Models\HrAttendance;
use App\Notifications\HrNotification;
use App\Services\WebPushService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RemindClockOut extends Command
{
    protected $signature = 'hr:remind-clock-out';
    protected $description = 'Send clock-out reminders to employees who have clocked in today but have not yet clocked out';

    public function handle(WebPushService $webPushService): int
    {
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $openAttendances = HrAttendance::with(['employee.user'])
            ->where('date', $today)
            ->whereNotNull('clock_in_time')
            ->whereNull('clock_out_time')
            ->get();

        $this->info("Found {$openAttendances->count()} employee(s) with unclosed attendance today.");

        $sentCount = 0;
        foreach ($openAttendances as $att) {
            $user = $att->employee?->user;
            if (!$user) continue;

            $payload = [
                'division'  => 'hr',
                'category'  => 'attendance',
                'severity'  => 'info',
                'title'     => '🔔 Shift End Reminder: Clock Out',
                'message'   => 'Official shift ends at 5:30 PM. Please remember to clock out before leaving the office!',
                'link'      => '/solar/hr/portal/home',
                'source_id' => $att->id,
            ];

            try {
                // In-app & WebPush notification via HrNotification
                $user->notify(new HrNotification($payload));
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Clock-out reminder error for user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Clock-out reminders successfully dispatched to {$sentCount} employee(s).");
        return Command::SUCCESS;
    }
}
