import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Alerts = () => {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'alerts', 'activity'

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const r = await api.get('/alerts');
      setFeed(r.data.data || []);
    } catch {
      toast.error('Failed to load alerts and activity');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      toast.success('Alert dismissed');
      setFeed(feed.filter(item => item.id !== id));
    } catch {
      toast.error('Failed to dismiss alert');
    }
  };

  const filteredFeed = feed.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'alerts') return item.type === 'alert';
    if (filter === 'activity') return item.type === 'activity';
    return true;
  });

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger': return '🔴';
      case 'warning': return '🟠';
      case 'info': return '🔵';
      case 'success': return '🟢';
      default: return '⚪';
    }
  };

  const renderActivityDetails = (item) => {
    if (item.type !== 'activity' || !item.properties) return null;
    
    const { attributes, old } = item.properties;
    if (!attributes) return null;

    const changes = [];
    const ignoredKeys = ['updated_at', 'created_at', 'id'];

    for (const key in attributes) {
      if (ignoredKeys.includes(key)) continue;

      if (old && old[key] !== undefined) {
        if (old[key] !== attributes[key]) {
          changes.push(
            <li key={key} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>{key}:</strong> <s>{String(old[key])}</s> <span>&rarr; {String(attributes[key])}</span>
            </li>
          );
        }
      } else {
        changes.push(
          <li key={key} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <strong>{key}:</strong> {String(attributes[key])}
          </li>
        );
      }
    }

    if (changes.length === 0) return null;

    return (
      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', marginBottom: 0 }}>
        {changes}
      </ul>
    );
  };

  return (
    <div style={{ padding: '0rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Alerts & Activity</h1>
          <p style={{ color: 'var(--text-muted)' }}>Unified system notifications and user tracking</p>
        </div>
        
        {/* Tabs for mobile responsiveness */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button 
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('all')}
          >
            All Feed
          </button>
          <button 
            className={`btn ${filter === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('alerts')}
          >
            System Alerts
          </button>
          <button 
            className={`btn ${filter === 'activity' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('activity')}
          >
            User Activity
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading feed...</div>
        ) : filteredFeed.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredFeed.map((item, index) => (
              <div 
                key={item.id + '_' + index}
                style={{ 
                  padding: '1.5rem', 
                  borderBottom: index < filteredFeed.length - 1 ? '1px solid var(--border-color)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  {/* Content Area */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      {item.type === 'alert' ? (
                        <span style={{ fontSize: '1.25rem' }}>{getAlertIcon(item.alert_type)}</span>
                      ) : (
                        <span style={{ fontSize: '1.25rem' }}>🧑‍💻</span>
                      )}
                      <strong style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>
                        {item.type === 'alert' ? item.title : `${item.description} ${item.subject_type}`}
                      </strong>
                      
                      {item.type === 'alert' && !item.read_at && (
                        <span className="badge badge-danger">New</span>
                      )}
                      
                      {item.type === 'activity' && (
                        <span className="badge badge-primary">{item.subject_name}</span>
                      )}
                    </div>
                    
                    <p style={{ color: 'var(--text-color)', margin: 0, lineHeight: 1.5 }}>
                      {item.type === 'alert' ? item.message : `Action performed by ${item.causer_name}`}
                    </p>
                    {renderActivityDetails(item)}
                  </div>

                  {/* Meta / Actions Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '150px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm a')}
                    </span>
                    
                    {item.type === 'alert' && !item.read_at && (
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleMarkAsRead(item.id)}
                        style={{ marginTop: '0.5rem' }}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Alerts;
