import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';

const schema = z.object({
  rental_period: z.string().min(1, 'Rental period is required'),
  amount: z.string().min(1, 'Amount is required').or(z.number()),
  status: z.enum(['paid', 'pending']),
  payment_date: z.string().optional().nullable(),
  notes: z.string().optional(),
});

const VehiclePaymentForm = ({ vehicleId, editId, onSuccess, onClose }) => {
  const isEditMode = !!editId;
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'paid', amount: '' },
  });

  useEffect(() => {
    if (isEditMode) {
      api.get(`/vehicle-payments/${editId}`)
        .then(({ data }) => {
          if (data.payment_date) data.payment_date = data.payment_date.split('T')[0];
          setExistingAttachments(data.attachments || []);
          reset(data);
        })
        .catch(() => { toast.error('Failed to load payment'); onClose(); });
    }
  }, [editId]);

  const handleRemoveExistingFile = (attachmentId) => {
    setDeleteAttachmentId(attachmentId);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = new FormData();
      payload.append('vehicle_id', vehicleId);
      
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
        await api.post(`/vehicle-payments/${editId}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Payment updated');
      } else {
        await api.post('/vehicle-payments', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Payment recorded');
      }
      onSuccess();
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Something went wrong'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        
        <div className="form-group">
          <label className="form-label">Rental Period *</label>
          <input type="text" {...register('rental_period')} className="form-control" placeholder="e.g. 2026-07 or July 22nd to July 24th" />
          {errors.rental_period && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.rental_period.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Amount (LKR) *</label>
          <input type="number" step="0.01" {...register('amount')} className="form-control" placeholder="0.00" />
          {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.amount.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Status *</label>
          <select {...register('status')} className="form-control">
            <option value="paid">Received</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Date Received</label>
          <input type="date" {...register('payment_date')} className="form-control" />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Notes</label>
          <textarea {...register('notes')} className="form-control" rows="2" placeholder="Additional details..." />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <FileUploadField 
            onFilesSelected={setFiles} 
            existingFiles={existingAttachments} 
            onRemoveExistingFile={handleRemoveExistingFile}
            label="Payment Receipts (Optional)" 
          />
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Payment' : 'Record Payment'}
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
        itemName="Receipt"
      />
    </form>
  );
};

export default VehiclePaymentForm;
