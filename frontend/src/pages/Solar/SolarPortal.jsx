import { useNavigate } from 'react-router-dom';
import { Sun, Users } from 'lucide-react';

const SolarPortal = () => {
  const navigate = useNavigate();

  const subdivisions = [
    {
      id: 'dashboard',
      title: 'Project Dashboard',
      subtitle: 'Manage Projects',
      description: 'Enterprise solar project management, installations, monitoring & client reporting.',
      icon: <Sun size={32} />,
      hoverColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.1)',
      iconColor: '#f59e0b',
      path: '/solar/login',
    },
    {
      id: 'hr',
      title: 'HR Division',
      subtitle: 'Manage Employees',
      description: 'Solar division human resources, employee records, payroll & attendance.',
      icon: <Users size={32} />,
      hoverColor: '#3b82f6',
      iconBg: 'rgba(59,130,246,0.1)',
      iconColor: '#3b82f6',
      path: '/solar/hr/login',
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            Solar Division
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 0, textAlign: 'center' }}>
            Select a sub-division to access your portal.
          </p>
        </div>

        <div
          className="grid-cols-2"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2rem',
            maxWidth: '700px',
            width: '100%',
          }}
        >
          {subdivisions.map(div => (
            <div
              key={div.id}
              className="card portal-card"
              onClick={() => navigate(div.path)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '1px solid var(--surface-2)',
                position: 'relative',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = div.hoverColor;
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--surface-2)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <div
                className="portal-card-icon"
                style={{ background: div.iconBg, color: div.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {div.icon}
              </div>

              <div className="portal-card-content">
                <h2>{div.title}</h2>
                <p style={{ marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: div.hoverColor,
                  }}>
                    {div.subtitle}
                  </span>
                </p>
                <p>{div.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/portal')}
          className="btn btn-ghost"
          style={{ marginTop: '3rem', border: '1px solid var(--surface-2)' }}
        >
          ← Back to Main Portal
        </button>
      </main>
    </div>
  );
};

export default SolarPortal;
