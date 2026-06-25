import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const DepartmentForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    api.get('/users').then(r => setUsers((r.data.data || r.data || []) || [])).catch(() => {});
    if (isEditMode) {
      api.get(`/departments/${id}`).then(({ data }) => reset(data))
        .catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/departments'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (isEditMode) { await api.put(`/departments/${id}`, data); toast.success('Department updated'); }
      else { await api.post('/departments', data); toast.success('Department created'); }
      if (isModal) onSuccess(); else navigate('/departments');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/departments'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Department' : 'Add Department'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input {...register('name', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Manager</label>
            <select {...register('manager_id')} className="form-control">
              <option value="">No Manager Assigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="form-control" rows="3" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update' : 'Create Department'}</button>
        </div>
      </form>
    </div>
  );
};
export default DepartmentForm;
