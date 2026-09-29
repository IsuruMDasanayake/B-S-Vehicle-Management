import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, ArrowLeft } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmDeleteModal from '../../../../components/ui/ConfirmDeleteModal';

const LocationsList = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius_meters: 500, status: 'active' });

  const fetchLocations = async () => {
    try {
      const res = await api.get('/hr/locations');
      setLocations(res.data);
    } catch (err) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, []);

  const openAdd = () => { setForm({ name: '', latitude: '', longitude: '', radius_meters: 500, status: 'active' }); setEditItem(null); setShowModal(true); };
  const openEdit = (loc) => { setForm({ name: loc.name, latitude: loc.latitude, longitude: loc.longitude, radius_meters: loc.radius_meters, status: loc.status }); setEditItem(loc); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.latitude || !form.longitude) return toast.error('Name, Latitude, and Longitude are required');
    
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/hr/locations/${editItem.id}`, form);
        toast.success('Location updated');
      } else {
        await api.post('/hr/locations', form);
        toast.success('Location added');
      }
      setShowModal(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading locations...</div>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/solar/hr/admin/attendance')} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem' }}>Clock-In Locations</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Manage authorized GPS zones for employee attendance</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add Location
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)' }}>LOCATION NAME</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)' }}>COORDINATES</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)' }}>RADIUS</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)' }}>STATUS</th>
              <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No locations configured.</td></tr>
            ) : locations.map(loc => (
              <tr key={loc.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                <td style={{ padding: '0.875rem 1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} color="#3b82f6" /> {loc.name}
                </td>
                <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {loc.latitude}, {loc.longitude}
                </td>
                <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.85rem' }}>
                  {loc.radius_meters}m
                </td>
                <td style={{ padding: '0.875rem 1.25rem' }}>
                  <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: loc.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', color: loc.status === 'active' ? '#22c55e' : '#6b7280', textTransform: 'capitalize' }}>
                    {loc.status}
                  </span>
                </td>
                <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(loc)} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteItem(loc)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{editItem ? 'Edit Location' : 'Add Location'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Location Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Head Office" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Latitude</label>
                  <input type="number" step="any" className="form-control" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="e.g. 6.9271" required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Longitude</label>
                  <input type="number" step="any" className="form-control" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="e.g. 79.8612" required />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Radius (meters)</label>
                  <input type="number" className="form-control" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onDeleted={() => { setDeleteItem(null); fetchLocations(); }}
        endpoint={deleteItem ? `/hr/locations/${deleteItem.id}` : ''}
        itemName={deleteItem?.name}
      />
    </div>
  );
};

export default LocationsList;
