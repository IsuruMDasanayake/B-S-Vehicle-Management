import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const RouteForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { is_active: true },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/routes/${id}`).then(({ data }) => reset(data))
        .catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/admin/routes'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (isEditMode) { await api.put(`/routes/${id}`, data); toast.success('Route updated'); }
      else { await api.post('/routes', data); toast.success('Route created'); }
      if (isModal) onSuccess(); else navigate('/admin/routes');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/routes'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Route' : 'Create Route'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Route Name *</label>
            <input {...register('route_name', { required: true })} className="form-control" placeholder="e.g. Colombo → Kandy" />
          </div>
          <div className="form-group">
            <label className="form-label">Starting Point *</label>
            <input {...register('starting_point', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination *</label>
            <input {...register('destination', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Distance (km)</label>
            <input type="number" step="0.1" {...register('distance_km')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Time (minutes)</label>
            <input type="number" {...register('estimated_time_minutes')} className="form-control" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="form-control" rows="2" />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="is_active" {...register('is_active')} defaultChecked />
            <label htmlFor="is_active" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Route is Active</label>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Route' : 'Create Route'}</button>
        </div>
      </form>
    </div>
  );
};
export default RouteForm;
