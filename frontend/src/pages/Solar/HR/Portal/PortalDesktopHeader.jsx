import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Clock, CalendarDays, Award, User, LogOut, Shield, ExternalLink } from 'lucide-react';
import useAuthStore from '../../../../store/authStore';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';
import api from '../../../../services/api';
import CELogo from '../../../Website/components/CELogo';

const navItems = [
  { to: 'home',         icon: Home,         label: 'Dashboard' },
  { to: 'attendance',   icon: Clock,        label: 'Attendance' },
  { to: 'leaves',       icon: CalendarDays, label: 'Leave' },
  { to: 'appraisals',   icon: Award,        label: 'Performance' },
  { to: 'profile',      icon: User,         label: 'My Profile' },
];

export const PortalDesktopHeader = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const isManager = isLeaveApprovalManager(user);
  const isHrAdmin = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';

  useEffect(() => {
    if (!isManager) return;
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await api.get('/hr/leaves/unapproved-counts');
        if (mounted) setPendingApprovals(res.data?.pending || 0);
      } catch {
        // silent
      }
    };
    fetchCount();
    const handleUpdate = () => fetchCount();
    window.addEventListener('hr-leaves-updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('hr-leaves-updated', handleUpdate);
    };
  }, [isManager]);

  const handleLogout = async () => {
    await logout();
    navigate('/solar/hr/portal/login');
  };

  return (
    <header className="portal-desktop-header">
      {/* ── Left: Brand & Portal Badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <NavLink to="home" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
          <CELogo variant="mark" height={28} color="#0284c7" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Circle Engineering
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Employee Portal
            </div>
          </div>
        </NavLink>
      </div>

      {/* ── Center: Main Navigation Links ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `portal-nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {to === 'leaves' && isManager && pendingApprovals > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 700,
                minWidth: '16px',
                height: '16px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
              }}>
                {pendingApprovals > 99 ? '99+' : pendingApprovals}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Right: User Profile Capsule & Logout ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Admin Quick Switch (if authorized) */}
        {isHrAdmin && (
          <NavLink
            to="/solar/hr/admin/appraisals"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
            title="Open HR Admin Console"
          >
            <Shield size={13} color="#0284c7" />
            <span>HR Admin</span>
          </NavLink>
        )}

        {/* User Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.3rem 0.65rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '999px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#0284c7',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.75rem',
          }}>
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              {user?.name || user?.email?.split('@')[0]}
            </span>
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
              {user?.email}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.65rem',
            borderRadius: '8px',
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default PortalDesktopHeader;
