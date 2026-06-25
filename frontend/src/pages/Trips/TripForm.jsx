import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const TripForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { status: 'ongoing', start_time: new Date().toISOString().slice(0, 16) },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers'), api.get('/routes')])
      .then(([vr, dr, rr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); setRoutes(rr.data.data || rr.data || []); })
      .catch(() => {});
    if (isEditMode) {
      api.get(`/trips/${id}`).then(({ data }) => {
        if (data.start_time) data.start_time = new Date(data.start_time).toISOString().slice(0, 16);
        if (data.end_time) data.end_time = new Date(data.end_time).toISOString().slice(0, 16);
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/trips'); else onClose?.(); });
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
        await api.post(`/trips/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Trip updated');
      } else {
        await api.post('/trips', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Trip created');
      }
      if (isModal) onSuccess(); else navigate('/trips');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/trips'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Trip' : 'Create Trip'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Trip Code</label>
            <input {...register('trip_code')} className="form-control" placeholder="Auto-generated if empty" />
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id', { required: true })} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Driver *</label>
            <select {...register('driver_id', { required: true })} className="form-control">
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Route (Optional)</label>
            <select {...register('route_id')} className="form-control">
              <option value="">No specific route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start Location *</label>
            <input {...register('start_location', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination *</label>
            <input {...register('destination', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Start Time *</label>
            <input type="datetime-local" {...register('start_time', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">End Time</label>
            <input type="datetime-local" {...register('end_time')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Distance (km)</label>
            <input type="number" step="0.1" {...register('distance_km')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input {...register('purpose')} className="form-control" />
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
              label="Trip Documents & Receipts" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Trip' : 'Create Trip'}</button>
        </div>
      </form>
    </div>
  );
};
export default TripForm;
