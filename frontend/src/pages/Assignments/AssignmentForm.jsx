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
  assignment_date: z.string().min(1, 'Assignment date is required'),
  return_date: z.string().optional().nullable(),
  department_id: z.string().optional().nullable().or(z.number()),
  purpose: z.string().optional(),
  status: z.enum(['active', 'completed', 'cancelled']),
  notes: z.string().optional(),
});

const AssignmentForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers'), api.get('/departments')])
      .then(([vr, dr, dpr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); setDepartments(dpr.data.data || dpr.data || []); })
      .catch(() => toast.error('Failed to load form data'));

    if (isEditMode) {
      api.get(`/assignments/${id}`)
        .then(({ data }) => {
          if (data.assignment_date) data.assignment_date = data.assignment_date.split('T')[0];
          if (data.return_date) data.return_date = data.return_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load assignment'); if (!isModal) navigate('/assignments'); else onClose?.(); });
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
        await api.post(`/assignments/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Assignment updated');
      } else {
        await api.post('/assignments', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Assignment created');
      }
      if (isModal) onSuccess(); else navigate('/assignments');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/assignments'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Assignment' : 'New Assignment'}</h1><p style={{ color: 'var(--text-muted)' }}>Assign a vehicle to a driver</p></div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id')} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.brand} {v.model})</option>)}
            </select>
            {errors.vehicle_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Driver *</label>
            <select {...register('driver_id')} className="form-control">
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {errors.driver_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.driver_id.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Department (Optional)</label>
            <select {...register('department_id')} className="form-control">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input {...register('purpose')} className="form-control" placeholder="Purpose of assignment" />
          </div>

          <div className="form-group">
            <label className="form-label">Assignment Date *</label>
            <input type="date" {...register('assignment_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Return Date (Optional)</label>
            <input type="date" {...register('return_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" placeholder="Additional details..." />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Assignment Documents & Approvals" 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentForm;
