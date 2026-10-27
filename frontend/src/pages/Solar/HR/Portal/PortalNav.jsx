import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Clock, CalendarDays, User, Megaphone, LogOut, Award } from 'lucide-react';
import useAuthStore from '../../../../store/authStore';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';
import api from '../../../../services/api';

const navItems = [
  { to: 'home',         icon: Home,         label: 'Home' },
  { to: 'attendance',   icon: Clock,        label: 'Attendance' },
  { to: 'leaves',       icon: CalendarDays, label: 'Leave' },
  { to: 'appraisals',   icon: Award,        label: 'MBO' },
  { to: 'profile',      icon: User,         label: 'Profile' },
  // { to: 'announcements',icon: Megaphone,    label: 'Updates' },
];

const PortalNav = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const isManager = isLeaveApprovalManager(user);

  useEffect(() => {
    if (!isManager) return;

    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await api.get('/hr/leaves/unapproved-counts');
        if (mounted) {
          setPendingApprovals(res.data?.pending || 0);
        }
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
    <nav
      className="portal-mobile-bottom-nav"
      style={{
        zIndex: 500,
        background: "#fff",
        borderTop: '1px solid var(--surface-2)',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '0.5rem 0 env(safe-area-inset-bottom, 0.5rem)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '0.2rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', fontSize: '0.65rem', fontWeight: 600,
            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'color 0.2s',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {to === 'leaves' && isManager && pendingApprovals > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-7px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    minWidth: '15px',
                    height: '15px',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 3px',
                    lineHeight: 1,
                    border: '1.5px solid #fff',
                  }}>
                    {pendingApprovals > 99 ? '99+' : pendingApprovals}
                  </span>
                )}
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0.2rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)',
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.65rem', fontWeight: 600, color: '#ef4444',
        }}
      >
        <LogOut size={22} strokeWidth={1.8} />
        Logout
      </button>
    </nav>
  );
};

export default PortalNav;
