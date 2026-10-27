import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import PortalDesktopHeader from './PortalDesktopHeader';
import PortalNav from './PortalNav';
import CELogo from '../../../Website/components/CELogo';
import useAuthStore from '../../../../store/authStore';
import './portal.css';

const PortalLayout = () => {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  const isHrAdmin = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';

  const handleLogout = async () => {
    await logout();
    navigate('/solar/hr/portal/login');
  };

  return (
    <div className="portal-root">
      {/* ── Desktop Top Navigation Header (>= 768px) ── */}
      <PortalDesktopHeader />

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#0284c7',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.72rem',
          }}>
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>

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
