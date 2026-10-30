<?php

namespace App\Services;

use App\Http\Controllers\Api\HR\HrLeaveController;
use App\Mail\HrAttendanceLeaveReportMail;
use App\Models\HrAttendance;
use App\Models\HrAttendanceRegularization;
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
     * Get default recipient users (solar_hr_admin and super_admin) for initial seed.
     */
    private function getDefaultUsers()
    {
        return User::where(function ($q) {
            $q->whereIn('role', ['solar_hr_admin', 'super_admin'])
              ->orWhereHas('roles', fn($r) => $r->whereIn('name', ['solar_hr_admin', 'super_admin']));
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
                elseif ($st === 'leave') $leave++;
                else $absent++;
            }

            $hours = round((float) $emp->attendances->sum('working_hours'), 1);
            $attended = $present + $late + ($halfDay * 0.5);
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
                'leave'               => $leave,
                'absent'              => $absent,
                'short_leave_hours'   => $shortLeaveHours,
                'total_working_hours' => $hours,
                'attendance_rate'     => $rate,
            ];

            $totals['present']  += $present;
            $totals['late']     += $late;
            $totals['half_day'] += $halfDay;
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

    /**
     * Build comprehensive monthly attendance, timesheet & payroll data for an individual employee.
     */
    public function buildIndividualEmployeePayrollReport(int $employeeId, ?string $month = null): array
    {
        $now = Carbon::now('Asia/Colombo');
        if (empty($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = $now->format('Y-m');
        }

        $employee = HrEmployee::with(['department', 'designation', 'manager', 'user'])
            ->findOrFail($employeeId);

        $startOfMonth = Carbon::parse($month . '-01', 'Asia/Colombo')->startOfMonth();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth();
        $today        = $now->copy()->startOfDay();

        // 1. Fetch all attendance records for this employee in this month
        $attendances = HrAttendance::with(['clockInLocation', 'regularization'])
            ->where('employee_id', $employeeId)
            ->whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->get();

        $attByDate = [];
        foreach ($attendances as $a) {
            $dStr = $a->date instanceof Carbon ? $a->date->format('Y-m-d') : substr((string) $a->date, 0, 10);
            $attByDate[$dStr] = $a;
        }

        // 2. Fetch all approved leaves covering this month
        $leaves = HrLeave::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $endOfMonth->toDateString())
            ->whereDate('end_date', '>=', $startOfMonth->toDateString())
            ->get();

        $leaveByDate = [];
        $shortLeaveByDate = [];
        $shortLeaveTotalHours = 0;

        foreach ($leaves as $lv) {
            if ($lv->leave_type === 'short') {
                $sDate = substr((string) $lv->start_date, 0, 10);
                $shortLeaveByDate[$sDate][] = $lv;
                $shortLeaveTotalHours += (int) $lv->hours_count;
                continue;
            }

            $lStart = Carbon::parse($lv->start_date, 'Asia/Colombo')->startOfDay();
            $lEnd   = Carbon::parse($lv->end_date ?? $lv->start_date, 'Asia/Colombo')->startOfDay();
            if ($lStart->lt($startOfMonth)) $lStart = $startOfMonth->copy();
            if ($lEnd->gt($endOfMonth))     $lEnd   = $endOfMonth->copy();

            for ($d = $lStart->copy(); $d->lte($lEnd); $d->addDay()) {
                if (!$d->isWeekend()) {
                    $leaveByDate[$d->toDateString()] = $lv;
                }
            }
        }

        // 3. Build day-by-day itemized record
        $days = [];
        $totals = [
            'calendar_days'            => (int) $startOfMonth->daysInMonth,
            'working_days'             => 0,
            'weekend_days'             => 0,
            'present'                  => 0,
            'late'                     => 0,
            'missing'                  => 0,
            'half_day'                 => 0,
            'leave'                    => 0,
            'absent'                   => 0,
            'total_working_hours'      => 0.0,
            'total_late_minutes'       => 0,
            'total_early_minutes'      => 0,
            'total_overtime_hours'     => 0.0,
            'short_leave_hours'        => $shortLeaveTotalHours,
            'leave_breakdown'          => [
                'annual'  => 0,
                'casual'  => 0,
                'medical' => 0,
                'nopay'   => 0,
                'other'   => 0,
            ],
        ];

        for ($d = $startOfMonth->copy(); $d->lte($endOfMonth); $d->addDay()) {
            $dateStr   = $d->toDateString();
            $isWeekend = $d->isWeekend();
            $isFuture  = $d->gt($today);
            $isToday   = $d->isSameDay($today);

            if ($isWeekend) {
                $totals['weekend_days']++;
            } else {
                $totals['working_days']++;
            }

            $att = $attByDate[$dateStr] ?? null;
            $lv  = $leaveByDate[$dateStr] ?? null;
            $shortLvs = $shortLeaveByDate[$dateStr] ?? [];

            $clockIn  = $att?->clock_in_time ? Carbon::parse($att->clock_in_time, 'Asia/Colombo') : null;
            $clockOut = $att?->clock_out_time ? Carbon::parse($att->clock_out_time, 'Asia/Colombo') : null;

            $status = $att?->status;
            $statusLabel = 'Scheduled';
            $hours = $att?->working_hours ? (float) $att->working_hours : 0.0;
            $lateMins = 0;
            $earlyMins = 0;
            $overtimeHrs = 0.0;

            // Compute late minutes (official start: 09:00, grace until 09:10)
            if ($clockIn) {
                $shiftStart = Carbon::parse($dateStr . ' 09:00:00', 'Asia/Colombo');
                $graceEnd   = Carbon::parse($dateStr . ' 09:10:00', 'Asia/Colombo');
                if ($clockIn->gt($graceEnd)) {
                    $lateMins = (int) $shiftStart->diffInMinutes($clockIn);
                }
            }

            // Compute early departure minutes (official end: 17:30)
            if ($clockOut) {
                $shiftEnd = Carbon::parse($dateStr . ' 17:30:00', 'Asia/Colombo');
                if ($clockOut->lt($shiftEnd)) {
                    $earlyMins = (int) $clockOut->diffInMinutes($shiftEnd);
                }
                // Overtime: worked beyond standard 8.5 hours
                if ($hours > 8.5) {
                    $overtimeHrs = round($hours - 8.5, 2);
                }
            }

            // Status resolution
            if ($lv && (!$att || empty($att->clock_in_time) || $status === 'absent')) {
                $status = 'leave';
                $statusLabel = ucfirst($lv->leave_type) . ' Leave';
                $lType = strtolower($lv->leave_type);
                if (isset($totals['leave_breakdown'][$lType])) {
                    $totals['leave_breakdown'][$lType]++;
                } else {
                    $totals['leave_breakdown']['other']++;
                }
                $totals['leave']++;
            } elseif ($att && !empty($att->clock_in_time)) {
                if ($status === 'missing' || (empty($att->clock_out_time) && !$isToday && !$isFuture)) {
                    $status = 'missing';
                    $statusLabel = 'Missing Clock-Out';
                    $totals['missing']++;
                } elseif ($status === 'late') {
                    $statusLabel = 'Late Arrival';
                    $totals['late']++;
                } elseif ($status === 'half_day') {
                    $statusLabel = 'Half Day';
                    $totals['half_day']++;
                } elseif ($status === 'present') {
                    $statusLabel = 'Present';
                    $totals['present']++;
                } elseif ($status === 'leave') {
                    $statusLabel = 'Leave';
                    $totals['leave']++;
                } else {
                    $statusLabel = ucfirst($status ?: 'Present');
                    $totals['present']++;
                }
            } elseif ($isWeekend) {
                $status = 'weekend';
                $statusLabel = 'Weekend';
            } elseif (!$isFuture && !$isToday) {
                $status = 'absent';
                $statusLabel = 'Absent (Unauthorized)';
                $totals['absent']++;
            } else {
                $status = 'scheduled';
                $statusLabel = $isToday ? 'Today (Pending)' : 'Upcoming';
            }

            $totals['total_working_hours'] += $hours;
            $totals['total_late_minutes']  += $lateMins;
            $totals['total_early_minutes'] += $earlyMins;
            $totals['total_overtime_hours'] += $overtimeHrs;

            // Remarks / Notes
            $remarks = [];
            if ($lv) {
                $remarks[] = ucfirst($lv->leave_type) . ' Leave' . ($lv->reason ? ': ' . $lv->reason : '');
            }
            if (!empty($shortLvs)) {
                foreach ($shortLvs as $sl) {
                    $remarks[] = "Short Leave ({$sl->hours_count}h)" . ($sl->reason ? ': ' . $sl->reason : '');
                }
            }
            if ($att?->regularization) {
                $reg = $att->regularization;
                $regStatus = strtoupper($reg->status);
                $regTime = Carbon::parse($reg->requested_clock_out_time)->timezone('Asia/Colombo')->format('h:i A');
                $remarks[] = "Adj Req: {$regTime} ({$regStatus})" . ($reg->reason ? ' - ' . $reg->reason : '');
            }
            if ($att?->notes && strpos($att->notes, 'Missing clock-out') === false) {
                $remarks[] = $att->notes;
            }

            $days[] = [
                'date'             => $dateStr,
                'day_num'          => (int) $d->format('d'),
                'day_name'         => $d->format('D'),
                'is_weekend'       => $isWeekend,
                'is_future'        => $isFuture,
                'is_today'         => $isToday,
                'clock_in'         => $clockIn ? $clockIn->format('h:i A') : '—',
                'clock_out'        => $clockOut ? $clockOut->format('h:i A') : ($status === 'missing' ? 'MISSING' : '—'),
                'clock_in_raw'     => $clockIn ? $clockIn->format('H:i') : null,
                'clock_out_raw'    => $clockOut ? $clockOut->format('H:i') : null,
                'location'         => $att?->clockInLocation?->name ?? '—',
                'working_hours'    => round($hours, 2),
                'hours_formatted'  => $hours > 0 ? sprintf('%dh %02dm', floor($hours), round(($hours - floor($hours)) * 60)) : '—',
                'late_minutes'     => $lateMins,
                'early_minutes'    => $earlyMins,
                'overtime_hours'   => $overtimeHrs,
                'status'           => $status,
                'status_label'     => $statusLabel,
                'remarks'          => implode('; ', $remarks) ?: '—',
            ];
        }

        $totals['total_working_hours']  = round($totals['total_working_hours'], 2);
        $totals['total_overtime_hours'] = round($totals['total_overtime_hours'], 2);

        // Payroll calculation metrics
        $paidLeaves = $totals['leave_breakdown']['annual']
                    + $totals['leave_breakdown']['casual']
                    + $totals['leave_breakdown']['medical']
                    + $totals['leave_breakdown']['other'];
        $noPayLeaves = $totals['leave_breakdown']['nopay'];

        $payableDays = $totals['present'] + $totals['late'] + ($totals['half_day'] * 0.5) + $paidLeaves;
        $unpaidDeductionDays = $totals['absent'] + ($totals['half_day'] * 0.5) + $noPayLeaves + $totals['missing'];

        $standardRequiredHours = $totals['working_days'] * 8.5;
        $effectiveElapsedWorkingDays = max(1, $totals['present'] + $totals['late'] + $totals['half_day'] + $totals['leave'] + $totals['absent'] + $totals['missing']);
        $attendanceRate = round(($payableDays / $effectiveElapsedWorkingDays) * 100, 1);

        $payrollSummary = [
            'calendar_days'               => $totals['calendar_days'],
            'working_days'                => $totals['working_days'],
            'weekend_days'                => $totals['weekend_days'],
            'days_present'                => $totals['present'],
            'days_late'                   => $totals['late'],
            'days_missing'                => $totals['missing'],
            'days_half_day'               => $totals['half_day'],
            'days_leave'                  => $totals['leave'],
            'paid_leave_days'             => $paidLeaves,
            'nopay_leave_days'            => $noPayLeaves,
            'short_leave_hours'           => $totals['short_leave_hours'],
            'days_absent'                 => $totals['absent'],
            'total_working_hours'         => $totals['total_working_hours'],
            'standard_required_hours'     => $standardRequiredHours,
            'total_overtime_hours'        => $totals['total_overtime_hours'],
            'total_late_minutes'          => $totals['total_late_minutes'],
            'total_late_formatted'        => sprintf('%dh %02dm', floor($totals['total_late_minutes'] / 60), $totals['total_late_minutes'] % 60),
            'total_early_minutes'         => $totals['total_early_minutes'],
            'total_early_formatted'       => sprintf('%dh %02dm', floor($totals['total_early_minutes'] / 60), $totals['total_early_minutes'] % 60),
            'payable_attendance_days'     => $payableDays,
            'unpaid_deduction_days'       => $unpaidDeductionDays,
            'attendance_rate'             => $attendanceRate,
            'leave_breakdown'             => $totals['leave_breakdown'],
        ];

        return [
            'employee'     => [
                'id'              => $employee->id,
                'name'            => $employee->full_name,
                'employee_id'     => $employee->employee_id,
                'epf_no'          => $employee->epf_no ?: $employee->employee_id,
                'nic'             => $employee->nic ?: '—',
                'department'      => $employee->department?->name ?? '—',
                'designation'     => $employee->designation?->title ?? $employee->designation?->name ?? '—',
                'manager'         => $employee->manager?->full_name ?? '—',
                'employment_type' => ucfirst(str_replace('_', ' ', $employee->employment_type ?? 'Permanent')),
                'joined_date'     => $employee->joined_date ? Carbon::parse($employee->joined_date)->format('Y-m-d') : '—',
                'basic_salary'    => $employee->basic_salary ? (float) $employee->basic_salary : null,
                'work_location'   => $employee->work_location ?? '—',
                'email'           => $employee->company_email ?: $employee->user?->email,
                'phone'           => $employee->phone ?: '—',
            ],
            'month'        => $month,
            'month_label'  => $startOfMonth->format('F Y'),
            'start_date'   => $startOfMonth->toDateString(),
            'end_date'     => $endOfMonth->toDateString(),
            'generated_at' => Carbon::now('Asia/Colombo')->format('Y-m-d h:i A'),
            'summary'      => $payrollSummary,
            'days'         => $days,
        ];
    }

    /**
     * Generate individual employee monthly payroll report as a printable PDF.
     */
    public function buildIndividualEmployeePdf(array $d): string
    {
        $emp     = $d['employee'];
        $sum     = $d['summary'];
        $days    = $d['days'];
        $monthLbl= e($d['month_label'] . ' (' . $d['start_date'] . ' to ' . $d['end_date'] . ')');
        $genAt   = e($d['generated_at']);

        $badgeStyle = [
            'present'  => 'background:#dcfce7;color:#15803d;',
            'late'     => 'background:#fef3c7;color:#b45309;',
            'missing'  => 'background:#ffe4e6;color:#e11d48;font-weight:700;',
            'half_day' => 'background:#f3e8ff;color:#7c3aed;',
            'leave'    => 'background:#dbeafe;color:#1d4ed8;',
            'absent'   => 'background:#fee2e2;color:#b91c1c;font-weight:700;',
            'weekend'  => 'background:#f1f5f9;color:#64748b;',
            'scheduled'=> 'background:#f8fafc;color:#94a3b8;',
        ];

        $rowsHtml = '';
        foreach ($days as $day) {
            $st = $day['status'] ?? 'scheduled';
            $stStyle = $badgeStyle[$st] ?? 'background:#f1f5f9;color:#475569;';
            $rowBg = $day['is_weekend'] ? '#fafafa' : '#ffffff';
            if ($st === 'missing' || $st === 'absent') {
                $rowBg = '#fff5f5';
            }

            $lateTxt = $day['late_minutes'] > 0 ? ('+' . $day['late_minutes'] . 'm') : '—';
            $earlyTxt = $day['early_minutes'] > 0 ? ('-' . $day['early_minutes'] . 'm') : '—';
            $overtimeTxt = $day['overtime_hours'] > 0 ? ('+' . $day['overtime_hours'] . 'h') : '—';

            $rowsHtml .= '<tr style="background:' . $rowBg . ';">'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;font-weight:600;color:#0f172a;white-space:nowrap;">' . e($day['date']) . ' (' . e($day['day_name']) . ')</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:#334155;">' . e($day['clock_in']) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:#334155;">' . e($day['clock_out']) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:#0f172a;font-weight:600;">' . e($day['hours_formatted']) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:' . ($day['late_minutes'] > 0 ? '#b45309' : '#64748b') . ';">' . e($lateTxt) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:' . ($day['early_minutes'] > 0 ? '#b45309' : '#64748b') . ';">' . e($earlyTxt) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:10px;text-align:center;color:' . ($day['overtime_hours'] > 0 ? '#15803d' : '#64748b') . ';">' . e($overtimeTxt) . '</td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:9.5px;text-align:center;"><span style="padding:2px 6px;border-radius:4px;font-size:9px;display:inline-block;' . $stStyle . '">' . e($day['status_label']) . '</span></td>'
                . '<td style="padding:4px 6px;border-bottom:1px solid #e2e8f0;font-size:9.5px;color:#475569;max-width:180px;">' . e($day['remarks']) . '</td>'
                . '</tr>';
        }

        $salaryRow = $emp['basic_salary']
            ? ('<td style="padding:4px 8px;font-size:11px;color:#334155;"><strong>Basic Salary:</strong> LKR ' . number_format($emp['basic_salary'], 2) . '</td>')
            : '<td style="padding:4px 8px;font-size:11px;color:#64748b;"><strong>Shift Hours:</strong> 9:00 AM – 5:30 PM (8.5h)</td>';

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Payroll Timesheet - {$emp['name']}</title>
  <style>
    @page { margin: 10mm 10mm; }
    body { font-family: DejaVu Sans, Arial, Helvetica, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px; background: #ffffff; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 9px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-bottom: 8px;">
    <div style="float: right; text-align: right; font-size: 9px; color: #64748b;">
      <div>Generated: {$genAt}</div>
      <div style="color: #2563eb; font-weight: 700;">HR &amp; Payroll Certified</div>
    </div>
    <div style="font-size: 10px; font-weight: 700; color: #2563eb; letter-spacing: 0.05em; text-transform: uppercase;">
      Circle Engineering (Pvt) Ltd · Human Resources Division
    </div>
    <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">
      MONTHLY ATTENDANCE &amp; PAYROLL TIMESHEET
    </div>
    <div style="font-size: 10px; color: #475569; margin-top: 2px;">
      <strong>Payroll Period:</strong> {$monthLbl}
    </div>
    <div style="clear: both;"></div>
  </div>

  <!-- Employee Info Box -->
  <div class="box" style="padding: 6px 10px; background: #f8fafc; margin-bottom: 8px;">
    <table>
      <tr>
        <td style="padding: 3px 8px; font-size: 11px; color: #0f172a;"><strong>Employee Name:</strong> {$emp['name']}</td>
        <td style="padding: 3px 8px; font-size: 11px; color: #0f172a;"><strong>EPF / Employee ID:</strong> {$emp['epf_no']} ({$emp['employee_id']})</td>
        <td style="padding: 3px 8px; font-size: 11px; color: #0f172a;"><strong>NIC:</strong> {$emp['nic']}</td>
      </tr>
      <tr>
        <td style="padding: 3px 8px; font-size: 11px; color: #334155;"><strong>Department:</strong> {$emp['department']}</td>
        <td style="padding: 3px 8px; font-size: 11px; color: #334155;"><strong>Designation:</strong> {$emp['designation']}</td>
        <td style="padding: 3px 8px; font-size: 11px; color: #334155;"><strong>Employment:</strong> {$emp['employment_type']}</td>
      </tr>
      <tr>
        <td style="padding: 3px 8px; font-size: 11px; color: #334155;"><strong>Work Location:</strong> {$emp['work_location']}</td>
        <td style="padding: 3px 8px; font-size: 11px; color: #334155;"><strong>Reporting Manager:</strong> {$emp['manager']}</td>
        {$salaryRow}
      </tr>
    </table>
  </div>

  <!-- Payroll Summary Metric Cards -->
  <div class="box" style="padding: 6px 10px; margin-bottom: 8px;">
    <div style="font-size: 10px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; margin-bottom: 4px;">
      Monthly Payroll &amp; Attendance Highlights
    </div>
    <table>
      <tr>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0;">
          <div style="font-size: 8.5px; color: #64748b; text-transform: uppercase;">Working Days</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">{$sum['working_days']}</div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0; background: #f0fdf4;">
          <div style="font-size: 8.5px; color: #15803d; text-transform: uppercase;">Present Days</div>
          <div style="font-size: 13px; font-weight: 800; color: #15803d;">{$sum['days_present']}</div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0; background: #fffbeb;">
          <div style="font-size: 8.5px; color: #b45309; text-transform: uppercase;">Late Arrivals</div>
          <div style="font-size: 13px; font-weight: 800; color: #b45309;">{$sum['days_late']} <span style="font-size:9px;font-weight:400;">({$sum['total_late_formatted']})</span></div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0; background: #fff1f2;">
          <div style="font-size: 8.5px; color: #e11d48; text-transform: uppercase;">Missing Out</div>
          <div style="font-size: 13px; font-weight: 800; color: #e11d48;">{$sum['days_missing']}</div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0;">
          <div style="font-size: 8.5px; color: #7c3aed; text-transform: uppercase;">Half Days</div>
          <div style="font-size: 13px; font-weight: 800; color: #7c3aed;">{$sum['days_half_day']}</div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0; background: #eff6ff;">
          <div style="font-size: 8.5px; color: #1d4ed8; text-transform: uppercase;">Approved Leaves</div>
          <div style="font-size: 13px; font-weight: 800; color: #1d4ed8;">{$sum['paid_leave_days']}d <span style="font-size:9px;font-weight:400;">({$sum['short_leave_hours']}h SL)</span></div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0; background: #fef2f2;">
          <div style="font-size: 8.5px; color: #dc2626; text-transform: uppercase;">Absent / No-Pay</div>
          <div style="font-size: 13px; font-weight: 800; color: #dc2626;">{$sum['days_absent']}d</div>
        </td>
        <td style="padding: 4px; text-align: center; border-right: 1px solid #e2e8f0;">
          <div style="font-size: 8.5px; color: #475569; text-transform: uppercase;">Total Hours</div>
          <div style="font-size: 13px; font-weight: 800; color: #2563eb;">{$sum['total_working_hours']}h</div>
        </td>
        <td style="padding: 4px; text-align: center; background: #f0fdf4;">
          <div style="font-size: 8.5px; color: #166534; font-weight: 700; text-transform: uppercase;">Payable Days</div>
          <div style="font-size: 15px; font-weight: 800; color: #166534;">{$sum['payable_attendance_days']}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Day-by-Day Itemized Timesheet -->
  <div style="margin-bottom: 8px;">
    <div style="font-size: 10px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 4px;">
      Day-by-Day Attendance &amp; Shift Timesheet
    </div>
    <table style="border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background: #e2e8f0; color: #1e293b;">
          <th style="padding: 5px 6px; text-align: left; font-size: 9.5px;">Date &amp; Day</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Clock In</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Clock Out</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Hours</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Late</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Early</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">OT</th>
          <th style="padding: 5px 6px; text-align: center; font-size: 9.5px;">Status</th>
          <th style="padding: 5px 6px; text-align: left; font-size: 9.5px;">Leave Details / Remarks</th>
        </tr>
      </thead>
      <tbody>
        {$rowsHtml}
      </tbody>
    </table>
  </div>

  <!-- Verification and Signatures Block -->
  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #cbd5e1;">
    <table style="width: 100%;">
      <tr>
        <td style="width: 25%; text-align: center; padding: 4px;">
          <div style="border-bottom: 1px solid #475569; height: 26px; margin-bottom: 4px;"></div>
          <div style="font-size: 9px; font-weight: 700; color: #1e293b;">Prepared By</div>
          <div style="font-size: 8px; color: #64748b;">HR Officer / Executive</div>
        </td>
        <td style="width: 25%; text-align: center; padding: 4px;">
          <div style="border-bottom: 1px solid #475569; height: 26px; margin-bottom: 4px;"></div>
          <div style="font-size: 9px; font-weight: 700; color: #1e293b;">Checked By</div>
          <div style="font-size: 8px; color: #64748b;">Accountant / Payroll Officer</div>
        </td>
        <td style="width: 25%; text-align: center; padding: 4px;">
          <div style="border-bottom: 1px solid #475569; height: 26px; margin-bottom: 4px;"></div>
          <div style="font-size: 9px; font-weight: 700; color: #1e293b;">Approved By</div>
          <div style="font-size: 8px; color: #64748b;">General Manager / Director</div>
        </td>
        <td style="width: 25%; text-align: center; padding: 4px;">
          <div style="border-bottom: 1px solid #475569; height: 26px; margin-bottom: 4px;"></div>
          <div style="font-size: 9px; font-weight: 700; color: #1e293b;">Employee Signature</div>
          <div style="font-size: 8px; color: #64748b;">Date: ___/___/______</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
HTML;

        return Pdf::loadHTML($html)->setPaper('a4', 'portrait')->output();
    }

    /**
     * Generate individual employee monthly payroll report as CSV.
     */
    public function buildIndividualEmployeeCsv(array $d): string
    {
        $emp  = $d['employee'];
        $sum  = $d['summary'];
        $days = $d['days'];

        $lines = [];
        $escape = fn($v) => '"' . str_replace('"', '""', (string) $v) . '"';

        $lines[] = "\xEF\xBB\xBF" . implode(',', array_map($escape, ['Circle Engineering (Pvt) Ltd - Monthly Employee Attendance & Payroll Timesheet']));
        $lines[] = implode(',', array_map($escape, ['Payroll Month:', $d['month_label'] . ' (' . $d['start_date'] . ' to ' . $d['end_date'] . ')']));
        $lines[] = implode(',', array_map($escape, ['Generated At:', $d['generated_at']]));
        $lines[] = '';

        // Employee Metadata
        $lines[] = implode(',', array_map($escape, ['--- EMPLOYEE INFORMATION ---']));
        $lines[] = implode(',', array_map($escape, ['Full Name', $emp['name'], 'EPF No', $emp['epf_no'], 'Employee ID', $emp['employee_id']]));
        $lines[] = implode(',', array_map($escape, ['Department', $emp['department'], 'Designation', $emp['designation'], 'NIC', $emp['nic']]));
        $lines[] = implode(',', array_map($escape, ['Employment Type', $emp['employment_type'], 'Work Location', $emp['work_location'], 'Reporting Manager', $emp['manager']]));
        $lines[] = implode(',', array_map($escape, ['Joined Date', $emp['joined_date'], 'Basic Salary', $emp['basic_salary'] ? 'LKR ' . number_format($emp['basic_salary'], 2) : '—', 'Email', $emp['email']]));
        $lines[] = '';

        // Payroll Summary
        $lines[] = implode(',', array_map($escape, ['--- PAYROLL & ATTENDANCE SUMMARY ---']));
        $lines[] = implode(',', array_map($escape, ['Total Calendar Days', $sum['calendar_days'], 'Working Days (Mon-Fri)', $sum['working_days'], 'Weekend Days', $sum['weekend_days']]));
        $lines[] = implode(',', array_map($escape, ['Present Days (Full)', $sum['days_present'], 'Late Arrival Days', $sum['days_late'], 'Total Late Minutes', $sum['total_late_minutes'] . ' mins (' . $sum['total_late_formatted'] . ')']));
        $lines[] = implode(',', array_map($escape, ['Missing Clock-outs', $sum['days_missing'], 'Half Days Worked', $sum['days_half_day'], 'Approved Leave Days', $sum['days_leave']]));
        $lines[] = implode(',', array_map($escape, ['Paid Leave Days', $sum['paid_leave_days'], 'No-Pay Leave Days', $sum['nopay_leave_days'], 'Short Leave Hours', $sum['short_leave_hours'] . ' hrs']));
        $lines[] = implode(',', array_map($escape, ['Unauthorized Absent Days', $sum['days_absent'], 'Total Actual Working Hours', $sum['total_working_hours'] . ' hrs', 'Standard Required Hours', $sum['standard_required_hours'] . ' hrs']));
        $lines[] = implode(',', array_map($escape, ['Overtime Hours', $sum['total_overtime_hours'] . ' hrs', 'Early Departure Minutes', $sum['total_early_minutes'] . ' mins (' . $sum['total_early_formatted'] . ')', 'Attendance Rate', $sum['attendance_rate'] . '%']));
        $lines[] = implode(',', array_map($escape, ['PAYABLE SALARY DAYS', $sum['payable_attendance_days'] . ' days', 'LOSS OF PAY (NOPAY) DAYS', $sum['unpaid_deduction_days'] . ' days']));
        $lines[] = '';

        // Day-by-Day Itemized Timesheet Table
        $lines[] = implode(',', array_map($escape, ['--- DAY-BY-DAY ITEMIZED TIMESHEET ---']));
        $lines[] = implode(',', array_map($escape, [
            'Date',
            'Day',
            'Day Type',
            'Clock In',
            'Clock Out',
            'Work Location',
            'Hours Worked (Decimal)',
            'Hours Formatted',
            'Late Minutes',
            'Early Departure Minutes',
            'Overtime Hours',
            'Status',
            'Remarks / Leave Details',
        ]));

        foreach ($days as $day) {
            $lines[] = implode(',', array_map($escape, [
                $day['date'],
                $day['day_name'],
                $day['is_weekend'] ? 'Weekend' : 'Working Day',
                $day['clock_in'],
                $day['clock_out'],
                $day['location'],
                $day['working_hours'],
                $day['hours_formatted'],
                $day['late_minutes'],
                $day['early_minutes'],
                $day['overtime_hours'],
                $day['status_label'],
                $day['remarks'],
            ]));
        }

        return implode("\r\n", $lines);
    }
}
