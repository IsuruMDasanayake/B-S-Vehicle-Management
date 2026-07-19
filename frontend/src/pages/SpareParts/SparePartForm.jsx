import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';

const SparePartForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { quantity: 0, min_stock_alert: 5 },
  });

  useEffect(() => {
    api.get('/vendors').then(r => setVendors((r.data.data || r.data || []) || [])).catch(() => {});
    if (isEditMode) {
      api.get(`/spare-parts/${id}`).then(({ data }) => {
        setExistingAttachments(data.attachments || []);
        reset(data);
      }).catch(() => { toast.error('Failed to load'); if (!isModal) navigate('/admin/spare-parts'); else onClose?.(); });
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
        await api.post(`/spare-parts/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Part updated');
      } else {
        await api.post('/spare-parts', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Spare part added');
      }
      if (isModal) onSuccess(); else navigate('/admin/spare-parts');
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setIsLoading(false); }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/spare-parts'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Spare Part' : 'Add Spare Part'}</h1></div>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Part Name *</label>
            <input {...register('part_name', { required: true })} className="form-control" placeholder="e.g. Oil Filter" />
          </div>
          <div className="form-group">
            <label className="form-label">Part Number</label>
            <input {...register('part_number')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Quantity in Stock</label>
            <input type="number" {...register('quantity')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Low Stock Alert At</label>
            <input type="number" {...register('min_stock_alert')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Unit Purchase Cost (LKR)</label>
            <input type="number" step="0.01" {...register('purchase_cost')} className="form-control" />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier / Vendor</label>
            <select {...register('vendor_id')} className="form-control">
              <option value="">No vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Storage Location</label>
            <input {...register('location')} className="form-control" placeholder="e.g. Shelf A3" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="form-control" rows="2" />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              label="Part Photos & Invoices" 
            />
          </div>

        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}><Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Part' : 'Add Part'}</button>
        </div>
      </form>
    </div>
  );
};
export default SparePartForm;
