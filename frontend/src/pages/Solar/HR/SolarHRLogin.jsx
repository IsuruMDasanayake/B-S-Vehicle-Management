import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import toast from 'react-hot-toast';

const SolarHRLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      const hasHRRole = ['super_admin', 'solar_hr_admin', 'solar_employee']
        .some(role => user?.roles?.includes(role) || user?.role === role);
        
      if (hasHRRole) {
        navigate('/solar/hr/dashboard');
      } else {
        toast.dismiss();
        useAuthStore.getState().logout();
        setTimeout(() => {
          toast.dismiss();
          toast.error('Unauthorized: You do not have access to the Solar HR Division.');
        }, 100);
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--surface)',
      padding: '1rem',
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>

        <button
          onClick={() => navigate('/solar/portal')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.82rem', padding: 0,
            marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          ← Back to Solar Portal
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            width: '64px', height: '64px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}>
            <Users size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>HR Division Login</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@circlegroup.lk"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%', padding: '0.75rem', marginTop: '1rem',
              background: '#3b82f6', borderColor: '#3b82f6',
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SolarHRLogin;
