import { useState, useEffect } from 'react';
import { Activity, TrendingUp, DollarSign, Fuel, Navigation } from 'lucide-react';
import api from '../../services/api';

const PerformanceDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/daily-ride-logs-analytics');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Performance View</h1>
          <p style={{ color: 'var(--text-muted)' }}>Analyze vehicle and driver performance metrics based on approved daily logs.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading metrics...</div>
      ) : analytics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '1rem', borderRadius: '50%' }}>
              <TrendingUp size={32} />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Net Revenue</p>
              <h2 style={{ margin: 0 }}>Rs {analytics.total_net?.toLocaleString()}</h2>
            </div>
          </div>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '50%' }}>
              <DollarSign size={32} />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Gross Revenue</p>
              <h2 style={{ margin: 0 }}>Rs {analytics.total_gross?.toLocaleString()}</h2>
            </div>
          </div>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '1rem', borderRadius: '50%' }}>
              <Fuel size={32} />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Fuel Expenses</p>
              <h2 style={{ margin: 0 }}>Rs {analytics.total_fuel?.toLocaleString()}</h2>
            </div>
          </div>
          
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '1rem', borderRadius: '50%' }}>
              <Navigation size={32} />
            </div>
            <div>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Distance</p>
              <h2 style={{ margin: 0 }}>{analytics.total_km} km</h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Hire: {analytics.hire_km} km | Empty: {analytics.empty_km} km
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Activity size={64} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <h2>Performance Dashboard</h2>
          <p>No analytics data available yet.</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
