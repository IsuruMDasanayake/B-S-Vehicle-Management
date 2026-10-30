import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Save, Send, Users, CheckCircle2, FileText, FileSpreadsheet,
  Search, Plus, X, Clock, Download, Loader2, RefreshCw, Server, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

export default function HRSettings({ embedded = false }) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPeriod, setSendingPeriod] = useState(''); // '' | 'daily' | 'weekly' | 'monthly' | 'custom'
  const [downloadingFormat, setDownloadingFormat] = useState(''); // '' | 'pdf' | 'csv'
  const [mailSectionExpanded, setMailSectionExpanded] = useState(true);

  // Settings state
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [customEmails, setCustomEmails] = useState([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [weeklyEnabled, setWeeklyEnabled] = useState(true);
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [includePdf, setIncludePdf] = useState(true);
  const [includeCsv, setIncludeCsv] = useState(true);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [lastSentSummary, setLastSentSummary] = useState(null);

  // Outgoing SMTP Server state
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpEncryption, setSmtpEncryption] = useState('tls');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('noreply@circlegroup.lk');
  const [smtpFromName, setSmtpFromName] = useState('Circle Engineering HR');

  // User search & manual test controls
  const [userSearch, setUserSearch] = useState('');
  const [testPeriod, setTestPeriod] = useState('weekly');
  const [testMonth, setTestMonth] = useState(defaultMonth);
  const [testStartDate, setTestStartDate] = useState(defaultDate);
  const [testEndDate, setTestEndDate] = useState(defaultDate);
  const [departments, setDepartments] = useState([]);
  const [testDeptId, setTestDeptId] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [res, deptRes] = await Promise.all([
        api.get('/hr/settings/mail-reports'),
        api.get('/hr/departments').catch(() => ({ data: [] })),
      ]);

      const s = res.data?.settings || {};
      setAvailableUsers(res.data?.available_users || []);
      setSelectedUserIds(Array.isArray(s.recipient_user_ids) ? s.recipient_user_ids.map(Number) : []);
      setCustomEmails(Array.isArray(s.custom_emails) ? s.custom_emails : []);
      setWeeklyEnabled(s.weekly_enabled !== false);
      setMonthlyEnabled(s.monthly_enabled !== false);
      setIncludePdf(s.include_pdf !== false);
      setIncludeCsv(s.include_csv !== false);
      setSmtpHost(s.smtp_host || '');
      setSmtpPort(s.smtp_port || 587);
      setSmtpEncryption(s.smtp_encryption || 'tls');
      setSmtpUsername(s.smtp_username || '');
      setSmtpPassword(s.smtp_password || '');
      setSmtpFromAddress(s.smtp_from_address || 'noreply@circlegroup.lk');
      setSmtpFromName(s.smtp_from_name || 'Circle Engineering HR');
      setLastSentAt(s.last_sent_at || null);
      setLastSentSummary(s.last_sent_summary || null);
      setDepartments(deptRes.data || []);
    } catch {
      toast.error('Failed to load mail report settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const toggleUser = (id) => {
    const numId = Number(id);
    setSelectedUserIds(prev =>
      prev.includes(numId) ? prev.filter(x => x !== numId) : [...prev, numId]
    );
  };

  const selectDefaultRecipients = () => {
    const ids = availableUsers
      .filter(u =>
        u.role === 'super_admin' ||
        u.role === 'solar_hr_admin' ||
        u.roles?.includes('super_admin') ||
        u.roles?.includes('solar_hr_admin')
      )
      .map(u => Number(u.id));
    setSelectedUserIds(ids);
  };

  const handleAddCustomEmail = (e) => {
    e?.preventDefault();
    const clean = newEmailInput.trim().toLowerCase();
    if (!clean) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!customEmails.includes(clean)) {
      setCustomEmails(prev => [...prev, clean]);
    }
    setNewEmailInput('');
  };

  const removeCustomEmail = (email) => {
    setCustomEmails(prev => prev.filter(e => e !== email));
  };

  // Compute live resolved email list
  const resolvedEmails = useMemo(() => {
    const fromUsers = availableUsers
      .filter(u => selectedUserIds.includes(Number(u.id)) && u.email)
      .map(u => u.email.toLowerCase());
    return Array.from(new Set([...fromUsers, ...customEmails]));
  }, [availableUsers, selectedUserIds, customEmails]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.epf_no || '').toLowerCase().includes(q)
    );
  }, [availableUsers, userSearch]);

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    if (!includePdf && !includeCsv) {
      toast.error('Please keep at least one attachment format (PDF or CSV) enabled.');
      return;
    }
    if (!smtpHost.trim()) {
      toast.error('Please enter your SMTP Host (e.g. smtp.gmail.com or mail.circlegroup.lk).');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/hr/settings/mail-reports', {
        recipient_user_ids: selectedUserIds,
        custom_emails: customEmails,
        weekly_enabled: weeklyEnabled,
        monthly_enabled: monthlyEnabled,
        include_pdf: includePdf,
        include_csv: includeCsv,
        smtp_mode: 'custom',
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort) || 587,
        smtp_encryption: smtpEncryption,
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        smtp_from_address: smtpFromAddress,
        smtp_from_name: smtpFromName,
      });
      toast.success(res.data?.message || 'Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getPeriodLabel = (p) => {
    if (p === 'daily') return 'Daily';
    if (p === 'custom') return 'Custom Date Range';
    if (p === 'monthly') return 'Monthly';
    return 'Weekly';
  };

  const handleSendReportNow = async (periodToTrigger = testPeriod) => {
    if (resolvedEmails.length === 0) {
      toast.error('Please assign at least one recipient user or email address.');
      return;
    }
    if (!smtpHost.trim()) {
      toast.error('Please enter your SMTP Host (e.g. smtp.gmail.com).');
      return;
    }
    setSendingPeriod(periodToTrigger);
    try {
      const res = await api.post('/hr/settings/mail-reports/send-now', {
        period: periodToTrigger,
        month: periodToTrigger === 'monthly' ? testMonth : undefined,
        start_date: ['daily', 'weekly', 'custom'].includes(periodToTrigger) ? testStartDate : undefined,
        end_date: periodToTrigger === 'custom' ? testEndDate : undefined,
        department_id: testDeptId ? Number(testDeptId) : undefined,
        recipient_user_ids: selectedUserIds,
        custom_emails: customEmails,
        weekly_enabled: weeklyEnabled,
        monthly_enabled: monthlyEnabled,
        include_pdf: includePdf,
        include_csv: includeCsv,
        smtp_mode: 'custom',
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort) || 587,
        smtp_encryption: smtpEncryption,
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        smtp_from_address: smtpFromAddress,
        smtp_from_name: smtpFromName,
      });
      toast.success(res.data?.message || 'Report emailed successfully!', { duration: 6000 });
      if (res.data?.settings) {
        setLastSentAt(res.data.settings.last_sent_at);
        setLastSentSummary(res.data.settings.last_sent_summary);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send report email', { duration: 6000 });
    } finally {
      setSendingPeriod('');
    }
  };

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

  const getRoleBadgeStyle = (role) => {
    if (role === 'super_admin') return { bg: 'rgba(239,68,68,0.12)', color: '#dc2626', label: 'Super Admin' };
    if (role === 'solar_hr_admin') return { bg: 'rgba(59,130,246,0.12)', color: '#2563eb', label: 'HR Admin' };
    if (role === 'solar_employee') return { bg: 'rgba(16,185,129,0.12)', color: '#059669', label: 'Employee' };
    return { bg: 'rgba(100,116,139,0.12)', color: '#475569', label: role || 'User' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '45vh', color: 'var(--text-muted)' }}>
        <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', marginRight: '0.6rem' }} />
        Loading HR Mail Report Settings...
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: embedded ? 0 : '2rem' }}>
      {!embedded && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              HR System Settings
            </h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.88rem' }}>
              Configure HR modules, automated mail reports, and system preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            className="btn btn-ghost"
            style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      )}

      {/* Settings Blocks Stack (additional HR setting blocks can be added below) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* ═════════════════════════════════════════════════════════════════════
            BLOCK 1: ATTENDANCE & LEAVE MAIL REPORT SETTINGS
        ═════════════════════════════════════════════════════════════════════ */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Unified Block Header */}
          <div
            onClick={() => setMailSectionExpanded(prev => !prev)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              cursor: 'pointer',
              paddingBottom: mailSectionExpanded ? '1rem' : 0,
              marginBottom: mailSectionExpanded ? '1.25rem' : 0,
              borderBottom: mailSectionExpanded ? '1px solid var(--surface-2)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb', padding: '0.65rem', borderRadius: '12px', display: 'flex' }}>
                <Mail size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Attendance &amp; Leave Mail Report Settings
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Assign recipients, configure automated Weekly &amp; Monthly schedules, SMTP server, and manually send or download reports (PDF &amp; CSV).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', fontWeight: 700, fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                {resolvedEmails.length} Recipient{resolvedEmails.length === 1 ? '' : 's'} Assigned
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.35rem', border: '1px solid var(--surface-2)', borderRadius: '8px', display: 'flex' }}
                aria-label="Toggle Mail Report Settings"
              >
                {mailSectionExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
          </div>

          {mailSectionExpanded && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {/*Sub-panel 1: Assign Mail Report Recipients */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-2)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                      <Users size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                        1. Assign Mail Report Recipients
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Select which users receive Attendance and Leave Reports
                      </div>
                    </div>
                  </div>
                </div>

          {/* Search & Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <div style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--surface)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '0.35rem 0.65rem' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by name, email, role, EPF..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.82rem', color: 'inherit' }}
              />
            </div>
            <button
              type="button"
              onClick={selectDefaultRecipients}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--surface-2)', fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
              title="Select HR, Super Admin"
            >
              Default Group
            </button>
            <button
              type="button"
              onClick={() => setSelectedUserIds(availableUsers.map(u => Number(u.id)))}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--surface-2)', fontSize: '0.74rem', padding: '0.35rem 0.65rem' }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              className="btn btn-ghost"
              style={{ border: '1px solid var(--surface-2)', fontSize: '0.74rem', padding: '0.35rem 0.65rem', color: '#ef4444' }}
            >
              Clear
            </button>
          </div>

          {/* Scrollable User Checklist */}
          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--surface-2)', borderRadius: '10px', marginBottom: '1rem' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No matching users found.
              </div>
            ) : (
              filteredUsers.map(u => {
                const checked = selectedUserIds.includes(Number(u.id));
                const badge = getRoleBadgeStyle(u.role);
                return (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderBottom: '1px solid var(--surface-2)',
                      background: checked ? 'rgba(59,130,246,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUser(u.id)}
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>{u.name}</span>
                          {u.epf_no && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              ({u.epf_no})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.email} {u.department ? `· ${u.department}` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ background: badge.bg, color: badge.color, fontSize: '0.68rem', fontWeight: 700, padding: '0.18rem 0.55rem', borderRadius: '999px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {badge.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Additional Custom Email Input */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 600 }}>
              Additional Recipient Email Addresses (Optional)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. director@circlegroup.lk"
                value={newEmailInput}
                onChange={e => setNewEmailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomEmail(e);
                  }
                }}
                style={{ flex: 1, fontSize: '0.84rem' }}
              />
              <button
                type="button"
                onClick={handleAddCustomEmail}
                className="btn btn-ghost"
                style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
              >
                <Plus size={15} /> Add
              </button>
            </div>
            {customEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.6rem' }}>
                {customEmails.map(email => (
                  <span
                    key={email}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      background: 'rgba(59,130,246,0.12)',
                      color: '#2563eb',
                    }}
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeCustomEmail(email)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Active Resolved Emails Preview */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.76rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Active Report Recipients ({resolvedEmails.length}):
            </div>
            {resolvedEmails.length === 0 ? (
              <span style={{ color: '#ef4444' }}>No recipients selected.</span>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {resolvedEmails.map(em => (
                  <span key={em} style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.72rem' }}>
                    {em}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

              {/* Right Column inside Mail Report Settings Block: Schedule + SMTP + Manual Trigger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Sub-panel 2: Schedule, Report Formats & SMTP */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-2)', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--surface-2)' }}>
                    <div style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                        2. Automated Schedule, Formats &amp; SMTP Server
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Configure automatic Weekly &amp; Monthly dispatch, attachments, and SMTP server
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={weeklyEnabled}
                        onChange={e => setWeeklyEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginTop: '0.15rem', accentColor: '#2563eb' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Weekly Attendance &amp; Leave Report</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Automatically emailed every <strong>Friday at 6:00 PM</strong> (Asia/Colombo) covering Mon–Fri.
                        </div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--surface-2)', borderRadius: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={monthlyEnabled}
                        onChange={e => setMonthlyEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginTop: '0.15rem', accentColor: '#2563eb' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>Monthly Attendance &amp; Leave Report</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Automatically emailed on the <strong>1st of every month at 8:00 AM</strong> (Asia/Colombo).
                        </div>
                      </div>
                    </label>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Attached Report Files in Email:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.65rem 0.85rem', border: '1px solid var(--surface-2)', borderRadius: '8px', cursor: 'pointer', background: includePdf ? 'rgba(239,68,68,0.06)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={includePdf}
                          onChange={e => setIncludePdf(e.target.checked)}
                          style={{ width: '15px', height: '15px', accentColor: '#dc2626' }}
                        />
                        <FileText size={16} style={{ color: '#dc2626' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>PDF Document (.pdf)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.65rem 0.85rem', border: '1px solid var(--surface-2)', borderRadius: '8px', cursor: 'pointer', background: includeCsv ? 'rgba(22,163,74,0.06)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={includeCsv}
                          onChange={e => setIncludeCsv(e.target.checked)}
                          style={{ width: '15px', height: '15px', accentColor: '#16a34a' }}
                        />
                        <FileSpreadsheet size={16} style={{ color: '#16a34a' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>CSV Spreadsheet (.csv)</span>
                      </label>
                    </div>
                  </div>

                  {/* Outgoing Mail Server (SMTP Configuration) */}
                  <div style={{ marginBottom: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--surface-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 700 }}>
                        <Server size={15} style={{ color: '#2563eb' }} />
                        Outgoing Mail Server (SMTP)
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', background: 'rgba(22,163,74,0.12)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                        Live External SMTP
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.85rem', background: 'var(--bg)', border: '1px solid var(--surface-2)', borderRadius: '8px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.55rem' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>SMTP Host *</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="smtp.gmail.com or mail.circlegroup.lk"
                            value={smtpHost}
                            onChange={e => setSmtpHost(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Port *</label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="587"
                            value={smtpPort}
                            onChange={e => setSmtpPort(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>Encryption</label>
                          <select
                            className="form-control"
                            value={smtpEncryption}
                            onChange={e => setSmtpEncryption(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          >
                            <option value="tls">TLS (587)</option>
                            <option value="ssl">SSL (465)</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>SMTP Username / Email</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="you@circlegroup.lk"
                            value={smtpUsername}
                            onChange={e => setSmtpUsername(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>SMTP Password / App Password</label>
                          <input
                            type="password"
                            className="form-control"
                            placeholder="SMTP or App Password"
                            value={smtpPassword}
                            onChange={e => setSmtpPassword(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>From Email Address</label>
                          <input
                            type="email"
                            className="form-control"
                            placeholder="noreply@circlegroup.lk"
                            value={smtpFromAddress}
                            onChange={e => setSmtpFromAddress(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 600 }}>From Sender Name</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Circle Engineering HR"
                            value={smtpFromName}
                            onChange={e => setSmtpFromName(e.target.value)}
                            style={{ fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving || !!sendingPeriod}
                    className="btn btn-primary"
                    style={{ width: '100%', background: '#2563eb', borderColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.65rem 1rem', fontWeight: 700 }}
                  >
                    {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                    {saving ? 'Saving Settings...' : 'Save Recipient, Schedule & SMTP Settings'}
                  </button>
                </div>

                {/* Sub-panel 3: Test & Manually Send Current Report */}
                <div style={{ background: 'var(--surface)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '12px', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--surface-2)' }}>
                    <div style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                      <Send size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                        3. Test &amp; Manually Send Current Report
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                        Select report period, specific day or date range, and email or download (PDF + CSV)
                      </div>
                    </div>
                  </div>

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
                      onClick={() => handleSendReportNow(testPeriod)}
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

