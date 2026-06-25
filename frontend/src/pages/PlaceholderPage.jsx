import React from 'react';

const PlaceholderPage = ({ title }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '500px' }}>
        This module is currently a placeholder. The backend API is ready and the frontend UI will be implemented soon as per your requirements.
      </p>
      <div style={{ marginTop: '2rem', padding: '2rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)' }}>
        🚧 Work in Progress 🚧
      </div>
    </div>
  );
};

export default PlaceholderPage;
