import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const VendorForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { vendor_type: 'workshop' },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/vendors/${id}`).then(({ data }) => reset(data))
        .catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/vendors'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (isEditMode) { await api.put(`/vendors/${id}`, data); toast.success('Vendor updated'); }
      else { await api.post('/vendors', data); toast.success('Vendor added'); }
      if (isModal) onSuccess(); else navigate('/vendors');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/vendors'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Vendor' : 'Add Vendor'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Vendor Name *</label>
            <input {...register('name', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Vendor Type</label>
            <select {...register('vendor_type')} className="form-control">
              <option value="fuel_station">Fuel Station</option>
              <option value="workshop">Workshop / Garage</option>
              <option value="insurance_provider">Insurance Provider</option>
              <option value="spare_parts_supplier">Spare Parts Supplier</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input {...register('contact_person')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" {...register('email')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input type="url" {...register('website')} className="form-control" placeholder="https://" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Address</label>
            <textarea {...register('address')} className="form-control" rows="2" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Vendor' : 'Add Vendor'}</button>
        </div>
      </form>
    </div>
  );
};
export default VendorForm;
