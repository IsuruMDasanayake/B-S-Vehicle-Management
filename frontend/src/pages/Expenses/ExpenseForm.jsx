import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const ExpenseForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { expense_type: 'fuel', date: new Date().toISOString().split('T')[0] },
  });

  useEffect(() => {
    api.get('/vehicles').then(r => setVehicles((r.data.data || r.data || []))).catch(() => {});
    if (isEditMode) {
      api.get(`/expenses/${id}`).then(({ data }) => {
        if (data.date) data.date = data.date.split('T')[0];
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/expenses'); else onClose?.(); });
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
        await api.post(`/expenses/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Expense updated');
      } else {
        await api.post('/expenses', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Expense recorded');
      }
      if (isModal) onSuccess(); else navigate('/expenses');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/expenses'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Expense' : 'Record Expense'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Expense Type *</label>
            <select {...register('expense_type', { required: true })} className="form-control">
              <option value="fuel">Fuel</option>
              <option value="service">Service / Maintenance</option>
              <option value="insurance">Insurance</option>
              <option value="license">License Fee</option>
              <option value="repair">Repair</option>
              <option value="parking">Parking</option>
              <option value="toll">Toll Charges</option>
              <option value="tire">Tire</option>
              <option value="spare_parts">Spare Parts</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Vehicle (Optional)</label>
            <select {...register('vehicle_id')} className="form-control">
              <option value="">General (No vehicle)</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (LKR) *</label>
            <input type="number" step="0.01" {...register('amount', { required: true })} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input type="date" {...register('date', { required: true })} className="form-control" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <input {...register('description')} className="form-control" placeholder="Brief description of the expense" />
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
              label="Receipts & Invoices" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update' : 'Record Expense'}</button>
        </div>
      </form>
    </div>
  );
};
export default ExpenseForm;
