import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const UserForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { role: 'fleet_manager', status: 'active' },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/users/${id}`).then(({ data }) => {
        data.role = data.roles?.[0]?.name || 'fleet_manager';
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/admin/users'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    if (!isEditMode && !data.password) { toast.error('Password is required'); return; }
    if (data.password) data.password_confirmation = data.password;
    setIsLoading(true);
    try {
      if (isEditMode) { await api.put(`/users/${id}`, data); toast.success('User updated'); }
      else { await api.post('/users', data); toast.success('User created'); }
      if (isModal) onSuccess(); else navigate('/admin/users');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/users'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit User' : 'Create User'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input {...register('name', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input type="email" {...register('email', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Role *</label>
            <select {...register('role', { required: true })} className="form-control">
              <option value="super_admin">Super Admin</option>
              <option value="fleet_manager">Fleet Manager</option>
              <option value="driver">Driver</option>
              <option value="mechanic">Mechanic</option>
              <option value="department_manager">Department Manager</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Password {isEditMode ? '(Leave blank to keep)' : '*'}</label>
            <input type="password" {...register('password')} className="form-control" placeholder={isEditMode ? 'Leave blank to keep current' : 'Min. 8 characters'} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update User' : 'Create User'}</button>
        </div>
      </form>
    </div>
  );
};
export default UserForm;
