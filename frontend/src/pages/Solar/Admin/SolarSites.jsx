import { useState, useEffect } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';

const SolarSites = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    notes: '',
    is_active: true
  });

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/solar/sites');
      setSites(data);
    } catch (error) {
      toast.error('Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSite) {
        await api.put(`/solar/sites/${editingSite.id}`, formData);
        toast.success('Site updated successfully');
      } else {
        await api.post('/solar/sites', formData);
        toast.success('Site created successfully');
      }
      setIsModalOpen(false);
      fetchSites();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving site');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setSiteToDelete(null);
    fetchSites();
  };

  const openModal = (site = null) => {
    if (site) {
      setEditingSite(site);
      setFormData({
        name: site.name,
        location: site.location || '',
        notes: site.notes || '',
        is_active: site.is_active == 1 || site.is_active === true
      });
    } else {
      setEditingSite(null);
      setFormData({ name: '', location: '', notes: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Solar Sites</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Add New Site</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <th style={{ padding: '1rem' }}>Site Name</th>
              <th style={{ padding: '1rem' }}>Location</th>
              <th style={{ padding: '1rem' }}>Projects</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sites.map(site => (
              <tr key={site.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{site.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{site.location || '-'}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {site.projects_count} Projects
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', 
                    fontSize: '0.85rem', 
                    fontWeight: 500,
                    background: site.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                    color: site.is_active ? '#22c55e' : '#64748b'
                  }}>
                    {site.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button onClick={() => openModal(site)} className="btn btn-ghost" style={{ padding: '0.5rem', marginRight: '0.5rem', color: 'var(--text-secondary)' }} title="Edit"><Edit size={18} /></button>
                  <button onClick={() => setSiteToDelete(site)} className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} title="Delete"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No solar sites added yet. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              {editingSite ? 'Edit Site' : 'Add New Site'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Site Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                  style={{ width: '100%' }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
                <textarea 
                  className="form-control" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_active} 
                    onChange={e => setFormData({...formData, is_active: e.target.checked})} 
                    style={{ margin: 0, width: '1.2rem', height: '1.2rem' }}
                  />
                  <span>Site is Active</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Site..' : (editingSite ? 'Save Changes' : 'Save Site')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={!!siteToDelete}
        onClose={() => setSiteToDelete(null)}
        onDeleted={handleDelete}
        endpoint={`/solar/sites/${siteToDelete?.id}`}
        itemName={`Site ${siteToDelete?.name}`}
      />
    </div>
  );
};

export default SolarSites;
