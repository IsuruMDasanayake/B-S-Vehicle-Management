import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, User, Users, Edit3 } from 'lucide-react';
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
  const [requests, setRequests] = useState([]);
  const [policeReportFile, setPoliceReportFile] = useState([]);
  const [accidentPhotos, setAccidentPhotos] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [existingPoliceReport, setExistingPoliceReport] = useState([]);
  const [assigneeType, setAssigneeType] = useState('internal');

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { status: 'reported', accident_date: new Date().toISOString().slice(0, 16), assignee_type: 'internal' },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers'), api.get('/vehicle-requests?approval_status=approved')])
      .then(([vr, dr, rq]) => { 
        setVehicles(vr.data.data || vr.data || []); 
        setDrivers(dr.data.data || dr.data || []); 
        setRequests(rq.data.data || rq.data || []);
      })
      .catch(() => {});
    if (isEditMode) {
      api.get(`/accidents/${id}`).then(({ data }) => {
        if (data.accident_date) data.accident_date = new Date(data.accident_date).toISOString().slice(0, 16);
        
        const photosArr = (data.photos || []).map((path, index) => ({
          id: index,
          file_path: path,
          file_type: 'image/jpeg'
        }));
        setExistingPhotos(photosArr);

        const reportArr = data.police_report_path ? [{
          id: 'report',
          file_path: data.police_report_path,
          file_type: data.police_report_path.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
        }] : [];
        setExistingPoliceReport(reportArr);

        if (data.assignee_type) setAssigneeType(data.assignee_type);
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
      
      if (policeReportFile.length > 0) payload.append('police_report', policeReportFile[0]);
      accidentPhotos.forEach(file => payload.append('accident_photos[]', file));
      payload.append('assignee_type', assigneeType);

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

  const handleRemovePhoto = async (index) => {
    if (!window.confirm('Are you sure you want to remove this photo?')) return;
    try {
      await api.delete(`/accidents/${id}/photos/${index}`);
      setExistingPhotos(prev => prev.filter(p => p.id !== index));
      toast.success('Photo removed');
    } catch (e) {
      toast.error('Failed to remove photo');
    }
  };

  const handleRemovePoliceReport = async () => {
    if (!window.confirm('Are you sure you want to remove the police report?')) return;
    try {
      await api.delete(`/accidents/${id}/police-report`);
      setExistingPoliceReport([]);
      toast.success('Police report removed');
    } catch (e) {
      toast.error('Failed to remove police report');
    }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id', { required: true })} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem' }}>Assignee Type</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setAssigneeType('internal'); setValue('vehicle_request_id', null); setValue('driver_name', null); }}
                style={{ flex: 1, minWidth: '200px', padding: '1rem', border: `2px solid ${assigneeType === 'internal' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: assigneeType === 'internal' ? 'var(--primary-alpha)' : 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <User size={20} style={{ color: assigneeType === 'internal' ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: assigneeType === 'internal' ? 'var(--primary)' : 'var(--text)' }}>Registered Driver</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select an internal driver</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => { setAssigneeType('external'); setValue('driver_id', null); setValue('driver_name', null); }}
                style={{ flex: 1, minWidth: '200px', padding: '1rem', border: `2px solid ${assigneeType === 'external' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: assigneeType === 'external' ? 'var(--primary-alpha)' : 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Users size={20} style={{ color: assigneeType === 'external' ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: assigneeType === 'external' ? 'var(--primary)' : 'var(--text)' }}>External Requester</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select from approved requests</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setAssigneeType('manual'); setValue('driver_id', null); setValue('vehicle_request_id', null); }}
                style={{ flex: 1, minWidth: '200px', padding: '1rem', border: `2px solid ${assigneeType === 'manual' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: assigneeType === 'manual' ? 'var(--primary-alpha)' : 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Edit3 size={20} style={{ color: assigneeType === 'manual' ? 'var(--primary)' : 'var(--text-muted)' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: assigneeType === 'manual' ? 'var(--primary)' : 'var(--text)' }}>Manual Entry</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type a custom name</div>
                </div>
              </button>
            </div>
          </div>

          {assigneeType === 'internal' && (
            <div className="form-group">
              <label className="form-label">Driver *</label>
              <select {...register('driver_id')} className="form-control">
                <option value="">Select Driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          
          {assigneeType === 'external' && (
            <div className="form-group">
              <label className="form-label">Approved Request *</label>
              <select {...register('vehicle_request_id')} className="form-control">
                <option value="">Select Request</option>
                {requests.map(r => <option key={r.id} value={r.id}>{r.requester_name}</option>)}
              </select>
            </div>
          )}

          {assigneeType === 'manual' && (
            <div className="form-group">
              <label className="form-label">Driver Name *</label>
              <input type="text" {...register('driver_name')} className="form-control" placeholder="Enter driver name" />
            </div>
          )}
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
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <FileUploadField 
              onFilesSelected={setPoliceReportFile} 
              existingFiles={existingPoliceReport}
              onRemoveExistingFile={handleRemovePoliceReport}
              label="Police Report (Optional)" 
              multiple={false}
            />
            <FileUploadField 
              onFilesSelected={setAccidentPhotos} 
              existingFiles={existingPhotos}
              onRemoveExistingFile={handleRemovePhoto}
              label="Accident & Odometer Photos (Max 5)" 
              multiple={true}
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
