import { Outlet } from 'react-router-dom';
import PerformanceSidebar from './PerformanceSidebar';
import Navbar from '../../components/layout/Navbar';

const PerformanceLayout = () => {
  return (
    <div className="app-container">
      <PerformanceSidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PerformanceLayout;
