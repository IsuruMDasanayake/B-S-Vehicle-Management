import { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const SolarSupervisors = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/solar/sites');
      setSites(data);
    } catch (error) {
      toast.error('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const regenerateToken = async (siteId) => {
    if (!window.confirm('Are you sure? The previous upload link will immediately stop working!')) return;
    try {
      await api.post(`/solar/sites/${siteId}/regenerate-token`);
      toast.success('Upload link regenerated!');
      fetchSites();
    } catch (error) {
      toast.error('Failed to regenerate token');
    }
  };

  const copyToClipboard = (token) => {
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Upload link copied to clipboard!');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Supervisor Upload Links</h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Share these unique, secure links with your field supervisors. No login is required. 
          When they upload images through a link, the images are automatically categorized under that specific site.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {sites.map(site => {
          const uploadUrl = `${window.location.origin}/upload/${site.supervisor_token}`;
          return (
            <div key={site.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0' }}>{site.name}</h3>
                  <span style={{ 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    background: site.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                    color: site.is_active ? '#22c55e' : '#64748b'
                  }}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '2rem' }}>📍</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Public Upload Link
                </label>
                <div style={{ 
                  display: 'flex', 
                  background: 'var(--surface-2)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: 'var(--radius)', 
                  border: '1px solid var(--border)' 
                }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={uploadUrl} 
                    style={{ 
                      flex: 1, 
                      background: 'transparent', 
                      border: 'none', 
                      outline: 'none', 
                      color: 'var(--text)',
                      fontSize: '0.9rem'
                    }} 
                  />
                  <button 
                    onClick={() => copyToClipboard(site.supervisor_token)}
                    className="btn btn-ghost" 
                    style={{ padding: '0.25rem 0.5rem', minHeight: 'unset', fontSize: '0.85rem' }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button 
                  onClick={() => regenerateToken(site.id)}
                  className="btn btn-ghost" 
                  style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem' }}
                >
                  Revoke & Regenerate Link
                </button>
              </div>
            </div>
          );
        })}

        {sites.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
            No sites available. Please create a site first.
          </div>
        )}
      </div>
    </div>
  );
};

export default SolarSupervisors;
