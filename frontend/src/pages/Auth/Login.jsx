import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { CarFront } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/portal');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login({ email, password });
    if (success) {
      navigate('/portal');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--surface)',
      padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            width: '64px', height: '64px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <CarFront size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>B&S Transport</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              placeholder="admin@bstransport.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Password
              <a href="#" style={{ fontSize: '0.8rem', fontWeight: 400 }}>Forgot password?</a>
            </label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
