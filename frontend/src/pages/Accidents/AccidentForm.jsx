import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const AccidentForm = ({ editId, onSuccess, onClose }) => {
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

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { status: 'reported', accident_date: new Date().toISOString().slice(0, 16) },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers')])
      .then(([vr, dr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); })
      .catch(() => {});
    if (isEditMode) {
      api.get(`/accidents/${id}`).then(({ data }) => {
        if (data.accident_date) data.accident_date = new Date(data.accident_date).toISOString().slice(0, 16);
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/accidents'); else onClose?.(); });
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
        await api.post(`/accidents/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Accident updated');
      } else {
        await api.post('/accidents', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Accident reported');
      }
      if (isModal) onSuccess(); else navigate('/accidents');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/accidents'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Accident Report' : 'Report Accident'}</h1></div>
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
            <label className="form-label">Driver</label>
            <select {...register('driver_id')} className="form-control">
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date & Time *</label>
            <input type="datetime-local" {...register('accident_date', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Location *</label>
            <input {...register('location', { required: true })} className="form-control" placeholder="Where did it happen?" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description *</label>
            <textarea {...register('description', { required: true })} className="form-control" rows="3" placeholder="Describe what happened" />
          </div>
          <div className="form-group">
            <label className="form-label">Police Report Number</label>
            <input {...register('police_report_number')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Insurance Claim Number</label>
            <input {...register('insurance_claim_number')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Repair Cost (LKR)</label>
            <input type="number" step="0.01" {...register('repair_cost')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="reported">Reported</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Accident Photos & Police Reports" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Report' : 'Report Accident'}</button>
        </div>
      </form>
    </div>
  );
};
export default AccidentForm;
