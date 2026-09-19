import React from 'react';
import RideLogsList from '../RideLogs/RideLogsList';

const ManageLogs = () => {
  return (
    <div>
      {/* <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Manage Performance Logs</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Approve or reject submitted daily logs. Only approved logs are calculated in the performance metrics.
        </p>
      </div> */}
      
      {/* We can reuse the entire RideLogsList component here for full functionality */}
      <div style={{ marginTop: '-2rem' }}>
        <RideLogsList />
      </div>
    </div>
  );
};

export default ManageLogs;
