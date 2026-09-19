import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun } from 'lucide-react';

const SolarLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Placeholder — Solar auth will be implemented when the Solar module is built
  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Solar division portal is coming soon.');
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

        {/* Back link */}
        <button
          onClick={() => navigate('/portal')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: '0.82rem', padding: 0,
            marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}
        >
          ← Back to Portal
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            width: '64px', height: '64px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto',
          }}>
            <Sun size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Solar Division</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to your account</p>
        </div>

        {/* Coming Soon notice */}
        <div style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1.5rem',
          textAlign: 'center',
        }}>
          <p style={{ color: '#d97706', fontWeight: 600, margin: '0 0 0.4rem', fontSize: '0.9rem' }}>
            🚧 Solar Module — Coming Soon
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
            The Solar portal is currently under development. Login will be available once the module is launched.
          </p>
        </div>

        {/* Form (disabled state) */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@circlegroup.lk"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled
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
              disabled
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%', padding: '0.75rem', marginTop: '1rem',
              background: '#f59e0b', borderColor: '#f59e0b', opacity: 0.6,
            }}
            disabled
          >
            Sign In (Coming Soon)
          </button>
        </form>
      </div>
    </div>
  );
};

export default SolarLogin;
