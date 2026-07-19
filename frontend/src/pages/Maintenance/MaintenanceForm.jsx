import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';

const schema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required').or(z.number()),
  vendor_id: z.string().optional().nullable().or(z.number().optional().nullable()),
  service_type: z.enum(['routine', 'repair', 'inspection', 'emergency']),
  service_date: z.string().min(1, 'Service date is required'),
  odometer_reading: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().min(1, 'Description is required'),
  cost: z.coerce.number().min(0),
  next_service_date: z.string().optional().nullable(),
  next_service_km: z.coerce.number().optional().nullable(),
  mechanic_name: z.string().optional().nullable(),
  parts_replaced: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
});

const MaintenanceForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      service_date: new Date().toISOString().split('T')[0],
      status: 'completed',
      service_type: 'routine',
    },
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles((r.data.data || r.data || []))).catch(() => {});
    if (isEditMode) {
      api.get(`/maintenance-records/${id}`)
        .then(({ data }) => {
          if (data.service_date) data.service_date = data.service_date.split('T')[0];
          if (data.next_service_date) data.next_service_date = data.next_service_date.split('T')[0];
          if (data.notes === null) data.notes = '';
          if (Array.isArray(data.parts_replaced)) data.parts_replaced = data.parts_replaced.join(', ');
          
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load record'); if (!isModal) navigate('/admin/maintenance'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          if (['attachments', 'vehicle', 'vendor'].includes(key)) return;
          payload.append(key, data[key]);
        }
      });
      
      files.forEach(file => {
        payload.append('attachments[]', file);
      });

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/maintenance-records/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Record updated');
      } else {
        await api.post('/maintenance-records', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Maintenance record added');
      }
      if (isModal) onSuccess(); else navigate('/admin/maintenance');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/maintenance'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Maintenance' : 'New Maintenance Record'}</h1><p style={{ color: 'var(--text-muted)' }}>Record service and repair details</p></div>
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
            <label className="form-label">Service Type</label>
            <select {...register('service_type')} className="form-control">
              <option value="routine">Routine Service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Service Date *</label>
            <input type="date" {...register('service_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Odometer Reading (km)</label>
            <input type="number" {...register('odometer_reading')} className="form-control" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description of Work *</label>
            <textarea {...register('notes')} className="form-control" rows="3" placeholder="What was done?" />
            {errors.notes && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.notes.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Total Cost (LKR) *</label>
            <input type="number" step="0.01" {...register('cost')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Mechanic Name</label>
            <input {...register('mechanic_name')} className="form-control" placeholder="Name of mechanic or workshop" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Parts Replaced</label>
            <textarea {...register('parts_replaced')} className="form-control" rows="2" placeholder="List of replaced parts..." />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Next Service Date</label>
            <input type="date" {...register('next_service_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Next Service Odometer (km)</label>
            <input type="number" {...register('next_service_km')} className="form-control" placeholder="e.g. 50000" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              onRemoveExistingFile={(id) => setDeleteAttachmentId(id)}
              label="Service Invoices & Documents" 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Record' : 'Add Record'}
          </button>
        </div>

        <ConfirmDeleteModal
          isOpen={!!deleteAttachmentId}
          onClose={() => setDeleteAttachmentId(null)}
          onDeleted={() => {
            setExistingAttachments(prev => prev.filter(a => a.id !== deleteAttachmentId));
            setDeleteAttachmentId(null);
          }}
          endpoint={deleteAttachmentId ? `/attachments/${deleteAttachmentId}` : ''}
          itemName="Attachment"
        />
      </form>
    </div>
  );
};

export default MaintenanceForm;
