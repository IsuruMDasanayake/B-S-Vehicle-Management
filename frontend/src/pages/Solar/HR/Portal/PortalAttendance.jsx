import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Check, X, Clock, Loader2, AlertCircle, Calendar,
  Globe, MapPin, ExternalLink, Image as ImageIcon, CheckCircle2, Search
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

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/attendance/my-history', { params: { month: monthStr } });
      setRecords(res.data);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [monthStr]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

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
      await fetchHistory();
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
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>My Attendance</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>Monthly overview</p>

      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={prevMonth} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
          <ChevronRight size={18} />
        </button>
      </div>

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
        </>
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
