import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Edit2, Plus, MapPin, Calendar, BarChart2,
  CheckCircle, XCircle, Clock, AlertTriangle, Check, X, Loader2, FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../../store/authStore';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';
import PayrollReportPanel from './PayrollReportPanel';

const STATUS_MAP = {
  present:  { label: 'Present',            color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  late:     { label: 'Late',               color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  missing:  { label: 'Missing Attendance', color: '#e11d48', bg: 'rgba(225,29,72,0.12)' },
  absent:   { label: 'Absent',             color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  half_day: { label: 'Half Day',           color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  leave:    { label: 'Leave',              color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
};

const StatusBadge = ({ status }) => {
  if (status === 'leave') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
        <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: '#3b82f6', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', fontWeight: 800 }}>LV</span>
        Leave
      </span>
    );
  }
  const s = STATUS_MAP[status] || { label: status || 'Absent', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const AttendanceList = () => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  const isHR = isSuperAdmin || user?.role === 'solar_hr_admin' || user?.roles?.includes('solar_hr_admin');
  const isManager = isSuperAdmin || isLeaveApprovalManager(user);

  // Active view tab: 'daily' | 'adjustments'
  const [viewTab, setViewTab] = useState('daily');

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ clock_in_time: '', clock_out_time: '', status: 'present', notes: '' });
  const [saving, setSaving] = useState(false);

  // Manual add state
  const [addItem, setAddItem] = useState(null);
  const [addForm, setAddForm] = useState({ clock_in_time: '', clock_out_time: '', status: 'present', notes: '' });

  // Clock-out adjustments state
  const [regularizations, setRegularizations] = useState([]);
  const [pendingRegCount, setPendingRegCount] = useState(0);
  const [mgrApprovedRegCount, setMgrApprovedRegCount] = useState(0);
  const [approvedRegCount, setApprovedRegCount] = useState(0);
  const [regFilter, setRegFilter] = useState('pending'); // 'pending' | 'manager_approved' | 'approved' | 'rejected' | 'all'
  const [regModal, setRegModal] = useState({ open: false, item: null, action: 'manager_approved', notes: '' });
  const [regProcessing, setRegProcessing] = useState(false);

  const fetchDepts = useCallback(async () => {
    const res = await api.get('/hr/departments');
    setDepartments(res.data);
  }, []);

  const fetchRegularizations = useCallback(async () => {
    try {
      const res = await api.get('/hr/attendance/regularizations', { params: { status: regFilter } });
      setRegularizations(res.data.data || []);
      setPendingRegCount(res.data.pending_count || 0);
      setMgrApprovedRegCount(res.data.manager_approved_count || 0);
      setApprovedRegCount(res.data.approved_count || 0);
    } catch {
      // silent
    }
  }, [regFilter]);

  const fetchData = useCallback(async () => {
    try {
      const params = { date };
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/hr/attendance', { params });
      setEmployees(res.data);
      await fetchRegularizations();
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, deptFilter, fetchRegularizations]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Summary stats
  const totals = employees.reduce((acc, emp) => {
    const status = emp.attendances?.[0]?.status || 'absent';
    acc[status] = (acc[status] || 0) + 1;
    acc.total++;
    return acc;
  }, { total: 0, present: 0, late: 0, missing: 0, absent: 0, half_day: 0, leave: 0 });

  const toLocalISO = (utcStr) => {
    if (!utcStr) return '';
    const d = new Date(utcStr);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const formatHours = (decimal) => {
    if (!decimal) return '—';
    const num = parseFloat(decimal);
    const h = Math.floor(num);
    const m = Math.round((num - h) * 60);
    return `${h}h ${m > 0 ? m + 'm' : '00m'}`;
  };

  const openEdit = (emp) => {
    const att = emp.attendances?.[0];
    setEditItem({ attendance_id: att?.id, full_name: emp.full_name });
    setEditForm({
      clock_in_time: toLocalISO(att?.clock_in_time),
      clock_out_time: toLocalISO(att?.clock_out_time),
      status: att?.status || 'absent',
      notes: att?.notes || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editItem.attendance_id) { toast.error('No attendance record to correct — use "Add" instead.'); return; }
    setSaving(true);
    
    const payload = {
      ...editForm,
      clock_in_time: editForm.clock_in_time ? new Date(editForm.clock_in_time).toISOString() : null,
      clock_out_time: editForm.clock_out_time ? new Date(editForm.clock_out_time).toISOString() : null,
    };
    
    try {
      await api.patch(`/hr/attendance/${editItem.attendance_id}`, payload);
      toast.success('Attendance corrected');
      setEditItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const openAdd = (emp) => {
    setAddItem({ employee_id: emp.id, full_name: emp.full_name });
    setAddForm({ clock_in_time: `${date}T09:00`, clock_out_time: `${date}T17:30`, status: 'present', notes: '' });
  };

  const handleAddSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = {
      ...addForm,
      employee_id: addItem.employee_id,
      date,
      clock_in_time: addForm.clock_in_time ? new Date(addForm.clock_in_time).toISOString() : null,
      clock_out_time: addForm.clock_out_time ? new Date(addForm.clock_out_time).toISOString() : null,
    };
    
    try {
      await api.post('/hr/attendance', payload);
      toast.success('Attendance record created');
      setAddItem(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create record');
    } finally { setSaving(false); }
  };

  const openRegModal = (item, action) => {
    setRegModal({ open: true, item, action, notes: '' });
  };

  const handleRegActionSubmit = async (e) => {
    e.preventDefault();
    if (!regModal.item) return;
    setRegProcessing(true);
    try {
      const res = await api.patch(`/hr/attendance/regularizations/${regModal.item.id}`, {
        status: regModal.action,
        notes: regModal.notes,
        admin_notes: regModal.notes,
      });
      const actionLabels = {
        manager_approved: 'approved by Manager and forwarded to HR',
        manager_rejected: 'rejected by Manager',
        approved: 'officially approved by HR',
        rejected: 'rejected by HR',
      };
      toast.success(res.data?.message || `Clock-out adjustment ${actionLabels[regModal.action] || 'processed'}`);
      setRegModal({ open: false, item: null, action: 'manager_approved', notes: '' });
      await fetchData();
      window.dispatchEvent(new Event('hr-attendance-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process adjustment');
    } finally {
      setRegProcessing(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading attendance records...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.2rem' }}>Attendance Management</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0, fontSize: '0.85rem' }}>
            Shift: 9:00 AM – 5:30 PM · Grace until 09:10 AM · Unclosed shifts remain blank and marked as Missing Attendance
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
          <button onClick={handleRefresh} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', padding: '0.5rem', display: 'flex' }} title="Refresh">
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button onClick={() => navigate('/solar/hr/admin/attendance/calendar')} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <Calendar size={15} /> Calendar
          </button>
          <button onClick={() => navigate('/solar/hr/admin/attendance/report')} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <BarChart2 size={15} /> Report
          </button>
          <button onClick={() => navigate('/solar/hr/admin/locations')} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <MapPin size={15} /> Locations
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setViewTab('daily')}
          style={{
            background: viewTab === 'daily' ? 'var(--primary, #3b82f6)' : 'transparent',
            color: viewTab === 'daily' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '0.45rem 1rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          Daily Attendance
        </button>
        <button
          onClick={() => setViewTab('adjustments')}
          style={{
            background: viewTab === 'adjustments' ? 'var(--primary, #3b82f6)' : 'transparent',
            color: viewTab === 'adjustments' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '0.45rem 1rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          Clock-Out Adjustments
          {(pendingRegCount + mgrApprovedRegCount) > 0 && (
            <span
              style={{
                background: viewTab === 'adjustments' ? '#fff' : '#ef4444',
                color: viewTab === 'adjustments' ? '#3b82f6' : '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: '999px',
              }}
              title={`${pendingRegCount} pending manager review, ${mgrApprovedRegCount} awaiting HR final approval`}
            >
              {pendingRegCount + mgrApprovedRegCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setViewTab('reports')}
          style={{
            background: viewTab === 'reports' ? 'var(--primary, #3b82f6)' : 'transparent',
            color: viewTab === 'reports' ? '#fff' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '6px',
            padding: '0.45rem 1rem',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <FileSpreadsheet size={15} />
          Payroll &amp; Attendance Reports
        </button>
      </div>

      {/* ── View 1: Daily Attendance ────────────────────────────────────────── */}
      {viewTab === 'daily' && (
        <>
          {/* Filters & Summary Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
              <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.45rem 0.6rem', width: 'auto' }} />
              <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '0.45rem 0.6rem', width: 'auto', minWidth: '160px' }}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {/* Pending adjustments notice if any */}
            {pendingRegCount > 0 && (
              <div
                onClick={() => setViewTab('adjustments')}
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#d97706',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Clock size={14} /> {pendingRegCount} clock-out adjustment request(s) pending review
              </div>
            )}
          </div>

          {/* Summary bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { key: 'total',    label: 'Total',    val: totals.total,    color: '#3b82f6',  bg: 'rgba(59,130,246,0.1)' },
              { key: 'present',  label: 'Present',  val: totals.present,  color: '#22c55e',  bg: 'rgba(34,197,94,0.1)' },
              { key: 'late',     label: 'Late',     val: totals.late,     color: '#f59e0b',  bg: 'rgba(245,158,11,0.1)' },
              { key: 'missing',  label: 'Missing',  val: totals.missing,  color: '#e11d48',  bg: 'rgba(225,29,72,0.12)' },
              { key: 'leave',    label: 'Leave (LV)', val: totals.leave,  color: '#3b82f6',  bg: 'rgba(59,130,246,0.12)' },
              { key: 'absent',   label: 'Absent',   val: totals.absent,   color: '#ef4444',  bg: 'rgba(239,68,68,0.1)' },
              { key: 'half_day', label: 'Half Day', val: totals.half_day, color: '#8b5cf6',  bg: 'rgba(139,92,246,0.1)' },
            ].map(s => (
              <div key={s.key} className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '100px', flex: '1 1 100px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontWeight: 700, fontSize: '1rem' }}>{s.val}</div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                  {['EMPLOYEE', 'DEPARTMENT', 'CLOCK IN', 'CLOCK OUT', 'HOURS', 'LOCATION', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No employees found.</td></tr>
                ) : employees.map(emp => {
                  const att = emp.attendances?.[0];
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{emp.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem' }}>{emp.department?.name || '—'}</td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: att?.clock_in_time ? 500 : 400, color: att?.clock_in_time ? 'inherit' : 'var(--text-muted)' }}>
                        {att?.clock_in_time ? new Date(att.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem' }}>
                        {att?.clock_out_time ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{new Date(att.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            {att.early_departure ? (
                              <span style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 600 }}>EARLY</span>
                            ) : null}
                          </div>
                        ) : (att?.status === 'missing' || att?.is_auto_clock_out) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                background: 'rgba(225,29,72,0.12)',
                                color: '#e11d48',
                                fontWeight: 700,
                              }}
                              title="Employee forgot to clock out — Clock-out is blank (Missing Attendance)"
                            >
                              MISSING
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        {formatHours(att?.working_hours)}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {att?.clock_in_location?.name || '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <StatusBadge status={att?.status} />
                        {att?.is_manual_override && <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', color: '#6b7280', fontStyle: 'italic' }}>edited</span>}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          {att?.id ? (
                            <button onClick={() => openEdit(emp)} title="Correct" style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                              <Edit2 size={14} />
                            </button>
                          ) : (
                            <button onClick={() => openAdd(emp)} title="Add manual record" style={{ background: 'rgba(59,130,246,0.1)', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── View 2: Clock-Out Adjustments (Regularizations) ───────────────── */}
      {viewTab === 'adjustments' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Clock-Out Adjustment Requests
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                Review and approve actual departure times for employees who forgot to clock out.
              </p>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { key: 'pending', label: `Pending Manager (${pendingRegCount})` },
                { key: 'manager_approved', label: `Awaiting HR (${mgrApprovedRegCount})` },
                { key: 'approved', label: `Approved (${approvedRegCount})` },
                { key: 'rejected', label: 'Rejected' },
                { key: 'all', label: 'All' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setRegFilter(f.key)}
                  style={{
                    background: regFilter === f.key ? 'var(--primary, #3b82f6)' : 'var(--surface-2)',
                    color: regFilter === f.key ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                  {['EMPLOYEE', 'SHIFT DATE', 'RECORDED IN', 'RECORDED OUT', 'REQUESTED OUT', 'REASON', 'APPROVAL WORKFLOW', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regularizations.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No adjustment requests found for this filter.
                    </td>
                  </tr>
                ) : regularizations.map(item => {
                  const att = item.attendance;
                  const emp = item.employee;
                  const isPending = item.status === 'pending';
                  const isManagerApproved = item.status === 'manager_approved';
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected' || item.status === 'manager_rejected';

                  // Is current user the line manager for this employee?
                  const isDirectLineManager = Boolean(user?.id && emp?.manager?.user_id === user.id);
                  const canManagerReview = isSuperAdmin || isManager || isDirectLineManager;

                  const shiftDate = att?.date ? new Date(att.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                  const clockIn = att?.clock_in_time ? new Date(att.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
                  const recordedOut = att?.clock_out_time ? new Date(att.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '— (Blank / Missing)';
                  const requestedOut = item.requested_clock_out_time ? new Date(item.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

                  const mgrReviewerName = item.manager_reviewer?.name || (item.manager_approved_by ? 'Manager' : null);
                  const hrReviewerName = item.reviewer?.name || (item.reviewed_by ? 'HR Admin' : null);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{emp?.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp?.department?.name || emp?.employee_id}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', fontWeight: 500 }}>
                        {shiftDate}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem' }}>
                        {clockIn}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#d97706' }}>
                        {recordedOut}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 700, color: '#2563eb' }}>
                        {requestedOut}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '220px' }}>
                        <div style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{item.reason}</div>
                        {item.manager_notes && (
                          <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            Mgr Note: {item.manager_notes}
                          </div>
                        )}
                        {item.admin_notes && (
                          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.2rem', fontStyle: 'italic' }}>
                            HR Note: {item.admin_notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {/* Step 1: Line Manager / GM / Project Director */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: '55px' }}>Manager:</span>
                            {item.status === 'pending' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                                Pending Review
                              </span>
                            ) : item.status === 'manager_rejected' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                                Rejected {mgrReviewerName ? `by ${mgrReviewerName}` : ''}
                              </span>
                            ) : (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(14,165,233,0.12)', color: '#0284c7' }}>
                                Approved {mgrReviewerName ? `by ${mgrReviewerName}` : ''}
                              </span>
                            )}
                          </div>

                          {/* Step 2: HR Admin Sign-off */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: '55px' }}>HR Admin:</span>
                            {item.status === 'approved' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                                Approved {hrReviewerName ? `by ${hrReviewerName}` : ''}
                              </span>
                            ) : item.status === 'rejected' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#dc2626' }}>
                                Rejected {hrReviewerName ? `by ${hrReviewerName}` : ''}
                              </span>
                            ) : item.status === 'manager_approved' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
                                Awaiting HR Sign-off
                              </span>
                            ) : item.status === 'manager_rejected' ? (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                Skipped (Manager Rejected)
                              </span>
                            ) : (
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 600, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                Waiting for Manager
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {/* If pending manager review */}
                        {isPending && (
                          canManagerReview ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => openRegModal(item, 'manager_approved')}
                                style={{
                                  background: '#0284c7',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                                title="Approve as Manager (Forwards to HR)"
                              >
                                <Check size={12} /> Mgr Approve
                              </button>
                              <button
                                onClick={() => openRegModal(item, 'manager_rejected')}
                                style={{
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  borderRadius: '5px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                                title="Reject as Manager"
                              >
                                <X size={12} /> Mgr Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} /> Awaiting Manager
                            </span>
                          )
                        )}

                        {/* If manager approved, awaiting HR final sign-off */}
                        {isManagerApproved && (
                          isHR ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => openRegModal(item, 'approved')}
                                style={{
                                  background: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '5px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                                title="HR Final Approval (Applies departure time)"
                              >
                                <Check size={12} /> HR Approve
                              </button>
                              <button
                                onClick={() => openRegModal(item, 'rejected')}
                                style={{
                                  background: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  borderRadius: '5px',
                                  padding: '0.25rem 0.55rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                }}
                                title="HR Reject"
                              >
                                <X size={12} /> HR Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} /> Awaiting HR
                            </span>
                          )
                        )}

                        {/* If already finalized */}
                        {isApproved && (
                          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={13} /> Finalized
                          </span>
                        )}

                        {isRejected && (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <XCircle size={13} /> Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── View 3: Payroll & Attendance Reports ── */}
      {viewTab === 'reports' && (
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          <PayrollReportPanel
            initialScope="employee"
            title="Payroll Timesheets & Attendance Reports"
            subtitle="Download individual monthly employee timesheets with punches, late minutes, leaves, and payable days for payroll, or export company summary reports."
          />
        </div>
      )}

      {/* Regularization Action Modal */}
      {regModal.open && regModal.item && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', background: 'var(--white)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={20} color={regModal.action.includes('rejected') ? '#ef4444' : regModal.action.startsWith('manager_') ? '#0284c7' : '#16a34a'} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                {regModal.action === 'manager_approved' && 'Line Manager / Management Approval'}
                {regModal.action === 'manager_rejected' && 'Manager Rejection'}
                {regModal.action === 'approved' && 'HR Final Sign-Off & Approval'}
                {regModal.action === 'rejected' && 'HR Rejection'}
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
              {regModal.action.startsWith('manager_')
                ? 'Step 1 of 2: Line Manager / General Manager / Project Director verification.'
                : 'Step 2 of 2: Official HR sign-off. Approving will update the attendance log and working hours.'}
            </p>

            {/* Request Summary Box */}
            <div style={{ background: 'var(--surface)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem', lineHeight: 1.5, border: '1px solid var(--surface-2)' }}>
              <div><strong>Employee:</strong> {regModal.item.employee?.full_name} ({regModal.item.employee?.department?.name || 'Staff'})</div>
              <div><strong>Shift Date:</strong> {new Date(regModal.item.attendance?.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div><strong>Recorded Clock-In:</strong> {regModal.item.attendance?.clock_in_time ? new Date(regModal.item.attendance.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</div>
              <div><strong>Requested Clock-Out:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{new Date(regModal.item.requested_clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}><strong>Reason:</strong> {regModal.item.reason}</div>

              {/* If HR stage, show manager's prior approval */}
              {!regModal.action.startsWith('manager_') && regModal.item.manager_approved_by && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--surface-2)', color: '#0284c7' }}>
                  <strong>Manager Verified:</strong> {regModal.item.manager_reviewer?.name || 'Line Manager'}
                  {regModal.item.manager_notes && (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      "{regModal.item.manager_notes}"
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleRegActionSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  {regModal.action.startsWith('manager_') ? 'Manager Remarks (Optional)' : 'HR Remarks (Optional)'}
                </label>
                <textarea
                  rows={3}
                  className="form-control"
                  placeholder={
                    regModal.action === 'manager_approved'
                      ? 'e.g. Verified work on site until 8:30 PM...'
                      : regModal.action === 'manager_rejected'
                      ? 'e.g. Departure time does not match job completion...'
                      : regModal.action === 'approved'
                      ? 'e.g. Approved and timesheet updated.'
                      : 'e.g. Rejected as per policy...'
                  }
                  value={regModal.notes}
                  onChange={e => setRegModal(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--surface-2)' }}
                  onClick={() => setRegModal({ open: false, item: null, action: 'manager_approved', notes: '' })}
                  disabled={regProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: regModal.action.includes('rejected')
                      ? '#ef4444'
                      : regModal.action === 'manager_approved'
                      ? '#0284c7'
                      : '#16a34a',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                  }}
                  disabled={regProcessing}
                >
                  {regProcessing ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Loader2 size={14} className="animate-spin" /> Processing...
                    </span>
                  ) : (
                    regModal.action === 'manager_approved'
                      ? 'Confirm Manager Approval'
                      : regModal.action === 'manager_rejected'
                      ? 'Confirm Manager Rejection'
                      : regModal.action === 'approved'
                      ? 'Confirm HR Final Approval'
                      : 'Confirm HR Rejection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.4rem', fontSize: '1.1rem' }}>Correct Attendance</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{editItem.full_name} · {date}</p>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Clock In</label>
                  <input type="datetime-local" className="form-control" value={editForm.clock_in_time} onChange={e => setEditForm({ ...editForm, clock_in_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clock Out</label>
                  <input type="datetime-local" className="form-control" value={editForm.clock_out_time} onChange={e => setEditForm({ ...editForm, clock_out_time: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Status</label>
                <select className="form-control" value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Reason / Notes</label>
                <textarea className="form-control" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} placeholder="Reason for correction..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setEditItem(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add modal */}
      {addItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.4rem', fontSize: '1.1rem' }}>Add Attendance Record</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{addItem.full_name} · {date}</p>
            <form onSubmit={handleAddSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Clock In</label>
                  <input type="datetime-local" className="form-control" value={addForm.clock_in_time} onChange={e => setAddForm({ ...addForm, clock_in_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Clock Out</label>
                  <input type="datetime-local" className="form-control" value={addForm.clock_out_time} onChange={e => setAddForm({ ...addForm, clock_out_time: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Status</label>
                <select className="form-control" value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Notes</label>
                <textarea className="form-control" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} rows={2} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setAddItem(null)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} disabled={saving}>{saving ? 'Saving...' : 'Add Record'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceList;
