import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, X, Clock, CheckCircle, AlertTriangle, Loader2,
  CalendarDays, Check, Ban, FileText, ChevronRight, MessageSquare
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';

const STATUS_STYLE = {
  pending:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Pending' },
  manager_approved: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'Mgr Approved' },
  manager_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Mgr Rejected' },
  approved:         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Approved' },
  rejected:         { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Rejected' },
  cancelled:        { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: 'Cancelled' },
};

const LEAVE_TYPE_COLORS = {
  annual:  '#3b82f6',
  casual:  '#a855f7',
  medical: '#f59e0b',
  short:   '#14b8a6',
};

const LEAVE_TYPES = [
  { key: 'annual',  label: 'Annual Leave' },
  { key: 'casual',  label: 'Casual Leave' },
  { key: 'medical', label: 'Medical Leave' },
  { key: 'short',   label: 'Short Leave' },
];

const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: status };
  return (
    <span style={{
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 700,
      background: s.bg,
      color: s.color,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      whiteSpace: 'nowrap',
    }}>
      {status === 'approved' && (
        <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.56rem', fontWeight: 800 }}>LV</span>
      )}
      {s.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const color = LEAVE_TYPE_COLORS[type] || '#9ca3af';
  return (
    <span style={{
      padding: '0.2rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: `${color}1a`,
      color,
      whiteSpace: 'nowrap',
      textTransform: 'capitalize',
    }}>
      {type}
    </span>
  );
};

const PortalLeave = () => {
  const user = useAuthStore(s => s.user);
  const isManager = isLeaveApprovalManager(user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'my' or 'approvals' (only for manager emails)
  const initialTab = (isManager && searchParams.get('tab') === 'approvals') ? 'approvals' : 'my';
  const [activeTab, setActiveTab] = useState(initialTab);

  // ── Personal Leave State ──
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    hours_count: 1,
    is_half_day: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  // ── Manager Team Approvals State ──
  const [teamRequests, setTeamRequests] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamFilter, setTeamFilter] = useState('pending'); // 'pending' | 'manager_approved' | 'all'
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [managerNote, setManagerNote] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Fetch personal data
  const fetchPersonalData = useCallback(async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get('/hr/leaves/my-balance'),
        api.get('/hr/leaves/my-requests'),
      ]);
      setBalances(balRes.data || []);
      setRequests(reqRes.data || []);
    } catch {
      toast.error('Failed to load personal leave data');
    }
  }, []);

  // Fetch team requests for manager
  const fetchTeamData = useCallback(async (filterStatus = teamFilter) => {
    if (!isManager) return;
    setTeamLoading(true);
    try {
      const params = {};
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const [listRes, countRes] = await Promise.all([
        api.get('/hr/leaves', { params }),
        api.get('/hr/leaves/unapproved-counts'),
      ]);
      setTeamRequests(listRes.data?.data || listRes.data || []);
      setPendingCount(countRes.data?.pending ?? 0);
    } catch {
      toast.error('Failed to load team leave requests');
    } finally {
      setTeamLoading(false);
    }
  }, [isManager, teamFilter]);

  // Master fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    await fetchPersonalData();
    if (isManager) {
      await fetchTeamData();
    }
    setLoading(false);
  }, [fetchPersonalData, fetchTeamData, isManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Switch tabs
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams(tabKey === 'approvals' ? { tab: 'approvals' } : {});
    if (tabKey === 'approvals') {
      fetchTeamData(teamFilter);
    }
  };

  // ── Personal Leave Handlers ──
  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    let d = new Date(start + 'T00:00:00'), count = 0;
    const e = new Date(end + 'T00:00:00');
    while (d <= e) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date) { toast.error('Please select start date'); return; }

    let submitData = { ...form };

    if (form.leave_type === 'short') {
      submitData.end_date = form.start_date;
      submitData.days_count = 0;
    } else {
      if (!form.end_date) { toast.error('Please select end date'); return; }
      if (form.start_date > form.end_date) {
        toast.error('End date cannot be earlier than start date');
        return;
      }
      submitData.hours_count = null;
      let d = calcDays(form.start_date, form.end_date);
      if (form.is_half_day && form.start_date === form.end_date) d = 0.5;
      submitData.days_count = d;
    }

    setSubmitting(true);
    try {
      await api.post('/hr/leaves', submitData);
      toast.success('Leave request submitted!');
      setShowForm(false);
      setForm({ leave_type: 'annual', start_date: '', end_date: '', reason: '', hours_count: 1, is_half_day: false });
      fetchPersonalData();
      window.dispatchEvent(new CustomEvent('hr-leaves-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.patch(`/hr/leaves/${id}/cancel`);
      toast.success('Request cancelled');
      fetchPersonalData();
      window.dispatchEvent(new CustomEvent('hr-leaves-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel');
    } finally { setCancelling(null); }
  };

  // ── Manager Action Handlers ──
  const openDetailModal = (leave) => {
    setSelectedDetail(leave);
    setManagerNote('');
    setDetailModalOpen(true);
  };

  const handleManagerAction = async (leaveId, status) => {
    setActionProcessing(true);
    try {
      const payload = { status };
      if (managerNote.trim()) {
        payload.notes = managerNote.trim();
      }
      await api.patch(`/hr/leaves/${leaveId}/status`, payload);
      const actionName = status === 'manager_approved' ? 'Manager Approved' : 'Manager Rejected';
      toast.success(`Leave request ${actionName} successfully!`);
      setDetailModalOpen(false);
      setSelectedDetail(null);
      setManagerNote('');
      fetchTeamData(teamFilter);
      window.dispatchEvent(new CustomEvent('hr-leaves-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionProcessing(false);
    }
  };

  const days = calcDays(form.start_date, form.end_date);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            {isManager && activeTab === 'approvals' ? 'Leave Approvals' : 'My Leave'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {isManager && activeTab === 'approvals'
              ? 'Review & approve employee requests'
              : 'Balance & requests'}
          </p>
        </div>
        {activeTab === 'my' && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: '#3b82f6', border: 'none', color: '#fff',
              padding: '0.55rem 0.95rem', borderRadius: 'var(--radius-md)',
              fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(59,130,246,0.3)',
            }}
          >
            <Plus size={16} /> Apply
          </button>
        )}
      </div>

      {/* ── Segmented Switcher (Visible ONLY for Leave Approval Managers) ── */}
      {isManager && (
        <div style={{
          display: 'flex',
          background: 'var(--surface-2)',
          padding: '0.3rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '1px solid var(--surface-2)',
        }}>
          <button
            type="button"
            onClick={() => handleTabChange('my')}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'my' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'my' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: activeTab === 'my' ? 'var(--dark)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            My Leave
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('approvals')}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'approvals' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'approvals' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: activeTab === 'approvals' ? '#0284c7' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Team Approvals</span>
            {pendingCount > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                padding: '0.12rem 0.45rem',
                borderRadius: '999px',
                fontWeight: 700,
                lineHeight: 1.2,
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: MY LEAVE (Standard View)
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'my' && (
        <>
          {/* Balances */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
            {balances.map(b => (
              <div key={b.key} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.type}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.used} used · {b.total} total</span>
                </div>
                <div style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (b.used / (b.total || 1)) * 100)}%`,
                    height: '100%',
                    background: b.remaining > 2 ? '#22c55e' : b.remaining > 0 ? '#f59e0b' : '#ef4444',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 700, color: b.remaining > 0 ? '#22c55e' : '#ef4444' }}>
                  {b.remaining} {b.unit} remaining
                </div>
              </div>
            ))}
          </div>

          {/* Requests */}
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>My Requests</div>
          {requests.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No leave requests yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {requests.map(r => {
                const s = STATUS_STYLE[r.status];
                return (
                  <div key={r.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                          {r.leave_type} Leave
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {r.leave_type === 'short'
                            ? `${r.start_date.split('T')[0]} · ${r.hours_count} hour(s)`
                            : `${r.start_date.split('T')[0]} → ${r.end_date.split('T')[0]} · ${r.days_count} day(s)`}
                        </div>
                        {r.reason && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--dark)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                            "{r.reason}"
                          </div>
                        )}
                        {r.manager_notes && (
                          <div style={{ fontSize: '0.72rem', color: '#0ea5e9', marginTop: '0.3rem', fontWeight: 500 }}>
                            Mgr: {r.manager_notes}
                          </div>
                        )}
                        {r.hr_notes && (
                          <div style={{ fontSize: '0.72rem', color: '#22c55e', marginTop: '0.25rem', fontWeight: 500 }}>
                            HR: {r.hr_notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <Badge status={r.status} />
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(r.id)}
                            disabled={cancelling === r.id}
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: 'none',
                              color: '#ef4444',
                              padding: '0.25rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            {cancelling === r.id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: TEAM APPROVALS (Manager View for CEO & GM)
      ───────────────────────────────────────────────────────────────── */}
      {isManager && activeTab === 'approvals' && (
        <>
          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {[
              { key: 'pending',          label: `Pending (${pendingCount})` },
              { key: 'manager_approved', label: 'Mgr Approved' },
              { key: 'all',              label: 'All Requests' },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setTeamFilter(f.key);
                  fetchTeamData(f.key);
                }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  border: teamFilter === f.key ? '1px solid #0284c7' : '1px solid var(--surface-2)',
                  background: teamFilter === f.key ? '#0284c7' : 'var(--surface)',
                  color: teamFilter === f.key ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List of Requests */}
          {teamLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#0ea5e9' }} />
            </div>
          ) : teamRequests.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <CheckCircle size={24} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--dark)', marginBottom: '0.25rem' }}>
                No pending requests
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>
                All employee leave requests have been reviewed.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teamRequests.map(leave => {
                const s = STATUS_STYLE[leave.status];
                const emp = leave.employee;
                const dateText = leave.leave_type === 'short'
                  ? `${leave.start_date.split('T')[0]} · ${leave.hours_count} hr(s)`
                  : `${leave.start_date.split('T')[0]} → ${leave.end_date.split('T')[0]} · ${leave.days_count} day(s)`;

                return (
                  <div
                    key={leave.id}
                    className="card"
                    style={{
                      padding: '1.1rem',
                      border: leave.status === 'pending' ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--surface-2)',
                      background: leave.status === 'pending' ? 'linear-gradient(135deg, rgba(245,158,11,0.03) 0%, rgba(255,255,255,1) 100%)' : '#fff',
                      borderRadius: 'var(--radius-lg, 12px)',
                      cursor: 'pointer',
                    }}
                    onClick={() => openDetailModal(leave)}
                  >
                    {/* Top Row: Employee & Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)' }}>
                          {emp?.full_name || 'Employee'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {emp?.department?.name || emp?.designation?.name || 'Department'} {emp?.employee_id ? `· ${emp.employee_id}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <TypeBadge type={leave.leave_type} />
                        <Badge status={leave.status} />
                      </div>
                    </div>

                    {/* Middle: Dates & Reason */}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={13} />
                      <span>{dateText}</span>
                    </div>

                    {leave.reason && (
                      <div style={{
                        padding: '0.55rem 0.75rem',
                        background: 'var(--surface-2)',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        color: 'var(--dark)',
                        marginBottom: '0.75rem',
                        lineHeight: 1.4,
                      }}>
                        "{leave.reason}"
                      </div>
                    )}

                    {/* Notes if already reviewed */}
                    {leave.manager_notes && (
                      <div style={{ fontSize: '0.72rem', color: '#0ea5e9', marginBottom: '0.6rem', fontWeight: 500 }}>
                        Manager Note: {leave.manager_notes}
                      </div>
                    )}

                    {/* Bottom Action Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--surface-2)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Submitted: {leave.created_at ? new Date(leave.created_at).toLocaleDateString('en-GB') : '-'}
                      </span>

                      {leave.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openDetailModal(leave)}
                            className="btn btn-sm btn-ghost"
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: '#0284c7',
                              border: '1px solid rgba(14,165,233,0.3)',
                              background: 'rgba(14,165,233,0.08)',
                              padding: '0.3rem 0.75rem',
                              borderRadius: '6px',
                            }}
                          >
                            Review & Approve
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>Details</span>
                          <ChevronRight size={14} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: APPLY FOR LEAVE (Personal Form)
      ───────────────────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Apply for Leave</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Leave Type</label>
                <select className="form-control" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  {LEAVE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: form.leave_type === 'short' ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{form.leave_type === 'short' ? 'Date' : 'Start Date'}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    required
                  />
                </div>
                {form.leave_type !== 'short' && (
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      required
                      min={form.start_date || undefined}
                    />
                  </div>
                )}
              </div>

              {form.leave_type === 'short' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Hours</label>
                  <select className="form-control" value={form.hours_count} onChange={e => setForm({ ...form, hours_count: parseInt(e.target.value) })}>
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours</option>
                  </select>
                </div>
              )}

              {form.leave_type !== 'short' && form.start_date === form.end_date && form.start_date && (
                <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="half_day" checked={form.is_half_day} onChange={e => setForm({ ...form, is_half_day: e.target.checked })} />
                  <label htmlFor="half_day" style={{ margin: 0, fontSize: '0.875rem' }}>This is a half-day leave (0.5 days)</label>
                </div>
              )}

              {form.leave_type !== 'short' && days > 0 && !form.is_half_day && (
                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: '#3b82f6', fontWeight: 600 }}>
                  📅 {days} working day{days > 1 ? 's' : ''}
                </div>
              )}
              {form.leave_type !== 'short' && days > 0 && form.is_half_day && (
                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: '#3b82f6', fontWeight: 600 }}>
                  📅 0.5 working days
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Reason (optional)</label>
                <textarea className="form-control" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Brief reason for leave..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--surface-2)' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', borderColor: '#3b82f6' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: LEAVE REQUEST DETAILS (Matches Image 2)
      ───────────────────────────────────────────────────────────────── */}
      {detailModalOpen && selectedDetail && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, padding: '1rem', backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '440px', padding: '1.5rem',
            background: '#fff', borderRadius: '16px', maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                Leave Request Details
              </h3>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Employee banner */}
            <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-2)', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--dark)' }}>
                {selectedDetail.employee?.full_name || 'Employee'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                · {selectedDetail.employee?.department?.name || 'Department'} {selectedDetail.employee?.employee_id ? `(${selectedDetail.employee.employee_id})` : ''}
              </div>
            </div>

            {/* Grid rows */}
            {[
              ['Leave Type', <TypeBadge type={selectedDetail.leave_type} />],
              ['Status', <Badge status={selectedDetail.status} />],
              ['Start Date', selectedDetail.start_date ? selectedDetail.start_date.split('T')[0] : '—'],
              ['End Date', selectedDetail.end_date ? selectedDetail.end_date.split('T')[0] : '—'],
              ['Duration', selectedDetail.leave_type === 'short' ? `${selectedDetail.hours_count} hour(s)` : `${Number(selectedDetail.days_count).toFixed(2)} working day(s)`],
              ['Submitted', selectedDetail.created_at ? new Date(selectedDetail.created_at).toLocaleDateString('en-GB') : '—'],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.55rem 0', borderBottom: '1px solid var(--surface-2)', fontSize: '0.85rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{val}</span>
              </div>
            ))}

            {/* Reason block */}
            {selectedDetail.reason && (
              <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                  REASON
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--dark)', lineHeight: 1.45 }}>
                  {selectedDetail.reason}
                </div>
              </div>
            )}

            {/* Approval Notes trail if any */}
            {(selectedDetail.manager_notes || selectedDetail.hr_notes) && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Approval Notes
                </div>
                {selectedDetail.manager_notes && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(14,165,233,0.08)', borderLeft: '3px solid #0ea5e9', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <strong style={{ color: '#0ea5e9' }}>Manager: </strong>{selectedDetail.manager_notes}
                  </div>
                )}
                {selectedDetail.hr_notes && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', borderRadius: '4px', fontSize: '0.8rem' }}>
                    <strong style={{ color: '#22c55e' }}>HR: </strong>{selectedDetail.hr_notes}
                  </div>
                )}
              </div>
            )}

            {/* Optional note input for manager when pending */}
            {selectedDetail.status === 'pending' && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Manager Remarks (Optional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Approved, tasks delegated..."
                  value={managerNote}
                  onChange={e => setManagerNote(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                />
              </div>
            )}

            {/* Action buttons matching Image 2 */}
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ border: '1px solid var(--surface-2)', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setDetailModalOpen(false)}
                disabled={actionProcessing}
              >
                Close
              </button>
              {selectedDetail.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      color: '#0ea5e9',
                      border: '1px solid rgba(14,165,233,0.35)',
                      background: 'rgba(14,165,233,0.08)',
                      fontWeight: 600,
                      padding: '0.45rem 1rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onClick={() => handleManagerAction(selectedDetail.id, 'manager_approved')}
                    disabled={actionProcessing}
                  >
                    {actionProcessing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                    <span>Mgr Approve</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.35)',
                      background: 'rgba(239,68,68,0.08)',
                      fontWeight: 600,
                      padding: '0.45rem 1rem',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    onClick={() => handleManagerAction(selectedDetail.id, 'manager_rejected')}
                    disabled={actionProcessing}
                  >
                    {actionProcessing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={14} />}
                    <span>Mgr Reject</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalLeave;
