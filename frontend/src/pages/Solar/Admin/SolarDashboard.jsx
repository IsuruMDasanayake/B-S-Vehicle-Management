import { useState, useEffect } from 'react';
import { MapPin, Briefcase, Image as ImageIcon, UploadCloud } from 'lucide-react';
import api from '../../../services/api';

const SolarDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/solar/stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  const statCards = [
    { title: 'Total Sites', value: stats?.total_sites || 0, icon: MapPin, color: 'var(--info)', bg: 'var(--info-alpha)' },
    { title: 'Active Projects', value: stats?.active_projects || 0, icon: Briefcase, color: 'var(--success)', bg: 'var(--success-alpha)' },
    { title: 'Total Images', value: stats?.total_images || 0, icon: ImageIcon, color: 'var(--warning)', bg: 'var(--warning-alpha)' },
    { title: 'Uploads Today', value: stats?.today_images || 0, icon: UploadCloud, color: 'var(--primary)', bg: 'var(--primary-alpha)' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back to CircleGroup Solar Division</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary">Generate Report</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                background: stat.bg,
                color: stat.color,
                width: '48px', height: '48px',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {stat.title}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {stat.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid-layout-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Placeholder for Chart */}
        <div className="card" style={{ minHeight: '300px' }}>
          <h3>Upload Activity Overview</h3>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            [ Chart Placeholder ]
          </div>
        </div>

        {/* Recent Uploads Panel */}
        <div className="card" style={{ minHeight: '300px' }}>
          <h3>Recent Uploads</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats?.recent_activity?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No recent activity.</div>
            ) : (
              stats?.recent_activity?.map(batch => (
                <div key={batch.id} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-2)' }}>
                  <div style={{ 
                    width: 8, height: 8, borderRadius: '50%', 
                    background: batch.has_issue ? 'var(--danger)' : 'var(--success)', 
                    marginTop: 6 
                  }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {batch.section?.project?.name} - {batch.section?.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {batch.images?.length || 0} images uploaded by supervisor
                      {batch.has_issue && <span style={{ color: 'var(--danger)', display: 'block' }}>⚠️ Issue Reported</span>}
                    </div>
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

export default SolarDashboard;
