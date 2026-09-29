import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_CELL = {
  present:  { label: 'P',   color: '#fff', bg: '#22c55e',           title: 'Present' },
  late:     { label: 'L',   color: '#fff', bg: '#f59e0b',           title: 'Late' },
  absent:   { label: 'A',   color: '#fff', bg: '#ef4444',           title: 'Absent' },
  half_day: { label: 'H',   color: '#fff', bg: '#8b5cf6',           title: 'Half Day' },
  wfh:      { label: 'WFH', color: '#fff', bg: '#0ea5e9',           title: 'WFH' },
  leave:    { label: 'LV',  color: '#fff', bg: '#3b82f6',           title: 'Leave' },
  weekend:  { label: '—',   color: '#9ca3af', bg: 'var(--surface)', title: 'Weekend' },
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

const PortalAttendance = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const byDate = Object.fromEntries(records.map(r => {
    const d = typeof r.date === 'string' ? r.date.split('T')[0] : r.date;
    return [d, r];
  }));

  const todayStr = now.toISOString().split('T')[0];
  const days = getDays(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  // Stats
  const stats = records.reduce((a, r) => {
    if (r.status) a[r.status] = (a[r.status] || 0) + 1;
    return a;
  }, {});

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'present', label: 'Present', color: '#22c55e' },
          { key: 'late',    label: 'Late',    color: '#f59e0b' },
          { key: 'absent',  label: 'Absent',  color: '#ef4444' },
          { key: 'half_day',label: 'Half Day',color: '#8b5cf6' },
        ].map(s => (
          <div key={s.key} className="card" style={{ padding: '0.65rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{stats[s.key] || 0}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{s.label}</div>
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
        ) : [...records].reverse().slice(0, 10).map(r => {
          const s = STATUS_CELL[r.status] || STATUS_CELL.absent;
          return (
            <div key={r.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {r.clock_in_time ? new Date(r.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {' → '}
                  {r.clock_out_time ? new Date(r.clock_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  {r.working_hours ? ` · ${formatHours(r.working_hours)}` : ''}
                </div>
              </div>
              <div style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 700 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PortalAttendance;
