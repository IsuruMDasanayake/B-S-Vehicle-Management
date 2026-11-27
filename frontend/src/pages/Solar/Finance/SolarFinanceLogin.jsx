import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import toast from 'react-hot-toast';

const SolarFinanceLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (isAuthenticated && user) {
      const hasFinanceRole = ['super_admin', 'solar_finance_admin', 'solar_admin']
        .some(role => user?.roles?.includes(role) || user?.role === role);

      if (hasFinanceRole) {
        navigate('/solar/finance/admin/dashboard');
      } else {
        toast.dismiss();
        useAuthStore.getState().logout();
        setTimeout(() => {
          toast.dismiss();
          toast.error('Unauthorized: You do not have access to Solar Finance Division.');
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

        {/* Back Link */}
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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
            width: '64px', height: '64px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}>
            <Landmark size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Finance Division Login</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Sign in to cash management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="you@circlegroup.lk"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Password
            </label>
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
              width: '100%', padding: '0.75rem', marginTop: '0.75rem',
              background: '#10b981', borderColor: '#10b981',
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In to Finance Portal'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px dashed rgba(16, 185, 129, 0.25)',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
        }}>
          💡 <strong>Cash Management Portal</strong>: Petty cash, project expenses, approvals & P&L.
        </div>
      </div>
    </div>
  );
};

export default SolarFinanceLogin;
