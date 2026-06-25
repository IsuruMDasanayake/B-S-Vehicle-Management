import { Activity } from 'lucide-react';

const PerformanceDashboard = () => {
  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Performance View</h1>
          <p style={{ color: 'var(--text-muted)' }}>Analyze vehicle and driver performance metrics.</p>
        </div>
      </div>

      <div className="card" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Activity size={64} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
        <h2>Performance Dashboard</h2>
        <p>This module is currently under construction. Check back soon for detailed analytics!</p>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
