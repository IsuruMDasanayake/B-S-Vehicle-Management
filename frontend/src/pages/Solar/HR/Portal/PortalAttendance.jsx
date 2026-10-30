import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_CELL = {
  present:  { label: 'P',   color: '#fff', bg: '#22c55e',           title: 'Present' },
  late:     { label: 'L',   color: '#fff', bg: '#f59e0b',           title: 'Late' },
  missing:  { label: 'M',   color: '#fff', bg: '#e11d48',           title: 'Missing Attendance' },
  absent:   { label: 'A',   color: '#fff', bg: '#ef4444',           title: 'Absent' },
  half_day: { label: 'H',   color: '#fff', bg: '#8b5cf6',           title: 'Half Day' },
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
      await api.post(`/hr/attendance/${selectedReg.id}/regularize`, regForm);
      toast.success('Clock-out adjustment submitted for HR approval');
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'present', label: 'Present', color: '#22c55e' },
          { key: 'late',    label: 'Late',    color: '#f59e0b' },
          { key: 'missing', label: 'Missing', color: '#e11d48' },
          { key: 'absent',  label: 'Absent',  color: '#ef4444' },
          { key: 'half_day',label: 'Half Day',color: '#8b5cf6' },
          { key: 'leave',   label: 'Leave',   color: '#3b82f6' },
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
                  {regSubmitting ? 'Submitting...' : 'Submit to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalAttendance;
