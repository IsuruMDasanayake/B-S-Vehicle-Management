import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Shield, User, Bell } from 'lucide-react';
import PortalDesktopHeader from './PortalDesktopHeader';
import PortalNav from './PortalNav';
import CELogo from '../../../Website/components/CELogo';
import useAuthStore from '../../../../store/authStore';
import api from '../../../../services/api';
import './portal.css';

const PortalLayout = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const isHrAdmin = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';

  useEffect(() => {
    let mounted = true;
    api.get('/hr/employees/me')
      .then(res => {
        if (mounted && res.data) setEmployee(res.data);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchNotifCount = async () => {
      try {
        const res = await api.get('/notifications', { params: { division: 'hr', unread_only: 1 } });
        if (mounted && res.data) {
          setUnreadNotifCount(res.data.unread_count || 0);
        }
      } catch {}
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    const handleUpdate = () => fetchNotifCount();
    window.addEventListener('hr-notifications-updated', handleUpdate);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('hr-notifications-updated', handleUpdate);
    };
  }, []);

  const photoUrl = employee?.photo_url || user?.photo_url || user?.avatar || null;
  const userInitial = (employee?.full_name || user?.name || user?.email || 'U').charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/solar/hr/portal/login');
  };

  return (
    <div className="portal-root">
      {/* ── Desktop Top Navigation Header (>= 768px) ── */}
      <PortalDesktopHeader employee={employee} />

      {/* ── Mobile Top Header Bar (< 768px) ── */}
      <header className="portal-mobile-top-bar">
        <NavLink to="home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <CELogo variant="mark" height={24} color="#0284c7" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.1 }}>
              Circle Engineering
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>
              Employee Portal
            </div>
          </div>
        </NavLink>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          {isHrAdmin && (
            <NavLink
              to="/solar/hr/admin/appraisals"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 700,
                background: '#f1f5f9',
                color: '#334155',
                textDecoration: 'none',
              }}
            >
              <Shield size={12} color="#0284c7" />
              <span>Admin</span>
            </NavLink>
          )}

          {/* Mobile Notifications Bell Icon (left to employee profile image) */}
          <NavLink
            to="announcements"
            title="Notifications & Updates"
            style={({ isActive }) => ({
              position: 'relative',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isActive ? '#e0f2fe' : '#f1f5f9',
              color: isActive ? '#0284c7' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              border: isActive ? '1px solid #bae6fd' : '1px solid #e2e8f0',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            })}
          >
            <Bell size={16} />
            {unreadNotifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.58rem',
                  fontWeight: 800,
                  minWidth: '15px',
                  height: '15px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1,
                  border: '1.5px solid #ffffff',
                  boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                }}
              >
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="profile"
            title="My Profile"
            style={({ isActive }) => ({
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: photoUrl ? 'transparent' : '#0284c7',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.76rem',
              textDecoration: 'none',
              overflow: 'hidden',
              border: isActive ? '2px solid #0284c7' : '2px solid #e2e8f0',
              boxShadow: isActive ? '0 0 0 2px rgba(2,132,199,0.2)' : 'none',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            })}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={employee?.full_name || user?.name || 'Profile'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              userInitial || <User size={15} />
            )}
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="portal-content-wrap">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation Bar (< 768px) ── */}
      <PortalNav />
    </div>
  );
};

export default PortalLayout;
