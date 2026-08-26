import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PerformanceSidebar from './PerformanceSidebar';
import Navbar from '../../components/layout/Navbar';

const PerformanceLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileOpen = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobileOpen = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="app-container">
      <PerformanceSidebar isMobileOpen={isMobileOpen} closeMobileOpen={closeMobileOpen} />
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

export default PerformanceLayout;
