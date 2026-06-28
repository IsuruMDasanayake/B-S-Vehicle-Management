import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import GpsSidebar from './GpsSidebar';
import Navbar from '../../components/layout/Navbar';

const GpsLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileOpen = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileOpen = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="app-container">
      <GpsSidebar isMobileOpen={isMobileOpen} closeMobileOpen={closeMobileOpen} />
      <div className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} onClick={closeMobileOpen}></div>
      <div className="main-content">
        <Navbar toggleMobileOpen={toggleMobileOpen} />
        <main className="page-container" onClick={() => isMobileOpen && closeMobileOpen()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GpsLayout;
