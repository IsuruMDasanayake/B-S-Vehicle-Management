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
  fill_date: z.string().min(1, 'Date is required'),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng']),
  quantity: z.coerce.number().min(0.1, 'Required'),
  unit_price: z.coerce.number().min(0.01, 'Required'),
  total_cost: z.coerce.number(),
  current_odometer: z.coerce.number().min(0, 'Required'),
  station_name: z.string().optional(),
  receipt_number: z.string().optional(),
  notes: z.string().optional(),
});

const FuelForm = ({ editId, onSuccess, onClose }) => {
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

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fill_date: new Date().toISOString().split('T')[0], fuel_type: 'diesel' },
  });

  const quantity = watch('quantity');
  const unitPrice = watch('unit_price');
  useEffect(() => {
    if (quantity && unitPrice) setValue('total_cost', (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2));
  }, [quantity, unitPrice, setValue]);

  useEffect(() => {
    Promise.all([api.get('/vehicles'), api.get('/drivers')])
      .then(([vr, dr]) => { setVehicles(vr.data.data || vr.data || []); setDrivers(dr.data.data || dr.data || []); })
      .catch(() => toast.error('Failed to load form data'));

    if (isEditMode) {
      api.get(`/fuel-entries/${id}`)
        .then(({ data }) => {
          if (data.fill_date) data.fill_date = data.fill_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load entry'); if (!isModal) navigate('/admin/fuel'); else onClose?.(); });
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
        await api.post(`/fuel-entries/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Entry updated');
      } else {
        await api.post('/fuel-entries', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Fuel entry added');
      }
      if (isModal) onSuccess(); else navigate('/admin/fuel');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/fuel'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Fuel Entry' : 'New Fuel Entry'}</h1><p style={{ color: 'var(--text-muted)' }}>Record fuel consumption</p></div>
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
            <label className="form-label">Date *</label>
            <input type="date" {...register('fill_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Fuel Type</label>
            <select {...register('fuel_type')} className="form-control">
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
              <option value="cng">CNG</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity (Liters) *</label>
            <input type="number" step="0.01" {...register('quantity')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Cost Per Liter (LKR) *</label>
            <input type="number" step="0.01" {...register('unit_price')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Total Cost (LKR)</label>
            <input type="number" step="0.01" {...register('total_cost')} className="form-control"
              readOnly style={{ background: 'var(--surface)', cursor: 'not-allowed' }} />
          </div>

          <div className="form-group">
            <label className="form-label">Current Odometer (km) *</label>
            <input type="number" {...register('current_odometer')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Station Name</label>
            <input {...register('station_name')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Receipt Number</label>
            <input {...register('receipt_number')} className="form-control" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Fuel Receipts & Invoices" 
            />
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Entry' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FuelForm;
