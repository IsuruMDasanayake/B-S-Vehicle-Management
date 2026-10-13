import { useState, useEffect, useCallback } from 'react';
import { User, Phone, MapPin, Mail, Lock, Loader2, Save, BellRing, Send, BellOff } from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import {
  getPushNotificationStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
} from '../../../../utils/pushNotifications';

const PortalProfile = () => {
  const user = useAuthStore(s => s.user);
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'default', isSubscribed: false });
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    api.get('/hr/employees/me')
      .then(r => {
        setEmp(r.data);
        setForm({
          phone: r.data.phone || '',
          address: r.data.address || '',
          emergency_contact_name: r.data.emergency_contact_name || '',
          emergency_contact_phone: r.data.emergency_contact_phone || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const checkPush = useCallback(async () => {
    try {
      const status = await getPushNotificationStatus();
      setPushStatus(status);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    checkPush();
  }, [checkPush]);

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushStatus.isSubscribed) {
        await unsubscribeFromPushNotifications();
        toast.success('Lock-screen alerts disabled for this device.');
      } else {
        await subscribeToPushNotifications();
        toast.success('Lock-screen alerts enabled! You will receive shift reminders at 5:30 PM.');
      }
      await checkPush();
    } catch (err) {
      toast.error(err.message || 'Push notification configuration failed.');
      await checkPush();
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      await sendTestPushNotification();
      toast.success('Test alert sent! Check your phone lock screen or notification tray.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to dispatch test notification.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/hr/employees/${emp.id}/self-update`, form);
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handlePwdChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.new_password_confirmation) {
      toast.error('Passwords do not match'); return;
    }
    setChangingPwd(true);
    try {
      await api.post('/auth/change-password', pwdForm);
      toast.success('Password changed successfully');
      setPwdForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      setShowPwd(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setChangingPwd(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.65rem 0', borderBottom: '1px solid var(--surface-2)' }}>
      {Icon && <Icon size={16} style={{ marginTop: '0.1rem', color: 'var(--text-muted)', flexShrink: 0 }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: '0.1rem' }}>{value || '—'}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem' }}>
      {/* Avatar + name */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 0.75rem',
          background: emp?.photo_url ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
        }}>
          {emp?.photo_url
            ? <img src={emp.photo_url} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff' }}>{emp?.full_name?.[0] || '?'}</span>
          }
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{emp?.full_name}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{emp?.designation?.name} · {emp?.employee_id}</p>
      </div>

      {/* Details */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Personal Details</span>
          {/* {!editMode && (
            <button onClick={() => setEditMode(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>Edit</button>
          )} */}
        </div>
        {!editMode ? (
          <>
            <InfoRow icon={User}   label="Full Name"     value={emp?.full_name} />
            <InfoRow icon={Mail}   label="Email"         value={emp?.company_email || user?.email} />
            <InfoRow icon={Phone}  label="Phone"         value={emp?.phone} />
            <InfoRow icon={MapPin} label="Department"    value={emp?.department?.name} />
            <InfoRow icon={MapPin} label="Address"       value={emp?.address} />
            <InfoRow label="Emergency Contact" value={emp?.emergency_contact_name} />
            <InfoRow label="Emergency Phone"   value={emp?.emergency_contact_phone} />
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+94 77 000 0000" />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Address</label>
              <textarea className="form-control" rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Emergency Contact Name</label>
              <input className="form-control" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Emergency Contact Phone</label>
              <input className="form-control" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" onClick={() => setEditMode(false)} className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--surface-2)' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Device Notifications Card */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BellRing size={16} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Lock-Screen Push Alerts</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
          Receive native notifications directly on your phone lock screen or notification tray at <strong>5:30 PM</strong> to remind you to clock out before leaving.
        </p>

        {!pushStatus.supported ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            Push notifications are not supported on this browser. Use Chrome or Edge on Android / Safari on iOS 16.4+ (added to Home Screen).
          </div>
        ) : pushStatus.permission === 'denied' ? (
          <div style={{ fontSize: '0.75rem', color: '#b91c1c', background: 'rgba(239,68,68,0.08)', padding: '0.6rem 0.75rem', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <BellOff size={16} style={{ flexShrink: 0 }} />
            <span>Notifications are blocked in your browser settings. Please allow notifications in site settings to receive reminders.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-2)' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>Shift Reminders (5:30 PM)</div>
                <div style={{ fontSize: '0.72rem', color: pushStatus.isSubscribed ? '#10b981' : 'var(--text-muted)' }}>
                  {pushStatus.isSubscribed ? '● Active on this device' : '○ Not enabled'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`btn btn-sm ${pushStatus.isSubscribed ? 'btn-ghost' : 'btn-primary'}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  ...(pushStatus.isSubscribed ? { border: '1px solid var(--surface-2)', color: 'var(--danger)' } : { background: '#3b82f6', borderColor: '#3b82f6' })
                }}
              >
                {pushLoading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>{pushStatus.isSubscribed ? 'Disable' : 'Enable'}</span>
              </button>
            </div>

            {pushStatus.isSubscribed && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={handleTestPush}
                  disabled={pushLoading}
                  className="btn btn-sm btn-ghost"
                  style={{
                    fontSize: '0.73rem',
                    padding: '0.3rem 0.65rem',
                    border: '1px solid var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Send size={12} />
                  <span>Send Test Alert to Phone</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPwd ? '1rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} color="var(--text-muted)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Change Password</span>
          </div>
          <button onClick={() => setShowPwd(!showPwd)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            {showPwd ? 'Hide' : 'Change'}
          </button>
        </div>
        {showPwd && (
          <form onSubmit={handlePwdChange}>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={pwdForm.current_password} onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })} required />
            </div>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={pwdForm.new_password} onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })} required minLength={8} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={pwdForm.new_password_confirmation} onChange={e => setPwdForm({ ...pwdForm, new_password_confirmation: e.target.value })} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: '#3b82f6', borderColor: '#3b82f6' }} disabled={changingPwd}>
              {changingPwd ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PortalProfile;
