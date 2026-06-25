import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const RevenueLicenseForm = ({ editId, onSuccess, onClose, defaultVehicleId }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { status: 'active', vehicle_id: defaultVehicleId || '' },
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles((r.data.data || r.data || []))).catch(() => {});
    if (isEditMode) {
      api.get(`/revenue-licenses/${id}`).then(({ data }) => {
        if (data.issue_date) data.issue_date = data.issue_date.split('T')[0];
        if (data.expiry_date) data.expiry_date = data.expiry_date.split('T')[0];
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/revenue-licenses'); else onClose?.(); });
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
        await api.post(`/revenue-licenses/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Updated');
      } else {
        await api.post('/revenue-licenses', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Revenue license added');
      }
      if (isModal) onSuccess(); else navigate('/revenue-licenses');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/revenue-licenses'); };

  const handleRemoveExistingFile = async (attachmentId) => {
    try {
      await api.delete(`/attachments/${attachmentId}`);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Document removed');
    } catch (e) {
      toast.error('Failed to remove document');
    }
  };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Revenue License' : 'Add Revenue License'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            {defaultVehicleId ? (
              <>
                <input type="hidden" {...register('vehicle_id', { required: true })} />
                <select className="form-control" disabled value={defaultVehicleId}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </>
            ) : (
              <select {...register('vehicle_id', { required: true })} className="form-control">
                <option value="">Select Vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
            )}
            {errors.vehicle_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_id.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">License Number *</label>
            <input {...register('license_number', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Issue Date *</label>
            <input type="date" {...register('issue_date', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Expiry Date *</label>
            <input type="date" {...register('expiry_date', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Amount Paid (LKR)</label>
            <input type="number" step="0.01" {...register('fee')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              onRemoveExistingFile={handleRemoveExistingFile}
              label="License Document" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update' : 'Add License'}</button>
        </div>
      </form>
    </div>
  );
};
export default RevenueLicenseForm;
