import { Outlet } from 'react-router-dom';
import GpsSidebar from './GpsSidebar';
import Navbar from '../../components/layout/Navbar';

const GpsLayout = () => {
  return (
    <div className="app-container">
      <GpsSidebar />
      <div className="main-content">
        <Navbar />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GpsLayout;
