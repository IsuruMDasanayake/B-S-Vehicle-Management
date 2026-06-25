import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, CheckSquare } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const InspectionForm = ({ editId, onSuccess, onClose }) => {
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

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      inspection_type: 'pre_trip',
      tires_ok: true, brakes_ok: true, lights_ok: true, mirrors_ok: true,
      fuel_level_ok: true, engine_ok: true, body_ok: true, ac_ok: true,
      overall_status: 'pass',
      inspected_at: new Date().toISOString().slice(0, 16),
    },
  });

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers')])
      .then(([vr, dr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); })
      .catch(() => {});
    if (isEditMode) {
      api.get(`/inspections/${id}`).then(({ data }) => {
        if (data.inspected_at) data.inspected_at = new Date(data.inspected_at).toISOString().slice(0, 16);
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/inspections'); else onClose?.(); });
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
        await api.post(`/inspections/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Inspection updated');
      } else {
        await api.post('/inspections', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Inspection submitted');
      }
      if (isModal) onSuccess(); else navigate('/inspections');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/inspections'); };

  const CheckItem = ({ name, label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)',
      border: `1px solid ${watch(name) ? 'var(--success)' : 'var(--danger)'}`,
      transition: 'border-color 0.2s',
    }}>
      <label htmlFor={name} style={{ fontWeight: 500, cursor: 'pointer', flex: 1 }}>{label}</label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: watch(name) ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
          {watch(name) ? '✓ OK' : '✗ FAIL'}
        </span>
        <input type="checkbox" id={name} {...register(name)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
      </div>
    </div>
  );

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>Vehicle Inspection</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
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
            <label className="form-label">Inspection Type</label>
            <select {...register('inspection_type')} className="form-control">
              <option value="pre_trip">Pre-Trip</option>
              <option value="post_trip">Post-Trip</option>
              <option value="routine">Routine</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Inspected At *</label>
            <input type="datetime-local" {...register('inspected_at', { required: true })} className="form-control" />
          </div>
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare size={18} /> Inspection Checklist
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <CheckItem name="tires_ok" label="🔘 Tires" />
            <CheckItem name="brakes_ok" label="🛑 Brakes" />
            <CheckItem name="lights_ok" label="💡 Lights" />
            <CheckItem name="mirrors_ok" label="🪞 Mirrors" />
            <CheckItem name="fuel_level_ok" label="⛽ Fuel Level" />
            <CheckItem name="engine_ok" label="🔧 Engine" />
            <CheckItem name="body_ok" label="🚗 Body / Exterior" />
            <CheckItem name="ac_ok" label="❄️ Air Conditioning" />
          </div>
        </div>

        {/* Readings & Result */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Odometer (km)</label>
            <input type="number" step="0.1" {...register('odometer')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Fuel Level (%)</label>
            <input type="number" min="0" max="100" {...register('fuel_level')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Overall Result</label>
            <select {...register('overall_status')} className="form-control">
              <option value="pass">Pass ✓</option>
              <option value="fail">Fail ✗</option>
              <option value="conditional">Conditional ⚠</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" placeholder="Any additional observations..." />
          </div>
        </div>

        {/* File Upload Component */}
        <div style={{ marginTop: '1rem' }}>
          <FileUploadField 
            onFilesSelected={setFiles} 
            existingFiles={existingAttachments} 
            label="Inspection Photos & Reports" 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Inspection' : 'Submit Inspection'}</button>
        </div>
      </form>
    </div>
  );
};
export default InspectionForm;
