import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const VehicleRequestForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { request_date: new Date().toISOString().split('T')[0], approval_status: 'pending' },
  });

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/vehicles')])
      .then(([dr, vr]) => { setDepartments(dr.data.data || dr.data || []); setVehicles(vr.data.data || vr.data || []); })
      .catch(() => {});
    if (isEditMode) {
      api.get(`/vehicle-requests/${id}`).then(({ data }) => {
        if (data.request_date) data.request_date = data.request_date.split('T')[0];
        if (data.return_date) data.return_date = data.return_date.split('T')[0];
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/admin/vehicle-requests'); else onClose?.(); });
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
        await api.post(`/vehicle-requests/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Request updated');
      } else {
        await api.post('/vehicle-requests', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Vehicle requested');
      }
      if (isModal) onSuccess(); else navigate('/admin/vehicle-requests');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/vehicle-requests'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Vehicle Request' : 'Request a Vehicle'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Department *</label>
            <select {...register('department_id', { required: true })} className="form-control">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Specific Vehicle (Optional)</label>
            <select {...register('vehicle_id')} className="form-control">
              <option value="">Any Available Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Request Date *</label>
            <input type="date" {...register('request_date', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Return Date</label>
            <input type="date" {...register('return_date')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Destination</label>
            <input {...register('destination')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('approval_status')} className="form-control">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Purpose *</label>
            <textarea {...register('purpose', { required: true })} className="form-control" rows="2" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Rejection Reason (If rejected)</label>
            <textarea {...register('rejection_reason')} className="form-control" rows="2" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Supporting Documents" 
            />
          </div>

        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Request' : 'Submit Request'}</button>
        </div>
      </form>
    </div>
  );
};
export default VehicleRequestForm;
