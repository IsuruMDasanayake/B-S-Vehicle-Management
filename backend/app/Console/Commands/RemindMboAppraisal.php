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
    protected $signature = 'hr:remind-mbo-appraisal {--type=auto : auto, employee (25th), manager (1st), appraiser, or objectives} {--month= : target month YYYY-MM}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send monthly MBO performance appraisal reminders to employees (on 25th), managers/directors (on 1st), or to Hasintha (Appraiser)';

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
        $targetMonth = $this->option('month');

        $this->info("Executing MBO Reminders for {$now->toDateString()} (Day: {$day}, Type: {$type}, Month: " . ($targetMonth ?: 'current') . ")");

        // 1. Employee Reminder: Sent on 25th of current month (or if explicitly requested)
        if ($type === 'employee' || ($type === 'auto' && $day === 25)) {
            $this->sendEmployeeReminders($now, $targetMonth);
        }

        // 2. Manager & Director Reminder: Sent on 1st of following month (or if explicitly requested)
        if ($type === 'manager' || ($type === 'auto' && $day === 1)) {
            $this->sendManagerAndDirectorReminders($now, $targetMonth);
        }

        // 3. HR Reminder to Hasintha (Project Director / Appraiser) for pending evaluations & marks
        if ($type === 'appraiser') {
            $this->sendAppraiserEvaluationReminders($now, $targetMonth);
        }

        // 4. HR Reminder to Hasintha to assign monthly objectives & weights
        if ($type === 'objectives') {
            $this->sendAppraiserObjectivesReminders($now, $targetMonth);
        }

        if ($type === 'auto' && $day !== 25 && $day !== 1) {
            $this->info("Today is day {$day}. No automated MBO reminders scheduled for today (Scheduled for 25th and 1st).");
        }

        return Command::SUCCESS;
    }

    /**
     * Send reminders to all active employees to submit their monthly self-evaluations.
     */
    protected function sendEmployeeReminders(Carbon $now, ?string $targetMonth = null): void
    {
        $monthCarbon = $targetMonth ? Carbon::parse($targetMonth . '-01') : $now;
        $currentMonthName = $monthCarbon->format('F Y');
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
                'source_id' => 'mbo-self-' . $monthCarbon->format('Y-m'),
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
    protected function sendManagerAndDirectorReminders(Carbon $now, ?string $targetMonth = null): void
    {
        $prevMonth = $targetMonth ? Carbon::parse($targetMonth . '-01') : $now->copy()->subMonth();
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
            $isAdmin = in_array($user->role, ['solar_hr_admin', 'super_admin'], true);

            $title = $isDirector
                ? '📋 Monthly MBO Appraisals Pending Finalization'
                : ($isAdmin ? '⏳ MBO Attendance & Misconduct Deductions Pending' : '⏳ Monthly MBO Evaluations');

            $message = $isDirector
                ? "Team appraisals for {$prevMonthName} are pending your final marks and sign-off."
                : ($isAdmin
                    ? "Employee appraisals for {$prevMonthName} need HR attendance & misconduct review."
                    : "Appraisals pending for {$prevMonthName}.");

            $targetLink = $isAdmin ? '/solar/hr/admin/appraisals' : '/solar/hr/portal/appraisals?tab=team';

            $payload = [
                'division'  => 'hr',
                'category'  => 'compliance',
                'severity'  => 'warning',
                'title'     => $title,
                'message'   => $message,
                'link'      => $targetLink,
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

    /**
     * Send specific reminder from HR to Hasintha & Project Directors that employee submissions are pending marks.
     */
    protected function sendAppraiserEvaluationReminders(Carbon $now, ?string $targetMonth = null): void
    {
        $monthCarbon = $targetMonth ? Carbon::parse($targetMonth . '-01') : $now->copy()->subMonth();
        $monthName = $monthCarbon->format('F Y');
        $this->info("Sending Appraiser evaluation reminders to Hasintha & Directors for {$monthName}...");

        $directors = User::whereIn('email', self::$directorEmails)->get();
        $sentCount = 0;
        foreach ($directors as $user) {
            $payload = [
                'division'  => 'hr',
                'category'  => 'compliance',
                'severity'  => 'warning',
                'title'     => '🎯 HR Reminder: Team MBO Appraisals Pending Final Marks',
                'message'   => "HR Reminder: Staff MBO self-evaluations for {$monthName} have been submitted. Please review achievements, enter actual marks, and sign off.",
                'link'      => '/solar/hr/portal/appraisals?tab=team',
                'source_id' => 'mbo-hr-appraiser-' . $monthCarbon->format('Y-m') . '-' . time(),
            ];

            try {
                $user->notify(new HrNotification($payload));
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Failed to send MBO reminder to director {$user->email}: " . $e->getMessage());
            }
        }

        $this->info("Dispatched HR reminders to {$sentCount} appraiser(s) for {$monthName}.");
    }

    /**
     * Send specific reminder from HR to Hasintha to assign monthly objectives and weights.
     */
    protected function sendAppraiserObjectivesReminders(Carbon $now, ?string $targetMonth = null): void
    {
        $monthCarbon = $targetMonth ? Carbon::parse($targetMonth . '-01') : $now;
        $monthName = $monthCarbon->format('F Y');
        $this->info("Sending Appraiser objectives assignment reminders to Hasintha for {$monthName}...");

        $directors = User::whereIn('email', self::$directorEmails)->get();
        $sentCount = 0;
        foreach ($directors as $user) {
            $payload = [
                'division'  => 'hr',
                'category'  => 'compliance',
                'severity'  => 'warning',
                'title'     => '📋 HR Reminder: Monthly Objectives Assignment Pending',
                'message'   => "HR Reminder: Please assign monthly MBO performance objectives, weights, and deadlines for staff for {$monthName}.",
                'link'      => '/solar/hr/portal/appraisals?tab=team',
                'source_id' => 'mbo-hr-objectives-' . $monthCarbon->format('Y-m') . '-' . time(),
            ];

            try {
                $user->notify(new HrNotification($payload));
                $sentCount++;
            } catch (\Throwable $e) {
                Log::error("Failed to send MBO objectives reminder to director {$user->email}: " . $e->getMessage());
            }
        }

        $this->info("Dispatched HR objectives reminders to {$sentCount} appraiser(s) for {$monthName}.");
    }
}
