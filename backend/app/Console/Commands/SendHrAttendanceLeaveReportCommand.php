<?php

namespace App\Console\Commands;

use App\Services\HrAttendanceLeaveReportService;
use Illuminate\Console\Command;

class SendHrAttendanceLeaveReportCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hr:send-attendance-leave-report
                            {--period=weekly : Report period: weekly or monthly}
                            {--month= : Optional YYYY-MM when period is monthly}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically generate and email the Weekly or Monthly HR Attendance & Leave Report to HR, Super Admin, Hasintha, and Eranda.';

    /**
     * Execute the console command.
     */
    public function handle(HrAttendanceLeaveReportService $service): int
    {
        $period = strtolower(trim((string) $this->option('period')));
        if (!in_array($period, ['weekly', 'monthly'], true)) {
            $this->error("Invalid --period value '{$period}'. Allowed: weekly, monthly.");
            return self::FAILURE;
        }

        $month = $this->option('month') ? trim((string) $this->option('month')) : null;

        $result = $service->sendReport($period, $month, null, null, null, true);

        if (!empty($result['skipped'])) {
            $this->info($result['reason'] ?? 'Skipped.');
            return self::SUCCESS;
        }

        $this->info(sprintf(
            '%s Attendance & Leave Report (%s) sent to %d recipient(s): %s',
            ucfirst($result['period']),
            $result['range_label'],
            count($result['recipients']),
            implode(', ', $result['recipients'])
        ));

        return self::SUCCESS;
    }
}

