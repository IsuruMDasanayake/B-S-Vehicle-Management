<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class HrAttendanceLeaveReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public array $reportData;
    public ?string $pdfContent;
    public ?string $pdfFilename;
    public ?string $csvContent;
    public ?string $csvFilename;

    public function __construct(
        array $reportData,
        ?string $pdfContent = null,
        ?string $pdfFilename = null,
        ?string $csvContent = null,
        ?string $csvFilename = null
    ) {
        $this->reportData  = $reportData;
        $this->pdfContent  = $pdfContent;
        $this->pdfFilename = $pdfFilename;
        $this->csvContent  = $csvContent;
        $this->csvFilename = $csvFilename;
    }

    public function build()
    {
        $periodLabel = ucfirst($this->reportData['period'] ?? 'Weekly');
        $rangeLabel  = $this->reportData['range_label'] ?? '';
        $subject     = "Circle Engineering HR — {$periodLabel} Attendance & Leave Report ({$rangeLabel})";

        $fromAddress = config('mail.from.address', 'noreply@circlegroup.lk');
        $fromName    = config('mail.from.name', 'Circle Engineering HR');

        $mail = $this->from($fromAddress, $fromName)
            ->subject($subject)
            ->html(self::renderReportHtml($this->reportData, false));

        if (!empty($this->pdfContent) && !empty($this->pdfFilename)) {
            $mail->attachData($this->pdfContent, $this->pdfFilename, [
                'mime' => 'application/pdf',
            ]);
        }

        if (!empty($this->csvContent) && !empty($this->csvFilename)) {
            $mail->attachData($this->csvContent, $this->csvFilename, [
                'mime' => 'text/csv',
            ]);
        }

        return $mail;
    }

    public static function renderReportHtml(array $d, bool $forPdf = false): string
    {
        $periodLabel = e(ucfirst($d['period'] ?? 'Weekly'));
        $rangeLabel  = e($d['range_label'] ?? '');
        $generatedAt = e($d['generated_at'] ?? '');
        $summary     = $d['summary'] ?? [];
        $leaveStats  = $d['leave_stats'] ?? [];
        $employees   = $d['employees'] ?? [];
        $leaves      = $d['leaves'] ?? [];

        $empRowsHtml = '';
        foreach ($employees as $emp) {
            $rate = (float) ($emp['attendance_rate'] ?? 0);
            $rateColor = $rate >= 90 ? '#16a34a' : ($rate >= 75 ? '#d97706' : '#dc2626');
            $rateBg    = $rate >= 90 ? '#dcfce7' : ($rate >= 75 ? '#fef3c7' : '#fee2e2');

            $empRowsHtml .= '<tr>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;font-weight:600;">' . e($emp['epf_no'] ?: $emp['employee_id']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#0f172a;font-weight:600;">' . e($emp['name']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569;">' . e($emp['department']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#475569;">' . (int) $emp['working_days'] . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#16a34a;font-weight:700;">' . (int) $emp['present'] . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#d97706;font-weight:700;">' . (int) $emp['late'] . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#7c3aed;font-weight:700;">' . (int) $emp['half_day'] . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;"><span style="background:#dbeafe;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-weight:700;font-size:10px;">' . (int) $emp['leave'] . '</span></td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#dc2626;font-weight:700;">' . (int) $emp['absent'] . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;color:#334155;">' . e($emp['total_working_hours']) . 'h</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;"><span style="background:' . $rateBg . ';color:' . $rateColor . ';padding:2px 7px;border-radius:999px;font-weight:700;font-size:10px;">' . e($rate) . '%</span></td>'
                . '</tr>';
        }

        if ($empRowsHtml === '') {
            $empRowsHtml = '<tr><td colspan="11" style="padding:14px;text-align:center;color:#64748b;font-size:12px;">No active employees found.</td></tr>';
        }

        $leaveRowsHtml = '';
        foreach ($leaves as $lv) {
            $statusBadge = match ($lv['status']) {
                'approved'         => '<span style="background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">LV · HR Approved</span>',
                'manager_approved' => '<span style="background:#e0f2fe;color:#0369a1;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">Mgr Approved</span>',
                'pending'          => '<span style="background:#fef3c7;color:#b45309;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">Pending</span>',
                'manager_rejected' => '<span style="background:#fee2e2;color:#b91c1c;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">Mgr Rejected</span>',
                'rejected'         => '<span style="background:#fee2e2;color:#b91c1c;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">HR Rejected</span>',
                default            => '<span style="background:#f1f5f9;color:#475569;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;">' . e($lv['status']) . '</span>',
            };

            $leaveRowsHtml .= '<tr>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#0f172a;font-weight:600;">' . e($lv['employee_name']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569;">' . e($lv['department']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;text-transform:capitalize;font-weight:600;">' . e($lv['leave_type']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">' . e($lv['dates']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#334155;">' . e($lv['duration']) . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;">' . $statusBadge . '</td>'
                . '<td style="padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;">' . e($lv['reason'] ?: '—') . '</td>'
                . '</tr>';
        }

        if ($leaveRowsHtml === '') {
            $leaveRowsHtml = '<tr><td colspan="7" style="padding:14px;text-align:center;color:#64748b;font-size:12px;">No leave requests recorded during this period.</td></tr>';
        }

        $footerNote = $forPdf
            ? ''
            : '<p style="margin:18px 0 0;font-size:12px;color:#64748b;">Attached: <strong>PDF Report (.pdf)</strong> and <strong>CSV Spreadsheet (.csv)</strong>.</p>';

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{$periodLabel} Attendance & Leave Report</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:DejaVu Sans,Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:1000px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <!-- Header -->
    <div style="padding:16px 20px;border-bottom:2px solid #e2e8f0;background:#ffffff;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:4px;">
        Circle Engineering (Pvt) Ltd · Human Resources Department
      </div>
      <h1 style="margin:0;font-size:18px;font-weight:800;color:#0f172a;">
        {$periodLabel} Attendance &amp; Leave Report
      </h1>
      <div style="margin-top:5px;font-size:12px;color:#475569;">
        <strong>Period:</strong> {$rangeLabel} &nbsp;|&nbsp; <strong>Generated:</strong> {$generatedAt}
      </div>
    </div>

    <div style="padding:18px 20px;">
      <!-- Attendance Summary Cards -->
      <h2 style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">
        1. Attendance Overview
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#0f172a;">{$summary['working_days']}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Working Days</div>
          </td>
          <td style="padding:10px;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#16a34a;">{$summary['present']}</div>
            <div style="font-size:10px;color:#15803d;margin-top:2px;">Present (P)</div>
          </td>
          <td style="padding:10px;background:#fffbeb;border:1px solid #fde68a;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#d97706;">{$summary['late']}</div>
            <div style="font-size:10px;color:#b45309;margin-top:2px;">Late (L)</div>
          </td>
          <td style="padding:10px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#2563eb;">{$summary['leave']}</div>
            <div style="font-size:10px;color:#1d4ed8;margin-top:2px;">Approved Leave (LV)</div>
          </td>
          <td style="padding:10px;background:#fef2f2;border:1px solid #fecaca;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#dc2626;">{$summary['absent']}</div>
            <div style="font-size:10px;color:#b91c1c;margin-top:2px;">Absent (A)</div>
          </td>
          <td style="padding:10px;background:#f5f3ff;border:1px solid #ddd6fe;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#7c3aed;">{$summary['half_day']}</div>
            <div style="font-size:10px;color:#6d28d9;margin-top:2px;">Half Day (H)</div>
          </td>
          <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center;width:14%;">
            <div style="font-size:16px;font-weight:800;color:#0f172a;">{$summary['avg_attendance_rate']}%</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Avg Attendance</div>
          </td>
        </tr>
      </table>

      <!-- Leave Summary Cards -->
      <h2 style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">
        2. Leave Management Summary ({$rangeLabel})
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:9px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:11px;">
            <strong>Total Requests:</strong> {$leaveStats['total']} &nbsp;|&nbsp;
            <span style="color:#d97706;font-weight:700;">Pending: {$leaveStats['pending']}</span> &nbsp;|&nbsp;
            <span style="color:#0284c7;font-weight:700;">Mgr Approved: {$leaveStats['manager_approved']}</span> &nbsp;|&nbsp;
            <span style="color:#16a34a;font-weight:700;">HR Approved (LV): {$leaveStats['approved']}</span> &nbsp;|&nbsp;
            <span style="color:#dc2626;font-weight:700;">Rejected: {$leaveStats['rejected']}</span>
          </td>
        </tr>
      </table>

      <!-- Employee Attendance Breakdown Table -->
      <h2 style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">
        3. Employee Attendance &amp; Leave Breakdown
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:22px;border:1px solid #e2e8f0;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;">
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">EPF / ID</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Employee</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Department</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#475569;text-transform:uppercase;">Wrk Days</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#16a34a;text-transform:uppercase;">P</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#d97706;text-transform:uppercase;">L</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#7c3aed;text-transform:uppercase;">H</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#2563eb;text-transform:uppercase;">LV</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#dc2626;text-transform:uppercase;">A</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#475569;text-transform:uppercase;">Hours</th>
            <th style="padding:7px 8px;text-align:center;font-size:10px;color:#475569;text-transform:uppercase;">Rate</th>
          </tr>
        </thead>
        <tbody>
          {$empRowsHtml}
        </tbody>
      </table>

      <!-- Leave Requests Table -->
      <h2 style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;">
        4. Leave Requests in Period
      </h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;">
        <thead>
          <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;">
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Employee</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Department</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Type</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Dates</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Duration</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Status</th>
            <th style="padding:7px 8px;text-align:left;font-size:10px;color:#475569;text-transform:uppercase;">Reason</th>
          </tr>
        </thead>
        <tbody>
          {$leaveRowsHtml}
        </tbody>
      </table>

      {$footerNote}
    </div>
  </div>
</body>
</html>
HTML;
    }
}
