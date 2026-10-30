<?php

namespace App\Services;

use App\Http\Controllers\Api\HR\HrLeaveController;
use App\Mail\HrAttendanceLeaveReportMail;
use App\Models\HrEmployee;
use App\Models\HrLeave;
use App\Models\User;
use App\Notifications\HrNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

class HrAttendanceLeaveReportService
{
    private const SETTINGS_FILE = 'hr_mail_report_settings.json';

    /**
     * Get default recipient users (solar_hr_admin, super_admin, hasintha, eranda) for initial seed.
     */
    private function getDefaultUsers()
    {
        $managerEmails = HrLeaveController::$approvalManagerEmails;

        return User::where(function ($q) use ($managerEmails) {
            $q->whereIn('role', ['solar_hr_admin', 'super_admin'])
              ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['solar_hr_admin', 'super_admin']))
              ->orWhereIn('email', $managerEmails);
        })->get();
    }

    /**
     * Load saved mail report settings or initialize defaults.
     */
    public function getSettings(): array
    {
        $defaultUsers = $this->getDefaultUsers();
        $defaultIds   = $defaultUsers->pluck('id')->map(fn($id) => (int) $id)->values()->all();

        $defaults = [
            'customized'         => false,
            'recipient_user_ids' => $defaultIds,
            'custom_emails'      => [],
            'weekly_enabled'     => true,
            'monthly_enabled'    => true,
            'include_pdf'        => true,
            'include_csv'        => true,
            'smtp_mode'          => 'env', // 'env' | 'custom'
            'smtp_host'          => '',
            'smtp_port'          => 587,
            'smtp_encryption'    => 'tls',
            'smtp_username'      => '',
            'smtp_password'      => '',
            'smtp_from_address'  => 'noreply@circlegroup.lk',
            'smtp_from_name'     => 'Circle Engineering HR',
            'last_sent_at'       => null,
            'last_sent_summary'  => null,
        ];

        if (!Storage::disk('local')->exists(self::SETTINGS_FILE)) {
            return $defaults;
        }

        try {
            $raw = json_decode(Storage::disk('local')->get(self::SETTINGS_FILE), true);
            if (!is_array($raw)) {
                return $defaults;
            }
            return array_merge($defaults, $raw);
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    /**
     * Save mail report settings.
     */
    public function saveSettings(array $data): array
    {
        $current = $this->getSettings();

        $userIds = isset($data['recipient_user_ids']) && is_array($data['recipient_user_ids'])
            ? array_values(array_unique(array_map('intval', $data['recipient_user_ids'])))
            : $current['recipient_user_ids'];

        $customEmails = isset($data['custom_emails']) && is_array($data['custom_emails'])
            ? array_values(array_unique(array_filter(array_map(
                fn($e) => strtolower(trim((string) $e)),
                $data['custom_emails']
            ), fn($e) => !empty($e) && filter_var($e, FILTER_VALIDATE_EMAIL))))
            : $current['custom_emails'];

        $rawHost = array_key_exists('smtp_host', $data) ? trim((string) $data['smtp_host']) : ($current['smtp_host'] ?? '');
        $rawPass = array_key_exists('smtp_password', $data) && $data['smtp_password'] !== '********'
            ? trim((string) $data['smtp_password'])
            : ($current['smtp_password'] ?? '');

        // Strip spaces if user pasted a 16-char Google App Password (e.g. "lmhd rylr seqp pzgv")
        if (stripos($rawHost, 'gmail') !== false || preg_match('/^[a-zA-Z0-9]{4}(\s+[a-zA-Z0-9]{4}){3}$/', $rawPass)) {
            $rawPass = preg_replace('/\s+/', '', $rawPass);
        }

        $updated = array_merge($current, [
            'customized'         => true,
            'recipient_user_ids' => $userIds,
            'custom_emails'      => $customEmails,
            'weekly_enabled'     => isset($data['weekly_enabled']) ? (bool) $data['weekly_enabled'] : $current['weekly_enabled'],
            'monthly_enabled'    => isset($data['monthly_enabled']) ? (bool) $data['monthly_enabled'] : $current['monthly_enabled'],
            'include_pdf'        => isset($data['include_pdf']) ? (bool) $data['include_pdf'] : $current['include_pdf'],
            'include_csv'        => isset($data['include_csv']) ? (bool) $data['include_csv'] : $current['include_csv'],
            'smtp_mode'          => isset($data['smtp_mode']) && in_array($data['smtp_mode'], ['env', 'custom'], true)
                ? $data['smtp_mode']
                : ($current['smtp_mode'] ?? 'env'),
            'smtp_host'          => $rawHost,
            'smtp_port'          => array_key_exists('smtp_port', $data) && (int) $data['smtp_port'] > 0 ? (int) $data['smtp_port'] : ($current['smtp_port'] ?? 587),
            'smtp_encryption'    => array_key_exists('smtp_encryption', $data) ? strtolower(trim((string) $data['smtp_encryption'])) : ($current['smtp_encryption'] ?? 'tls'),
            'smtp_username'      => array_key_exists('smtp_username', $data) ? trim((string) $data['smtp_username']) : ($current['smtp_username'] ?? ''),
            'smtp_password'      => $rawPass,
            'smtp_from_address'  => array_key_exists('smtp_from_address', $data) && !empty(trim((string) $data['smtp_from_address']))
                ? trim((string) $data['smtp_from_address'])
                : ($current['smtp_from_address'] ?? 'noreply@circlegroup.lk'),
            'smtp_from_name'     => array_key_exists('smtp_from_name', $data) && !empty(trim((string) $data['smtp_from_name']))
                ? trim((string) $data['smtp_from_name'])
                : ($current['smtp_from_name'] ?? 'Circle Engineering HR'),
            'updated_at'         => Carbon::now('Asia/Colombo')->toDateTimeString(),
        ]);

        Storage::disk('local')->put(self::SETTINGS_FILE, json_encode($updated, JSON_PRETTY_PRINT));

        return $updated;
    }

    /**
     * Inspect active mail transport (whether it is routing to local Mailpit or a live external SMTP host).
     */
    public function getMailTransportStatus(?array $settings = null): array
    {
        $settings = $settings ?? $this->getSettings();
        $mode     = $settings['smtp_mode'] ?? 'env';

        if ($mode === 'custom' && !empty($settings['smtp_host'])) {
            $host = trim((string) $settings['smtp_host']);
            $port = (int) ($settings['smtp_port'] ?: 587);
            $isMailpit = in_array(strtolower($host), ['mailpit', 'mailhog', 'localhost', '127.0.0.1'], true) && $port === 1025;
            return [
                'mode'         => 'custom',
                'host'         => $host,
                'port'         => $port,
                'encryption'   => $settings['smtp_encryption'] ?? 'tls',
                'from_address' => $settings['smtp_from_address'] ?: config('mail.from.address'),
                'from_name'    => $settings['smtp_from_name'] ?: config('mail.from.name'),
                'is_sandbox'   => $isMailpit,
                'sandbox_url'  => $isMailpit ? 'http://localhost:8025' : null,
            ];
        }

        $envHost = (string) config('mail.mailers.smtp.host', 'mailpit');
        $envPort = (int) config('mail.mailers.smtp.port', 1025);
        $isMailpit = in_array(strtolower($envHost), ['mailpit', 'mailhog'], true) || $envPort === 1025;

        return [
            'mode'         => 'env',
            'host'         => $envHost,
            'port'         => $envPort,
            'encryption'   => config('mail.mailers.smtp.encryption') ?: 'none',
            'from_address' => config('mail.from.address'),
            'from_name'    => config('mail.from.name'),
            'is_sandbox'   => $isMailpit,
            'sandbox_url'  => $isMailpit ? 'http://localhost:8025' : null,
        ];
    }

    /**
     * Apply custom SMTP configuration at runtime if configured, overriding Docker's MAIL_HOST=mailpit env var.
     */
    public function applyRuntimeMailConfig(?array $settings = null): array
    {
        $settings = $settings ?? $this->getSettings();
        if (($settings['smtp_mode'] ?? 'env') === 'custom' && !empty($settings['smtp_host'])) {
            $host = trim((string) $settings['smtp_host']);
            $port = (int) ($settings['smtp_port'] ?: 587);
            $enc  = strtolower(trim((string) ($settings['smtp_encryption'] ?? 'tls')));
            $pass = (string) ($settings['smtp_password'] ?? '');

            if (stripos($host, 'gmail') !== false || preg_match('/^[a-zA-Z0-9]{4}(\s+[a-zA-Z0-9]{4}){3}$/', $pass)) {
                $pass = preg_replace('/\s+/', '', $pass);
            }

            $scheme = null;
            if ($enc === 'ssl' || $port === 465) {
                $scheme = 'smtps';
                $enc    = 'tls';
            } elseif ($enc === 'none' || $enc === '') {
                $scheme = 'smtp';
                $enc    = null;
            } else {
                $scheme = 'smtp';
                $enc    = 'tls';
            }

            $fromAddress = !empty($settings['smtp_from_address'])
                ? trim((string) $settings['smtp_from_address'])
                : (!empty($settings['smtp_username']) ? trim((string) $settings['smtp_username']) : config('mail.from.address'));
            $fromName = !empty($settings['smtp_from_name'])
                ? trim((string) $settings['smtp_from_name'])
                : config('mail.from.name');

            config([
                'mail.default'                   => 'smtp',
                'mail.mailers.smtp.transport'    => 'smtp',
                'mail.mailers.smtp.url'          => null,
                'mail.mailers.smtp.scheme'       => $scheme,
                'mail.mailers.smtp.host'         => $host,
                'mail.mailers.smtp.port'         => $port,
                'mail.mailers.smtp.encryption'   => $enc,
                'mail.mailers.smtp.username'     => !empty($settings['smtp_username']) ? trim((string) $settings['smtp_username']) : null,
                'mail.mailers.smtp.password'     => $pass !== '' ? $pass : null,
                'mail.mailers.smtp.verify_peer'  => false,
                'mail.mailers.smtp.timeout'      => 30,
                'mail.from.address'              => $fromAddress,
                'mail.from.name'                 => $fromName,
            ]);

            Mail::purge('smtp');
            if (method_exists(Mail::getFacadeRoot(), 'forgetMailers')) {
                Mail::forgetMailers();
            }
        }

        return $this->getMailTransportStatus($settings);
    }

    /**
     * Return all selectable system users (with their HR employee info if linked).
     */
    public function getAvailableUsers(): array
    {
        $employeesByUserId = HrEmployee::with(['department', 'designation'])
            ->whereNotNull('user_id')
            ->get()
            ->keyBy('user_id');

        return User::with('roles')
            ->orderBy('name')
            ->get()
            ->map(function ($u) use ($employeesByUserId) {
                $emp = $employeesByUserId->get($u->id);
                $roleNames = $u->roles ? $u->roles->pluck('name')->all() : [];
                if (!empty($u->role) && !in_array($u->role, $roleNames, true)) {
                    array_unshift($roleNames, $u->role);
                }

                return [
                    'id'          => (int) $u->id,
                    'name'        => $emp?->full_name ?: $u->name,
                    'email'       => $u->email,
                    'role'        => $u->role ?: ($roleNames[0] ?? 'user'),
                    'roles'       => $roleNames,
                    'epf_no'      => $emp?->epf_no ?: $emp?->employee_id,
                    'department'  => $emp?->department?->name,
                    'designation' => $emp?->designation?->name,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Resolve recipient emails & User models from saved manual settings (or optional override).
     */
    public function getRecipients(?array $overrideUserIds = null, ?array $overrideCustomEmails = null): array
    {
        $settings = $this->getSettings();

        $userIds = $overrideUserIds !== null
            ? array_map('intval', $overrideUserIds)
            : ($settings['recipient_user_ids'] ?? []);

        $customEmails = $overrideCustomEmails !== null
            ? $overrideCustomEmails
            : ($settings['custom_emails'] ?? []);

        // If never customized yet, ensure default manager emails are also included
        if (empty($settings['customized']) && $overrideUserIds === null && $overrideCustomEmails === null) {
            $customEmails = array_merge($customEmails, HrLeaveController::$approvalManagerEmails);
        }

        $users = !empty($userIds)
            ? User::whereIn('id', $userIds)->get()
            : collect();

        $emails = $users->pluck('email')
            ->merge($customEmails)
            ->map(fn($e) => strtolower(trim((string) $e)))
            ->filter(fn($e) => !empty($e) && filter_var($e, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values()
            ->all();

        return [
            'users'  => $users,
            'emails' => $emails,
        ];
    }

    /**
     * Resolve start & end dates for daily, custom, weekly, or monthly report.
     *
     * @param string $period 'daily' | 'custom' | 'weekly' | 'monthly'
     * @param string|null $month Optional 'YYYY-MM' when period='monthly'
     * @param bool $isScheduled True when invoked from cron schedule
     * @param string|null $startDate Optional 'YYYY-MM-DD' for daily, custom, or weekly reference date
     * @param string|null $endDate Optional 'YYYY-MM-DD' for custom range
     */
    public function resolveDateRange(
        string $period = 'weekly',
        ?string $month = null,
        bool $isScheduled = false,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $now = Carbon::now('Asia/Colombo');

        if ($period === 'daily') {
            $day = !empty($startDate)
                ? Carbon::parse($startDate, 'Asia/Colombo')
                : $now->copy();
            $start = $day->copy()->startOfDay();
            $end   = $day->copy()->endOfDay();
            return [
                'start'       => $start,
                'end'         => $end,
                'range_label' => $start->format('M d, Y') . ' (' . $start->toDateString() . ')',
            ];
        }

        if ($period === 'custom') {
            $start = !empty($startDate)
                ? Carbon::parse($startDate, 'Asia/Colombo')->startOfDay()
                : $now->copy()->startOfDay();
            $end = !empty($endDate)
                ? Carbon::parse($endDate, 'Asia/Colombo')->endOfDay()
                : $start->copy()->endOfDay();
            if ($end->lt($start)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }
            return [
                'start'       => $start,
                'end'         => $end,
                'range_label' => $start->toDateString() === $end->toDateString()
                    ? $start->format('M d, Y') . ' (' . $start->toDateString() . ')'
                    : $start->format('M d, Y') . ' – ' . $end->format('M d, Y'),
            ];
        }

        if ($period === 'monthly') {
            if (!empty($month) && preg_match('/^\d{4}-\d{2}$/', $month)) {
                $start = Carbon::parse($month . '-01', 'Asia/Colombo')->startOfMonth();
            } elseif ($isScheduled && $now->day <= 5) {
                // Scheduled job on 1st of month reports previous full month
                $start = $now->copy()->subMonthNoOverflow()->startOfMonth();
            } else {
                // Manual "send current report" defaults to current month
                $start = $now->copy()->startOfMonth();
            }
            $end = $start->copy()->endOfMonth();
            return [
                'start'       => $start,
                'end'         => $end,
                'range_label' => $start->format('F Y') . ' (' . $start->toDateString() . ' to ' . $end->toDateString() . ')',
            ];
        }

        // Weekly report: if custom startDate & endDate are given, use them; if startDate is given, use its week
        if (!empty($startDate) && !empty($endDate)) {
            $start = Carbon::parse($startDate, 'Asia/Colombo')->startOfDay();
            $end   = Carbon::parse($endDate, 'Asia/Colombo')->endOfDay();
            if ($end->lt($start)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }
        } elseif (!empty($startDate)) {
            $ref   = Carbon::parse($startDate, 'Asia/Colombo');
            $start = $ref->copy()->startOfWeek(Carbon::MONDAY);
            $end   = $start->copy()->addDays(4)->endOfDay();
        } elseif ($isScheduled && $now->isMonday() && $now->hour < 12) {
            $start = $now->copy()->subWeek()->startOfWeek(Carbon::MONDAY);
            $end   = $start->copy()->addDays(4)->endOfDay();
        } else {
            $start = $now->copy()->startOfWeek(Carbon::MONDAY);
            $end   = $start->copy()->addDays(4)->endOfDay();
        }

        return [
            'start'       => $start,
            'end'         => $end,
            'range_label' => $start->format('M d, Y') . ' – ' . $end->format('M d, Y'),
        ];
    }

    /**
     * Build complete Attendance & Leave report data for the given period.
     */
    public function buildReport(
        string $period = 'weekly',
        ?string $month = null,
        ?int $deptId = null,
        bool $isScheduled = false,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $range        = $this->resolveDateRange($period, $month, $isScheduled, $startDate, $endDate);
        $start        = $range['start']->copy()->startOfDay();
        $end          = $range['end']->copy()->endOfDay();
        $today        = Carbon::today('Asia/Colombo')->endOfDay();
        $effectiveEnd = $end->gt($today) ? $today : $end;

        $workingDays = 0;
        $elapsedWorkingDates = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            if (!$d->isWeekend() || $period === 'daily') {
                $workingDays++;
                if ($d->lte($effectiveEnd)) {
                    $elapsedWorkingDates[] = $d->toDateString();
                }
            }
        }

        $empQuery = HrEmployee::with([
            'department',
            'attendances' => fn($q) => $q->whereBetween('date', [$start->toDateString(), $end->toDateString()]),
            'leaves'      => fn($q) => $q->where('status', 'approved')
                ->whereDate('start_date', '<=', $end->toDateString())
                ->whereDate('end_date', '>=', $start->toDateString()),
        ])->where('status', 'active')->orderBy('full_name');

        if ($deptId) {
            $empQuery->where('department_id', $deptId);
        }

        $employeeRows = [];
        $totals = [
            'working_days'        => $workingDays,
            'present'             => 0,
            'late'                => 0,
            'half_day'            => 0,
            'wfh'                 => 0,
            'leave'               => 0,
            'absent'              => 0,
            'total_working_hours' => 0.0,
            'avg_attendance_rate' => 0.0,
        ];

        $employees = $empQuery->get();
        foreach ($employees as $emp) {
            $attByDate = [];
            foreach ($emp->attendances as $a) {
                $dStr = $a->date instanceof Carbon ? $a->date->format('Y-m-d') : Carbon::parse($a->date)->format('Y-m-d');
                $attByDate[$dStr] = $a;
            }

            $approvedLeaveDates = [];
            $shortLeaveHours = 0;
            foreach ($emp->leaves as $lv) {
                if ($lv->leave_type === 'short') {
                    $shortLeaveHours += (int) $lv->hours_count;
                    continue;
                }
                $lStart = Carbon::parse($lv->start_date)->startOfDay();
                $lEnd   = Carbon::parse($lv->end_date ?? $lv->start_date)->startOfDay();
                if ($lStart->lt($start)) $lStart = $start->copy();
                if ($lEnd->gt($end)) $lEnd = $end->copy();

                for ($d = $lStart->copy(); $d->lte($lEnd); $d->addDay()) {
                    if (!$d->isWeekend()) {
                        $approvedLeaveDates[$d->toDateString()] = $lv->leave_type;
                    }
                }
            }

            $present = 0;
            $late    = 0;
            $halfDay = 0;
            $wfh     = 0;
            $leave   = 0;
            $absent  = 0;

            foreach ($elapsedWorkingDates as $dStr) {
                $att = $attByDate[$dStr] ?? null;
                $st  = $att?->status;

                if (isset($approvedLeaveDates[$dStr]) && (!$att || empty($att->clock_in_time) || $st === 'absent')) {
                    $st = 'leave';
                } elseif (!$st) {
                    $st = 'absent';
                }

                if ($st === 'present') $present++;
                elseif ($st === 'late') $late++;
                elseif ($st === 'half_day') $halfDay++;
                elseif ($st === 'wfh') $wfh++;
                elseif ($st === 'leave') $leave++;
                else $absent++;
            }

            $hours = round((float) $emp->attendances->sum('working_hours'), 1);
            $attended = $present + $late + $wfh + ($halfDay * 0.5);
            $denom = max(1, count($elapsedWorkingDates) - $leave);
            $rate = count($elapsedWorkingDates) > 0
                ? min(100.0, round(($attended / $denom) * 100, 1))
                : 0.0;

            $employeeRows[] = [
                'employee_id'         => $emp->employee_id,
                'epf_no'              => $emp->epf_no ?: $emp->employee_id,
                'name'                => $emp->full_name,
                'department'          => $emp->department?->name ?? 'N/A',
                'working_days'        => $workingDays,
                'present'             => $present,
                'late'                => $late,
                'half_day'            => $halfDay,
                'wfh'                 => $wfh,
                'leave'               => $leave,
                'absent'              => $absent,
                'short_leave_hours'   => $shortLeaveHours,
                'total_working_hours' => $hours,
                'attendance_rate'     => $rate,
            ];

            $totals['present']  += $present;
            $totals['late']     += $late;
            $totals['half_day'] += $halfDay;
            $totals['wfh']      += $wfh;
            $totals['leave']    += $leave;
            $totals['absent']   += $absent;
            $totals['total_working_hours'] += $hours;
        }

        if (count($employeeRows) > 0) {
            $totals['avg_attendance_rate'] = round(
                collect($employeeRows)->avg('attendance_rate'),
                1
            );
        }
        $totals['total_working_hours'] = round($totals['total_working_hours'], 1);

        $leavesQuery = HrLeave::with(['employee.department'])
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('start_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('end_date', [$start->toDateString(), $end->toDateString()])
                  ->orWhereBetween('created_at', [$start, $end]);
            })
            ->orderByDesc('start_date');

        if ($deptId) {
            $leavesQuery->whereHas('employee', fn($q) => $q->where('department_id', $deptId));
        }

        $leaveModels = $leavesQuery->get();
        $leaveRows = $leaveModels->map(function ($lv) {
            $sDate = $lv->start_date instanceof Carbon ? $lv->start_date->format('Y-m-d') : substr((string) $lv->start_date, 0, 10);
            $eDate = $lv->end_date instanceof Carbon ? $lv->end_date->format('Y-m-d') : substr((string) $lv->end_date, 0, 10);
            return [
                'id'            => $lv->id,
                'employee_name' => $lv->employee?->full_name ?? 'Employee',
                'epf_no'        => $lv->employee?->epf_no ?: ($lv->employee?->employee_id ?? '—'),
                'department'    => $lv->employee?->department?->name ?? '—',
                'leave_type'    => $lv->leave_type,
                'dates'         => ($eDate && $eDate !== $sDate) ? "{$sDate} → {$eDate}" : $sDate,
                'duration'      => $lv->leave_type === 'short' ? "{$lv->hours_count} hr(s)" : "{$lv->days_count} day(s)",
                'status'        => $lv->status,
                'reason'        => $lv->reason,
            ];
        })->all();

        $leaveStats = [
            'total'            => $leaveModels->count(),
            'pending'          => $leaveModels->where('status', 'pending')->count(),
            'manager_approved' => $leaveModels->filter(fn($l) => in_array($l->status, ['manager_approved', 'approved'], true) || !empty($l->manager_approved_at))->where('status', '!=', 'manager_rejected')->count(),
            'approved'         => $leaveModels->where('status', 'approved')->count(),
            'rejected'         => $leaveModels->whereIn('status', ['rejected', 'manager_rejected'])->count(),
        ];

        return [
            'period'       => $period,
            'start_date'   => $start->toDateString(),
            'end_date'     => $end->toDateString(),
            'range_label'  => $range['range_label'],
            'generated_at' => Carbon::now('Asia/Colombo')->format('Y-m-d h:i A'),
            'summary'      => $totals,
            'leave_stats'  => $leaveStats,
            'employees'    => $employeeRows,
            'leaves'       => $leaveRows,
        ];
    }

    /**
     * Generate PDF binary string from report data using DomPDF.
     */
    public function buildPdf(array $reportData): string
    {
        $html = HrAttendanceLeaveReportMail::renderReportHtml($reportData, true);
        return Pdf::loadHTML($html)->setPaper('a4', 'landscape')->output();
    }

    /**
     * Generate CSV string from report data.
     */
    public function buildCsv(array $reportData): string
    {
        $lines = [];
        $escape = fn($v) => '"' . str_replace('"', '""', (string) $v) . '"';

        $lines[] = implode(',', array_map($escape, [
            'Circle Engineering (Pvt) Ltd - ' . ucfirst($reportData['period']) . ' Attendance & Leave Report',
            'Period: ' . $reportData['range_label'],
            'Generated: ' . $reportData['generated_at'],
        ]));
        $lines[] = '';

        $lines[] = implode(',', array_map($escape, [
            'EPF / Employee ID',
            'Employee Name',
            'Department',
            'Working Days',
            'Present (P)',
            'Late (L)',
            'Half Day (H)',
            'WFH',
            'Approved Leave (LV)',
            'Absent (A)',
            'Short Leave (Hrs)',
            'Total Working Hours',
            'Attendance Rate (%)',
        ]));

        foreach ($reportData['employees'] as $emp) {
            $lines[] = implode(',', array_map($escape, [
                $emp['epf_no'],
                $emp['name'],
                $emp['department'],
                $emp['working_days'],
                $emp['present'],
                $emp['late'],
                $emp['half_day'],
                $emp['wfh'],
                $emp['leave'],
                $emp['absent'],
                $emp['short_leave_hours'],
                $emp['total_working_hours'],
                $emp['attendance_rate'] . '%',
            ]));
        }

        $lines[] = '';
        $lines[] = implode(',', array_map($escape, ['Leave Requests in Period']));
        $lines[] = implode(',', array_map($escape, [
            'EPF / ID',
            'Employee Name',
            'Department',
            'Leave Type',
            'Dates',
            'Duration',
            'Status',
            'Reason',
        ]));

        foreach ($reportData['leaves'] as $lv) {
            $statusLabel = match ($lv['status']) {
                'approved'         => 'LV - HR Approved',
                'manager_approved' => 'Mgr Approved',
                'manager_rejected' => 'Mgr Rejected',
                'rejected'         => 'HR Rejected',
                'pending'          => 'Pending',
                default            => $lv['status'],
            };
            $lines[] = implode(',', array_map($escape, [
                $lv['epf_no'],
                $lv['employee_name'],
                $lv['department'],
                ucfirst($lv['leave_type']),
                $lv['dates'],
                $lv['duration'],
                $statusLabel,
                $lv['reason'] ?? '',
            ]));
        }

        return implode("\r\n", $lines);
    }

    /**
     * Generate and email the report (with PDF & CSV attachments) to the configured or overridden recipients.
     */
    public function sendReport(
        string $period = 'weekly',
        ?string $month = null,
        ?int $deptId = null,
        ?array $overrideUserIds = null,
        ?array $overrideCustomEmails = null,
        bool $isScheduled = false,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $settings = $this->getSettings();

        if ($isScheduled) {
            if ($period === 'weekly' && empty($settings['weekly_enabled'])) {
                return [
                    'skipped'     => true,
                    'reason'      => 'Weekly automated report is disabled in settings.',
                    'period'      => $period,
                    'range_label' => '',
                    'recipients'  => [],
                    'attachments' => [],
                ];
            }
            if ($period === 'monthly' && empty($settings['monthly_enabled'])) {
                return [
                    'skipped'     => true,
                    'reason'      => 'Monthly automated report is disabled in settings.',
                    'period'      => $period,
                    'range_label' => '',
                    'recipients'  => [],
                    'attachments' => [],
                ];
            }
        }

        $reportData = $this->buildReport($period, $month, $deptId, $isScheduled, $startDate, $endDate);
        $baseName   = sprintf(
            'attendance_leave_%s_report_%s_to_%s',
            $period,
            $reportData['start_date'],
            $reportData['end_date']
        );

        $includePdf = $settings['include_pdf'] ?? true;
        $includeCsv = $settings['include_csv'] ?? true;
        if (!$includePdf && !$includeCsv) {
            $includePdf = true;
            $includeCsv = true;
        }

        $pdfContent  = $includePdf ? $this->buildPdf($reportData) : null;
        $pdfFilename = $includePdf ? ($baseName . '.pdf') : null;
        $csvContent  = $includeCsv ? $this->buildCsv($reportData) : null;
        $csvFilename = $includeCsv ? ($baseName . '.csv') : null;

        $recipients = $this->getRecipients($overrideUserIds, $overrideCustomEmails);
        $emails     = $recipients['emails'];
        $users      = $recipients['users'];

        $transport = $this->applyRuntimeMailConfig($settings);

        if (!empty($emails)) {
            Mail::to($emails)->send(new HrAttendanceLeaveReportMail(
                $reportData,
                $pdfContent,
                $pdfFilename,
                $csvContent,
                $csvFilename
            ));
        }

        $attachments = array_values(array_filter([$pdfFilename, $csvFilename]));

        if ($users->isNotEmpty()) {
            try {
                $periodLabel = ucfirst($period);
                Notification::send($users, new HrNotification([
                    'division' => 'hr',
                    'category' => 'attendance',
                    'severity' => 'info',
                    'title'    => "{$periodLabel} Attendance & Leave Report Sent",
                    'message'  => "{$periodLabel} Attendance & Leave report ({$reportData['range_label']}) with PDF & CSV has been emailed to " . count($emails) . " recipient(s).",
                    'link'     => '/solar/hr/admin/attendance/report',
                ]));
            } catch (\Throwable $e) {
                Log::error('HR report notification error: ' . $e->getMessage());
            }
        }

        // Persist last_sent_at & summary
        try {
            $current = $this->getSettings();
            $current['last_sent_at'] = Carbon::now('Asia/Colombo')->format('Y-m-d h:i:s A');
            $current['last_sent_summary'] = [
                'period'      => $period,
                'range_label' => $reportData['range_label'],
                'recipients'  => $emails,
                'attachments' => $attachments,
                'transport'   => $transport,
            ];
            Storage::disk('local')->put(self::SETTINGS_FILE, json_encode($current, JSON_PRETTY_PRINT));
        } catch (\Throwable $e) {
            // ignore storage write failure
        }

        return [
            'period'      => $period,
            'range_label' => $reportData['range_label'],
            'recipients'  => $emails,
            'attachments' => $attachments,
            'transport'   => $transport,
            'summary'     => $reportData['summary'],
            'leave_stats' => $reportData['leave_stats'],
        ];
    }
}
