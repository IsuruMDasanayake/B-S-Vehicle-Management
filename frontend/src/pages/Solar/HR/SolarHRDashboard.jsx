import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import useAuthStore from '../../../store/authStore';

const SolarHRDashboard = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);

  const handleLogout = async () => {
    await logout();
    navigate('/solar/hr/login');
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
          background: 'rgba(59,130,246,0.1)',
          color: '#3b82f6',
          width: '72px', height: '72px',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem auto',
          fontSize: '2.2rem',
        }}>
          <Users size={32} />
        </div>

        <h1 style={{ fontSize: '1.8rem', marginBottom: '0.75rem' }}>HR Division Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Welcome to the Solar HR Division.
          Employee management and payroll features will be available here soon.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
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

export default SolarHRDashboard;
