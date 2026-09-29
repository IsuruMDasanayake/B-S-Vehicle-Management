import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Edit2, Plus, MapPin, Download, Calendar, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  present:  { label: 'Present',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  late:     { label: 'Late',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  absent:   { label: 'Absent',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  half_day: { label: 'Half Day',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  wfh:      { label: 'WFH',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || { label: status || 'Absent', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

const AttendanceList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deptFilter, setDeptFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ clock_in_time: '', clock_out_time: '', status: 'present', notes: '' });
  const [saving, setSaving] = useState(false);
  // New manual add state
  const [addItem, setAddItem] = useState(null);
  const [addForm, setAddForm] = useState({ clock_in_time: '', clock_out_time: '', status: 'present', notes: '' });

  const fetchDepts = useCallback(async () => {
    const res = await api.get('/hr/departments');
    setDepartments(res.data);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const params = { date };
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/hr/attendance', { params });
      setEmployees(res.data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, deptFilter]);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);
  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  // Summary stats
  const totals = employees.reduce((acc, emp) => {
    const status = emp.attendances?.[0]?.status || 'absent';
    acc[status] = (acc[status] || 0) + 1;
    acc.total++;
    return acc;
  }, { total: 0, present: 0, late: 0, absent: 0, half_day: 0, wfh: 0 });

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
    
    // Convert local time to UTC for the backend
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
    
    // Convert local time to UTC for the backend
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading attendance records...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Daily Attendance</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Shift: 9:00 AM – 5:30 PM · Grace until 10:00 AM</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }} />
            <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '0.5rem', width: 'auto', minWidth: '160px' }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <button onClick={handleRefresh} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', padding: '0.5rem', display: 'flex' }}>
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
      </div>

      {/* Summary bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'total',    label: 'Total',    val: totals.total,    color: '#3b82f6',  bg: 'rgba(59,130,246,0.1)' },
          { key: 'present',  label: 'Present',  val: totals.present,  color: '#22c55e',  bg: 'rgba(34,197,94,0.1)' },
          { key: 'late',     label: 'Late',     val: totals.late,     color: '#f59e0b',  bg: 'rgba(245,158,11,0.1)' },
          { key: 'absent',   label: 'Absent',   val: totals.absent,   color: '#ef4444',  bg: 'rgba(239,68,68,0.1)' },
          { key: 'wfh',      label: 'WFH',      val: totals.wfh,      color: '#0ea5e9',  bg: 'rgba(14,165,233,0.1)' },
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
                    {att?.clock_out_time ? new Date(att.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    {att?.early_departure ? <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>EARLY</span> : null}
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
                      {att ? (
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
