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
  driver_id: z.string().min(1, 'Driver is required').or(z.number()),
  breakdown_date: z.string().min(1, 'Date and time is required'),
  location: z.string().min(1, 'Location is required'),
  description: z.string().min(1, 'Description is required'),
  action_taken: z.string().optional(),
  towing_required: z.boolean(),
  repair_cost: z.coerce.number().optional().nullable(),
  status: z.enum(['reported', 'towing', 'in_repair', 'resolved']),
});

const BreakdownForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'reported', towing_required: false },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers')])
      .then(([vr, dr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); })
      .catch(() => toast.error('Failed to load form data'));

    if (isEditMode) {
      api.get(`/breakdowns/${id}`)
        .then(({ data }) => {
          if (data.breakdown_date) {
            const d = new Date(data.breakdown_date);
            data.breakdown_date = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          }
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load record'); if (!isModal) navigate('/breakdowns'); else onClose?.(); });
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
        await api.post(`/breakdowns/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Breakdown updated');
      } else {
        await api.post('/breakdowns', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Breakdown reported');
      }
      if (isModal) onSuccess(); else navigate('/breakdowns');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/breakdowns'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Breakdown' : 'Report Breakdown'}</h1><p style={{ color: 'var(--text-muted)' }}>Log a vehicle breakdown incident</p></div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id')} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
            {errors.vehicle_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Driver *</label>
            <select {...register('driver_id')} className="form-control">
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date & Time *</label>
            <input type="datetime-local" {...register('breakdown_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Location *</label>
            <input {...register('location')} className="form-control" placeholder="Where did it happen?" />
            {errors.location && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.location.message}</span>}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description of Issue *</label>
            <textarea {...register('description')} className="form-control" rows="3" placeholder="What went wrong?" />
            {errors.description && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.description.message}</span>}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Action Taken</label>
            <textarea {...register('action_taken')} className="form-control" rows="2" placeholder="What was done to resolve or mitigate?" />
          </div>

          <div className="form-group">
            <label className="form-label">Repair Cost (LKR)</label>
            <input type="number" step="0.01" {...register('repair_cost')} className="form-control" />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="towing_check" {...register('towing_required')} />
            <label htmlFor="towing_check" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Towing Required</label>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="reported">Reported</option>
              <option value="towing">Towing</option>
              <option value="in_repair">In Repair</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Breakdown Photos & Reports" 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Record' : 'Report Breakdown'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BreakdownForm;
