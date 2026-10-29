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
            'period'               => 'required|in:weekly,monthly',
            'month'                => 'nullable|string|max:10',
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
                false
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'SMTP Mail Delivery Error: ' . $e->getMessage(),
            ], 422);
        }

        $transport = $result['transport'] ?? $service->getMailTransportStatus();
        $viaNote   = !empty($transport['is_sandbox'])
            ? ' (Captured in Local Mailpit Sandbox: http://localhost:8025 — configure Live SMTP in Section 2 to deliver to real inboxes)'
            : ' via ' . ($transport['host'] ?? 'SMTP');

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
     * GET /api/hr/settings/mail-reports/download?period=weekly|monthly&format=pdf|csv&month=YYYY-MM
     * Download the generated PDF or CSV report directly.
     */
    public function downloadMailReport(Request $request, HrAttendanceLeaveReportService $service)
    {
        if (!$this->authorizeSuperOrHrAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $period = in_array($request->get('period'), ['weekly', 'monthly'], true) ? $request->get('period') : 'weekly';
        $format = in_array($request->get('format'), ['pdf', 'csv'], true) ? $request->get('format') : 'pdf';
        $month  = $request->get('month');
        $deptId = $request->get('department_id') ? (int) $request->get('department_id') : null;

        $reportData = $service->buildReport($period, $month, $deptId, false);
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
}

