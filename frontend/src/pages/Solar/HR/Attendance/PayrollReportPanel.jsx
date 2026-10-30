import { useState, useEffect, useCallback } from 'react';
import {
  Download, Loader2, Mail, Send, CheckCircle2, UserCheck, Building2,
  FileSpreadsheet, FileText, Calendar, Search
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

export default function PayrollReportPanel({
  initialScope = 'employee',
  title = 'Payroll & Attendance Reports',
  subtitle = 'Generate company summary reports or individual monthly employee timesheets for payroll (PDF + CSV).',
  cardStyle = {},
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [loading, setLoading] = useState(true);
  const [reportScope, setReportScope] = useState(initialScope); // 'employee' | 'company'
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Individual employee report state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empReportMonth, setEmpReportMonth] = useState(defaultMonth);
  const [empPreviewData, setEmpPreviewData] = useState(null);
  const [empPreviewLoading, setEmpPreviewLoading] = useState(false);
  const [downloadingEmpFormat, setDownloadingEmpFormat] = useState(''); // '' | 'pdf' | 'csv'

  // Company report state
  const [testPeriod, setTestPeriod] = useState('monthly'); // 'daily' | 'weekly' | 'monthly' | 'custom'
  const [testMonth, setTestMonth] = useState(defaultMonth);
  const [testStartDate, setTestStartDate] = useState(defaultDate);
  const [testEndDate, setTestEndDate] = useState(defaultDate);
  const [testDeptId, setTestDeptId] = useState('');
  const [sendingPeriod, setSendingPeriod] = useState('');
  const [downloadingFormat, setDownloadingFormat] = useState('');
  const [lastSentAt, setLastSentAt] = useState(null);
  const [lastSentSummary, setLastSentSummary] = useState(null);

  // Initial load
  useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      try {
        const [empRes, deptRes, mailRes] = await Promise.all([
          api.get('/hr/employees').catch(() => ({ data: [] })),
          api.get('/hr/departments').catch(() => ({ data: [] })),
          api.get('/hr/settings/mail-reports').catch(() => ({ data: {} })),
        ]);
        if (isCancelled) return;
        const empList = empRes.data || [];
        setEmployees(empList);
        setDepartments(deptRes.data || []);
        if (empList.length > 0) {
          setSelectedEmpId(prev => prev || String(empList[0].id));
        }
        const s = mailRes.data?.settings || {};
        setLastSentAt(s.last_sent_at || null);
        setLastSentSummary(s.last_sent_summary || null);
      } catch {
        // silent
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    loadData();
    return () => { isCancelled = true; };
  }, []);

  // Live fetch employee payroll preview when selected
  useEffect(() => {
    if (reportScope !== 'employee' || !selectedEmpId) {
      setEmpPreviewData(null);
      return;
    }
    let isCancelled = false;
    setEmpPreviewLoading(true);
    api.get('/hr/settings/employee-payroll-report/preview', {
      params: { employee_id: selectedEmpId, month: empReportMonth }
    }).then(res => {
      if (!isCancelled) {
        setEmpPreviewData(res.data);
      }
    }).catch(() => {
      if (!isCancelled) {
        setEmpPreviewData(null);
      }
    }).finally(() => {
      if (!isCancelled) {
        setEmpPreviewLoading(false);
      }
    });
    return () => { isCancelled = true; };
  }, [reportScope, selectedEmpId, empReportMonth]);

  // Handler: Download Individual Employee Payroll Report
  const handleDownloadEmployeeReport = async (format) => {
    if (!selectedEmpId) {
      toast.error('Please select an employee first');
      return;
    }
    setDownloadingEmpFormat(format);
    try {
      const res = await api.get('/hr/settings/employee-payroll-report/download', {
        params: {
          employee_id: selectedEmpId,
          month: empReportMonth,
          format,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8',
      });
      const emp = employees.find(e => String(e.id) === String(selectedEmpId));
      const cleanName = (emp?.full_name || 'employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanEpf = (emp?.epf_no || emp?.employee_id || 'emp').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `payroll_timesheet_${cleanEpf}_${cleanName}_${empReportMonth}.${format}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Individual Payroll ${format.toUpperCase()} downloaded!`);
    } catch {
      toast.error(`Failed to download Payroll ${format.toUpperCase()} report`);
    } finally {
      setDownloadingEmpFormat('');
    }
  };

  // Handler: Download Company Report
  const handleDownloadReport = async (format) => {
    setDownloadingFormat(format);
    try {
      const params = {
        period: testPeriod,
        format,
        month: testPeriod === 'monthly' ? testMonth : undefined,
        start_date: ['daily', 'weekly', 'custom'].includes(testPeriod) ? testStartDate : undefined,
        end_date: testPeriod === 'custom' ? testEndDate : undefined,
        department_id: testDeptId || undefined,
      };
      const res = await api.get('/hr/settings/mail-reports/download', {
        params,
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_leave_${testPeriod}_report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloadingFormat('');
    }
  };

  // Handler: Send Report Now via Email
  const handleSendReportNow = async () => {
    setSendingPeriod(testPeriod);
    try {
      const res = await api.post('/hr/settings/mail-reports/send-now', {
        period: testPeriod,
        month: testPeriod === 'monthly' ? testMonth : undefined,
        start_date: ['daily', 'weekly', 'custom'].includes(testPeriod) ? testStartDate : undefined,
        end_date: testPeriod === 'custom' ? testEndDate : undefined,
        department_id: testDeptId ? Number(testDeptId) : undefined,
      });
      toast.success(res.data?.message || 'Report emailed successfully!', { duration: 6000 });
      if (res.data?.settings) {
        setLastSentAt(res.data.settings.last_sent_at);
        setLastSentSummary(res.data.settings.last_sent_summary);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send report email');
    } finally {
      setSendingPeriod('');
    }
  };

  const getPeriodLabel = (p) => {
    if (p === 'daily') return 'Daily';
    if (p === 'weekly') return 'Weekly';
    if (p === 'monthly') return 'Monthly';
    if (p === 'custom') return 'Custom Range';
    return p;
  };

  return (
    <div
      className="card"
      style={{
        background: 'var(--surface, #fff)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: '12px',
        padding: '1.25rem',
        ...cardStyle,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--surface-2)' }}>
        <div style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
          <FileSpreadsheet size={20} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            {title}
          </h3>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {subtitle}
          </div>
        </div>
      </div>

      {/* Scope Switcher: Individual Employee Payroll vs Company Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1.1rem', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: '10px' }}>
        <button
          type="button"
          onClick={() => setReportScope('employee')}
          style={{
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: reportScope === 'employee' ? 'var(--white, #fff)' : 'transparent',
            color: reportScope === 'employee' ? '#2563eb' : 'var(--text-muted)',
            boxShadow: reportScope === 'employee' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <UserCheck size={14} /> Individual Employee (Payroll)
        </button>
        <button
          type="button"
          onClick={() => setReportScope('company')}
          style={{
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: reportScope === 'company' ? 'var(--white, #fff)' : 'transparent',
            color: reportScope === 'company' ? '#2563eb' : 'var(--text-muted)',
            boxShadow: reportScope === 'company' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Building2 size={14} /> Company Summary
        </button>
      </div>

      {/* ── MODE 1: INDIVIDUAL EMPLOYEE MONTHLY PAYROLL REPORT ── */}
      {reportScope === 'employee' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            {/* Employee Dropdown */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Select Employee for Payroll Report <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="form-control"
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                style={{ fontSize: '0.84rem' }}
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.epf_no ? `(EPF: ${emp.epf_no})` : (emp.employee_id ? `(${emp.employee_id})` : '')} — {emp.designation?.title || emp.designation?.name || 'Staff'} ({emp.department?.name || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            {/* Month Picker */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                Payroll Month <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="month"
                className="form-control"
                value={empReportMonth}
                onChange={e => setEmpReportMonth(e.target.value)}
                style={{ fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {/* Live Preview Summary Card */}
          {empPreviewLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '1rem' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', display: 'inline', marginRight: '0.4rem' }} />
              Calculating monthly timesheet &amp; payroll metrics...
            </div>
          ) : empPreviewData?.summary ? (
            <div style={{ background: 'var(--surface-2)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--dark)' }}>
                    {empPreviewData.employee?.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                    EPF: <strong>{empPreviewData.employee?.epf_no}</strong> · {empPreviewData.employee?.designation} · {empPreviewData.employee?.department}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>
                    Month: <strong>{empPreviewData.month_label}</strong>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Payable Salary Days</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
                    {empPreviewData.summary?.payable_attendance_days} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {empPreviewData.summary?.working_days}d</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>
                    NOPAY Deductions: {empPreviewData.summary?.unpaid_deduction_days}d
                  </div>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', textAlign: 'center', marginBottom: '0.65rem' }}>
                <div style={{ background: 'var(--surface)', padding: '0.45rem 0.2rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>{empPreviewData.summary?.days_present}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Present</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '0.45rem 0.2rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#d97706' }}>{empPreviewData.summary?.days_late}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Late ({empPreviewData.summary?.total_late_minutes}m)</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '0.45rem 0.2rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb' }}>{empPreviewData.summary?.days_leave}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Leaves ({empPreviewData.summary?.short_leave_hours}h SL)</div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '0.45rem 0.2rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>{empPreviewData.summary?.days_absent}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Absent / NoPay</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.45rem', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '0.74rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  Actual Hours: <strong style={{ color: '#2563eb' }}>{empPreviewData.summary?.total_working_hours}h</strong>
                </span>
                <span style={{ color: empPreviewData.summary?.days_missing > 0 ? '#e11d48' : 'var(--text-muted)', fontWeight: empPreviewData.summary?.days_missing > 0 ? 700 : 400 }}>
                  Missing Out: {empPreviewData.summary?.days_missing}
                </span>
              </div>
            </div>
          ) : selectedEmpId ? (
            <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '1.1rem' }}>
              Select an employee to compute monthly payroll timesheet details.
            </div>
          ) : null}

          {/* Download Buttons for Individual Payroll Timesheet */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => handleDownloadEmployeeReport('pdf')}
              disabled={!selectedEmpId || !!downloadingEmpFormat}
              className="btn btn-primary"
              style={{
                background: '#dc2626',
                borderColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.7rem 0.75rem',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
              title="Download printable monthly payroll timesheet PDF with daily punches, locations, late minutes, leaves & sign-offs"
            >
              {downloadingEmpFormat === 'pdf' ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={16} />
              )}
              Download Payroll PDF
            </button>
            <button
              type="button"
              onClick={() => handleDownloadEmployeeReport('csv')}
              disabled={!selectedEmpId || !!downloadingEmpFormat}
              className="btn btn-primary"
              style={{
                background: '#16a34a',
                borderColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.7rem 0.75rem',
                fontWeight: 700,
                fontSize: '0.84rem',
              }}
              title="Download itemized daily timesheet CSV formatted for payroll software import"
            >
              {downloadingEmpFormat === 'csv' ? (
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Download size={16} />
              )}
              Download Payroll CSV
            </button>
          </div>
        </div>
      )}

      {/* ── MODE 2: COMPANY-WIDE REPORT ── */}
      {reportScope === 'company' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: testPeriod === 'custom' ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Report Period</label>
              <select
                className="form-control"
                value={testPeriod}
                onChange={e => setTestPeriod(e.target.value)}
              >
                <option value="daily">Daily Report (Single Day)</option>
                <option value="custom">Custom Date Range (From Day – To Day)</option>
                <option value="weekly">Weekly Report (Mon–Fri)</option>
                <option value="monthly">Monthly Report (Full Month)</option>
              </select>
            </div>

            {testPeriod === 'daily' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select Day</label>
                <input
                  type="date"
                  className="form-control"
                  value={testStartDate}
                  onChange={e => setTestStartDate(e.target.value)}
                />
              </div>
            )}

            {testPeriod === 'weekly' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select Day in Week</label>
                <input
                  type="date"
                  className="form-control"
                  value={testStartDate}
                  onChange={e => setTestStartDate(e.target.value)}
                />
              </div>
            )}

            {testPeriod === 'monthly' && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Select Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={testMonth}
                  onChange={e => setTestMonth(e.target.value)}
                />
              </div>
            )}
          </div>

          {testPeriod === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>From Day (Start Date)</label>
                <input
                  type="date"
                  className="form-control"
                  value={testStartDate}
                  onChange={e => setTestStartDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>To Day (End Date)</label>
                <input
                  type="date"
                  className="form-control"
                  value={testEndDate}
                  min={testStartDate}
                  onChange={e => setTestEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Department Filter (Optional)</label>
            <select
              className="form-control"
              value={testDeptId}
              onChange={e => setTestDeptId(e.target.value)}
            >
              <option value="">All Departments (Company-Wide)</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Trigger Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={handleSendReportNow}
              disabled={!!sendingPeriod}
              className="btn btn-primary"
              style={{
                background: '#16a34a',
                borderColor: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1rem',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              {sendingPeriod ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Generating &amp; Sending {getPeriodLabel(sendingPeriod)} Report (PDF + CSV)...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Send {getPeriodLabel(testPeriod)} Report Now (PDF &amp; CSV)
                </>
              )}
            </button>

            {/* Direct Download Preview Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => handleDownloadReport('pdf')}
                disabled={!!downloadingFormat}
                className="btn btn-ghost"
                style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {downloadingFormat === 'pdf' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} style={{ color: '#dc2626' }} />}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport('csv')}
                disabled={!!downloadingFormat}
                className="btn btn-ghost"
                style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
              >
                {downloadingFormat === 'csv' ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} style={{ color: '#16a34a' }} />}
                Download CSV
              </button>
            </div>
          </div>

          {/* Last Sent Status Box */}
          {lastSentAt && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', fontSize: '0.76rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={14} /> Last Report Dispatched: {lastSentAt}
              </div>
              {lastSentSummary && (
                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <div><strong>Period:</strong> {lastSentSummary.period?.toUpperCase()} ({lastSentSummary.range_label})</div>
                  {lastSentSummary.attachments?.length > 0 && (
                    <div><strong>Attachments:</strong> {lastSentSummary.attachments.join(', ')}</div>
                  )}
                  {lastSentSummary.recipients?.length > 0 && (
                    <div><strong>Sent To:</strong> {lastSentSummary.recipients.join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

