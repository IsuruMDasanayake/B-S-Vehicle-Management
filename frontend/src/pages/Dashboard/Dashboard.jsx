import { useState, useEffect } from 'react';
import { CarFront, AlertTriangle, Users, MapPin, Activity } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [kpiStats, setKpiStats] = useState({
    total_vehicles: 0,
    active_drivers: 0,
    under_maintenance: 0,
    on_trip: 0
  });

  useEffect(() => {
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data && res.data.stats) {
        setKpiStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/notifications');
      setAlerts(res.data.notifications ? res.data.notifications.slice(0, 5) : []);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
    }
  };

  const triggerAlerts = async () => {
    setIsGenerating(true);
    try {
      await api.post('/notifications/generate');
      toast.success('Alerts generated successfully');
      fetchAlerts();
      // Dispatch a custom event so Navbar can refresh its count immediately
      window.dispatchEvent(new Event('notifications_updated'));
    } catch (err) {
      toast.error('Failed to generate alerts');
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = [
    { title: 'Total Vehicles', value: kpiStats.total_vehicles, icon: CarFront, color: 'var(--info)' },
    { title: 'Active Drivers', value: kpiStats.active_drivers, icon: Users, color: 'var(--success)' },
    { title: 'Under Maintenance', value: kpiStats.under_maintenance, icon: AlertTriangle, color: 'var(--warning)' },
    { title: 'On Trip', value: kpiStats.on_trip, icon: MapPin, color: 'var(--primary)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back to B&S Vehicle Management</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* <button 
            className="btn btn-ghost" 
            onClick={triggerAlerts} 
            disabled={isGenerating}
            style={{ border: '1px solid var(--surface-2)' }}
          >
            <Activity size={16} /> {isGenerating ? 'Generating...' : 'Simulate Alerts'}
          </button> */}
          <button className="btn btn-primary">Generate Report</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                background: `${stat.color}15`,
                color: stat.color,
                width: '56px', height: '56px',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={28} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {stat.title}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Placeholder for Chart */}
        <div className="card" style={{ minHeight: '300px' }}>
          <h3>Fuel Consumption Overview</h3>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [ Chart Placeholder ]
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="card" style={{ minHeight: '300px' }}>
          <h3>Recent Alerts</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {alerts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent alerts.</div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-2)' }}>
                  <div style={{ 
                    width: 8, height: 8, borderRadius: '50%', 
                    background: `var(--${alert.data.type || 'info'})`, 
                    marginTop: 6 
                  }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{alert.data.title}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{alert.data.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
