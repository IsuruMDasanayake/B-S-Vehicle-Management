import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, Users, CarFront, Settings, ArrowLeft, BarChart2, CheckSquare
} from 'lucide-react';

import useAuthStore from '../../store/authStore';

const PerformanceSidebar = () => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const menuGroups = [
    {
      title: 'Analytics',
      items: [
        { name: 'Overview', path: '/admin/performance', icon: BarChart2, roles: ['super_admin', 'fleet_manager', 'dept_manager'] },
        { name: 'Driver Analytics', path: '/admin/performance/drivers', icon: Users, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Vehicle Analytics', path: '/admin/performance/vehicles', icon: CarFront, roles: ['super_admin', 'fleet_manager'] },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { name: 'Manage Logs', path: '/admin/performance/manage', icon: CheckSquare, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Settings', path: '/admin/performance/settings', icon: Settings, roles: ['super_admin'] },
      ]
    }
  ];

  return (
    <aside className="sidebar no-scrollbar" style={{ 
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
        <div style={{ background: 'var(--success)', color: 'white', padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex' }}>
          <Activity size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: 0 }}>Performance</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>B&S Transport</span>
        </div>
      </div>

      <nav className="no-scrollbar" style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        {menuGroups.map((group, idx) => {
          const visibleItems = group.items.filter(item => 
            !item.roles || item.roles.some(role => user?.roles?.includes(role))
          );
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ 
                fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', 
                color: 'var(--text-muted)', padding: '0 1.5rem', marginBottom: '0.5rem' 
              }}>
                {group.title}
              </h3>
              <ul style={{ listStyle: 'none' }}>
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/admin/performance' && location.pathname.startsWith(item.path));
                  const Icon = item.icon;
                  return (
                    <li key={item.path} style={{ padding: '0.15rem 1rem' }}>
                      <Link 
                        to={item.path}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
                          color: isActive ? 'var(--white)' : 'var(--text-muted)',
                          backgroundColor: isActive ? 'var(--success-alpha)' : 'transparent',
                          borderLeft: isActive ? '3px solid var(--success)' : '3px solid transparent',
                          textDecoration: 'none', transition: 'all 0.2s',
                          fontWeight: isActive ? 600 : 500, fontSize: '0.9rem'
                        }}
                      >
                        <Icon size={18} color={isActive ? 'var(--success)' : 'currentColor'} />
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

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--dark-2)', marginTop: 'auto' }}>
        <Link 
          to="/portal"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)', background: 'transparent', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--white)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={18} />
          Back to Portal
        </Link>
      </div>
    </aside>
  );
};

export default PerformanceSidebar;
