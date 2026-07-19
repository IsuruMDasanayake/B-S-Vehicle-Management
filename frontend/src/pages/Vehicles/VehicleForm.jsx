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
  vehicle_number: z.string().min(1, 'Vehicle number is required'),
  brand: z.string().min(1, 'Brand is required'),
  model: z.string().min(1, 'Model is required'),
  registration_number: z.string().min(1, 'Registration number is required'),
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  vehicle_category: z.string().min(1, 'Vehicle category is required'),
  seating_capacity: z.any().transform(v => v ? Number(v) : null),
  manufacturing_year: z.any().transform(v => Number(v)),
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'cng']),
  engine_capacity: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  chassis_number: z.string().nullable().optional(),
  engine_number: z.string().nullable().optional(),
  current_odometer: z.any().transform(v => Number(v)),
  current_status: z.enum(['available', 'assigned', 'under_maintenance', 'out_of_service', 'sold']),
  purchase_date: z.string().nullable().optional(),
  purchase_cost: z.any().transform(v => v ? Number(v) : null),
  ownership: z.enum(['B&S Transports', 'Hired']),
  hired_details: z.object({
    owner_name: z.string().nullable().optional(),
    contact_no: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    emergency_person: z.string().nullable().optional(),
    emergency_contact: z.string().nullable().optional(),
    monthly_amount: z.any().transform(v => v ? Number(v) : null).nullable().optional(),
  }).nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * VehicleForm — works both as a standalone route page and embedded inside a Modal.
 *
 * Props (modal mode):
 *   - editId    : number|null  — vehicle ID to edit, null = create
 *   - onSuccess : () => void   — called after save
 *   - onClose   : () => void   — called when cancelling
 */
const VehicleForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      vehicle_type: 'car',
      vehicle_category: 'passenger',
      fuel_type: 'diesel',
      current_status: 'available',
      ownership: 'B&S Transports',
      manufacturing_year: new Date().getFullYear(),
      current_odometer: 0,
    },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/vehicles/${id}`)
        .then(({ data }) => {
          if (data.purchase_date) data.purchase_date = data.purchase_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => {
          toast.error('Failed to load vehicle details');
          if (!isModal) navigate('/admin/vehicles');
          else onClose?.();
        });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (data.ownership !== 'Hired') {
        delete data.hired_details;
      }
      
      const payload = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          if (typeof data[key] === 'object' && !Array.isArray(data[key]) && !(data[key] instanceof Date)) {
            Object.keys(data[key]).forEach(subKey => {
              if (data[key][subKey] !== null && data[key][subKey] !== undefined) {
                payload.append(`${key}[${subKey}]`, data[key][subKey]);
              }
            });
          } else {
            payload.append(key, data[key]);
          }
        }
      });
      
      files.forEach(file => {
        payload.append('attachments[]', file);
      });

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/vehicles/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Vehicle updated successfully');
      } else {
        await api.post('/vehicles', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Vehicle added successfully');
      }
      if (isModal) onSuccess();
      else navigate('/admin/vehicles');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isModal) onClose?.();
    else navigate('/admin/vehicles');
  };

  const handleRemoveExistingFile = async (attachmentId) => {
    try {
      await api.delete(`/attachments/${attachmentId}`);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } catch (e) {
      toast.error('Failed to remove attachment');
    }
  };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Enter vehicle details below</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Vehicle Number *</label>
            <input {...register('vehicle_number')} className="form-control" placeholder="e.g. WP KB-1234" />
            {errors.vehicle_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Registration Number *</label>
            <input {...register('registration_number')} className="form-control" placeholder="e.g. KV-5678" />
            {errors.registration_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.registration_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Type *</label>
            <select {...register('vehicle_type')} className="form-control">
              <option value="car">Car</option>
              <option value="van">Van</option>
              <option value="suv">SUV</option>
              <option value="pickup">Pickup</option>
              <option value="truck">Truck</option>
              <option value="bus">Bus</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="other">Other</option>
            </select>
            {errors.vehicle_type && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_type.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle Category *</label>
            <select {...register('vehicle_category')} className="form-control">
              <option value="passenger">Passenger</option>
              <option value="cargo">Cargo / Freight</option>
              <option value="construction">Construction</option>
              <option value="executive">Executive</option>
              <option value="other">Other</option>
            </select>
            {errors.vehicle_category && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_category.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Seating Capacity</label>
            <input type="number" {...register('seating_capacity')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Brand *</label>
            <input {...register('brand')} className="form-control" placeholder="e.g. Toyota" />
            {errors.brand && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.brand.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Model *</label>
            <input {...register('model')} className="form-control" placeholder="e.g. Hilux" />
            {errors.model && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.model.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Year *</label>
            <input type="number" {...register('manufacturing_year')} className="form-control" />
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
            <label className="form-label">Status</label>
            <select {...register('current_status')} className="form-control">
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="out_of_service">Out of Service</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <input {...register('color')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Engine Capacity (cc)</label>
            <input {...register('engine_capacity')} className="form-control" placeholder="e.g. 2000" />
          </div>

          <div className="form-group">
            <label className="form-label">Chassis Number</label>
            <input {...register('chassis_number')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Engine Number</label>
            <input {...register('engine_number')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Current Odometer (km)</label>
            <input type="number" {...register('current_odometer')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Ownership *</label>
            <select {...register('ownership')} className="form-control">
              <option value="B&S Transports">B&S Transports</option>
              <option value="Hired">Hired</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Purchase Date</label>
            <input type="date" {...register('purchase_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Purchase Cost (LKR)</label>
            <input type="number" step="0.01" {...register('purchase_cost')} className="form-control" />
          </div>
        </div>

        {/* Hired Vehicle Details */}
        {watch('ownership') === 'Hired' && (
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-2)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Hired Vehicle Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Owner Name *</label>
                <input {...register('hired_details.owner_name')} className="form-control" />
                {errors.hired_details?.owner_name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.owner_name.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number *</label>
                <input {...register('hired_details.contact_no')} className="form-control" />
                {errors.hired_details?.contact_no && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.contact_no.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" {...register('hired_details.email')} className="form-control" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Address *</label>
                <input {...register('hired_details.address')} className="form-control" />
                {errors.hired_details?.address && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.address.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact Person *</label>
                <input {...register('hired_details.emergency_person')} className="form-control" />
                {errors.hired_details?.emergency_person && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.emergency_person.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Emergency Contact Number *</label>
                <input {...register('hired_details.emergency_contact')} className="form-control" />
                {errors.hired_details?.emergency_contact && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.emergency_contact.message}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Amount (LKR) *</label>
                <input type="number" step="0.01" {...register('hired_details.monthly_amount')} className="form-control" />
                {errors.hired_details?.monthly_amount && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.hired_details.monthly_amount.message}</span>}
              </div>
            </div>
          </div>
        )}

        {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              onRemoveExistingFile={handleRemoveExistingFile}
              label="Vehicle Photos & Documents" 
            />
          </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          {Object.keys(errors).length > 0 && (
            <div style={{ flex: 1, color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
              Please fix the errors above to continue. (Debug: {Object.keys(errors).join(', ')})
            </div>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleCancel}
            style={{ border: '1px solid var(--surface-2)' }}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Vehicle' : 'Add Vehicle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleForm;
