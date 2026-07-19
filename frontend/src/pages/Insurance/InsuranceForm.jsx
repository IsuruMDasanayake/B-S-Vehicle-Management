import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const schema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required').or(z.number()),
  policy_number: z.string().min(1, 'Policy number is required'),
  insurance_company: z.string().min(1, 'Insurance company is required'),
  coverage_type: z.string().min(1, 'Coverage type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  premium_amount: z.coerce.number().min(0).optional().or(z.literal('')),
  coverage_amount: z.coerce.number().min(0).optional().or(z.literal('')),
  status: z.enum(['active', 'expired', 'cancelled']),
});

const InsuranceForm = ({ editId, onSuccess, onClose, defaultVehicleId }) => {
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
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', coverage_type: 'comprehensive', vehicle_id: defaultVehicleId || '' },
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles((r.data.data || r.data || []))).catch(() => {});
    if (isEditMode) {
      api.get(`/insurance-policies/${id}`)
        .then(({ data }) => {
          if (data.start_date) data.start_date = data.start_date.split('T')[0];
          if (data.expiry_date) data.expiry_date = data.expiry_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load policy'); if (!isModal) navigate('/admin/insurance'); else onClose?.(); });
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
        await api.post(`/insurance-policies/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Policy updated');
      } else {
        await api.post('/insurance-policies', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Policy added');
      }
      if (isModal) onSuccess(); else navigate('/admin/insurance');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/insurance'); };

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
          <div><h1>{isEditMode ? 'Edit Insurance Policy' : 'Add Insurance Policy'}</h1><p style={{ color: 'var(--text-muted)' }}>Enter policy details below</p></div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            {defaultVehicleId ? (
              <>
                <input type="hidden" {...register('vehicle_id')} />
                <select className="form-control" disabled value={defaultVehicleId}>
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
                </select>
              </>
            ) : (
              <select {...register('vehicle_id')} className="form-control">
                <option value="">Select Vehicle</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
            )}
            {errors.vehicle_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Policy Number *</label>
            <input {...register('policy_number')} className="form-control" />
            {errors.policy_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.policy_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Insurance Company *</label>
            <input {...register('insurance_company')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Coverage Type</label>
            <select {...register('coverage_type')} className="form-control">
              <option value="comprehensive">Comprehensive</option>
              <option value="third_party">Third Party</option>
              <option value="fire_theft">Fire & Theft</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Start Date *</label>
            <input type="date" {...register('start_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date *</label>
            <input type="date" {...register('expiry_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (LKR)</label>
            <input type="number" step="0.01" {...register('premium_amount')} className="form-control" />
          </div>

          {/* <div className="form-group">
            <label className="form-label">Coverage Amount (LKR)</label>
            <input type="number" step="0.01" {...register('coverage_amount')} className="form-control" />
          </div> */}

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              onRemoveExistingFile={handleRemoveExistingFile}
              label="Policy Documents" 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Policy' : 'Add Policy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InsuranceForm;
