import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

// Status display: P / A / L / H / WFH
const STATUS_CELL = {
  present:  { label: 'P',   color: '#fff',    bg: '#22c55e',           title: 'Present' },
  late:     { label: 'L',   color: '#fff',    bg: '#f59e0b',           title: 'Late' },
  absent:   { label: 'A',   color: '#fff',    bg: '#ef4444',           title: 'Absent' },
  half_day: { label: 'H',   color: '#fff',    bg: '#8b5cf6',           title: 'Half Day' },
  wfh:      { label: 'WFH', color: '#fff',    bg: '#0ea5e9',           title: 'Work From Home' },
  weekend:  { label: '—',   color: '#6b7280', bg: 'var(--surface-2)', title: 'Weekend' },
  holiday:  { label: 'PH',  color: '#fff',    bg: '#ec4899',           title: 'Holiday / Poya' },
};

const isWeekend = (dateStr) => {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const AttendanceCalendar = () => {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({}); // { empId: { 'YYYY-MM-DD': status } }
  const [loading, setLoading] = useState(true);

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { department_id: deptFilter || undefined };

      // Fetch all employees
      const empRes = await api.get('/hr/employees', { params });
      setEmployees(empRes.data);

      // Fetch attendance map for the whole month in one request!
      const mapRes = await api.get('/hr/attendance/calendar', { params: { month: monthStr, ...params } });
      
      setAttendanceMap(mapRes.data || {});
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [year, month, deptFilter, monthStr]);

  useEffect(() => { api.get('/hr/departments').then(r => setDepartments(r.data)); }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const days = getDaysInMonth(year, month);
  const dayNums = Array.from({ length: days }, (_, i) => i + 1);

  // Summary per employee
  const getSummary = (empId) => {
    const rec = attendanceMap[empId] || {};
    const counts = { present: 0, late: 0, absent: 0, half_day: 0, wfh: 0 };
    Object.values(rec).forEach(s => { if (counts[s] !== undefined) counts[s]++; });
    return counts;
  };

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/solar/hr/admin/attendance')} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Monthly Calendar</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Attendance overview — P / A / L / H / WFH</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.4rem 0.75rem' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.1rem' }}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: 600, minWidth: '120px', textAlign: 'center', fontSize: '0.95rem' }}>{monthNames[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '0.1rem' }}><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {Object.entries(STATUS_CELL).filter(([k]) => k !== 'weekend' && k !== 'holiday').map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: v.color }}>{v.label}</div>
            {v.title}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#6b7280' }}>—</div>
          Weekend
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Building calendar...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '900px' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)', position: 'sticky', left: 0, zIndex: 2, minWidth: '160px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>EMPLOYEE</th>
                {dayNums.map(d => {
                  const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                  const weekend = isWeekend(dateStr);
                  const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(dateStr).getDay()];
                  return (
                    <th key={d} style={{ padding: '0.4rem 0.3rem', textAlign: 'center', background: weekend ? 'rgba(107,114,128,0.07)' : 'var(--surface)', borderBottom: '1px solid var(--surface-2)', minWidth: '34px', color: weekend ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: '0.65rem' }}>
                      <div>{d}</div>
                      <div style={{ opacity: 0.6 }}>{dow}</div>
                    </th>
                  );
                })}
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)', fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '60px' }}>P</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)', fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '60px' }}>L</th>
                <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)', fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: '60px' }}>A</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const summary = getSummary(emp.id);
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '0.5rem 1rem', background: 'var(--card)', position: 'sticky', left: 0, zIndex: 1, borderRight: '1px solid var(--surface-2)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{emp.full_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                    </td>
                    {dayNums.map(d => {
                      const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
                      const weekend = isWeekend(dateStr);
                      const todayStr = new Date().toISOString().split('T')[0];
                      let status = attendanceMap[emp.id]?.[dateStr];
                      
                      if (weekend) {
                        status = 'weekend';
                      } else if (!status && dateStr <= todayStr) {
                        status = 'absent';
                      }
                      const cell = STATUS_CELL[status] || { label: '', bg: 'transparent', color: 'transparent' };
                      return (
                        <td key={d} style={{ padding: '0.3rem', textAlign: 'center', background: weekend ? 'rgba(107,114,128,0.05)' : 'transparent' }}>
                          {status && (
                            <div title={cell.title} style={{ width: '26px', height: '26px', borderRadius: '4px', background: cell.bg, color: cell.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, margin: '0 auto' }}>
                              {cell.label}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#22c55e', padding: '0.5rem 0.75rem' }}>{summary.present + summary.late + summary.wfh}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#f59e0b', padding: '0.5rem 0.75rem' }}>{summary.late}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#ef4444', padding: '0.5rem 0.75rem' }}>{summary.absent}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
