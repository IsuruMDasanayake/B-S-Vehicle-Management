import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const TireForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { status: 'active', position: 'front_left', installation_date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles((r.data.data || r.data || []))).catch(() => {});
    if (isEditMode) {
      api.get(`/tires/${id}`).then(({ data }) => {
        if (data.installation_date) data.installation_date = data.installation_date.split('T')[0];
        if (data.replacement_date) data.replacement_date = data.replacement_date.split('T')[0];
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/tires'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          payload.append(key, data[key]);
        }
      });
      
      files.forEach(file => {
        payload.append('attachments[]', file);
      });

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/tires/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Tire updated');
      } else {
        await api.post('/tires', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Tire record added');
      }
      if (isModal) onSuccess(); else navigate('/tires');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/tires'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Tire' : 'Add Tire Record'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id', { required: true })} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tire Brand *</label>
            <input {...register('tire_brand', { required: true })} className="form-control" placeholder="e.g. Michelin" />
          </div>
          <div className="form-group">
            <label className="form-label">Tire Size</label>
            <input {...register('tire_size')} className="form-control" placeholder="e.g. 205/55 R16" />
          </div>
          <div className="form-group">
            <label className="form-label">Position</label>
            <select {...register('position')} className="form-control">
              <option value="front_left">Front Left</option>
              <option value="front_right">Front Right</option>
              <option value="rear_left">Rear Left</option>
              <option value="rear_right">Rear Right</option>
              <option value="spare">Spare</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Installation Date *</label>
            <input type="date" {...register('installation_date', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Replacement Date</label>
            <input type="date" {...register('replacement_date')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Installation Mileage (km)</label>
            <input type="number" {...register('installation_mileage')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="replaced">Replaced</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Tire Invoices & Warranty Documents" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Tire' : 'Add Tire'}</button>
        </div>
      </form>
    </div>
  );
};
export default TireForm;
