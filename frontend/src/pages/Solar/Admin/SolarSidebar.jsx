import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, MapPin, Briefcase, Link as LinkIcon, FileText, Sun, Menu, Search, LogOut, FileBarChart2, Settings, Bell
} from 'lucide-react';

import useAuthStore from '../../../store/authStore';

export const SolarSidebar = ({ isMobileOpen, closeMobileOpen }) => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/solar/login';
  };

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/solar/admin/dashboard', icon: LayoutDashboard },
        { name: 'Sites', path: '/solar/admin/sites', icon: MapPin },
        { name: 'Projects', path: '/solar/admin/projects', icon: Briefcase },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Supervisors (URLs)', path: '/solar/admin/supervisors', icon: LinkIcon },
        { name: 'Notifications', path: '/solar/admin/notifications', icon: Bell },
        ...(user?.role === 'super_admin' || user?.roles?.includes('super_admin') ? [
          { name: 'Milestone Templates', path: '/solar/admin/templates', icon: Settings }
        ] : []),
      ]
    },
    {
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/solar/admin/reports', icon: FileBarChart2 },
      ]
    }
  ];

  return (
    <aside className={`sidebar no-scrollbar ${isMobileOpen ? 'mobile-open' : ''}`} style={{ 
      display: 'flex', flexDirection: 'column', 
      borderRight: '1px solid var(--dark-2)',
      height: '100%',
    }}>
      <div style={{ 
        padding: '1.5rem', 
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid var(--dark-2)',
        flexShrink: 0
      }}>
        <div style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
          <Sun size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: 0 }}>CircleGroup</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solar Division</span>
        </div>
      </div>

      <nav className="no-scrollbar" style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        {menuGroups.map((group, idx) => {
          return (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', 
                color: 'var(--text-muted)', padding: '0 1.5rem', marginBottom: '0.5rem' 
              }}>
                {group.title}
              </h3>
              <ul style={{ listStyle: 'none' }}>
                {group.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.path);
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
                          backgroundColor: isActive ? 'var(--primary-alpha)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                          textDecoration: 'none', transition: 'all 0.2s',
                          fontWeight: isActive ? 600 : 500, fontSize: '0.9rem'
                        }}
                      >
                        <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--dark-2)' }}>
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem',
            background: 'transparent', border: 'none',
            color: 'var(--danger)', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 500,
            borderRadius: 'var(--radius-md)', transition: 'background 0.2s'
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
