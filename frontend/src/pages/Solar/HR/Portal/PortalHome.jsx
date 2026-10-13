import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight,
  BellRing, BellOff, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  subscribeToPushNotifications,
  sendTestPushNotification,
} from '../../../../utils/pushNotifications';

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

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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
  
  // Location alert state
  const [locations, setLocations] = useState([]);
  const [zoneAlert, setZoneAlert] = useState({ loading: true, msg: 'Checking location...', color: 'var(--text-muted)', bg: 'var(--surface-2)' });

  // Missed clock-out & regularization state
  const [unclosedPast, setUnclosedPast] = useState([]);
  const [selectedReg, setSelectedReg] = useState(null);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({ requested_time: '17:30', reason: '' });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Push notifications state for employee device
  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    isSubscribed: false,
  });
  const [pushLoading, setPushLoading] = useState(false);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(
    () => localStorage.getItem('emp_push_banner_dismissed') === '1'
  );

  const checkPush = useCallback(async () => {
    try {
      const status = await getPushNotificationStatus();
      setPushStatus(status);
    } catch (e) {
      console.warn('Failed to query push status:', e);
    }
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [empRes, todayRes, histRes, locRes, unclosedRes] = await Promise.all([
        api.get('/hr/employees/me'),
        api.get('/hr/attendance/today'),
        api.get('/hr/attendance/my-history'),
        api.get('/hr/locations'),
        api.get('/hr/attendance/unclosed-past'),
      ]);
      setEmployee(empRes.data);
      setToday(todayRes.data);
      setLocations(locRes.data || []);
      const todayStr = new Date().toISOString().split('T')[0];
      const pastOnly = (unclosedRes.data || []).filter(r => {
        const rDate = r.date ? r.date.split('T')[0] : '';
        return rDate && rDate < todayStr;
      });
      setUnclosedPast(pastOnly);

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
      checkPush();
    }
  }, [checkPush]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEnablePush = async () => {
    setPushLoading(true);
    try {
      await subscribeToPushNotifications();
      await checkPush();
      // Automatically send one-time verification alert so the employee sees it works immediately
      try {
        await sendTestPushNotification();
        toast.success('Lock-screen alerts enabled! A test notification was sent to your phone.', { duration: 4500 });
      } catch {
        toast.success('Lock-screen alerts enabled! You will receive shift reminders at 5:30 PM.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to enable notifications.');
      await checkPush();
    } finally {
      setPushLoading(false);
    }
  };

  const handleOpenRegModal = (att) => {
    setSelectedReg(att);
    let defaultTime = '17:30';
    if (att.clock_out_time) {
      const d = new Date(att.clock_out_time);
      defaultTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    setRegForm({ requested_time: defaultTime, reason: '' });
    setRegModalOpen(true);
  };

  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReg) return;
    setRegSubmitting(true);
    try {
      const datePart = selectedReg.date.split('T')[0];
      const targetDateTime = `${datePart} ${regForm.requested_time}:00`;

      await api.post('/hr/attendance/regularize', {
        attendance_id: selectedReg.id,
        requested_clock_out_time: targetDateTime,
        reason: regForm.reason,
      });

      toast.success('Time adjustment request submitted to HR.');
      setRegModalOpen(false);
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit adjustment request.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const getGPS = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    
    // Attempt 1: High accuracy, 10s timeout, cache for 1 minute
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err1) => {
        if (err1.code === 1) { // PERMISSION_DENIED
          resolve(null);
          return;
        }
        console.warn('High accuracy GPS failed, falling back to low accuracy...', err1);
        // Attempt 2: Low accuracy (network/cell tower), 10s timeout, cache for 5 mins
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err2) => {
            console.error('Low accuracy GPS also failed:', err2);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      return data.display_name || null;
    } catch { return null; }
  };

  const hasClockIn  = !!today?.clock_in_time;
  const hasClockOut = !!today?.clock_out_time;
  const canClockIn  = !hasClockIn;
  const canClockOut = hasClockIn && !hasClockOut;
  const needsClocking = canClockIn || canClockOut;

  // Background GPS check for the alert banner
  useEffect(() => {
    if (!loading && needsClocking) {
      if (!locations || locations.length === 0) {
        setZoneAlert({ loading: false, msg: 'No active work zones configured.', color: 'var(--text-muted)', bg: 'var(--surface-2)' });
        return;
      }
      getGPS().then(gps => {
        if (!gps) {
          setZoneAlert({ loading: false, msg: 'Location access denied or unavailable. Please enable GPS.', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' });
          return;
        }
        let nearest = null;
        let minDistance = null;
        locations.forEach(loc => {
          if (loc.status !== 'active') return;
          const dist = getDistance(gps.lat, gps.lng, parseFloat(loc.latitude), parseFloat(loc.longitude));
          if (minDistance === null || dist < minDistance) {
            minDistance = dist;
            nearest = loc;
          }
        });

        if (nearest) {
          const action = canClockOut ? 'clock out' : 'clock in';
          const radius = Number(nearest.radius_meters) || 100;
          if (minDistance <= radius) {
            setZoneAlert({ loading: false, msg: `📍 You are inside the approved zone (${nearest.name}). Ready to ${action}!`, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' });
          } else {
            setZoneAlert({ loading: false, msg: `⚠️ You are ${Math.round(minDistance)}m away from the nearest zone (${nearest.name}).`, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' });
          }
        } else {
          setZoneAlert({ loading: false, msg: 'No active work zones found.', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' });
        }
      });
    }
  }, [loading, needsClocking, locations, canClockOut]);

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

      {/* Native Web Push / Lock Screen Notifications Banner */}
      {pushStatus.supported && !pushStatus.isSubscribed && pushStatus.permission !== 'denied' && !pushBannerDismissed && (
        <div
          className="card"
          style={{
            padding: '1rem 1.15rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.22)',
            borderRadius: 'var(--radius-lg, 12px)',
            position: 'relative',
          }}
        >
          <button
            onClick={() => {
              setPushBannerDismissed(true);
              localStorage.setItem('portal_push_dismissed', '1');
            }}
            style={{
              position: 'absolute',
              top: '0.65rem',
              right: '0.65rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Dismiss"
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingRight: '1.25rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(99,102,241,0.15)',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}>
              <BellRing size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--dark)', marginBottom: '0.2rem' }}>
                Never Forget to Clock Out!
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Enable lock-screen alerts to get a reminder at <strong>5:30 PM</strong> before leaving, even when your phone is locked or browser is closed.
              </p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="btn btn-primary btn-sm"
                  style={{
                    background: '#4f46e5',
                    borderColor: '#4f46e5',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {pushLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <BellRing size={13} />}
                  <span>Enable Lock-Screen Alerts</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* When Notifications are Blocked in Browser */}
      {pushStatus.supported && pushStatus.permission === 'denied' && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.75rem',
            color: '#b91c1c',
          }}
        >
          <BellOff size={16} style={{ flexShrink: 0 }} />
          <span>
            Lock-screen alerts are blocked in browser settings. Tap the lock icon in the address bar to allow notifications for 5:30 PM shift reminders.
          </span>
        </div>
      )}

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

      {/* Missed Clock-Out Notices */}
      {unclosedPast.length > 0 && (
        <div
          className="card"
          style={{
            padding: '1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 100%)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-lg, 12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(245,158,11,0.15)', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--dark)' }}>
                Missed Clock-Out Notice ({unclosedPast.length})
              </h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                You forgot to clock out on shift(s) below. The system recorded departure at 5:30 PM.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {unclosedPast.map(att => {
              const reg = att.regularization;
              const dateStr = new Date(att.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <div
                  key={att.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--white)',
                    borderRadius: '8px',
                    border: '1px solid rgba(245,158,11,0.2)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dark)' }}>{dateStr}</span>
                      <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#d97706', fontWeight: 600 }}>
                        Auto Clocked-Out (5:30 PM)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Clock-in: {formatTime(att.clock_in_time)} · Recorded Hours: {formatHours(att.working_hours) || '8h 30m'}
                    </div>
                    {reg && (
                      <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', fontWeight: 500, color: reg.status === 'pending' ? '#d97706' : reg.status === 'approved' ? '#16a34a' : '#dc2626' }}>
                        {reg.status === 'pending' && `⏳ Adjustment to ${formatTime(reg.requested_clock_out_time)} pending HR approval`}
                        {reg.status === 'approved' && `✅ Adjustment approved (${formatTime(reg.requested_clock_out_time)})`}
                        {reg.status === 'rejected' && `❌ Adjustment rejected by HR`}
                      </div>
                    )}
                  </div>

                  {(!reg || reg.status === 'rejected') && (
                    <button
                      onClick={() => handleOpenRegModal(att)}
                      style={{
                        background: '#f59e0b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(245,158,11,0.3)',
                      }}
                    >
                      Request Time Adjustment
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {/* GPS Status Alert */}
        {needsClocking && (
          <div style={{ marginBottom: '1.25rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: zoneAlert.bg, color: zoneAlert.color, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {zoneAlert.loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertCircle size={18} />}
            {zoneAlert.msg}
          </div>
        )}

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

      {/* Clock-Out Adjustment Modal */}
      {regModalOpen && selectedReg && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem', color: 'var(--dark)' }}>
              Request Clock-Out Adjustment
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              For shift on <strong>{new Date(selectedReg.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</strong> (Clock-in: {formatTime(selectedReg.clock_in_time)}).
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
                  placeholder="e.g. Worked on project with client until 6:30 PM, forgot to clock out before leaving..."
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

export default PortalHome;
