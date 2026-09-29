import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Briefcase, Clock, Calendar,
  FileText, Package, Megaphone, BarChart2, Settings, LogOut, Users2,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const HR_BLUE = '#3b82f6';

export const HRSidebar = ({ isMobileOpen, closeMobileOpen }) => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  const isHRAdmin = isSuperAdmin || user?.role === 'solar_hr_admin' || user?.roles?.includes('solar_hr_admin');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/solar/hr/login';
  };

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/solar/hr/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'People',
      items: [
        { name: 'Employees', path: '/solar/hr/admin/employees', icon: Users },
        { name: 'Departments', path: '/solar/hr/admin/departments', icon: Building2 },
        { name: 'Designations', path: '/solar/hr/admin/designations', icon: Briefcase },
      ],
    },
    ...(isHRAdmin ? [
      {
        title: 'Time & Attendance',
        items: [
          { name: 'Attendance', path: '/solar/hr/admin/attendance', icon: Clock },
          { name: 'Leave', path: '/solar/hr/admin/leave', icon: Calendar },
        ],
      },
      {
        title: 'Operations',
        items: [
          { name: 'Documents', path: '/solar/hr/admin/documents', icon: FileText },
          { name: 'Assets', path: '/solar/hr/admin/assets', icon: Package },
          { name: 'Announcements', path: '/solar/hr/admin/announcements', icon: Megaphone },
        ],
      },
      {
        title: 'Reports',
        items: [
          { name: 'HR Reports', path: '/solar/hr/admin/reports', icon: BarChart2 },
        ],
      },
    ] : []),
    ...(isSuperAdmin ? [
      {
        title: 'System',
        items: [
          { name: 'Settings', path: '/solar/hr/admin/settings', icon: Settings },
        ],
      },
    ] : []),
  ];

  return (
    <aside className={`sidebar no-scrollbar ${isMobileOpen ? 'mobile-open' : ''}`} style={{
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--dark-2)',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid var(--dark-2)',
        flexShrink: 0,
      }}>
        <div style={{
          background: HR_BLUE, color: 'white',
          padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex',
        }}>
          <Users2 size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: 0 }}>Circle Engineering</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HR Management System</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="no-scrollbar" style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        {menuGroups.map((group, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--text-muted)', padding: '0 1.5rem', marginBottom: '0.5rem',
            }}>
              {group.title}
            </h3>
            <ul style={{ listStyle: 'none' }}>
              {group.items.map(item => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <li key={item.path} style={{ padding: '0.15rem 1rem' }}>
                    <Link
                      to={item.path}
                      onClick={() => isMobileOpen && closeMobileOpen()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
                        color: isActive ? 'var(--white)' : 'var(--text-muted)',
                        backgroundColor: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                        borderLeft: isActive ? `3px solid ${HR_BLUE}` : '3px solid transparent',
                        textDecoration: 'none', transition: 'all 0.2s',
                        fontWeight: isActive ? 600 : 500, fontSize: '0.9rem',
                      }}
                    >
                      <Icon size={18} color={isActive ? HR_BLUE : 'currentColor'} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--dark-2)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '0.75rem', padding: '0.5rem',
          background: 'rgba(59,130,246,0.08)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: HR_BLUE, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'HR Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.role === 'super_admin' ? 'System Admin' : user?.role === 'solar_hr_admin' ? 'HR Admin' : 'Employee'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.65rem 1rem',
            background: 'transparent', border: 'none',
            color: 'var(--danger)', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500,
            borderRadius: 'var(--radius-md)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-alpha)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};
