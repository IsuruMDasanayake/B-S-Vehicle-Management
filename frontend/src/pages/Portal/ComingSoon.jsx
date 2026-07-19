import { CarFront } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--text-primary)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'var(--primary)',
        color: 'white',
        padding: '1.5rem',
        borderRadius: '50%',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CarFront size={64} />
      </div>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>Coming Soon</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '600px' }}>
        We are working hard to bring you a new experience. Please check back later.
      </p>
    </div>
  );
};

export default ComingSoon;
