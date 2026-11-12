import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight,
  BellRing, BellOff, X, CalendarDays, Award, Video, Camera, Upload, ExternalLink, ShieldCheck, Globe, RefreshCw, FileText, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  subscribeToPushNotifications,
  sendTestPushNotification,
} from '../../../../utils/pushNotifications';

const STATUS_COLORS = {
  present:     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Present' },
  late:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Late' },
  short_leave: { color: '#0891b2', bg: 'rgba(6,182,212,0.12)',  label: 'Short Leave (SL)' },
  missing:     { color: '#e11d48', bg: 'rgba(225,29,72,0.12)',  label: 'Missing Attendance' },
  absent:      { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Absent' },
  half_day:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', label: 'Half Day' },
  leave:       { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Leave (LV)' },
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
  const isManager = isLeaveApprovalManager(user);

  const [today, setToday] = useState(null);
  const [monthStats, setMonthStats] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [now, setNow] = useState(new Date());
  const [pendingLeaveApprovals, setPendingLeaveApprovals] = useState(0);
  const [pendingAttApprovals, setPendingAttApprovals] = useState(0);
  const [pendingRemoteApprovals, setPendingRemoteApprovals] = useState(0);

  // Remote Clock-In / Clock-Out state
  const [todayRemote, setTodayRemote] = useState(null);
  const [remoteModalOpen, setRemoteModalOpen] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [remoteSubmitting, setRemoteSubmitting] = useState(false);
  const [remoteForm, setRemoteForm] = useState({
    request_type: 'clock_in',
    latitude: null,
    longitude: null,
    accuracy_meters: null,
    location_name: '',
    address: '',
    reason_category: 'client_site_visit',
    reason_notes: '',
    evidence_photo: null,
    evidence_preview: null,
  });
  
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
      const [empRes, todayRes, histRes, locRes, unclosedRes, remoteRes] = await Promise.all([
        api.get('/hr/employees/me').catch(() => ({ data: null })),
        api.get('/hr/attendance/today').catch(() => ({ data: null })),
        api.get('/hr/attendance/my-history').catch(() => ({ data: [] })),
        api.get('/hr/locations').catch(() => ({ data: [] })),
        api.get('/hr/attendance/unclosed-past').catch(() => ({ data: [] })),
        api.get('/hr/attendance/remote-today').catch(() => ({ data: null })),
      ]);
      setEmployee(empRes.data);
      setToday(todayRes.data);
      setTodayRemote(remoteRes?.data || null);
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
        if (r.status === 'present' || r.status === 'late' || r.status === 'short_leave') a.present++;
        if (r.status === 'short_leave') a.shortLeave++;
        if (r.status === 'missing') a.missing++;
        if (r.status === 'absent') a.absent++;
        if (r.status === 'late') a.late++;
        if (r.status === 'half_day') a.halfDay++;
        return a;
      }, { present: 0, missing: 0, absent: 0, late: 0, halfDay: 0, shortLeave: 0 });
      setMonthStats(stats);

      // Check pending leave, attendance, and remote approvals for executive manager
      if (isManager) {
        try {
          const [unapprovedRes, attRegRes, remoteReqRes] = await Promise.all([
            api.get('/hr/leaves/unapproved-counts'),
            api.get('/hr/attendance/regularizations', { params: { status: 'pending' } }),
            api.get('/hr/attendance/remote-requests', { params: { status: 'pending' } }),
          ]);
          setPendingLeaveApprovals(unapprovedRes.data?.pending || 0);
          setPendingAttApprovals(attRegRes.data?.pending_count || 0);
          setPendingRemoteApprovals(remoteReqRes.data?.pending_count || 0);
        } catch {
          // silent
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      checkPush();
    }
  }, [checkPush, isManager]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen to leave and attendance updates for real-time manager count
  useEffect(() => {
    if (!isManager) return;
    const handleUpdate = async () => {
      try {
        const [unapprovedRes, attRegRes, remoteReqRes] = await Promise.all([
          api.get('/hr/leaves/unapproved-counts'),
          api.get('/hr/attendance/regularizations', { params: { status: 'pending' } }),
          api.get('/hr/attendance/remote-requests', { params: { status: 'pending' } }),
        ]);
        setPendingLeaveApprovals(unapprovedRes.data?.pending || 0);
        setPendingAttApprovals(attRegRes.data?.pending_count || 0);
        setPendingRemoteApprovals(remoteReqRes.data?.pending_count || 0);
      } catch {
        // silent
      }
    };
    window.addEventListener('hr-leaves-updated', handleUpdate);
    window.addEventListener('hr-attendance-updated', handleUpdate);
    window.addEventListener('hr-remote-attendance-updated', handleUpdate);
    window.addEventListener('hr-approval-managers-updated', handleUpdate);
    return () => {
      window.removeEventListener('hr-leaves-updated', handleUpdate);
      window.removeEventListener('hr-attendance-updated', handleUpdate);
      window.removeEventListener('hr-remote-attendance-updated', handleUpdate);
      window.removeEventListener('hr-approval-managers-updated', handleUpdate);
    };
  }, [isManager]);

  // Sync user profile when approval manager assignments change in settings
  useEffect(() => {
    const handleManagerAssignmentChange = async () => {
      try {
        await useAuthStore.getState().fetchUser();
      } catch {}
    };
    window.addEventListener('hr-approval-managers-updated', handleManagerAssignmentChange);
    return () => window.removeEventListener('hr-approval-managers-updated', handleManagerAssignmentChange);
  }, []);

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

      toast.success('Time adjustment request submitted for Manager & HR approval.');
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
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err1) => {
        if (err1.code === 1) { // PERMISSION_DENIED
          resolve(null);
          return;
        }
        console.warn('High accuracy GPS failed, falling back to low accuracy...', err1);
        // Attempt 2: Low accuracy (network/cell tower), 10s timeout, cache for 5 mins
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
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

  const openRemoteModal = async (type = 'clock_in') => {
    setRemoteForm({
      request_type: type,
      latitude: null,
      longitude: null,
      accuracy_meters: null,
      location_name: '',
      address: '',
      reason_category: type === 'clock_in' ? 'client_site_visit' : 'client_site_visit',
      reason_notes: '',
      evidence_photo: null,
      evidence_preview: null,
    });
    setRemoteModalOpen(true);
    setLocatingGPS(true);

    try {
      const gps = await getGPS();
      if (gps) {
        let addr = '';
        try {
          addr = await reverseGeocode(gps.lat, gps.lng);
        } catch {}
        setRemoteForm(prev => ({
          ...prev,
          latitude: gps.lat,
          longitude: gps.lng,
          accuracy_meters: gps.accuracy ? Math.round(gps.accuracy) : null,
          address: addr || '',
        }));
      } else {
        toast.error('Unable to retrieve GPS coordinates. Please ensure device location is allowed.');
      }
    } finally {
      setLocatingGPS(false);
    }
  };

  const refreshGPS = async () => {
    setLocatingGPS(true);
    try {
      const gps = await getGPS();
      if (gps) {
        let addr = '';
        try {
          addr = await reverseGeocode(gps.lat, gps.lng);
        } catch {}
        setRemoteForm(prev => ({
          ...prev,
          latitude: gps.lat,
          longitude: gps.lng,
          accuracy_meters: gps.accuracy ? Math.round(gps.accuracy) : null,
          address: addr || prev.address,
        }));
        toast.success('GPS location refreshed.');
      } else {
        toast.error('Unable to retrieve GPS. Ensure location services are active.');
      }
    } finally {
      setLocatingGPS(false);
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Evidence photo must be under 10MB.');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setRemoteForm(prev => ({
        ...prev,
        evidence_photo: file,
        evidence_preview: previewUrl,
      }));
    }
  };

  const handleRemovePhoto = () => {
    setRemoteForm(prev => ({
      ...prev,
      evidence_photo: null,
      evidence_preview: null,
    }));
  };

  const handleRemoteSubmit = async (e) => {
    e.preventDefault();
    if (!remoteForm.latitude || !remoteForm.longitude) {
      toast.error('GPS coordinates are required to submit remote attendance.');
      return;
    }
    if (!remoteForm.location_name.trim()) {
      toast.error('Please enter the location or site name.');
      return;
    }
    if (!remoteForm.reason_notes.trim()) {
      toast.error('Please describe the reason / work summary.');
      return;
    }

    setRemoteSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('request_type', remoteForm.request_type);
      formData.append('latitude', remoteForm.latitude);
      formData.append('longitude', remoteForm.longitude);
      if (remoteForm.accuracy_meters) formData.append('accuracy_meters', remoteForm.accuracy_meters);
      formData.append('location_name', remoteForm.location_name.trim());
      if (remoteForm.address) formData.append('address', remoteForm.address.trim());
      formData.append('reason_category', remoteForm.reason_category);
      formData.append('reason_notes', remoteForm.reason_notes.trim());
      if (remoteForm.evidence_photo) {
        formData.append('evidence_photo', remoteForm.evidence_photo);
      }

      const res = await api.post('/hr/attendance/remote-request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data?.message || 'Remote request submitted for manager review!');
      setRemoteModalOpen(false);
      await fetchData();
      window.dispatchEvent(new Event('hr-remote-attendance-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit remote request.');
    } finally {
      setRemoteSubmitting(false);
    }
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
    <div style={{ width: '100%' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.2rem' }}>{dateStr}</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          Hello, {employee?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {employee?.designation?.title || employee?.designation?.name || (isManager ? 'Management' : 'Employee')}
          {employee?.employee_id ? ` · ${employee.employee_id}` : ''}
        </p>
      </div>

      {/* Executive Leave Approval Alert for CEO & GM */}
      {isManager && pendingLeaveApprovals > 0 && (
        <div
          className="card"
          onClick={() => navigate('/solar/hr/portal/leaves?tab=approvals')}
          style={{
            padding: '1rem 1.15rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(2,132,199,0.04) 100%)',
            border: '1px solid rgba(14,165,233,0.25)',
            borderRadius: 'var(--radius-lg, 12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(14,165,233,0.15)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CalendarDays size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                {pendingLeaveApprovals} Leave Request{pendingLeaveApprovals > 1 ? 's' : ''} Awaiting Approval
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Employee requests waiting for Manager Approval
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#0284c7',
            flexShrink: 0,
          }}>
            <span>Review</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* Clock-Out Adjustments Approval Alert for Managers */}
      {isManager && pendingAttApprovals > 0 && (
        <div
          className="card"
          onClick={() => navigate('/solar/hr/portal/attendance?tab=approvals')}
          style={{
            padding: '1rem 1.15rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(2,132,199,0.08) 0%, rgba(14,165,233,0.04) 100%)',
            border: '1px solid rgba(2,132,199,0.25)',
            borderRadius: 'var(--radius-lg, 12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(2,132,199,0.15)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                {pendingAttApprovals} Clock-Out Adjustment{pendingAttApprovals > 1 ? 's' : ''} Awaiting Approval
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Missing attendance submissions waiting for Line Manager / Management sign-off
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#0284c7',
            flexShrink: 0,
          }}>
            <span>Review</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* Remote Attendance Approvals Alert for Managers */}
      {isManager && pendingRemoteApprovals > 0 && (
        <div
          className="card"
          onClick={() => navigate('/solar/hr/portal/attendance?tab=remote-approvals')}
          style={{
            padding: '1rem 1.15rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.04) 100%)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 'var(--radius-lg, 12px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16,185,129,0.15)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                {pendingRemoteApprovals} Remote Attendance Request{pendingRemoteApprovals > 1 ? 's' : ''} Awaiting Review
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Field &amp; WFH clock-in/out requests awaiting Manager Approval
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#059669',
            flexShrink: 0,
          }}>
            <span>Review</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

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

      {/* ── Responsive Dashboard Content Grid ── */}
      <div className="portal-dashboard-grid">
        {/* Left Column: Live Clock, Today Status & Actions, Missed Notices */}
        <div>
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

          {/* Today status & Clock In/Out */}
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

            {/* Remote Attendance Submissions & Status Blocks */}
            <div style={{ marginTop: (canClockIn || canClockOut) ? '0.85rem' : '0' }}>
              {/* Remote Clock-In Status or Button */}
              {!hasClockIn && (
                <>
                  {todayRemote?.clock_in?.status === 'pending' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.28)',
                      marginBottom: '0.5rem',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#b45309' }}>
                          <Globe size={15} /> Remote Clock-In Submitted
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#fef3c7', color: '#b45309' }}>
                          Pending Manager
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Requested at {formatTime(todayRemote.clock_in.requested_time)} · {todayRemote.clock_in.location_name}
                      </div>
                    </div>
                  )}

                  {todayRemote?.clock_in?.status === 'manager_approved' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(2,132,199,0.08)',
                      border: '1px solid rgba(2,132,199,0.28)',
                      marginBottom: '0.5rem',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#0369a1' }}>
                          <CheckCircle2 size={15} /> Manager Approved Remote In
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                          Awaiting HR Final Sign-off
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Requested at {formatTime(todayRemote.clock_in.requested_time)} · {todayRemote.clock_in.location_name}
                      </div>
                    </div>
                  )}

                  {todayRemote?.clock_in?.status === 'rejected' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      marginBottom: '0.5rem',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={15} /> Remote Clock-In Rejected
                        </div>
                        <button
                          type="button"
                          onClick={() => openRemoteModal('clock_in')}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid rgba(239,68,68,0.3)',
                            cursor: 'pointer',
                          }}
                        >
                          Re-submit
                        </button>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Note: {todayRemote.clock_in.rejection_reason || todayRemote.clock_in.manager_review_notes || 'Please verify location details and resubmit.'}
                      </div>
                    </div>
                  )}

                  {!todayRemote?.clock_in && (
                    <button
                      type="button"
                      onClick={() => openRemoteModal('clock_in')}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16,185,129,0.07)',
                        border: '1px dashed rgba(16,185,129,0.45)',
                        color: '#059669',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.13)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.07)'}
                    >
                      <Globe size={15} /> Offsite or Field Visit? Submit Remote Clock-In
                    </button>
                  )}
                </>
              )}

              {/* Remote Clock-Out Status or Button */}
              {(hasClockIn || (todayRemote?.clock_in && todayRemote.clock_in.status !== 'rejected')) && !hasClockOut && (
                <div style={{ marginTop: '0.5rem' }}>
                  {todayRemote?.clock_out?.status === 'pending' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.28)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#b45309' }}>
                          <Globe size={15} /> Remote Clock-Out Submitted
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#fef3c7', color: '#b45309' }}>
                          Pending Manager
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Requested at {formatTime(todayRemote.clock_out.requested_time)} · {todayRemote.clock_out.location_name}
                      </div>
                    </div>
                  )}

                  {todayRemote?.clock_out?.status === 'manager_approved' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(2,132,199,0.08)',
                      border: '1px solid rgba(2,132,199,0.28)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: '#0369a1' }}>
                          <CheckCircle2 size={15} /> Manager Approved Remote Out
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1' }}>
                          Awaiting HR Final Sign-off
                        </span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Requested at {formatTime(todayRemote.clock_out.requested_time)} · {todayRemote.clock_out.location_name}
                      </div>
                    </div>
                  )}

                  {todayRemote?.clock_out?.status === 'rejected' && (
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      fontSize: '0.8rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertCircle size={15} /> Remote Clock-Out Rejected
                        </div>
                        <button
                          type="button"
                          onClick={() => openRemoteModal('clock_out')}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            border: '1px solid rgba(239,68,68,0.3)',
                            cursor: 'pointer',
                          }}
                        >
                          Re-submit
                        </button>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        Note: {todayRemote.clock_out.rejection_reason || todayRemote.clock_out.manager_review_notes || 'Please verify location details and resubmit.'}
                      </div>
                    </div>
                  )}

                  {!todayRemote?.clock_out && (
                    <button
                      type="button"
                      onClick={() => openRemoteModal('clock_out')}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(217,119,6,0.07)',
                        border: '1px dashed rgba(217,119,6,0.45)',
                        color: '#d97706',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(217,119,6,0.13)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(217,119,6,0.07)'}
                    >
                      <Globe size={15} /> Leaving from Site or Home? Submit Remote Clock-Out
                    </button>
                  )}
                </div>
              )}
            </div>
            {hasClockIn && hasClockOut && (
              <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-md)', color: '#16a34a', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> Attendance complete for today
              </div>
            )}
          </div>

          {/* Missing Attendance (Forgot Clock-Out) Notices */}
          {unclosedPast.length > 0 && (
            <div
              className="card"
              style={{
                padding: '1.25rem',
                marginBottom: '1.25rem',
                background: 'linear-gradient(135deg, rgba(225,29,72,0.08) 0%, rgba(245,158,11,0.05) 100%)',
                border: '1px solid rgba(225,29,72,0.28)',
                borderRadius: 'var(--radius-lg, 12px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'rgba(225,29,72,0.14)', color: '#e11d48',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--dark)' }}>
                    Missing Attendance — Clock-Out Required ({unclosedPast.length})
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Clock-out time is blank for the date(s) below and marked as Missing Attendance. Please fill your clock-out time and reason before month end.
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
                        border: '1px solid rgba(225,29,72,0.2)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.6rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dark)' }}>{dateStr}</span>
                          <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(225,29,72,0.12)', color: '#e11d48', fontWeight: 700 }}>
                            Missing Attendance (Clock-Out Blank)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Clock-in: {formatTime(att.clock_in_time)} · Clock-out: <strong>— (Blank)</strong>
                        </div>
                        {reg && (
                          <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', fontWeight: 500, color: reg.status === 'pending' ? '#d97706' : reg.status === 'approved' ? '#16a34a' : '#dc2626' }}>
                            {reg.status === 'pending' && `⏳ Requested clock-out (${formatTime(reg.requested_clock_out_time)}) pending HR approval`}
                            {reg.status === 'approved' && `✅ Clock-out approved (${formatTime(reg.requested_clock_out_time)})`}
                            {reg.status === 'rejected' && `❌ Request rejected by HR — please resubmit`}
                          </div>
                        )}
                      </div>

                      {(!reg || reg.status === 'rejected') && (
                        <button
                          onClick={() => handleOpenRegModal(att)}
                          style={{
                            background: '#e11d48',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(225,29,72,0.3)',
                          }}
                        >
                          Fill Time & Reason
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Month stats & Quick Navigation */}
        <div>
          {/* Month stats */}
          {monthStats && (
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{month} Attendance</span>
                <button
                  onClick={() => navigate('/solar/hr/portal/attendance')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
                {[
                  { label: 'Present',  val: monthStats.present,    color: '#22c55e' },
                  { label: 'Late',     val: monthStats.late,       color: '#f59e0b' },
                  { label: 'Short Lv', val: monthStats.shortLeave, color: '#0891b2' },
                  { label: 'Missing',  val: monthStats.missing,    color: '#e11d48' },
                  { label: 'Absent',   val: monthStats.absent,     color: '#ef4444' },
                  { label: 'Half',     val: monthStats.halfDay,    color: '#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '0.6rem 0.25rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Attendance Deficiencies Alert Strip */}
              {(monthStats.late > 0 || monthStats.missing > 0 || monthStats.absent > 0) && (
                <div style={{
                  marginTop: '0.85rem',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: '0.74rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <span>
                      <strong>Deficiencies:</strong> {[
                        monthStats.late > 0 && `${monthStats.late} late`,
                        monthStats.missing > 0 && `${monthStats.missing} missing clock-out`,
                        monthStats.absent > 0 && `${monthStats.absent} absent`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/solar/hr/portal/attendance?view=deficiencies')}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.28rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Review Deficiencies →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Navigation Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            <button
              onClick={() => navigate('/solar/hr/portal/attendance?view=report')}
              className="card"
              style={{
                padding: '1rem',
                border: '1px solid #bae6fd',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2,132,199,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Attendance Report &amp; Timesheet</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Download monthly timesheet (PDF/CSV) &amp; inspect deficiencies</div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
            </button>

            {isManager && (
              <button
                onClick={() => navigate('/solar/hr/portal/attendance?tab=team-attendance')}
                className="card"
                style={{
                  padding: '1rem',
                  border: '1px solid #bfdbfe',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      All Employees Attendance
                      <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '0.1rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        Manager
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Daily attendance logs, status tracking &amp; monthly company timesheets</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#2563eb" />
              </button>
            )}

            <button
              onClick={() => navigate('/solar/hr/portal/appraisals')}
              className="card"
              style={{
                padding: '1rem',
                border: '1px solid #e0e7ff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', flexShrink: 0 }}>
                  <Award size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Performance Appraisals</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>View monthly targets, submit achievements & scorecards</div>
                </div>
              </div>
              <ChevronRight size={18} color="#6366f1" />
            </button>

            <button
              onClick={() => navigate('/solar/hr/portal/training')}
              className="card"
              style={{
                padding: '1rem',
                border: '1px solid #bae6fd',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2,132,199,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <Video size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Training & Video Lessons</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Watch assigned lessons & submit completion confirmations</div>
                </div>
              </div>
              <ChevronRight size={18} color="#0284c7" />
            </button>

            <button
              onClick={() => navigate('/solar/hr/portal/leaves')}
              className="card"
              style={{
                padding: '1rem',
                border: '1px solid #e0f2fe',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                transition: 'transform 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2,132,199,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <CalendarDays size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Leave Management</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Apply for leave & track approval balance</div>
                </div>
              </div>
              <ChevronRight size={18} color="#0284c7" />
            </button>
          </div>
        </div>
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
              Fill Missing Attendance Clock-Out
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              For shift on <strong>{new Date(selectedReg.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</strong> (Clock-in: {formatTime(selectedReg.clock_in_time)} · Clock-out: Blank). Please submit your actual departure time and reason before month end.
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
                  {regSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remote Clock-In/Clock-Out Modal */}
      {remoteModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem',
          backdropFilter: 'blur(2px)',
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
            padding: '1.5rem', background: 'var(--white)', borderRadius: '14px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={20} color="#059669" />
                  {remoteForm.request_type === 'clock_in' ? 'Remote Clock-In Request' : 'Remote Clock-Out Request'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                  For field visits, site duty, or work-from-home. Routed to Line Manager then HR.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemoteModalOpen(false)}
                className="btn-ghost"
                style={{ padding: '0.25rem', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRemoteSubmit} style={{ marginTop: '1rem' }}>
              {/* GPS Coordinates Bar */}
              <div style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: (remoteForm.latitude && remoteForm.longitude) ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.1)',
                border: '1px solid ' + ((remoteForm.latitude && remoteForm.longitude) ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'),
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <MapPin size={18} color={(remoteForm.latitude && remoteForm.longitude) ? '#059669' : '#d97706'} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: '0.78rem' }}>
                    {locatingGPS ? (
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Locating high-accuracy GPS...
                      </span>
                    ) : (remoteForm.latitude && remoteForm.longitude) ? (
                      <>
                        <div style={{ fontWeight: 600, color: 'var(--dark)' }}>
                          {remoteForm.latitude.toFixed(5)}, {remoteForm.longitude.toFixed(5)}
                          {remoteForm.accuracy_meters && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>
                              (±{remoteForm.accuracy_meters}m)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#059669' }}>
                          Verified GPS coordinates locked
                        </div>
                      </>
                    ) : (
                      <span style={{ color: '#b91c1c', fontWeight: 600 }}>GPS coordinates unavailable. Tap refresh.</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={refreshGPS}
                  disabled={locatingGPS}
                  title="Refresh GPS Coordinates"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.6rem',
                    cursor: locatingGPS ? 'not-allowed' : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    color: 'var(--dark)',
                  }}
                >
                  <RefreshCw size={12} style={{ animation: locatingGPS ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Location Name */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Location / Site Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Bank Kandy Branch / Wattala Site / Home"
                  className="form-control"
                  value={remoteForm.location_name}
                  onChange={e => setRemoteForm(prev => ({ ...prev, location_name: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Physical Address / Landmark (Optional) */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Address / Landmark <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 124 Station Road, Kandy"
                  className="form-control"
                  value={remoteForm.address}
                  onChange={e => setRemoteForm(prev => ({ ...prev, address: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                />
              </div>

              {/* Reason Category */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Reason Category <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  required
                  className="form-control"
                  value={remoteForm.reason_category}
                  onChange={e => setRemoteForm(prev => ({ ...prev, reason_category: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                >
                  <option value="client_site_visit">Client Site Visit / Site Survey</option>
                  <option value="field_installation">Field Installation / Solar Commissioning</option>
                  <option value="work_from_home">Work From Home (WFH)</option>
                  <option value="transit_duty">Duty in Transit / Transport</option>
                  <option value="meeting">External Meeting / Government Office</option>
                  <option value="other">Other Official Field Assignment</option>
                </select>
              </div>

              {/* Work Notes / Description */}
              <div style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Work Summary / Notes <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  className="form-control"
                  placeholder="Detail the tasks performed or assignment objective at this location..."
                  value={remoteForm.reason_notes}
                  onChange={e => setRemoteForm(prev => ({ ...prev, reason_notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              {/* Evidence Photo (Optional) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--dark)' }}>
                  Evidence Photo <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional - Site photo, job card, or environment)</span>
                </label>

                {remoteForm.evidence_preview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', border: '1px solid var(--surface-2)', borderRadius: '8px' }}>
                    <img
                      src={remoteForm.evidence_preview}
                      alt="Evidence preview"
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {remoteForm.evidence_photo?.name || 'Photo selected'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {(remoteForm.evidence_photo?.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="btn-ghost"
                      style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.6rem', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="remote-photo-input"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="remote-photo-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        border: '1px dashed var(--surface-2)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        background: 'var(--surface)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                    >
                      <Camera size={16} />
                      <span>Take Photo or Upload Image</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRemoteModalOpen(false)}
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--surface-2)', padding: '0.5rem 1rem' }}
                  disabled={remoteSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: remoteForm.request_type === 'clock_in' ? '#059669' : '#d97706',
                    borderColor: remoteForm.request_type === 'clock_in' ? '#059669' : '#d97706',
                    padding: '0.5rem 1.25rem',
                    fontWeight: 600,
                  }}
                  disabled={remoteSubmitting || locatingGPS}
                >
                  {remoteSubmitting ? 'Submitting...' : (remoteForm.request_type === 'clock_in' ? 'Submit Remote Clock-In' : 'Submit Remote Clock-Out')}
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
