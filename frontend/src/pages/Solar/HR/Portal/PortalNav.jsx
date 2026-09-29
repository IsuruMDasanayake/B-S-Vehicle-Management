import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Clock, CalendarDays, User, Megaphone, LogOut } from 'lucide-react';
import useAuthStore from '../../../../store/authStore';

const navItems = [
  { to: 'home',         icon: Home,         label: 'Home' },
  { to: 'attendance',   icon: Clock,        label: 'Attendance' },
  { to: 'leaves',       icon: CalendarDays, label: 'Leave' },
  { to: 'profile',      icon: User,         label: 'Profile' },
  { to: 'announcements',icon: Megaphone,    label: 'Updates' },
];

const PortalNav = () => {
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/solar/hr/portal/login');
  };

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: "#fff",
      borderTop: '1px solid var(--surface-2)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '0.5rem 0 env(safe-area-inset-bottom, 0.5rem)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
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
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
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
