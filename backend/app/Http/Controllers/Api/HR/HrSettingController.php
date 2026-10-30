<?php

namespace App\Http\Controllers\Api\HR;

use App\Http\Controllers\Controller;
use App\Services\HrAttendanceLeaveReportService;
use Illuminate\Http\Request;

class HrSettingController extends Controller
{
    private function authorizeSuperOrHrAdmin(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;
        return $user->role === 'super_admin'
            || $user->role === 'solar_hr_admin'
            || (method_exists($user, 'hasRole') && ($user->hasRole('super_admin') || $user->hasRole('solar_hr_admin')));
    }

    /**
     * GET /api/hr/settings/mail-reports
     * Fetch current mail report recipient settings & list of all assignable users.
     */
    public function getMailReportSettings(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $settings   = $service->getSettings();
        $users      = $service->getAvailableUsers();
        $recipients = $service->getRecipients();
        $transport  = $service->getMailTransportStatus($settings);

        return response()->json([
            'settings'            => $settings,
            'available_users'     => $users,
            'resolved_recipients' => $recipients['emails'],
            'mail_transport'      => $transport,
        ]);
    }

    /**
     * PUT /api/hr/settings/mail-reports
     * Save manual recipient user assignments, custom emails, SMTP config, and schedule/format toggles.
     */
    public function saveMailReportSettings(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'recipient_user_ids'   => 'nullable|array',
            'recipient_user_ids.*' => 'integer',
            'custom_emails'        => 'nullable|array',
            'custom_emails.*'      => 'string|email',
            'weekly_enabled'       => 'nullable|boolean',
            'monthly_enabled'      => 'nullable|boolean',
            'include_pdf'          => 'nullable|boolean',
            'include_csv'          => 'nullable|boolean',
            'smtp_mode'            => 'nullable|string|in:env,custom',
            'smtp_host'            => 'nullable|string|max:255',
            'smtp_port'            => 'nullable|integer|min:1|max:65535',
            'smtp_encryption'      => 'nullable|string|in:tls,ssl,none,',
            'smtp_username'        => 'nullable|string|max:255',
            'smtp_password'        => 'nullable|string|max:255',
            'smtp_from_address'    => 'nullable|string|email|max:255',
            'smtp_from_name'       => 'nullable|string|max:255',
        ]);

        $saved      = $service->saveSettings($validated);
        $recipients = $service->getRecipients();
        $transport  = $service->getMailTransportStatus($saved);

        return response()->json([
            'message'             => 'Mail report settings saved successfully.',
            'settings'            => $saved,
            'resolved_recipients' => $recipients['emails'],
            'mail_transport'      => $transport,
        ]);
    }

    /**
     * POST /api/hr/settings/mail-reports/send-now
     * Manually trigger sending the current Attendance & Leave Report (PDF + CSV) to assigned users.
     */
    public function sendMailReportNow(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'period'               => 'required|in:daily,weekly,monthly,custom',
            'month'                => 'nullable|string|max:10',
            'start_date'           => 'nullable|date_format:Y-m-d',
            'end_date'             => 'nullable|date_format:Y-m-d',
            'department_id'        => 'nullable|integer',
            'recipient_user_ids'   => 'nullable|array',
            'recipient_user_ids.*' => 'integer',
            'custom_emails'        => 'nullable|array',
            'custom_emails.*'      => 'string|email',
            'smtp_mode'            => 'nullable|string|in:env,custom',
            'smtp_host'            => 'nullable|string|max:255',
            'smtp_port'            => 'nullable|integer|min:1|max:65535',
            'smtp_encryption'      => 'nullable|string|in:tls,ssl,none,',
            'smtp_username'        => 'nullable|string|max:255',
            'smtp_password'        => 'nullable|string|max:255',
            'smtp_from_address'    => 'nullable|string|email|max:255',
            'smtp_from_name'       => 'nullable|string|max:255',
        ]);

        // Save current form settings first so recipients & SMTP settings stay in sync
        if ($request->hasAny(['recipient_user_ids', 'custom_emails', 'smtp_mode', 'smtp_host'])) {
            $service->saveSettings($request->only([
                'recipient_user_ids',
                'custom_emails',
                'weekly_enabled',
                'monthly_enabled',
                'include_pdf',
                'include_csv',
                'smtp_mode',
                'smtp_host',
                'smtp_port',
                'smtp_encryption',
                'smtp_username',
                'smtp_password',
                'smtp_from_address',
                'smtp_from_name',
            ]));
        }

        $recipients = $service->getRecipients(
            $validated['recipient_user_ids'] ?? null,
            $validated['custom_emails'] ?? null
        );

        if (empty($recipients['emails'])) {
            return response()->json([
                'message' => 'Please select at least one recipient user or enter a valid email address before sending.',
            ], 422);
        }

        try {
            $result = $service->sendReport(
                $validated['period'],
                $validated['month'] ?? null,
                !empty($validated['department_id']) ? (int) $validated['department_id'] : null,
                $validated['recipient_user_ids'] ?? null,
                $validated['custom_emails'] ?? null,
                false,
                $validated['start_date'] ?? null,
                $validated['end_date'] ?? null
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'SMTP Mail Delivery Error: ' . $e->getMessage(),
            ], 422);
        }

        $transport = $result['transport'] ?? $service->getMailTransportStatus();
        $viaNote   = ' via ' . ($transport['host'] ?? 'SMTP');

        return response()->json([
            'message' => sprintf(
                '%s Attendance & Leave Report (%s) sent with %s to %d recipient(s)%s!',
                ucfirst($result['period']),
                $result['range_label'],
                implode(' & ', $result['attachments']),
                count($result['recipients']),
                $viaNote
            ),
            'data'           => $result,
            'settings'       => $service->getSettings(),
            'mail_transport' => $transport,
        ]);
    }

    /**
     * GET /api/hr/settings/mail-reports/download?period=daily|weekly|monthly|custom&format=pdf|csv&month=YYYY-MM&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
     * Download the generated PDF or CSV report directly.
     */
    public function downloadMailReport(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->filled('employee_id')) {
            return $this->downloadIndividualPayrollReport($request, $service);
        }

        $period    = in_array($request->get('period'), ['daily', 'weekly', 'monthly', 'custom'], true) ? $request->get('period') : 'weekly';
        $format    = in_array($request->get('format'), ['pdf', 'csv'], true) ? $request->get('format') : 'pdf';
        $month     = $request->get('month');
        $startDate = $request->get('start_date');
        $endDate   = $request->get('end_date');
        $deptId    = $request->get('department_id') ? (int) $request->get('department_id') : null;

        $reportData = $service->buildReport($period, $month, $deptId, false, $startDate, $endDate);
        $baseName   = sprintf(
            'attendance_leave_%s_report_%s_to_%s',
            $period,
            $reportData['start_date'],
            $reportData['end_date']
        );

        if ($format === 'csv') {
            $csv = $service->buildCsv($reportData);
            return response($csv, 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $baseName . '.csv"',
            ]);
        }

        $pdf = $service->buildPdf($reportData);
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $baseName . '.pdf"',
        ]);
    }

    /**
     * GET /api/hr/settings/employee-payroll-report/preview?employee_id=X&month=YYYY-MM
     * Fetch JSON summary and daily breakdown for an individual employee for live preview in UI.
     */
    public function previewIndividualPayrollReport(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:hr_employees,id',
            'month'       => 'nullable|string|max:10',
        ]);

        $reportData = $service->buildIndividualEmployeePayrollReport(
            (int) $validated['employee_id'],
            $validated['month'] ?? null
        );

        return response()->json($reportData);
    }

    /**
     * GET /api/hr/settings/employee-payroll-report/download?employee_id=X&month=YYYY-MM&format=pdf|csv
     * Download the individual employee monthly payroll report directly as PDF or CSV.
     */
    public function downloadIndividualPayrollReport(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'employee_id' => 'required|exists:hr_employees,id',
            'month'       => 'nullable|string|max:10',
            'format'      => 'nullable|in:pdf,csv',
        ]);

        $format = $validated['format'] ?? 'pdf';
        $reportData = $service->buildIndividualEmployeePayrollReport(
            (int) $validated['employee_id'],
            $validated['month'] ?? null
        );

        $emp = $reportData['employee'];
        $cleanName = preg_replace('/[^A-Za-z0-9_-]/', '_', $emp['name']);
        $cleanEpf  = preg_replace('/[^A-Za-z0-9_-]/', '_', $emp['epf_no'] ?: $emp['employee_id']);
        $baseName  = sprintf('payroll_timesheet_%s_%s_%s', $cleanEpf, $cleanName, $reportData['month']);

        if ($format === 'csv') {
            $csv = $service->buildIndividualEmployeeCsv($reportData);
            return response($csv, 200, [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $baseName . '.csv"',
            ]);
        }

        $pdf = $service->buildIndividualEmployeePdf($reportData);
        return response($pdf, 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $baseName . '.pdf"',
        ]);
    }
}

