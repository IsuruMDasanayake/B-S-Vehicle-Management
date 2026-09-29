import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const AttendanceReport = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month };
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/hr/attendance/report', { params });
      setReport(res.data);
    } catch {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [month, deptFilter]);

  useEffect(() => { api.get('/hr/departments').then(r => setDepartments(r.data)); }, []);
  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Working Days', 'Present', 'Late', 'Half Day', 'WFH', 'Absent', 'Total Hours', 'Attendance %'];
    const rows = report.map(r => [
      r.employee_id, r.name, r.department,
      r.working_days, r.present, r.late, r.half_day, r.wfh, r.absent,
      r.total_working_hours, r.attendance_rate,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const getRateBg = (rate) => {
    if (rate >= 90) return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' };
    if (rate >= 75) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/solar/hr/admin/attendance')} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Monthly Report</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Attendance summary by employee</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input type="month" className="form-control" value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '0.5rem', width: 'auto' }} />
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '0.5rem', width: 'auto', minWidth: '160px' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={exportCSV} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }} disabled={report.length === 0}>
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {report.length > 0 && (() => {
        const totals = report.reduce((a, r) => ({
          present: a.present + r.present,
          late: a.late + r.late,
          absent: a.absent + r.absent,
          half_day: a.half_day + r.half_day,
          wfh: a.wfh + r.wfh,
          hours: a.hours + r.total_working_hours,
        }), { present: 0, late: 0, absent: 0, half_day: 0, wfh: 0, hours: 0 });
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Present',  val: totals.present,              color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
              { label: 'Late Arrivals',  val: totals.late,                 color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { label: 'Absent Days',    val: totals.absent,               color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              { label: 'Half Days',      val: totals.half_day,             color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
              { label: 'WFH Days',       val: totals.wfh,                  color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
              { label: 'Total Hours',    val: `${totals.hours.toFixed(0)}h`, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 130px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>{s.val}</div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
              {['EMPLOYEE', 'DEPARTMENT', 'WRKNG DAYS', 'PRESENT', 'LATE', 'HALF DAY', 'WFH', 'ABSENT', 'TOTAL HRS', 'ATTENDANCE %'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'EMPLOYEE' || h === 'DEPARTMENT' ? 'left' : 'center', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading report...</td></tr>
            ) : report.length === 0 ? (
              <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No data for this month.</td></tr>
            ) : report.map((r, i) => {
              const { color, bg } = getRateBg(r.attendance_rate);
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.employee_id}</div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>{r.department}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', color: 'var(--text-muted)' }}>{r.working_days}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 600, color: '#22c55e' }}>{r.present}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 600, color: '#f59e0b' }}>{r.late}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 600, color: '#8b5cf6' }}>{r.half_day}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 600, color: '#0ea5e9' }}>{r.wfh}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 600, color: '#ef4444' }}>{r.absent}</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem', fontWeight: 500 }}>{r.total_working_hours}h</td>
                  <td style={{ textAlign: 'center', padding: '0.875rem 1rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700, background: bg, color }}>{r.attendance_rate}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceReport;
