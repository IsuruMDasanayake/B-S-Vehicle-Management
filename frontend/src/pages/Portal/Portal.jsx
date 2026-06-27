import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { LayoutDashboard, Map, Activity, LogOut } from 'lucide-react';

const Portal = () => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  // Determine if the user is a driver
  const isDriver = user?.roles?.includes('driver');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Portal Header */}
      {/* <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--surface-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            width: '40px', height: '40px',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '1.2rem'
          }}>
            B&S
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Vehicle Management Portal</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Welcome back, {user?.name || 'User'}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </header> */}

      {/* Portal Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Select an Application</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '3rem', textAlign: 'center' }}>
          Choose a module below to access your workspace.
        </p>

        <div 
          className={isDriver ? 'grid-cols-2' : 'grid-cols-3'}
          style={{
            display: 'grid',
            gridTemplateColumns: isDriver ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '2rem',
            maxWidth: '1000px',
            width: '100%'
          }}>
          {/* Dashboard Card */}
          <div 
            className="card portal-card" 
            onClick={() => navigate('/dashboard')}
            style={{ 
              cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem',
              border: '1px solid var(--surface-2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--surface-2)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          >
            <div style={{ background: 'var(--primary-alpha)', color: 'var(--primary)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <LayoutDashboard size={40} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Main Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Access your daily operations, fleet status, and pending tasks.</p>
          </div>

          {/* GPS Card */}
          <div 
            className="card portal-card" 
            onClick={() => navigate('/gps')}
            style={{ 
              cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem',
              border: '1px solid var(--surface-2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--info)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--surface-2)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          >
            <div style={{ background: 'var(--info-light)', color: 'var(--info)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Map size={40} />
            </div>
            <h2 style={{ marginBottom: '0.5rem' }}>Live GPS Tracking</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Track vehicle locations, routes, and live telemetry data.</p>
          </div>

          {/* Performance View Card (Hidden from Drivers) */}
          {!isDriver && (
            <div 
              className="card portal-card" 
              onClick={() => navigate('/performance')}
              style={{ 
                cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem',
                border: '1px solid var(--surface-2)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = 'var(--success)'; e.currentTarget.style.boxShadow = 'var(--shadow-xl)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--surface-2)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            >
              <div style={{ background: 'var(--success-light)', color: 'var(--success)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Activity size={40} />
              </div>
              <h2 style={{ marginBottom: '0.5rem' }}>Performance View</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Analyze fleet efficiency, driver behavior, and key metrics.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Portal;
