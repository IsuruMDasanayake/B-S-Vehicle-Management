<?php

namespace App\Console\Commands;

use App\Models\HrEmployee;
use App\Models\User;
use App\Notifications\HrNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RemindMboAppraisal extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hr:remind-mbo-appraisal {--type=auto : auto, employee (25th), or manager (1st)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send monthly MBO performance appraisal reminders to employees (on 25th) and managers/directors (on 1st)';

    /**
     * Executive email list for directors.
     */
    private static array $directorEmails = [
        'hasintha@circlegroup.lk',
        'eranda@circlegroup.lk',
    ];

    public function handle(): int
    {
        $now = Carbon::now('Asia/Colombo');
        $day = $now->day;
        $type = $this->option('type') ?: 'auto';

        $this->info("Executing MBO Reminders for {$now->toDateString()} (Day: {$day}, Type: {$type})");

        // 1. Employee Reminder: Sent on 25th of current month (or if explicitly requested)
        if ($type === 'employee' || ($type === 'auto' && $day === 25)) {
            $this->sendEmployeeReminders($now);
        }

        // 2. Manager & Director Reminder: Sent on 1st of following month (or if explicitly requested)
        if ($type === 'manager' || ($type === 'auto' && $day === 1)) {
            $this->sendManagerAndDirectorReminders($now);
        }

        if ($type === 'auto' && $day !== 25 && $day !== 1) {
            $this->info("Today is day {$day}. No automated MBO reminders scheduled for today (Scheduled for 25th and 1st).");
        }

        return Command::SUCCESS;
    }

    /**
     * Send reminders to all active employees to submit their monthly self-evaluations.
     */
    protected function sendEmployeeReminders(Carbon $now): void
    {
        $currentMonthName = $now->format('F Y');
        $this->info("Sending employee self-appraisal reminders for {$currentMonthName}...");

        $activeEmployees = HrEmployee::with('user')
            ->where('status', 'active')
            ->get();

        $sentCount = 0;
        foreach ($activeEmployees as $emp) {
            $user = $emp->user;
            if (!$user) {
                // If user relation missing, try resolving by company_email
                if (!empty($emp->company_email)) {
                    $user = User::where('email', $emp->company_email)->first();
                }
            }

            if (!$user) continue;

            $payload = [
                'division'  => 'hr',
                'category'  => 'compliance',
                'severity'  => 'warning',
                'title'     => '🎯 Monthly MBO Self-Evaluation Due',
                'message'   => "Please finalize and submit your monthly MBO self-evaluations for {$currentMonthName}. Record your achievements and review your KPIs.",
                'link'      => '/solar/hr/portal/appraisals',
                'source_id' => 'mbo-self-' . $now->format('Y-m'),
            ];

            try {
                $user->notify(new HrNotification($payload));
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Failed to send MBO employee reminder to user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Dispatched employee reminders to {$sentCount} active employees.");
    }

    /**
     * Send reminders to Line Managers, HR Admins, and Project Directors/CEO to finalize reviews.
     */
    protected function sendManagerAndDirectorReminders(Carbon $now): void
    {
        // 1st of month refers to the preceding month's performance period
        $prevMonth = $now->copy()->subMonth();
        $prevMonthName = $prevMonth->format('F Y');
        $this->info("Sending manager & director evaluation reminders for {$prevMonthName}...");

        // Collect all managers
        $managerEmployeeIds = HrEmployee::whereNotNull('manager_id')
            ->distinct()
            ->pluck('manager_id')
            ->filter();

        $managerUsers = HrEmployee::whereIn('id', $managerEmployeeIds)
            ->with('user')
            ->get()
            ->map(fn($e) => $e->user ?? User::where('email', $e->company_email)->first())
            ->filter();

        // Collect HR Admins & Super Admins
        $adminUsers = User::whereIn('role', ['solar_hr_admin', 'super_admin'])->get();

        // Collect Executive Directors
        $directorUsers = User::whereIn('email', self::$directorEmails)->get();

        // Unique user collection
        $allRecipients = $managerUsers
            ->concat($adminUsers)
            ->concat($directorUsers)
            ->unique('id');

        $sentCount = 0;
        foreach ($allRecipients as $user) {
            $isDirector = in_array(strtolower(trim($user->email)), self::$directorEmails, true);

            $title = $isDirector
                ? '📋 Monthly MBO Director Sign-Offs Pending'
                : '⏳ Team MBO Evaluations Pending';

            $message = $isDirector
                ? "Team evaluations for {$prevMonthName} are ready for your review and official Director sign-off."
                : "Team evaluations & Director approvals pending for {$prevMonthName}. Please finalize ratings and feedback.";

            $payload = [
                'division'  => 'hr',
                'category'  => 'compliance',
                'severity'  => 'warning',
                'title'     => $title,
                'message'   => $message,
                'link'      => $isDirector ? '/solar/hr/portal/appraisals?tab=director' : '/solar/hr/portal/appraisals?tab=team',
                'source_id' => 'mbo-eval-' . $prevMonth->format('Y-m'),
            ];

            try {
                $user->notify(new HrNotification($payload));
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Failed to send MBO manager reminder to user {$user->id}: " . $e->getMessage());
            }
        }

        $this->info("Dispatched review reminders to {$sentCount} managers, admins, and directors.");
    }
}
