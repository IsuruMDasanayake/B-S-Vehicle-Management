import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CarFront, Users, Fuel, Wrench, AlertTriangle, Map, FileText, 
  Shield, UserSquare2, Settings, Route, Navigation, Receipt, HardHat, FileCheck, 
  Activity, Users2, Database, Car, Package, DollarSign, Store, LogOut, Briefcase, Bell
} from 'lucide-react';

import useAuthStore from '../../store/authStore';

const Sidebar = ({ isMobileOpen, closeMobileOpen }) => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'fleet_manager', 'driver', 'mechanic', 'dept_manager'] },
        { name: 'Alerts & Activity', path: '/admin/alerts', icon: Bell, roles: ['super_admin', 'fleet_manager'] },
      ]
    },
    {
      title: 'Fleet Management',
      items: [
        { name: 'Vehicles', path: '/admin/vehicles', icon: CarFront, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Drivers', path: '/admin/drivers', icon: Users, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Assignments', path: '/admin/assignments', icon: UserSquare2, roles: ['super_admin', 'fleet_manager', 'driver', 'dept_manager'] },
        { name: 'Vehicle Requests', path: '/admin/vehicle-requests', icon: Car, roles: ['super_admin', 'fleet_manager', 'dept_manager'] },
      ]
    },
    // {
    //   title: 'Operations',
    //   items: [
    //     { name: 'Trips', path: '/admin/trips', icon: Navigation, roles: ['super_admin', 'fleet_manager'] },
    //     { name: 'Routes', path: '/admin/routes', icon: Route, roles: ['super_admin', 'fleet_manager'] },
    //     { name: 'Fuel', path: '/admin/fuel', icon: Fuel, roles: ['super_admin', 'fleet_manager', 'driver'] },
    //   ]
    // },

    {
      title: 'Finance & Vendors',
      items: [
        // { name: 'Expenses', path: '/admin/expenses', icon: DollarSign, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Rental Income', path: '/admin/vehicle-payments', icon: DollarSign, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Hiring Payments', path: '/admin/hiring-details', icon: Briefcase, roles: ['super_admin', 'fleet_manager'] },
        // { name: 'Vendors', path: '/admin/vendors', icon: Store, roles: ['super_admin', 'fleet_manager'] },
      ]
    },

    {
      title: 'Maintenance & Safety',
      items: [
        { name: 'Maintenance', path: '/admin/maintenance', icon: Wrench, roles: ['super_admin', 'fleet_manager', 'mechanic'] },
        // { name: 'Inspections', path: '/admin/inspections', icon: FileCheck, roles: ['super_admin', 'fleet_manager', 'mechanic'] },
        // { name: 'Breakdowns', path: '/admin/breakdowns', icon: AlertTriangle, roles: ['super_admin', 'fleet_manager', 'driver', 'mechanic'] },
        { name: 'Accidents', path: '/admin/accidents', icon: HardHat, roles: ['super_admin', 'fleet_manager'] },
        // { name: 'Tires', path: '/admin/tires', icon: Activity, roles: ['super_admin', 'fleet_manager', 'mechanic'] },
        // { name: 'Spare Parts', path: '/admin/spare-parts', icon: Package, roles: ['super_admin', 'fleet_manager', 'mechanic'] },
        // { name: 'Fuel', path: '/admin/fuel', icon: Fuel, roles: ['super_admin', 'fleet_manager', 'driver'] },
      ]
    },

    {
      title: 'Organization',
      items: [
        // { name: 'Departments', path: '/admin/departments', icon: Database, roles: ['super_admin', 'fleet_manager'] },
        { name: 'Users & Roles', path: '/admin/users', icon: Users2, roles: ['super_admin'] },
      ]
    },
    // {
    //   title: 'System',
    //   items: [
    //     { name: 'Reports', path: '/admin/reports', icon: FileText, roles: ['super_admin', 'fleet_manager', 'dept_manager'] },
    //     { name: 'Settings', path: '/admin/settings', icon: Settings, roles: ['super_admin'] },
    //   ]
    // }
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
          <CarFront size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: 0 }}>B&S Transport</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Management</span>
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

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--dark-2)', marginTop: 'auto' }}>
        <button 
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            color: 'var(--danger)', background: 'transparent', border: 'none',
            cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500, fontSize: '0.9rem'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--danger-alpha)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
