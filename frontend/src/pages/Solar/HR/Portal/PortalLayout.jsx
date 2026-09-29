import { Outlet } from 'react-router-dom';
import PortalNav from './PortalNav';

const PortalLayout = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface)',
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
    }}>
      <main style={{
        paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
        minHeight: '100vh',
      }}>
        <Outlet />
      </main>
      <PortalNav />
    </div>
  );
};

export default PortalLayout;
