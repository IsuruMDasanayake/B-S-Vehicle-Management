import { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  present:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Present' },
  late:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Late' },
  absent:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Absent' },
  half_day: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Half Day' },
  wfh:      { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', label: 'WFH' },
};

const formatTime = (isoStr) => {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const formatHours = (decimal) => {
  if (!decimal) return null;
  const h = Math.floor(decimal);
  const m = Math.round((decimal - h) * 60);
  return `${h}h ${m}m`;
};

const PortalHome = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [today, setToday] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, todayRes, histRes] = await Promise.all([
        api.get('/hr/employees/me'),
        api.get('/hr/attendance/today'),
        api.get('/hr/attendance/my-history'),
      ]);
      setEmployee(empRes.data);
      setToday(todayRes.data);

      // Calculate month stats
      const records = histRes.data || [];
      const stats = records.reduce((a, r) => {
        if (r.status === 'present' || r.status === 'late' || r.status === 'wfh') a.present++;
        if (r.status === 'absent') a.absent++;
        if (r.status === 'late') a.late++;
        if (r.status === 'half_day') a.halfDay++;
        return a;
      }, { present: 0, absent: 0, late: 0, halfDay: 0 });
      setMonthStats(stats);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getGPS = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      return data.display_name || null;
    } catch { return null; }
  };

  const handleClockIn = async () => {
    setClocking(true);
    toast.loading('Getting your location...');
    try {
      const gps = await getGPS();
      if (!gps) {
        toast.dismiss();
        toast.error('Location access is required to clock in. Please enable GPS.');
        setClocking(false);
        return;
      }
      
      const address = await reverseGeocode(gps.lat, gps.lng);
      const payload = { latitude: gps.lat, longitude: gps.lng, address };
      toast.dismiss();
      const res = await api.post('/hr/attendance/clock-in', payload);
      toast.success(res.data.message);
      await fetchData();
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Clock-in failed');
    } finally { setClocking(false); }
  };

  const handleClockOut = async () => {
    setClocking(true);
    toast.loading('Getting your location...');
    try {
      const gps = await getGPS();
      if (!gps) {
        toast.dismiss();
        toast.error('Location access is required to clock out. Please enable GPS.');
        setClocking(false);
        return;
      }
      
      const address = await reverseGeocode(gps.lat, gps.lng);
      const payload = { latitude: gps.lat, longitude: gps.lng, address };
      toast.dismiss();
      const res = await api.post('/hr/attendance/clock-out', payload);
      toast.success(res.data.message);
      await fetchData();
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Clock-out failed');
    } finally { setClocking(false); }
  };

  const hasClockIn  = !!today?.clock_in_time;
  const hasClockOut = !!today?.clock_out_time;
  const canClockIn  = !hasClockIn;
  const canClockOut = hasClockIn && !hasClockOut;

  const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>{dateStr}</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Hello, {employee?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{employee?.designation?.name} · {employee?.employee_id}</p>
      </div>

      {/* Live clock */}
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Current Time</div>
        <div style={{ color: '#fff', fontSize: '3rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>
          {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
          Shift: 9:00 AM – 5:30 PM · Grace until 9:10 AM
        </div>
      </div>

      {/* Today status */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Today's Attendance</span>
          {today?.status && (
            <span style={{
              padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              background: STATUS_COLORS[today.status]?.bg, color: STATUS_COLORS[today.status]?.color,
            }}>
              {STATUS_COLORS[today.status]?.label}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>CLOCK IN</div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: hasClockIn ? '#22c55e' : 'var(--text-muted)' }}>
              {hasClockIn ? formatTime(today.clock_in_time) : '—'}
            </div>
            {today?.clock_in_address && (
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                <MapPin size={10} />{today.clock_in_address.split(',').slice(0, 2).join(', ')}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>CLOCK OUT</div>
            <div style={{ fontWeight: 700, fontSize: '1.25rem', color: hasClockOut ? '#f59e0b' : 'var(--text-muted)' }}>
              {hasClockOut ? formatTime(today.clock_out_time) : '—'}
            </div>
            {hasClockOut && today?.working_hours && (
              <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: '0.25rem', fontWeight: 600 }}>
                {formatHours(today.working_hours)} worked
              </div>
            )}
          </div>
        </div>

        {/* Clock In/Out Button */}
        {canClockIn && (
          <button
            onClick={handleClockIn}
            disabled={clocking}
            style={{
              width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', cursor: clocking ? 'not-allowed' : 'pointer',
              color: '#fff', fontWeight: 700, fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(34,197,94,0.4)',
              transition: 'opacity 0.2s', opacity: clocking ? 0.7 : 1,
            }}
          >
            {clocking ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Clock size={20} />}
            {clocking ? 'Locating...' : 'Clock In'}
          </button>
        )}
        {canClockOut && (
          <button
            onClick={handleClockOut}
            disabled={clocking}
            style={{
              width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none', cursor: clocking ? 'not-allowed' : 'pointer',
              color: '#fff', fontWeight: 700, fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: '0 4px 15px rgba(245,158,11,0.4)',
              transition: 'opacity 0.2s', opacity: clocking ? 0.7 : 1,
            }}
          >
            {clocking ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={20} />}
            {clocking ? 'Locating...' : 'Clock Out'}
          </button>
        )}
        {hasClockIn && hasClockOut && (
          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', color: '#16a34a', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={16} /> Attendance complete for today
          </div>
        )}
      </div>

      {/* Month stats */}
      {monthStats && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{month}</span>
            <button
              onClick={() => navigate('/solar/hr/portal/attendance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Present', val: monthStats.present, color: '#22c55e' },
              { label: 'Absent',  val: monthStats.absent,  color: '#ef4444' },
              { label: 'Late',    val: monthStats.late,    color: '#f59e0b' },
              { label: 'Half',    val: monthStats.halfDay, color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.6rem 0.3rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/solar/hr/portal/leaves')}
          className="card"
          style={{ flex: 1, padding: '1rem', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>Apply Leave</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Submit request</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/solar/hr/portal/announcements')}
          className="card"
          style={{ flex: 1, padding: '1rem', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
            <AlertCircle size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>Announcements</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Company updates</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default PortalHome;
