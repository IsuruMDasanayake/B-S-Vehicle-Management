import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../../../../components/ui/ConfirmDeleteModal';

const LEVEL_COLORS = {
  Junior:  { bg: 'rgba(34,197,94,0.1)',   color: '#16a34a' },
  Mid:     { bg: 'rgba(59,130,246,0.1)',  color: '#2563eb' },
  Senior:  { bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
  Lead:    { bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
  C_Level: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
};

const DesignationsList = () => {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [form, setForm] = useState({ title: '', department_id: '', level: 'Mid' });

  const fetchAll = () =>
    Promise.all([
      api.get('/hr/designations'),
      api.get('/hr/departments'),
    ]).then(([dRes, depRes]) => {
      setDesignations(dRes.data);
      setDepartments(depRes.data);
    }).catch(() => toast.error('Failed to load data'));

  useEffect(() => { fetchAll().finally(() => setLoading(false)); }, []);

  const openAdd  = () => { setForm({ title: '', department_id: '', level: 'Mid' }); setEditItem(null); setShowModal(true); };
  const openEdit = (d) => { setForm({ title: d.title, department_id: d.department_id, level: d.level }); setEditItem(d); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.department_id) { toast.error('Title and department are required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/hr/designations/${editItem.id}`, form);
        toast.success('Designation updated');
      } else {
        await api.post('/hr/designations', form);
        toast.success('Designation created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save designation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading designations...</div>
  );

  const filtered = filterDept ? designations.filter(d => d.department_id === parseInt(filterDept)) : designations;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Designations</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{filtered.length} designations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '200px' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={openAdd} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
            <Plus size={16} /> Add Designation
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
              {['Designation', 'Department', 'Level', 'Employees', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No designations found.</td></tr>
            ) : filtered.map(d => {
              const lc = LEVEL_COLORS[d.level] || LEVEL_COLORS.Mid;
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--surface-2)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Briefcase size={16} color="#3b82f6" />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{d.department?.name || '—'}</td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: lc.bg, color: lc.color }}>{d.level}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{d.employee_count ?? 0}</td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(d)} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteItem(d)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{editItem ? 'Edit Designation' : 'Add Designation'}</h2>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Engineer" />
            </div>
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select className="form-control" value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-control" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                <option value="Junior">Junior</option><option value="Mid">Mid</option>
                <option value="Senior">Senior</option><option value="Lead">Lead</option>
                <option value="C_Level">C-Level</option>
              </select>
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
        onDeleted={() => { setDeleteItem(null); fetchAll(); }}
        endpoint={deleteItem ? `/hr/designations/${deleteItem.id}` : ''}
        itemName={deleteItem?.title}
      />
    </div>
  );
};

export default DesignationsList;
