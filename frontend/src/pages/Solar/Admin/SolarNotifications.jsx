import { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const SolarNotifications = () => {
  const [sites, setSites] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    site_id: 'all',
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    fetchSites();
    fetchHistory();
  }, []);

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/solar/sites');
      setSites(data);
    } catch (error) {
      toast.error('Failed to load sites');
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/solar/notifications/history');
      setHistory(data.data || []);
    } catch (error) {
      toast.error('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/solar/notifications/send', formData);
      toast.success('Notification sent successfully');
      setFormData({ site_id: 'all', title: '', message: '', type: 'info' });
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Push Notifications</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)' }}>Send messages to Site Supervisor portals</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'start' }}>
        {/* Send Notification Form */}
        <div className="card" style={{ padding: '1.5rem', flex: '1 1 350px', position: 'sticky', top: '100px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1.5rem' }}>Send Notification</h2>
          
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Target Site</label>
              <select 
                className="form-control" 
                value={formData.site_id} 
                onChange={e => setFormData({...formData, site_id: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="all">Broadcast to All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notification Type</label>
              <select 
                className="form-control" 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="info">Information</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Critical Error</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                required 
                placeholder="e.g. System Update"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message</label>
              <textarea 
                className="form-control" 
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})} 
                required 
                placeholder="Detailed message..."
                style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: '0.5rem' }}>
              {submitting ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="card" style={{ flex: '2 1 500px' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Notification History</h2>
          </div>
          
          <div style={{ padding: '1.5rem', overflowX: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</p>
            ) : history.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No notifications sent yet.</p>
            ) : (
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Site</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Message</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500 }}>{new Date(item.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>
                        {item.site_name}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.data.title}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{item.data.message}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sent by: {item.data.sender_name}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {item.read_at ? (
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            Read at<br/>{new Date(item.read_at).toLocaleDateString()}<br/>{new Date(item.read_at).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            Unread
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolarNotifications;
