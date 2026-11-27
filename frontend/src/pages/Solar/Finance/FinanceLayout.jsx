import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FinanceSidebar } from './FinanceSidebar';
import { FinanceNavbar } from './FinanceNavbar';

const FinanceLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobileOpen = () => setIsMobileOpen(!isMobileOpen);
  const closeMobileOpen = () => setIsMobileOpen(false);

  return (
    <div
      className="app-container"
      style={{
        '--primary': '#10b981',
        '--primary-light': '#a7f3d0',
        '--primary-dark': '#047857',
        '--primary-alpha': 'rgba(16, 185, 129, 0.1)',
      }}
    >
      <FinanceSidebar isMobileOpen={isMobileOpen} closeMobileOpen={closeMobileOpen} />
      <div className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`} onClick={closeMobileOpen} />
      <div className="main-content">
        <FinanceNavbar toggleMobileOpen={toggleMobileOpen} />
        <main className="page-container" onClick={() => isMobileOpen && closeMobileOpen()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default FinanceLayout;
