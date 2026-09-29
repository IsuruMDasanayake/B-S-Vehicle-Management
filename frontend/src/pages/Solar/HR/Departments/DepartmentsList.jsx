import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, Users } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../../../../components/ui/ConfirmDeleteModal';

const DepartmentsList = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchDepartments = () =>
    api.get('/hr/departments').then(({ data }) => setDepartments(data)).catch(() => toast.error('Failed to load departments'));

  useEffect(() => {
    fetchDepartments().finally(() => setLoading(false));
  }, []);

  const openAdd  = () => { setForm({ name: '', description: '' }); setEditItem(null); setShowModal(true); };
  const openEdit = (dept) => { setForm({ name: dept.name, description: dept.description || '' }); setEditItem(dept); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/hr/departments/${editItem.id}`, form);
        toast.success('Department updated');
      } else {
        await api.post('/hr/departments', form);
        toast.success('Department created');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading departments...</div>
  );

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Departments</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{departments.length} departments</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> Add Department
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {departments.map(dept => (
          <div key={dept.id} className="card" style={{ transition: 'all 0.2s', borderColor: 'var(--surface-2)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--surface-2)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: '0.95rem', margin: 0 }}>{dept.name}</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button onClick={() => openEdit(dept)} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={14} /></button>
                <button onClick={() => setDeleteItem(dept)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={14} /></button>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{dept.description || '—'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#3b82f6', fontWeight: 600 }}>
              <Users size={14} /> {dept.employee_count ?? 0} {(dept.employee_count ?? 0) === 1 ? 'employee' : 'employees'}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{editItem ? 'Edit Department' : 'Add Department'}</h2>
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. R&D / Engineering" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onDeleted={() => { setDeleteItem(null); fetchDepartments(); }}
        endpoint={deleteItem ? `/hr/departments/${deleteItem.id}` : ''}
        itemName={deleteItem?.name}
      />
    </div>
  );
};

export default DepartmentsList;
