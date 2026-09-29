import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HRSidebar } from './HRSidebar';
import { HRNavbar } from './HRNavbar';

const HRLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileOpen = () => setIsMobileOpen(!isMobileOpen);
  const closeMobileOpen = () => setIsMobileOpen(false);

  return (
    <div
      className="app-container"
      style={{
        '--primary': '#3b82f6',
        '--primary-light': '#93c5fd',
        '--primary-dark': '#1d4ed8',
        '--primary-alpha': 'rgba(59, 130, 246, 0.1)',
      }}
    >
      <HRSidebar isMobileOpen={isMobileOpen} closeMobileOpen={closeMobileOpen} />
      <div className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} onClick={closeMobileOpen} />
      <div className="main-content">
        <HRNavbar toggleMobileOpen={toggleMobileOpen} />
        <main className="page-container" onClick={() => isMobileOpen && closeMobileOpen()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HRLayout;
