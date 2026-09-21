import { useNavigate } from 'react-router-dom';

const CircleGroupLanding = () => {
  const navigate = useNavigate();

  const divisions = [
    {
      id: 'vehicle',
      title: 'Vehicle Division',
      subtitle: 'Transport Services',
      description: 'Fleet management, ride-hailing operations, driver performance & GPS tracking.',
      icon: '🚗',
      hoverColor: 'var(--primary)',
      iconBg: 'var(--primary-alpha)',
      iconColor: 'var(--primary)',
      available: true,
      path: '/vehicle/login',
    },
    {
      id: 'solar',
      title: 'Solar Division',
      subtitle: 'Manage Solar Energy',
      description: 'Enterprise solar project management, installations, monitoring & client reporting.',
      icon: '☀️',
      hoverColor: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.1)',
      iconColor: '#f59e0b',
      available: true,
      path: '/solar/login',
    },
    {
      id: 'plantation',
      title: 'Plantation Division',
      subtitle: 'Coming Soon',
      description: 'Plantation operations, crop management, and agricultural logistics.',
      icon: '🌿',
      hoverColor: '#6366f1',
      iconBg: 'rgba(99,102,241,0.08)',
      iconColor: '#6366f1',
      available: false,
      path: null,
    },
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
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          
            
          
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            CircleGroup
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 0, textAlign: 'center' }}>
            Select a division to access your portal.
          </p>
        </div>

        {/* Division Cards — same grid + card structure as Portal.jsx */}
        <div
          className="grid-cols-3"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2rem',
            maxWidth: '1000px',
            width: '100%',
          }}
        >
          {divisions.map(div => (
            <div
              key={div.id}
              className="card portal-card"
              onClick={() => div.available && div.path && navigate(div.path)}
              style={{
                cursor: div.available && div.path ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                border: '1px solid var(--surface-2)',
                opacity: div.available ? 1 : 0.5,
                position: 'relative',
              }}
              onMouseOver={e => {
                if (!div.available) return;
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
              {/* Coming Soon badge */}
              {!div.available && (
                <span style={{
                  position: 'absolute', top: '0.9rem', right: '0.9rem',
                  background: 'var(--surface-2)', color: 'var(--text-muted)',
                  fontSize: '0.68rem', fontWeight: 700,
                  padding: '0.18rem 0.5rem', borderRadius: '999px',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  Soon
                </span>
              )}

              <div
                className="portal-card-icon"
                style={{ background: div.iconBg, color: div.iconColor }}
              >
                <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{div.icon}</span>
              </div>

              <div className="portal-card-content">
                <h2>{div.title}</h2>
                <p style={{ marginBottom: '0.25rem' }}>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: div.available ? div.hoverColor : 'var(--text-muted)',
                  }}>
                    {div.subtitle}
                  </span>
                </p>
                <p>{div.description}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '3rem' }}>
          © {new Date().getFullYear()} CircleGroup · circlegroup.lk
        </p>
      </main>
    </div>
  );
};

export default CircleGroupLanding;
