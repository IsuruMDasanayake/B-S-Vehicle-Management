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
  name: z.string().min(1, 'Name is required'),
  nic_number: z.string().min(10, 'Valid NIC is required'),
  address: z.string().optional(),
  contact_number: z.string().min(10, 'Valid contact number is required'),
  license_number: z.string().min(1, 'License number is required'),
  license_expiry_date: z.string().min(1, 'License expiry date is required'),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'suspended', 'retired']),
  notes: z.string().optional(),
});

const DriverForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [licenseFront, setLicenseFront] = useState([]);
  const [licenseBack, setLicenseBack] = useState([]);
  const [photo, setPhoto] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/drivers/${id}`)
        .then(({ data }) => {
          if (data.license_expiry_date) data.license_expiry_date = data.license_expiry_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => {
          toast.error('Failed to load driver details');
          if (!isModal) navigate('/drivers');
          else onClose?.();
        });
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
      
      if (licenseFront.length > 0) payload.append('license_front_file', licenseFront[0]);
      if (licenseBack.length > 0) payload.append('license_back_file', licenseBack[0]);
      if (photo.length > 0) payload.append('photo_file', photo[0]);

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/drivers/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Driver updated successfully');
      } else {
        await api.post('/drivers', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Driver added successfully');
      }
      if (isModal) onSuccess();
      else navigate('/drivers');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isModal) onClose?.();
    else navigate('/drivers');
  };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>{isEditMode ? 'Edit Driver' : 'Add New Driver'}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Enter driver details below</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input {...register('name')} className="form-control" />
            {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">NIC Number *</label>
            <input {...register('nic_number')} className="form-control" />
            {errors.nic_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.nic_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Contact Number *</label>
            <input {...register('contact_number')} className="form-control" />
            {errors.contact_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.contact_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">License Number *</label>
            <input {...register('license_number')} className="form-control" />
            {errors.license_number && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.license_number.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">License Expiry Date *</label>
            <input type="date" {...register('license_expiry_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <textarea {...register('address')} className="form-control" rows="2" />
          </div>

          <div className="form-group">
            <label className="form-label">Emergency Contact Name</label>
            <input {...register('emergency_contact_name')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Emergency Contact Phone</label>
            <input {...register('emergency_contact_phone')} className="form-control" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Driver Documents</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <FileUploadField 
                onFilesSelected={setLicenseFront} 
                label="License Front" 
                multiple={false}
              />
              <FileUploadField 
                onFilesSelected={setLicenseBack} 
                label="License Back" 
                multiple={false}
              />
              <FileUploadField 
                onFilesSelected={setPhoto} 
                label="Driver Photo" 
                multiple={false}
              />
            </div>
            {existingAttachments.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Note: Existing documents are preserved unless overwritten.</p>
              </div>
            )}
          </div>

        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel}
            style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Driver' : 'Add Driver'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
