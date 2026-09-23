import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Edit, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';

const SolarProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [formData, setFormData] = useState({
    solar_site_id: '',
    name: '',
    client_name: '',
    status: 'active',
    start_date: '',
    expected_completion: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [projRes, sitesRes] = await Promise.all([
        api.get('/solar/projects'),
        api.get('/solar/sites')
      ]);
      setProjects(projRes.data);
      setSites(sitesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingProject) {
        await api.put(`/solar/projects/${editingProject.id}`, formData);
        toast.success('Project updated');
      } else {
        await api.post('/solar/projects', formData);
        toast.success('Project created with milestone sections');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    setProjectToDelete(null);
    fetchData();
  };


  const openModal = (proj = null) => {
    if (proj) {
      setEditingProject(proj);
      setFormData({
        solar_site_id: proj.solar_site_id,
        name: proj.name,
        client_name: proj.client_name || '',
        status: proj.status,
        start_date: proj.start_date || '',
        expected_completion: proj.expected_completion || '',
        notes: proj.notes || '',
      });
    } else {
      setEditingProject(null);
      setFormData({
        solar_site_id: sites[0]?.id || '',
        name: '',
        client_name: '',
        status: 'active',
        start_date: '',
        expected_completion: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Solar Projects</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>+ Create Project</button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <th style={{ padding: '1rem' }}>Project Name</th>
              <th style={{ padding: '1rem' }}>Site</th>
              <th style={{ padding: '1rem' }}>Client</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(proj => (
              <tr key={proj.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{proj.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{proj.sections_count} Sections</div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{proj.site?.name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{proj.client_name || '-'}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '999px', 
                    fontSize: '0.85rem', 
                    fontWeight: 500,
                    background: proj.status === 'active' ? 'rgba(34,197,94,0.1)' : 
                                proj.status === 'completed' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                    color: proj.status === 'active' ? '#22c55e' : 
                           proj.status === 'completed' ? '#3b82f6' : '#f59e0b'
                  }}>
                    {proj.status.charAt(0).toUpperCase() + proj.status.slice(1)}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button onClick={() => window.open(`/solar/admin/projects/${proj.id}`, '_blank')} className="btn btn-primary" style={{ padding: '0.5rem', marginRight: '0.5rem' }}>View Milestones</button>
                  <button onClick={() => openModal(proj)} className="btn btn-ghost" style={{ padding: '0.5rem', marginRight: '0.5rem', color: 'var(--text-secondary)' }} title="Edit"><Edit size={18} /></button>
                  <button onClick={() => setProjectToDelete(proj)} className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} title="Delete"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No projects created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--text-muted)' }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Site *</label>
                <select 
                  className="form-control" 
                  value={formData.solar_site_id} 
                  onChange={e => setFormData({...formData, solar_site_id: e.target.value})} 
                  required 
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose a site --</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Project Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.client_name} 
                    onChange={e => setFormData({...formData, client_name: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Status</label>
                  <select 
                    className="form-control" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})} 
                    style={{ width: '100%' }}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Expected Completion</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={formData.expected_completion} 
                    onChange={e => setFormData({...formData, expected_completion: e.target.value})} 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
                <textarea 
                  className="form-control" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-ghost" disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving Project..' : (editingProject ? 'Save Changes' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal 
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onDeleted={handleDelete}
        endpoint={`/solar/projects/${projectToDelete?.id}`}
        itemName={`Project ${projectToDelete?.name}`}
      />
    </div>
  );
};

export default SolarProjects;
