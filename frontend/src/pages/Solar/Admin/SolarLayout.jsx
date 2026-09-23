import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SolarSidebar } from './SolarSidebar';
import { SolarNavbar } from './SolarNavbar';

const SolarLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileOpen = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileOpen = () => {
    setIsMobileOpen(false);
  };

  return (
    <div 
      className="app-container" 
      style={{
        '--primary': '#eab308', // Tailwind yellow-500
        '--primary-light': '#fef08a', 
        '--primary-dark': '#ca8a04',
        '--primary-alpha': 'rgba(234, 179, 8, 0.1)',
      }}
    >
      <SolarSidebar isMobileOpen={isMobileOpen} closeMobileOpen={closeMobileOpen} />
      <div className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} onClick={closeMobileOpen}></div>
      <div className="main-content">
        <SolarNavbar toggleMobileOpen={toggleMobileOpen} />
        <main className="page-container" onClick={() => isMobileOpen && closeMobileOpen()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SolarLayout;
