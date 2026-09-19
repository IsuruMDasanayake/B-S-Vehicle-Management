import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
const SolarPortal = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  const handleLogout = async () => {
    await logout();
    navigate('/solar/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '3rem 2rem' }}>
        <div style={{
          background: 'rgba(245,158,11,0.1)',
          color: '#f59e0b',
          width: '72px', height: '72px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          fontSize: '2.2rem',
        }}>
          ☀️
        </div>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>Solar Division Portal</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          The CircleGroup Solar project management portal is under development.
          This space will house project tracking, installation management,
          energy monitoring dashboards, and client reporting.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
          {['Project Management', 'Installation Tracking', 'Energy Monitoring', 'Client Reports', 'Inventory'].map(feature => (
            <span key={feature} style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#d97706',
              padding: '0.3rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}>
              {feature}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/portal')}
            className="btn btn-ghost"
            style={{ border: '1px solid var(--surface-2)' }}
          >
            ← Back to Main Portal
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ border: '1px solid #ef4444', color: '#ef4444' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolarPortal;
