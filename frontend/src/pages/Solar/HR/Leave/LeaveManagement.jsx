import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, CheckCircle, XCircle, Clock, Users, BarChart2, Calendar,
  RefreshCw, Eye, Filter, Search, TrendingUp, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../../store/authStore';

/* ─── constants ──────────────────────────────────────────────────────────── */
const STATUS_STYLE = {
  pending:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Pending' },
  manager_approved: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'Mgr Approved' },
  manager_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Mgr Rejected' },
  approved:         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'HR Approved' },
  rejected:         { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'HR Rejected' },
  cancelled:        { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: 'Cancelled' },
};

const LEAVE_TYPE_COLORS = {
  annual:  '#3b82f6',
  casual:  '#a855f7',
  medical: '#f59e0b',
  short:   '#14b8a6',
};

const Badge = ({ status }) => {
  const s = STATUS_STYLE[status] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: status };
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const color = LEAVE_TYPE_COLORS[type] || '#9ca3af';
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, background: `${color}1a`, color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {type}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ background: `${color}1a`, color, padding: '0.75rem', borderRadius: 'var(--radius-md)', display: 'flex', flexShrink: 0 }}>
      <Icon size={20} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.72rem', color, marginTop: '0.1rem', fontWeight: 600 }}>{sub}</div>}
    </div>
  </div>
);

/* ─── main component ─────────────────────────────────────────────────────── */
export default function LeaveManagement() {
  const [tab, setTab] = useState('requests'); // 'requests' | 'balances' | 'calendar'

  // -- requests tab state
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', leave_type: '', department_id: '', month: '', search: '' });
  const [departments, setDepartments] = useState([]);

  // -- balances tab state
  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');

  // -- stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // -- modal
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const user = useAuthStore(state => state.user);
  const isManager = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  const isHR = user?.role === 'solar_hr_admin' || user?.roles?.includes('solar_hr_admin');

  /* ── fetch ──────────────────────────────────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get('/hr/leaves/stats');
      setStats(res.data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.status) params.status = filters.status;
      if (filters.leave_type) params.leave_type = filters.leave_type;
      if (filters.department_id) params.department_id = filters.department_id;
      if (filters.month) params.month = filters.month;
      const res = await api.get('/hr/leaves', { params });
      setLeaves(res.data.data);
      setLastPage(res.data.last_page || 1);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  }, [filters, page]);

  const fetchDepts = useCallback(async () => {
    try {
      const res = await api.get('/hr/departments');
      setDepartments(res.data);
    } catch { /* silent */ }
  }, []);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await api.get('/hr/leaves/all-balances');
      setBalances(res.data);
    } catch { toast.error('Failed to load leave balances'); }
    finally { setBalancesLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); fetchDepts(); }, [fetchStats, fetchDepts]);
  useEffect(() => { if (tab === 'requests') fetchLeaves(); }, [tab, fetchLeaves]);
  useEffect(() => { if (tab === 'balances' && balances.length === 0) fetchBalances(); }, [tab, fetchBalances]);

  /* ── handlers ───────────────────────────────────────────────────────────── */
  const confirmAction = (leave, status) => {
    setSelectedLeave(leave); setActionStatus(status); setActionNotes(''); setModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedLeave || !actionStatus) return;
    setIsProcessing(true);
    try {
      await api.patch(`/hr/leaves/${selectedLeave.id}/status`, { status: actionStatus, notes: actionNotes });
      toast.success('Leave status updated');
      setModalOpen(false);
      fetchLeaves(); fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally { setIsProcessing(false); }
  };

  const formatActionName = (status) => ({
    manager_approved: 'Manager Approve',
    manager_rejected: 'Manager Reject',
    approved: 'HR Approve',
    rejected: 'HR Reject',
  }[status] || status);

  const fmtDate = (d) => d ? d.split('T')[0] : '-';

  /* ── filtered balances ───────────────────────────────────────────────────── */
  const filteredBalances = balances.filter(e =>
    !balanceSearch ||
    e.name?.toLowerCase().includes(balanceSearch.toLowerCase()) ||
    e.department?.toLowerCase().includes(balanceSearch.toLowerCase())
  );

  /* ─── render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Leave Management</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Full oversight of leave requests, balances and approvals</p>
        </div>
        <button onClick={() => { fetchLeaves(); fetchStats(); if (tab === 'balances') fetchBalances(); }}
          className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={Clock} label="Pending" value={statsLoading ? '…' : stats?.pending ?? 0} color="#f59e0b" />
        <StatCard icon={TrendingUp} label="Mgr Approved" value={statsLoading ? '…' : stats?.manager_approved ?? 0} color="#0ea5e9" />
        <StatCard icon={CheckCircle} label="HR Approved" value={statsLoading ? '…' : stats?.approved ?? 0} color="#22c55e" />
        <StatCard icon={XCircle} label="Rejected" value={statsLoading ? '…' : stats?.rejected ?? 0} color="#ef4444" />
        <StatCard icon={Calendar} label="This Month" value={statsLoading ? '…' : stats?.total_this_month ?? 0} color="#8b5cf6" />
      </div>

      {/* ── Leave Type Pills (from stats) ── */}
      {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {Object.entries(stats.by_type).map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.9rem', borderRadius: '999px', background: `${LEAVE_TYPE_COLORS[type] || '#9ca3af'}1a`, border: `1px solid ${LEAVE_TYPE_COLORS[type] || '#9ca3af'}33` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: LEAVE_TYPE_COLORS[type] || '#9ca3af', flexShrink: 0 }} />
              <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', fontWeight: 600, color: LEAVE_TYPE_COLORS[type] || '#9ca3af' }}>{type}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0' }}>
        {[
          { key: 'requests', label: 'Leave Requests', icon: Calendar },
          { key: 'balances', label: 'Employee Balances', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem',
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
            color: tab === key ? '#3b82f6' : 'var(--text-muted)',
            borderBottom: tab === key ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px', transition: 'color 0.15s',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ TAB: REQUESTS ═══════════════════════ */}
      {tab === 'requests' && (
        <>
          {/* Filters */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Status</label>
                <select className="form-control" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="manager_approved">Manager Approved</option>
                  <option value="approved">HR Approved</option>
                  <option value="manager_rejected">Manager Rejected</option>
                  <option value="rejected">HR Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Leave Type</label>
                <select className="form-control" value={filters.leave_type} onChange={e => { setFilters(f => ({ ...f, leave_type: e.target.value })); setPage(1); }}>
                  <option value="">All Types</option>
                  <option value="annual">Annual</option>
                  <option value="casual">Casual</option>
                  <option value="medical">Medical</option>
                  <option value="short">Short</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Department</label>
                <select className="form-control" value={filters.department_id} onChange={e => { setFilters(f => ({ ...f, department_id: e.target.value })); setPage(1); }}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Month</label>
                <input type="month" className="form-control" value={filters.month} onChange={e => { setFilters(f => ({ ...f, month: e.target.value })); setPage(1); }} />
              </div>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', alignSelf: 'flex-end' }}
                onClick={() => { setFilters({ status: '', leave_type: '', department_id: '', month: '', search: '' }); setPage(1); }}>
                <Filter size={14} style={{ marginRight: 4 }} /> Clear
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} /></div>
            ) : leaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <AlertCircle size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                <div>No leave requests match the current filters.</div>
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-2)', background: 'rgba(255,255,255,0.02)' }}>
                    {['Employee', 'Type', 'Duration', 'Reason', 'Status', 'Workflow', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => {
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--surface-2)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.employee?.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{l.employee?.department?.name}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <TypeBadge type={l.leave_type} />
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontSize: '0.825rem' }}>{fmtDate(l.start_date)}{l.end_date && l.start_date !== l.end_date ? ` → ${fmtDate(l.end_date)}` : ''}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {l.leave_type === 'short' ? `${l.hours_count} hr` : `${l.days_count} day(s)`}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.825rem', color: 'var(--text-muted)' }} title={l.reason || '-'}>
                            {l.reason || <span style={{ fontStyle: 'italic' }}>—</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <Badge status={l.status} />
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {/* Visual approval pipeline */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 600 }}>Employee</span>
                            <span>→</span>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600,
                              background: l.status === 'manager_approved' ? 'rgba(14,165,233,0.12)' : l.status === 'manager_rejected' ? 'rgba(239,68,68,0.1)' : l.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.06)',
                              color: l.status === 'manager_approved' ? '#0ea5e9' : l.status === 'manager_rejected' ? '#ef4444' : l.status === 'approved' ? '#22c55e' : 'var(--text-muted)' }}>
                              Manager
                            </span>
                            <span>→</span>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600,
                              background: l.status === 'approved' ? 'rgba(34,197,94,0.1)' : l.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
                              color: l.status === 'approved' ? '#22c55e' : l.status === 'rejected' ? '#ef4444' : 'var(--text-muted)' }}>
                              HR
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setSelectedLeave(l); setDetailOpen(true); }} className="btn btn-ghost"
                              style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--surface-2)', color: 'var(--text-muted)' }} title="View Details">
                              <Eye size={14} />
                            </button>
                            {isManager && l.status === 'pending' && (
                              <>
                                <button onClick={() => confirmAction(l, 'manager_approved')} className="btn btn-ghost"
                                  style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--surface-2)', color: '#0ea5e9' }} title="Manager Approve">
                                  <CheckCircle size={14} />
                                </button>
                                <button onClick={() => confirmAction(l, 'manager_rejected')} className="btn btn-ghost"
                                  style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--surface-2)', color: '#ef4444' }} title="Manager Reject">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                            {isHR && (l.status === 'pending' || l.status === 'manager_approved') && (
                              <>
                                <button onClick={() => confirmAction(l, 'approved')} className="btn btn-ghost"
                                  style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--surface-2)', color: '#22c55e' }} title="HR Approve (Finalize)">
                                  <CheckCircle size={14} />
                                </button>
                                <button onClick={() => confirmAction(l, 'rejected')} className="btn btn-ghost"
                                  style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--surface-2)', color: '#ef4444' }} title="HR Reject (Finalize)">
                                  <XCircle size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {page} of {lastPage}</span>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} disabled={page === lastPage} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ TAB: BALANCES ═══════════════════════ */}
      {tab === 'balances' && (
        <>
          <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input className="form-control" placeholder="Search employee or department…" value={balanceSearch}
                onChange={e => setBalanceSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0.25rem 0', flex: 1 }} />
            </div>
          </div>

          {balancesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 style={{ animation: 'spin 1s linear infinite' }} size={24} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredBalances.map(emp => (
                <div key={emp.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{emp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{emp.designation} · {emp.department}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Joined: {fmtDate(emp.joined_date)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                    {emp.balances?.map(b => {
                      const pct = b.total > 0 ? Math.min(100, (b.used / b.total) * 100) : 0;
                      const barColor = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#22c55e';
                      return (
                        <div key={b.key} style={{ background: '#ffffff', border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: LEAVE_TYPE_COLORS[b.key] || '#9ca3af' }}>{b.type}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.used}/{b.total} {b.unit}</span>
                          </div>
                          <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.72rem', marginTop: '0.3rem', color: barColor, fontWeight: 700 }}>
                            {b.remaining} left
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filteredBalances.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No employees found.</div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ CONFIRM MODAL ═══════════════════════ */}
      {modalOpen && selectedLeave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: actionStatus.includes('reject') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: actionStatus.includes('reject') ? '#ef4444' : '#22c55e', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                {actionStatus.includes('reject') ? <XCircle size={20} /> : <CheckCircle size={20} />}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Confirm {formatActionName(actionStatus)}</h3>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee</span>
                <span style={{ fontWeight: 600 }}>{selectedLeave.employee?.full_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Type</span>
                <TypeBadge type={selectedLeave.leave_type} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Duration</span>
                <span style={{ fontWeight: 600 }}>{fmtDate(selectedLeave.start_date)} → {fmtDate(selectedLeave.end_date)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
              <textarea className="form-control" rows={3} placeholder="Add remarks for the employee…" value={actionNotes} onChange={e => setActionNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setModalOpen(false)} disabled={isProcessing}>Cancel</button>
              <button className="btn btn-primary" style={{ background: actionStatus.includes('reject') ? '#ef4444' : '#22c55e', borderColor: actionStatus.includes('reject') ? '#ef4444' : '#22c55e' }} onClick={handleStatusUpdate} disabled={isProcessing}>
                {isProcessing ? 'Saving…' : formatActionName(actionStatus)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ DETAIL MODAL ═══════════════════════ */}
      {detailOpen && selectedLeave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', borderRadius: 'var(--radius-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Leave Request Details</h3>
              <button onClick={() => setDetailOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>✕</button>
            </div>

            {/* Employee Info */}
            <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{selectedLeave.employee?.full_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedLeave.employee?.designation?.name} · {selectedLeave.employee?.department?.name}</div>
            </div>

            {/* Leave Details Grid */}
            {[
              ['Leave Type', <TypeBadge type={selectedLeave.leave_type} />],
              ['Status', <Badge status={selectedLeave.status} />],
              ['Start Date', fmtDate(selectedLeave.start_date)],
              ['End Date', fmtDate(selectedLeave.end_date)],
              ['Duration', selectedLeave.leave_type === 'short' ? `${selectedLeave.hours_count} hour(s)` : `${selectedLeave.days_count} working day(s)`],
              ['Submitted', selectedLeave.created_at ? new Date(selectedLeave.created_at).toLocaleDateString() : '-'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-2)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right' }}>{val}</span>
              </div>
            ))}

            {selectedLeave.reason && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason</div>
                <div style={{ fontSize: '0.875rem' }}>{selectedLeave.reason}</div>
              </div>
            )}

            {/* Approval trail */}
            {(selectedLeave.manager_notes || selectedLeave.hr_notes) && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approval Notes</div>
                {selectedLeave.manager_notes && (
                  <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(14,165,233,0.08)', borderLeft: '3px solid #0ea5e9', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', marginBottom: '0.5rem', fontSize: '0.825rem' }}>
                    <span style={{ fontWeight: 600, color: '#0ea5e9' }}>Manager: </span>{selectedLeave.manager_notes}
                  </div>
                )}
                {selectedLeave.hr_notes && (
                  <div style={{ padding: '0.6rem 0.9rem', background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', fontSize: '0.825rem' }}>
                    <span style={{ fontWeight: 600, color: '#22c55e' }}>HR: </span>{selectedLeave.hr_notes}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setDetailOpen(false)}>Close</button>
              {isManager && selectedLeave.status === 'pending' && (
                <>
                  <button className="btn btn-ghost" style={{ color: '#0ea5e9', border: '1px solid var(--surface-2)' }} onClick={() => { setDetailOpen(false); confirmAction(selectedLeave, 'manager_approved'); }}>Mgr Approve</button>
                  <button className="btn btn-ghost" style={{ color: '#ef4444', border: '1px solid var(--surface-2)' }} onClick={() => { setDetailOpen(false); confirmAction(selectedLeave, 'manager_rejected'); }}>Mgr Reject</button>
                </>
              )}
              {isHR && (selectedLeave.status === 'pending' || selectedLeave.status === 'manager_approved') && (
                <>
                  <button className="btn btn-primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} onClick={() => { setDetailOpen(false); confirmAction(selectedLeave, 'approved'); }}>HR Approve</button>
                  <button className="btn btn-ghost" style={{ color: '#ef4444', border: '1px solid var(--surface-2)' }} onClick={() => { setDetailOpen(false); confirmAction(selectedLeave, 'rejected'); }}>Reject</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
