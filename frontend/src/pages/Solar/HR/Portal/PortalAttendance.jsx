import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Check, X, Clock, Loader2, AlertCircle, Calendar,
  Globe, MapPin, ExternalLink, Image as ImageIcon, CheckCircle2, Search,
  Download, FileText, AlertTriangle, ShieldAlert, ArrowRight, UserCheck
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../../store/authStore';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';

const STATUS_CELL = {
  present:     { label: 'P',   color: '#fff', bg: '#22c55e',           title: 'Present' },
  late:        { label: 'L',   color: '#fff', bg: '#f59e0b',           title: 'Late' },
  short_leave: { label: 'SL',  color: '#fff', bg: '#0891b2',           title: 'Short Leave' },
  missing:     { label: 'M',   color: '#fff', bg: '#e11d48',           title: 'Missing Attendance' },
  absent:      { label: 'A',   color: '#fff', bg: '#ef4444',           title: 'Absent' },
  half_day:    { label: 'H',   color: '#fff', bg: '#8b5cf6',           title: 'Half Day' },
  leave:       { label: 'LV',  color: '#fff', bg: '#3b82f6',           title: 'Leave' },
  weekend:     { label: '—',   color: '#9ca3af', bg: 'var(--surface)', title: 'Weekend' },
};

const isWeekend = (d) => { const day = new Date(d).getDay(); return day === 0 || day === 6; };
const getDays = (year, month) => new Date(year, month + 1, 0).getDate();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const formatHours = (decimal) => {
  if (!decimal) return '—';
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}h ${m > 0 ? m + 'm' : '00m'}`;
};

const REASON_LABELS = {
  client_site_visit: 'Client Site Visit',
  field_installation: 'Field Installation',
  work_from_home: 'Work From Home (WFH)',
  transit_duty: 'Transit / Field Duty',
  meeting: 'External Meeting',
  other: 'Other Assignment',
};

const PortalAttendance = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isManager = isLeaveApprovalManager(user) || user?.role === 'super_admin' || user?.role === 'solar_hr_admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (isManager && searchParams.get('tab') === 'remote-approvals')
    ? 'remote-approvals'
    : (isManager && searchParams.get('tab') === 'approvals')
      ? 'approvals'
      : 'my';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Manager Team Adjustments State ──
  const [teamAdjustments, setTeamAdjustments] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamPendingCount, setTeamPendingCount] = useState(0);
  const [teamFilter, setTeamFilter] = useState('pending'); // 'pending' | 'all'
  const [managerActionModal, setManagerActionModal] = useState({ open: false, item: null, action: 'manager_approved', notes: '' });
  const [managerActionSubmitting, setManagerActionSubmitting] = useState(false);

  // ── Manager Team Remote Attendance State ──
  const [teamRemoteRequests, setTeamRemoteRequests] = useState([]);
  const [teamRemoteLoading, setTeamRemoteLoading] = useState(false);
  const [teamRemotePendingCount, setTeamRemotePendingCount] = useState(0);
  const [teamRemoteCounts, setTeamRemoteCounts] = useState({ pending: 0, manager_approved: 0, approved: 0, rejected: 0, total: 0 });
  const [teamRemoteFilter, setTeamRemoteFilter] = useState('pending'); // 'pending' | 'manager_approved' | 'approved' | 'rejected' | 'all'
  const [teamRemoteSearch, setTeamRemoteSearch] = useState('');
  const [remoteActionModal, setRemoteActionModal] = useState({ open: false, item: null, action: 'manager_approved', notes: '' });
  const [remoteActionSubmitting, setRemoteActionSubmitting] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState({ open: false, url: '', title: '' });

  const fetchTeamRemoteRequests = useCallback(async () => {
    if (!isManager) return;
    setTeamRemoteLoading(true);
    try {
      const res = await api.get('/hr/attendance/remote-requests', { params: { status: teamRemoteFilter } });
      setTeamRemoteRequests(res.data.data || []);
      setTeamRemotePendingCount(res.data.pending_count || 0);
      setTeamRemoteCounts(res.data.counts || { pending: 0, manager_approved: 0, approved: 0, rejected: 0, total: 0 });
    } catch {
      // silent
    } finally {
      setTeamRemoteLoading(false);
    }
  }, [isManager, teamRemoteFilter]);

  useEffect(() => {
    if (isManager) {
      fetchTeamRemoteRequests();
    }
  }, [isManager, fetchTeamRemoteRequests]);

  useEffect(() => {
    if (!isManager) return;
    const handleRemoteUpdate = () => {
      fetchTeamRemoteRequests();
    };
    window.addEventListener('hr-remote-attendance-updated', handleRemoteUpdate);
    return () => window.removeEventListener('hr-remote-attendance-updated', handleRemoteUpdate);
  }, [isManager, fetchTeamRemoteRequests]);

  const handleRemoteActionSubmit = async (e) => {
    e.preventDefault();
    if (!remoteActionModal.item) return;
    setRemoteActionSubmitting(true);
    try {
      const res = await api.patch(`/hr/attendance/remote-requests/${remoteActionModal.item.id}/review`, {
        status: remoteActionModal.action,
        manager_notes: remoteActionModal.notes,
      });
      toast.success(res.data?.message || 'Remote request updated successfully');
      setRemoteActionModal({ open: false, item: null, action: 'manager_approved', notes: '' });
      await fetchTeamRemoteRequests();
      window.dispatchEvent(new Event('hr-remote-attendance-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update remote request');
    } finally {
      setRemoteActionSubmitting(false);
    }
  };

  const fetchTeamAdjustments = useCallback(async () => {
    if (!isManager) return;
    setTeamLoading(true);
    try {
      const res = await api.get('/hr/attendance/regularizations', { params: { status: teamFilter } });
      setTeamAdjustments(res.data.data || []);
      setTeamPendingCount(res.data.pending_count || 0);
    } catch {
      // silent
    } finally {
      setTeamLoading(false);
    }
  }, [isManager, teamFilter]);

  useEffect(() => {
    if (isManager) {
      fetchTeamAdjustments();
    }
  }, [isManager, fetchTeamAdjustments]);

  // Sync user profile when approval managers are updated in HR settings
  useEffect(() => {
    const handleManagerAssignmentChange = async () => {
      try {
        await useAuthStore.getState().fetchUser();
      } catch {}
    };
    window.addEventListener('hr-approval-managers-updated', handleManagerAssignmentChange);
    return () => window.removeEventListener('hr-approval-managers-updated', handleManagerAssignmentChange);
  }, []);

  const handleManagerActionSubmit = async (e) => {
    e.preventDefault();
    if (!managerActionModal.item) return;
    setManagerActionSubmitting(true);
    try {
      const res = await api.patch(`/hr/attendance/regularizations/${managerActionModal.item.id}`, {
        status: managerActionModal.action,
        notes: managerActionModal.notes,
        admin_notes: managerActionModal.notes,
      });
      toast.success(res.data?.message || (managerActionModal.action === 'manager_approved' ? 'Adjustment approved and forwarded to HR' : 'Adjustment rejected'));
      setManagerActionModal({ open: false, item: null, action: 'manager_approved', notes: '' });
      await fetchTeamAdjustments();
      window.dispatchEvent(new Event('hr-attendance-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update adjustment');
    } finally {
      setManagerActionSubmitting(false);
    }
  };

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [selectedReg, setSelectedReg] = useState(null);
  const [regForm, setRegForm] = useState({ requested_time: '17:30', reason: '' });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // ── Employee Attendance Report & Deficiencies State ──
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState('');
  const [myViewMode, setMyViewMode] = useState(searchParams.get('view') || 'calendar'); // 'calendar' | 'deficiencies' | 'report'

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['calendar', 'deficiencies', 'report'].includes(viewParam)) {
      setMyViewMode(viewParam);
    }
  }, [searchParams]);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/attendance/my-history', { params: { month: monthStr } });
      setRecords(res.data);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [monthStr]);

  const fetchMyReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const res = await api.get('/hr/attendance/my-report', { params: { month: monthStr } });
      setReportData(res.data);
    } catch {
      // silent
    } finally {
      setReportLoading(false);
    }
  }, [monthStr]);

  useEffect(() => {
    fetchHistory();
    fetchMyReport();
  }, [fetchHistory, fetchMyReport]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchHistory();
      fetchMyReport();
    };
    window.addEventListener('hr-attendance-updated', handleUpdate);
    return () => window.removeEventListener('hr-attendance-updated', handleUpdate);
  }, [fetchHistory, fetchMyReport]);

  const handleDownloadReport = async (format) => {
    setDownloadingFormat(format);
    try {
      const res = await api.get('/hr/attendance/my-report/download', {
        params: { month: monthStr, format },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8',
      });
      const emp = reportData?.employee;
      const cleanName = (emp?.name || user?.name || 'employee').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanEpf = (emp?.epf_no || emp?.employee_id || 'emp').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `attendance_timesheet_${cleanEpf}_${cleanName}_${monthStr}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} attendance timesheet downloaded`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloadingFormat('');
    }
  };

  const openRegModal = (att) => {
    setSelectedReg(att);
    let defaultTime = '17:30';
    if (att.regularization?.requested_clock_out_time) {
      const d = new Date(att.regularization.requested_clock_out_time);
      defaultTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setRegForm({
      requested_time: defaultTime,
      reason: att.regularization?.reason || '',
    });
    setRegModalOpen(true);
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReg) return;
    if (!regForm.requested_time || !regForm.reason.trim()) {
      return toast.error('Please enter your actual clock-out time and reason');
    }
    setRegSubmitting(true);
    try {
      const datePart = typeof selectedReg.date === 'string' ? selectedReg.date.split('T')[0] : selectedReg.date;
      const targetDateTime = `${datePart} ${regForm.requested_time}:00`;

      await api.post('/hr/attendance/regularize', {
        attendance_id: selectedReg.id,
        requested_clock_out_time: targetDateTime,
        reason: regForm.reason,
      });
      toast.success('Missing attendance clock-out time submitted for Manager & HR review');
      setRegModalOpen(false);
      setSelectedReg(null);
      await Promise.all([fetchHistory(), fetchMyReport()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit adjustment request');
    } finally {
      setRegSubmitting(false);
    }
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const byDate = Object.fromEntries(records.map(r => {
    const d = typeof r.date === 'string' ? r.date.split('T')[0] : r.date;
    return [d, r];
  }));

  const todayStr = now.toISOString().split('T')[0];
  const days = getDays(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  // Compute monthly stats across calendar days (including approved leaves & past weekday absences)
  const stats = Array.from({ length: days }, (_, i) => i + 1).reduce((a, d) => {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const weekend = isWeekend(dateStr);
    const rec = byDate[dateStr];
    let status = rec?.status;
    if (!status && !weekend && dateStr <= todayStr) status = 'absent';
    if (weekend) status = 'weekend';
    if (status && status !== 'weekend') {
      a[status] = (a[status] || 0) + 1;
    }
    return a;
  }, {});

  return (
    <div style={{ width: '100%' }}>
      {/* View Tabs for Managers */}
      {isManager && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            style={{
              background: activeTab === 'my' ? 'var(--primary, #0284c7)' : 'transparent',
              color: activeTab === 'my' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            My Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            style={{
              background: activeTab === 'approvals' ? 'var(--primary, #0284c7)' : 'transparent',
              color: activeTab === 'approvals' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Team Adjustments
            {teamPendingCount > 0 && (
              <span
                style={{
                  background: activeTab === 'approvals' ? '#fff' : '#ef4444',
                  color: activeTab === 'approvals' ? '#0284c7' : '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                }}
              >
                {teamPendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('remote-approvals')}
            style={{
              background: activeTab === 'remote-approvals' ? '#059669' : 'transparent',
              color: activeTab === 'remote-approvals' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Globe size={15} /> Team Remote
            {teamRemotePendingCount > 0 && (
              <span
                style={{
                  background: activeTab === 'remote-approvals' ? '#fff' : '#059669',
                  color: activeTab === 'remote-approvals' ? '#059669' : '#fff',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                }}
              >
                {teamRemotePendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === 'approvals' ? (
        /* ── View 2: Manager Team Clock-Out Approvals ── */
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Team Clock-Out Adjustments</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                Review and approve team departure times before forwarding to HR for finalization.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {[
                { key: 'pending', label: `Pending Review (${teamPendingCount})` },
                { key: 'all', label: 'All Requests' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTeamFilter(f.key)}
                  style={{
                    background: teamFilter === f.key ? '#0284c7' : 'var(--surface-2)',
                    color: teamFilter === f.key ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {teamLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
              <div>Loading team adjustment requests...</div>
            </div>
          ) : teamAdjustments.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No adjustment requests found for this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teamAdjustments.map(item => {
                const att = item.attendance;
                const emp = item.employee;
                const isPending = item.status === 'pending';
                const shiftDate = att?.date ? new Date(att.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                const clockIn = att?.clock_in_time ? new Date(att.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                const requestedOut = item.requested_clock_out_time ? new Date(item.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '1.15rem',
                      background: 'var(--white)',
                      borderRadius: '12px',
                      border: '1px solid var(--surface-2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
                          {emp?.full_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {emp?.department?.name || 'Staff'} · {emp?.employee_id}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Shift: {shiftDate}
                        </span>
                        <span
                          style={{
                            padding: '0.15rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: item.status === 'approved' ? 'rgba(34,197,94,0.1)' : item.status === 'manager_approved' ? 'rgba(14,165,233,0.12)' : item.status.includes('rejected') ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.12)',
                            color: item.status === 'approved' ? '#16a34a' : item.status === 'manager_approved' ? '#0284c7' : item.status.includes('rejected') ? '#dc2626' : '#d97706',
                          }}
                        >
                          {item.status === 'pending' && 'PENDING MGR'}
                          {item.status === 'manager_approved' && 'MGR APPROVED · PENDING HR'}
                          {item.status === 'manager_rejected' && 'MGR REJECTED'}
                          {item.status === 'approved' && 'HR APPROVED'}
                          {item.status === 'rejected' && 'HR REJECTED'}
                        </span>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div style={{ background: 'var(--surface)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Recorded In</span>
                        <strong>{clockIn}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Recorded Out</span>
                        <span style={{ color: '#d97706' }}>Blank (Missing)</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Requested Out</span>
                        <strong style={{ color: '#0284c7' }}>{requestedOut}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      <strong style={{ color: 'var(--dark)' }}>Reason:</strong> {item.reason}
                    </div>

                    {item.manager_notes && (
                      <div style={{ fontSize: '0.72rem', color: '#0284c7', background: 'rgba(14,165,233,0.06)', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                        Mgr Note: {item.manager_notes}
                      </div>
                    )}

                    {isPending && (
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--surface-2)', paddingTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setManagerActionModal({ open: true, item, action: 'manager_rejected', notes: '' })}
                          style={{
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '6px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <X size={13} /> Mgr Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setManagerActionModal({ open: true, item, action: 'manager_approved', notes: '' })}
                          style={{
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.35rem 0.85rem',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={13} /> Mgr Approve
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'remote-approvals' ? (
        /* ── View 3: Manager Team Remote Attendance ── */
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={22} color="#059669" />
                Team Remote Attendance
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                Review field visits, client surveys, and work-from-home requests with GPS coordinates &amp; photo evidence.
              </p>
            </div>

            {/* Status Filter Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { key: 'pending',          label: `Pending Review (${teamRemoteCounts.pending || 0})` },
                { key: 'manager_approved', label: `Manager Approved (${teamRemoteCounts.manager_approved || 0})` },
                { key: 'approved',         label: `HR Final (${teamRemoteCounts.approved || 0})` },
                { key: 'rejected',         label: `Rejected (${teamRemoteCounts.rejected || 0})` },
                { key: 'all',              label: `All (${teamRemoteCounts.total || 0})` },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTeamRemoteFilter(f.key)}
                  style={{
                    background: teamRemoteFilter === f.key ? '#059669' : 'var(--surface-2)',
                    color: teamRemoteFilter === f.key ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box */}
          <div style={{ marginBottom: '1rem', position: 'relative', maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by employee, location, site..."
              value={teamRemoteSearch}
              onChange={e => setTeamRemoteSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.2rem', fontSize: '0.8rem', height: '34px' }}
            />
          </div>

          {/* Requests Content List */}
          {teamRemoteLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem 0' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#059669' }} />
            </div>
          ) : teamRemoteRequests.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Globe size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.35, color: '#059669' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No remote attendance requests found</div>
              <p style={{ fontSize: '0.78rem', margin: '0.25rem 0 0' }}>
                {teamRemoteFilter === 'pending'
                  ? 'Great job! No field or remote attendance requests awaiting your review.'
                  : `No requests found for "${teamRemoteFilter}" status.`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {teamRemoteRequests
                .filter(item => {
                  if (!teamRemoteSearch.trim()) return true;
                  const q = teamRemoteSearch.toLowerCase();
                  return (
                    item.employee?.full_name?.toLowerCase().includes(q) ||
                    item.employee?.employee_id?.toLowerCase().includes(q) ||
                    item.location_name?.toLowerCase().includes(q) ||
                    item.address?.toLowerCase().includes(q) ||
                    item.reason_notes?.toLowerCase().includes(q)
                  );
                })
                .map(item => {
                  const reqDate = new Date(item.requested_time).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                  const reqTime = new Date(item.requested_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                  const isClockIn = item.request_type === 'clock_in';

                  return (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        padding: '1.15rem',
                        borderLeft: `4px solid ${
                          item.status === 'approved' ? '#22c55e' :
                          item.status === 'manager_approved' ? '#0284c7' :
                          item.status === 'rejected' ? '#ef4444' : '#f59e0b'
                        }`,
                        background: 'var(--white)',
                        borderRadius: '10px',
                      }}
                    >
                      {/* Top Bar: Employee & Request Type */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: isClockIn ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: isClockIn ? '#059669' : '#d97706',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                          }}>
                            {item.employee?.full_name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)' }}>
                              {item.employee?.full_name || 'Employee'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {item.employee?.designation?.title || item.employee?.department?.name || 'Solar Team'} · {item.employee?.employee_id}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            background: isClockIn ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                            color: isClockIn ? '#059669' : '#d97706',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}>
                            <Globe size={13} /> {isClockIn ? 'Remote Clock-In' : 'Remote Clock-Out'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {reqDate} at {reqTime}
                          </span>
                        </div>
                      </div>

                      {/* Middle Grid: Location, Map Pin, Reason, and Optional Photo */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '0.85rem',
                        padding: '0.85rem',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        marginBottom: '0.85rem',
                        fontSize: '0.8rem',
                      }}>
                        {/* Location Details */}
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                            Location &amp; Coordinates
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--dark)', marginBottom: '0.2rem' }}>
                            {item.location_name}
                          </div>
                          {item.address && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                              {item.address}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span>GPS: {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span>
                            {item.accuracy_meters && (
                              <span style={{ color: '#059669', fontWeight: 600 }}>(±{Math.round(item.accuracy_meters)}m)</span>
                            )}
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#0284c7',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textDecoration: 'none',
                              padding: '0.2rem 0.5rem',
                              background: 'rgba(2,132,199,0.08)',
                              borderRadius: '4px',
                            }}
                          >
                            <MapPin size={13} /> View on Google Maps <ExternalLink size={11} />
                          </a>
                        </div>

                        {/* Reason / Assignment */}
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                            Duty Purpose &amp; Summary
                          </div>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(99,102,241,0.1)',
                            color: '#4f46e5',
                            marginBottom: '0.35rem',
                          }}>
                            {REASON_LABELS[item.reason_category] || item.reason_category}
                          </span>
                          <div style={{ fontSize: '0.78rem', color: 'var(--dark)', lineHeight: 1.4 }}>
                            {item.reason_notes}
                          </div>
                        </div>

                        {/* Evidence Photo (if attached) */}
                        {item.evidence_photo_url && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                              Photo Evidence
                            </div>
                            <div
                              onClick={() => setPreviewPhotoModal({ open: true, url: item.evidence_photo_url, title: `${item.employee?.full_name} · ${item.location_name}` })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid var(--surface-2)',
                                background: 'var(--white)',
                                cursor: 'pointer',
                              }}
                            >
                              <img
                                src={item.evidence_photo_url}
                                alt="Evidence"
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                              />
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0284c7' }}>
                                View Photo <ExternalLink size={11} style={{ display: 'inline' }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Status / Review Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                        <div>
                          {item.status === 'pending' && (
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                              Stage 1: Pending Line Manager Review
                            </span>
                          )}
                          {item.status === 'manager_approved' && (
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                              Manager Approved ({item.manager_reviewer?.name || 'Line Manager'}) · Awaiting HR Sign-Off
                            </span>
                          )}
                          {item.status === 'approved' && (
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                              ✓ Final Approved by HR ({item.hr_reviewer?.name || 'HR Admin'}) · Shift Recorded
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '0.25rem 0.6rem', borderRadius: '4px' }}>
                              ✕ Rejected ({item.manager_reviewer?.name || item.hr_reviewer?.name || 'Reviewer'})
                            </span>
                          )}
                          {(item.manager_review_notes || item.hr_review_notes || item.rejection_reason) && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              Notes: {item.manager_review_notes || item.hr_review_notes || item.rejection_reason}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons for Pending Requests */}
                        {item.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => setRemoteActionModal({ open: true, item, action: 'manager_rejected', notes: '' })}
                              style={{
                                background: 'transparent',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <X size={13} /> Mgr Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoteActionModal({ open: true, item, action: 'manager_approved', notes: '' })}
                              style={{
                                background: '#059669',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Check size={13} /> Mgr Approve (Stage 1)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* ── View 1: My Personal Attendance ── */
        <>
          {/* Header Title & Top Export Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.25rem' }}>My Attendance &amp; Timesheet</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                Monthly attendance overview, timesheet reports, and attendance deficiencies
              </p>
            </div>

            {/* Download Buttons on Top Right */}
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleDownloadReport('pdf')}
                disabled={!reportData || !!downloadingFormat}
                className="btn btn-ghost"
                style={{
                  border: '1px solid rgba(220,38,38,0.3)',
                  background: 'var(--card, #fff)',
                  color: '#dc2626',
                  padding: '0.42rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: (!reportData || downloadingFormat) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                title="Download printable monthly payroll timesheet PDF with daily punches, locations, and sign-offs"
              >
                {downloadingFormat === 'pdf' ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={13} />
                )}
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport('csv')}
                disabled={!reportData || !!downloadingFormat}
                className="btn btn-ghost"
                style={{
                  border: '1px solid rgba(22,163,74,0.3)',
                  background: 'var(--card, #fff)',
                  color: '#16a34a',
                  padding: '0.42rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: (!reportData || downloadingFormat) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                title="Download itemized daily timesheet CSV formatted for payroll"
              >
                {downloadingFormat === 'csv' ? (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={13} />
                )}
                Export CSV
              </button>
            </div>
          </div>

          {/* Month picker & Sub-view Switcher Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* Month picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--surface-2)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>
              <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', padding: '0.2rem', cursor: 'pointer', display: 'flex' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', minWidth: '130px', textAlign: 'center' }}>
                {MONTHS[month]} {year}
              </span>
              <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', padding: '0.2rem', cursor: 'pointer', display: 'flex' }}>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* View Mode Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--surface-2)', padding: '0.25rem', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setMyViewMode('calendar')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: myViewMode === 'calendar' ? 'var(--card)' : 'transparent',
                  color: myViewMode === 'calendar' ? 'var(--dark)' : 'var(--text-muted)',
                  boxShadow: myViewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Calendar size={13} />
                Calendar &amp; Punches
              </button>

              <button
                type="button"
                onClick={() => setMyViewMode('deficiencies')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: myViewMode === 'deficiencies' ? 'var(--card)' : 'transparent',
                  color: myViewMode === 'deficiencies' ? '#dc2626' : ((reportData?.deficiencies?.total_deficiency_events || 0) > 0 ? '#b91c1c' : 'var(--text-muted)'),
                  boxShadow: myViewMode === 'deficiencies' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <AlertCircle size={13} />
                Deficiencies
                {(reportData?.deficiencies?.total_deficiency_events || 0) > 0 && (
                  <span style={{
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '0.05rem 0.45rem',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                  }}>
                    {reportData.deficiencies.total_deficiency_events}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMyViewMode('report')}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: myViewMode === 'report' ? 'var(--card)' : 'transparent',
                  color: myViewMode === 'report' ? 'var(--dark)' : 'var(--text-muted)',
                  boxShadow: myViewMode === 'report' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <FileText size={13} />
                Timesheet Report
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              SUB-VIEW 1: CALENDAR & DAILY PUNCH LOG
          ══════════════════════════════════════════════════════════════════════ */}
          {myViewMode === 'calendar' && (
            <>
              {/* Deficiency Alert Banner if items exist */}
              {(reportData?.deficiencies?.total_deficiency_events || 0) > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(245,158,11,0.08) 100%)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#991b1b' }}>
                        Attendance Deficiencies Detected ({reportData.deficiencies.total_deficiency_events})
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#7f1d1d', marginTop: '0.1rem' }}>
                        {[
                          reportData.deficiencies.late_arrivals?.length > 0 && `${reportData.deficiencies.late_arrivals.length} late arrival(s)`,
                          reportData.deficiencies.missing_clock_outs?.length > 0 && `${reportData.deficiencies.missing_clock_outs.length} missing clock-out(s)`,
                          reportData.deficiencies.unauthorized_absences?.length > 0 && `${reportData.deficiencies.unauthorized_absences.length} unauthorized absence(s)`,
                          reportData.deficiencies.early_departures?.length > 0 && `${reportData.deficiencies.early_departures.length} early departure(s)`,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMyViewMode('deficiencies')}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    Review Deficiencies <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: '0.4rem', marginBottom: '1.25rem' }}>
                {[
                  { key: 'present',     label: 'Present',         color: '#22c55e' },
                  { key: 'late',        label: 'Late',            color: '#f59e0b' },
                  { key: 'short_leave', label: 'Short Leave (SL)',color: '#0891b2' },
                  { key: 'missing',     label: 'Missing',         color: '#e11d48' },
                  { key: 'absent',      label: 'Absent',          color: '#ef4444' },
                  { key: 'half_day',    label: 'Half Day',        color: '#8b5cf6' },
                  { key: 'leave',       label: 'Leave',           color: '#3b82f6' },
                ].map(s => (
                  <div key={s.key} className="card" style={{ padding: '0.55rem 0.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color }}>{stats[s.key] || 0}</div>
                    <div style={{ fontSize: '0.56rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {Object.entries(STATUS_CELL).filter(([k]) => k !== 'weekend').map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '3px', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', color: v.color, fontWeight: 700 }}>{v.label}</div>
                    {v.title}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.2rem' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.3rem' }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                    const weekend = isWeekend(dateStr);
                    const rec = byDate[dateStr];
                    let status = rec?.status;
                    if (!status && !weekend && dateStr <= todayStr) status = 'absent';
                    if (weekend) status = 'weekend';
                    const cell = STATUS_CELL[status];
                    const isToday = dateStr === todayStr;

                    return (
                      <div key={d} style={{
                        textAlign: 'center', padding: '0.2rem 0',
                        borderRadius: 'var(--radius-sm)',
                        outline: isToday ? '2px solid var(--primary)' : 'none',
                        outlineOffset: '1px',
                      }}>
                        <div style={{ fontSize: '0.65rem', color: isToday ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 400, marginBottom: '0.15rem' }}>{d}</div>
                        {cell ? (
                          <div title={cell.title} style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            background: cell.bg, color: cell.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.55rem', fontWeight: 700, margin: '0 auto',
                          }}>{cell.label}</div>
                        ) : (
                          <div style={{ width: '24px', height: '24px', margin: '0 auto' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent records list */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)', fontWeight: 600, fontSize: '0.875rem' }}>
                  Recent Records
                </div>
                {loading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                ) : records.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records for this month.</div>
                ) : [...records].map(r => {
                  const s = STATUS_CELL[r.status] || STATUS_CELL.absent;
                  const dateStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date;
                  const isMissing = r.status === 'missing' || (r.clock_in_time && !r.clock_out_time && dateStr < todayStr);
                  const reg = r.regularization;
                  return (
                    <div key={r.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span>{new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          {isMissing && (
                            <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(225,29,72,0.12)', color: '#e11d48', fontWeight: 700 }}>
                              Missing Attendance (Clock-Out Blank)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {r.status === 'leave' ? (
                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>{r.notes || 'Approved Leave'}</span>
                          ) : (
                            <>
                              {r.clock_in_time ? new Date(r.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                              {' → '}
                              {r.clock_out_time ? new Date(r.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : (
                                <span style={{ color: isMissing ? '#e11d48' : 'inherit', fontWeight: isMissing ? 600 : 400 }}>
                                  — (Blank)
                                </span>
                              )}
                              {r.working_hours ? ` · ${formatHours(r.working_hours)}` : ''}
                            </>
                          )}
                        </div>
                        {reg && (
                          <div style={{ fontSize: '0.68rem', marginTop: '0.2rem', color: reg.status === 'approved' ? '#16a34a' : reg.status === 'rejected' ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                            Requested clock-out: {new Date(reg.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ({reg.status.toUpperCase()})
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        {isMissing && (!reg || reg.status !== 'approved') && (
                          <button
                            type="button"
                            onClick={() => openRegModal(r)}
                            style={{
                              background: reg?.status === 'pending' ? 'var(--surface-2)' : '#f59e0b',
                              color: reg?.status === 'pending' ? 'var(--dark)' : '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.28rem 0.6rem',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {reg?.status === 'pending' ? 'Update Request' : 'Fill Time & Reason'}
                          </button>
                        )}
                        <div title={s.title} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 700 }}>{s.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SUB-VIEW 2: ATTENDANCE DEFICIENCIES
          ══════════════════════════════════════════════════════════════════════ */}
          {myViewMode === 'deficiencies' && (
            <div>
              {reportLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                  <div>Analyzing attendance deficiencies...</div>
                </div>
              ) : (reportData?.deficiencies?.total_deficiency_events || 0) === 0 ? (
                <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(16,185,129,0.04) 100%)', border: '1px solid rgba(34,197,94,0.25)' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem' }}>
                    <CheckCircle2 size={30} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534', margin: '0 0 0.35rem' }}>
                    Perfect Attendance Record!
                  </h3>
                  <p style={{ color: '#15803d', fontSize: '0.84rem', margin: '0 auto', maxWidth: '500px', lineHeight: 1.5 }}>
                    Excellent work! You have <strong>0 attendance deficiencies</strong> recorded for {MONTHS[month]} {year}. All your scheduled shifts are properly recorded with on-time arrivals, closed punches, and no unapproved absences.
                  </p>
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
                    <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #f59e0b' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>
                        {reportData?.deficiencies?.late_arrivals?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dark)', marginTop: '0.2rem' }}>Late Arrivals</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Total: {reportData?.summary?.total_late_formatted || '0m'}
                      </div>
                    </div>

                    <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #e11d48' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', lineHeight: 1.1 }}>
                        {reportData?.deficiencies?.missing_clock_outs?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dark)', marginTop: '0.2rem' }}>Missing Clock-Outs</div>
                      <div style={{ fontSize: '0.68rem', color: '#e11d48', fontWeight: 600 }}>
                        Action required
                      </div>
                    </div>

                    <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #dc2626' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>
                        {reportData?.deficiencies?.unauthorized_absences?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dark)', marginTop: '0.2rem' }}>Unauthorized Absences</div>
                      <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>
                        {reportData?.summary?.unpaid_deduction_days || 0}d salary deduction
                      </div>
                    </div>

                    <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #8b5cf6' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6', lineHeight: 1.1 }}>
                        {reportData?.deficiencies?.early_departures?.length || 0}
                      </div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dark)', marginTop: '0.2rem' }}>Early Departures</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Total: {reportData?.summary?.total_early_formatted || '0m'}
                      </div>
                    </div>
                  </div>

                  {/* 1. Missing Clock-Outs Section */}
                  {reportData?.deficiencies?.missing_clock_outs?.length > 0 && (
                    <div className="card" style={{ padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid rgba(225,29,72,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <AlertCircle size={18} style={{ color: '#e11d48' }} />
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#9f1239' }}>
                          Missing Clock-Outs ({reportData.deficiencies.missing_clock_outs.length})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        You clocked in for these shifts but departure was not recorded. To avoid deduction, submit your actual departure time for Manager &amp; HR approval.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        {reportData.deficiencies.missing_clock_outs.map(day => (
                          <div
                            key={day.date}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--surface-2)',
                              borderRadius: '8px',
                              padding: '0.75rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.65rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--dark)' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Clock In: <strong style={{ color: 'var(--dark)' }}>{day.clock_in}</strong> · Clock Out: <span style={{ color: '#e11d48', fontWeight: 700 }}>MISSING</span> · Location: {day.location || '—'}
                              </div>
                              {day.regularization ? (
                                <div style={{ fontSize: '0.72rem', marginTop: '0.25rem', color: day.regularization.status === 'approved' ? '#16a34a' : day.regularization.status === 'rejected' ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                                  ⏳ Adjustment Request: {day.regularization.requested_clock_out_time ? new Date(day.regularization.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'} ({day.regularization.status.toUpperCase()})
                                  {day.regularization.admin_notes && ` · Notes: ${day.regularization.admin_notes}`}
                                </div>
                              ) : (
                                <div style={{ fontSize: '0.72rem', color: '#e11d48', marginTop: '0.2rem', fontWeight: 500 }}>
                                  ⚠️ No adjustment request submitted yet
                                </div>
                              )}
                            </div>

                            {(!day.regularization || day.regularization.status !== 'approved') && (
                              <button
                                type="button"
                                onClick={() => openRegModal({
                                  id: day.attendance_id,
                                  date: day.date,
                                  clock_in_time: day.clock_in_raw ? `${day.date}T${day.clock_in_raw}` : null,
                                  regularization: day.regularization,
                                })}
                                style={{
                                  background: day.regularization?.status === 'pending' ? 'var(--surface-2)' : '#e11d48',
                                  color: day.regularization?.status === 'pending' ? 'var(--dark)' : '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '0.4rem 0.8rem',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                {day.regularization?.status === 'pending' ? 'Update Adjustment Request' : '⚡ Request Clock-Out Adjustment'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Late Arrivals Section */}
                  {reportData?.deficiencies?.late_arrivals?.length > 0 && (
                    <div className="card" style={{ padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Clock size={18} style={{ color: '#d97706' }} />
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#92400e' }}>
                          Late Arrivals ({reportData.deficiencies.late_arrivals.length})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Shift begins at <strong>9:00 AM</strong> with grace period ending at <strong>9:10 AM</strong>. Total lateness for {MONTHS[month]} {year}: <strong>{reportData?.summary?.total_late_formatted || '0m'}</strong>.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reportData.deficiencies.late_arrivals.map(day => (
                          <div
                            key={day.date}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--surface-2)',
                              borderRadius: '8px',
                              padding: '0.7rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--dark)' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Clocked in at <strong style={{ color: '#d97706' }}>{day.clock_in}</strong> · Shift start: 9:00 AM · Location: {day.location || '—'}
                              </div>
                              {day.remarks && day.remarks !== '—' && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                  Note: {day.remarks}
                                </div>
                              )}
                            </div>
                            <span style={{
                              background: 'rgba(245,158,11,0.12)',
                              color: '#b45309',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}>
                              +{day.late_minutes}m late
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Unauthorized Absences Section */}
                  {reportData?.deficiencies?.unauthorized_absences?.length > 0 && (
                    <div className="card" style={{ padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid rgba(220,38,38,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <ShieldAlert size={18} style={{ color: '#dc2626' }} />
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#991b1b' }}>
                          Unauthorized Absences ({reportData.deficiencies.unauthorized_absences.length})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Scheduled working days where no attendance punch was recorded and no approved leave exists. Each unauthorized absence results in a <strong>1.0-day No-Pay salary deduction</strong>.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reportData.deficiencies.unauthorized_absences.map(day => (
                          <div
                            key={day.date}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--surface-2)',
                              borderRadius: '8px',
                              padding: '0.7rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#991b1b' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Scheduled working day · No attendance recorded · Impact: <strong>1.0 Day No-Pay Deduction</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate('/solar/hr/portal/leaves')}
                              style={{
                                background: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Apply for Leave →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Early Departures Section */}
                  {reportData?.deficiencies?.early_departures?.length > 0 && (
                    <div className="card" style={{ padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <TrendingDown size={18} style={{ color: '#8b5cf6' }} />
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#6d28d9' }}>
                          Early Departures / Undertime ({reportData.deficiencies.early_departures.length})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Shifts where clock-out occurred before scheduled shift end (<strong>5:30 PM</strong>). Total undertime: <strong>{reportData?.summary?.total_early_formatted || '0m'}</strong>.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reportData.deficiencies.early_departures.map(day => (
                          <div
                            key={day.date}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--surface-2)',
                              borderRadius: '8px',
                              padding: '0.7rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--dark)' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Clocked out at <strong style={{ color: 'var(--dark)' }}>{day.clock_out}</strong> · Standard shift end: 5:30 PM · Worked: {day.hours_formatted}
                              </div>
                            </div>
                            <span style={{
                              background: 'rgba(139,92,246,0.12)',
                              color: '#7c3aed',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}>
                              -{day.early_minutes}m undertime
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Half-Day Shifts */}
                  {reportData?.deficiencies?.half_days?.length > 0 && (
                    <div className="card" style={{ padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Clock size={18} style={{ color: '#8b5cf6' }} />
                        <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#6d28d9' }}>
                          Half-Day Attendances ({reportData.deficiencies.half_days.length})
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Working hours under 4.5h threshold. Each half-day counts as 0.5 payable attendance day and 0.5 unpaid deduction day.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {reportData.deficiencies.half_days.map(day => (
                          <div
                            key={day.date}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--surface-2)',
                              borderRadius: '8px',
                              padding: '0.7rem 0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--dark)' }}>
                                {new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Clock In: {day.clock_in} · Clock Out: {day.clock_out} · Worked: <strong style={{ color: '#8b5cf6' }}>{day.hours_formatted}</strong>
                              </div>
                            </div>
                            <span style={{
                              background: 'rgba(139,92,246,0.12)',
                              color: '#7c3aed',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '999px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}>
                              Half Day (0.5d)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              SUB-VIEW 3: MONTHLY PAYROLL TIMESHEET REPORT
          ══════════════════════════════════════════════════════════════════════ */}
          {myViewMode === 'report' && (
            <div>
              {reportLoading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                  <div>Loading payroll timesheet report...</div>
                </div>
              ) : !reportData ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Failed to load report data. Please refresh or select another month.
                </div>
              ) : (
                <>
                  {/* Employee & Payroll Overview Card */}
                  <div style={{ background: 'var(--surface-2)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.65rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--dark)' }}>
                          {reportData.employee?.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          EPF No: <strong>{reportData.employee?.epf_no || reportData.employee?.employee_id}</strong> · {reportData.employee?.designation} · {reportData.employee?.department}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Manager: <strong>{reportData.employee?.manager}</strong> · Shift: 9:00 AM – 5:30 PM (8.5h)
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Payable Salary Days</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
                          {reportData.summary?.payable_attendance_days} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {reportData.summary?.working_days}d</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: (reportData.summary?.unpaid_deduction_days || 0) > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 600 }}>
                          NOPAY Deductions: {reportData.summary?.unpaid_deduction_days}d
                        </div>
                      </div>
                    </div>

                    {/* 6 Metric KPI Blocks */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a' }}>{reportData.summary?.days_present}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Days Present</div>
                      </div>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#d97706' }}>{reportData.summary?.days_late}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Late ({reportData.summary?.total_late_minutes}m)</div>
                      </div>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0891b2' }}>{reportData.summary?.days_short_leave || 0}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Short Lv ({reportData.summary?.short_leave_hours}h)</div>
                      </div>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb' }}>{reportData.summary?.days_leave}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Leaves ({reportData.summary?.paid_leave_days}d Paid)</div>
                      </div>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#e11d48' }}>{reportData.summary?.days_missing}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Missing Out</div>
                      </div>
                      <div style={{ background: 'var(--surface)', padding: '0.55rem 0.35rem', borderRadius: '6px', border: '1px solid var(--surface-2)' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>{reportData.summary?.days_absent}</div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Absent (NoPay)</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: '0.76rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Actual Hours: <strong style={{ color: '#2563eb' }}>{reportData.summary?.total_working_hours}h</strong> · Standard Required: <strong>{reportData.summary?.standard_required_hours}h</strong>
                      </span>
                      <span style={{ color: reportData.summary?.attendance_rate >= 90 ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                        Attendance Rate: {reportData.summary?.attendance_rate}%
                      </span>
                    </div>
                  </div>

                  {/* Itemized Daily Timesheet Table */}
                  <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)', fontWeight: 700, fontSize: '0.86rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Itemized Daily Timesheet — {reportData.month_label}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        Generated {reportData.generated_at}
                      </span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                          {['DATE', 'DAY', 'CLOCK IN', 'CLOCK OUT', 'HOURS', 'LATE', 'EARLY', 'STATUS', 'REMARKS / DETAILS'].map((h, i) => (
                            <th key={h} style={{ padding: '0.65rem 0.8rem', textAlign: (i <= 1 || i === 8) ? 'left' : 'center', fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.days?.map(d => {
                          const weekend = d.is_weekend;
                          const cell = STATUS_CELL[d.status] || { label: d.status, bg: 'var(--surface-2)', color: 'var(--text-muted)' };
                          const rowBg = weekend ? 'rgba(107,114,128,0.04)' : (d.status === 'missing' || d.status === 'absent') ? 'rgba(239,68,68,0.04)' : 'transparent';
                          return (
                            <tr key={d.date} style={{ borderBottom: '1px solid var(--surface-2)', background: rowBg }}>
                              <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.date}</td>
                              <td style={{ padding: '0.6rem 0.8rem', color: weekend ? 'var(--text-muted)' : 'var(--text-secondary)' }}>{d.day_name}</td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: d.clock_in !== '—' ? '#0f172a' : 'var(--text-muted)', fontWeight: d.clock_in !== '—' ? 600 : 400 }}>
                                {d.clock_in}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: d.clock_out === 'MISSING' ? '#e11d48' : d.clock_out !== '—' ? '#0f172a' : 'var(--text-muted)', fontWeight: d.clock_out === 'MISSING' ? 800 : d.clock_out !== '—' ? 600 : 400 }}>
                                {d.clock_out}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 600, color: d.working_hours > 0 ? '#0f172a' : 'var(--text-muted)' }}>
                                {d.hours_formatted}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: d.late_minutes > 0 ? '#b45309' : 'var(--text-muted)', fontWeight: d.late_minutes > 0 ? 700 : 400 }}>
                                {d.late_minutes > 0 ? `+${d.late_minutes}m` : '—'}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center', color: d.early_minutes > 0 ? '#b45309' : 'var(--text-muted)', fontWeight: d.early_minutes > 0 ? 700 : 400 }}>
                                {d.early_minutes > 0 ? `-${d.early_minutes}m` : '—'}
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                <span style={{
                                  padding: '0.18rem 0.55rem',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: cell.bg,
                                  color: cell.color,
                                  display: 'inline-block',
                                }}>
                                  {d.status_label || cell.title || d.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.74rem', color: 'var(--text-muted)', maxWidth: '220px' }}>
                                {d.remarks}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Missing Attendance Clock-Out Adjustment Modal */}
      {regModalOpen && selectedReg && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--dark)' }}>
              Fill Missing Attendance Clock-Out
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              For shift on <strong>{new Date(selectedReg.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</strong> (Clock-in: {selectedReg.clock_in_time ? new Date(selectedReg.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'} · Clock-out: Blank). Please submit your actual departure time and reason before month end.
            </p>

            <form onSubmit={handleRegularizeSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Actual Departure Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  required
                  className="form-control"
                  value={regForm.requested_time}
                  onChange={e => setRegForm(prev => ({ ...prev, requested_time: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Reason for Adjustment <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  className="form-control"
                  placeholder="e.g. Worked on project until 6:00 PM, forgot to clock out before leaving..."
                  value={regForm.reason}
                  onChange={e => setRegForm(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRegModalOpen(false)}
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--surface-2)', padding: '0.5rem 1rem' }}
                  disabled={regSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', padding: '0.5rem 1.25rem', fontWeight: 600 }}
                  disabled={regSubmitting}
                >
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Action Modal (for Team Adjustments) */}
      {managerActionModal.open && managerActionModal.item && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--dark)' }}>
              {managerActionModal.action === 'manager_approved' ? 'Manager Approval' : 'Manager Rejection'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Employee: <strong>{managerActionModal.item.employee?.full_name}</strong> · Shift: {new Date(managerActionModal.item.attendance?.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}<br />
              Requested Departure: <strong style={{ color: '#0284c7' }}>{new Date(managerActionModal.item.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</strong><br />
              Reason: <em>"{managerActionModal.item.reason}"</em>
            </p>

            <form onSubmit={handleManagerActionSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Manager Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder={managerActionModal.action === 'manager_approved' ? 'e.g. Verified site work with project team...' : 'e.g. Clock-out time does not match log...'}
                  value={managerActionModal.notes}
                  onChange={e => setManagerActionModal(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setManagerActionModal({ open: false, item: null, action: 'manager_approved', notes: '' })}
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--surface-2)', padding: '0.5rem 1rem' }}
                  disabled={managerActionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: managerActionModal.action === 'manager_approved' ? '#0284c7' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    fontWeight: 600,
                  }}
                  disabled={managerActionSubmitting}
                >
                  {managerActionSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Loader2 size={13} className="animate-spin" /> Processing...
                    </span>
                  ) : (
                    managerActionModal.action === 'manager_approved' ? 'Confirm Approval' : 'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Review Modal (for Remote Attendance) */}
      {remoteActionModal.open && remoteActionModal.item && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '1.5rem', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--dark)' }}>
              {remoteActionModal.action === 'manager_approved' ? 'Manager Approval (Stage 1)' : 'Manager Rejection'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              For <strong>{remoteActionModal.item.employee?.full_name}</strong> · Remote {remoteActionModal.item.request_type === 'clock_in' ? 'Clock-In' : 'Clock-Out'} at <strong>{remoteActionModal.item.location_name}</strong>.
              {remoteActionModal.action === 'manager_approved' ? ' Once approved by manager, this request will be forwarded to HR Admin for final shift creation.' : ' Please state why this remote attendance request is being rejected.'}
            </p>

            <form onSubmit={handleRemoteActionSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Manager Remarks / Notes {remoteActionModal.action === 'manager_rejected' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <textarea
                  required={remoteActionModal.action === 'manager_rejected'}
                  rows={3}
                  className="form-control"
                  placeholder={remoteActionModal.action === 'manager_approved' ? 'e.g. Verified field assignment with installation team...' : 'e.g. Employee was scheduled at head office, not field site...'}
                  value={remoteActionModal.notes}
                  onChange={e => setRemoteActionModal(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRemoteActionModal({ open: false, item: null, action: 'manager_approved', notes: '' })}
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--surface-2)', padding: '0.5rem 1rem' }}
                  disabled={remoteActionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: remoteActionModal.action === 'manager_approved' ? '#059669' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    fontWeight: 600,
                  }}
                  disabled={remoteActionSubmitting}
                >
                  {remoteActionSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Loader2 size={13} className="animate-spin" /> Processing...
                    </span>
                  ) : (
                    remoteActionModal.action === 'manager_approved' ? 'Confirm Manager Approval' : 'Confirm Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {previewPhotoModal.open && (
        <div
          onClick={() => setPreviewPhotoModal({ open: false, url: '', title: '' })}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: '1.5rem',
            cursor: 'zoom-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '85vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              background: '#1e293b', borderRadius: '12px', overflow: 'hidden', cursor: 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{previewPhotoModal.title || 'Evidence Photo'}</span>
              <button
                type="button"
                onClick={() => setPreviewPhotoModal({ open: false, url: '', title: '' })}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
              <img
                src={previewPhotoModal.url}
                alt="Evidence"
                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '6px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalAttendance;
