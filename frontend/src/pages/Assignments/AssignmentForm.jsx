import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import { ArrowLeft, Save, User, Users } from 'lucide-react';
import FileUploadField from '../../components/ui/FileUploadField';
import { differenceInDays, isWeekend, addDays } from 'date-fns';

const schema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle is required').or(z.number()),
  driver_id: z.string().optional().nullable().or(z.number()),
  vehicle_request_id: z.string().optional().nullable().or(z.number()),
  assignment_date: z.string().min(1, 'Assignment date is required'),
  return_date: z.string().optional().nullable(),
  department_id: z.string().optional().nullable().or(z.number()),
  purpose: z.string().optional().nullable(),
  payment_frequency: z.enum(['monthly', 'custom', 'weekends']),
  amount: z.any().transform(v => v ? Number(v) : null),
  status: z.enum(['active', 'completed', 'cancelled', 'pending']),
  notes: z.string().optional().nullable(),
}).refine(data => data.driver_id || data.vehicle_request_id, {
  message: "Either Driver or Vehicle Request must be selected",
  path: ["driver_id"]
});

const AssignmentForm = ({ editId, onSuccess, onClose }) => {
  const params = useParams();
  const id = editId ?? params.id;
  const isEditMode = !!id;
  const isModal = !!onSuccess;
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  
  const [assigneeType, setAssigneeType] = useState('internal');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active', assignment_date: new Date().toISOString().split('T')[0], payment_frequency: 'monthly' },
  });

  const [inputRate, setInputRate] = useState('');
  const [totalCalculated, setTotalCalculated] = useState(0);

  const watchPaymentFrequency = watch('payment_frequency');
  const watchAssignmentDate = watch('assignment_date');
  const watchReturnDate = watch('return_date');

  useEffect(() => {
    if (!inputRate || !watchAssignmentDate) {
      setTotalCalculated(0);
      setValue('amount', '');
      return;
    }
    const rate = Number(inputRate) || 0;
    if (watchPaymentFrequency === 'monthly') {
      setTotalCalculated(rate);
    } else {
      const start = new Date(watchAssignmentDate);
      const end = watchReturnDate ? new Date(watchReturnDate) : start;
      if (watchPaymentFrequency === 'custom') {
        const days = differenceInDays(end, start) + 1;
        setTotalCalculated(days * rate);
      } else if (watchPaymentFrequency === 'weekends') {
        let weekendDays = 0;
        let curr = start;
        while (curr <= end) {
          if (isWeekend(curr)) weekendDays++;
          curr = addDays(curr, 1);
        }
        setTotalCalculated(weekendDays * rate);
      }
    }
  }, [inputRate, watchPaymentFrequency, watchAssignmentDate, watchReturnDate, setValue]);

  useEffect(() => {
    Promise.all([
      api.get('/vehicles'), 
      api.get('/drivers'), 
      api.get('/departments'),
      api.get('/vehicle-requests?approval_status=approved') // Get approved requests
    ])
      .then(([vr, dr, dpr, reqr]) => { 
        setVehicles(vr.data.data || vr.data || []); 
        setDrivers(dr.data.data || dr.data || []); 
        setDepartments(dpr.data.data || dpr.data || []); 
        setRequests(reqr.data.data || reqr.data || []); 
      })
      .catch(() => toast.error('Failed to load form data'));

    if (isEditMode) {
      api.get(`/assignments/${id}`)
        .then(({ data }) => {
          if (data.assignment_date) data.assignment_date = data.assignment_date.split('T')[0];
          if (data.return_date) data.return_date = data.return_date.split('T')[0];
          if (data.vehicle_request_id) setAssigneeType('external');
          setExistingAttachments(data.attachments || []);
          reset(data);
          if (data.amount) setInputRate(data.amount.toString());
        })
        .catch(() => { toast.error('Failed to load assignment'); if (!isModal) navigate('/admin/assignments'); else onClose?.(); });
    }
  }, [id]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = new FormData();
      const finalData = { ...data, amount: Number(inputRate) || 0 };
      Object.keys(finalData).forEach(key => {
        if (finalData[key] !== null && finalData[key] !== undefined) {
          payload.append(key, finalData[key]);
        }
      });
      
      files.forEach(file => {
        payload.append('attachments[]', file);
      });

      if (isEditMode) {
        payload.append('_method', 'PUT');
        await api.post(`/assignments/${id}`, payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Assignment updated');
      } else {
        await api.post('/assignments', payload, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Assignment created');
      }
      if (isModal) onSuccess(); else navigate('/admin/assignments');
    } catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setIsLoading(false); }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to remove this attachment?')) return;
    try {
      await api.delete(`/attachments/${attachmentId}`);
      setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment removed');
    } catch (e) {
      toast.error('Failed to remove attachment');
    }
  };

  const handleCancel = () => { if (isModal) onClose?.(); else navigate('/admin/assignments'); };

  return (
    <div>
      {!isModal && (
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handleCancel} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}><ArrowLeft size={20} /></button>
          <div><h1>{isEditMode ? 'Edit Assignment' : 'New Assignment'}</h1><p style={{ color: 'var(--text-muted)' }}>Assign a vehicle to a driver or requester</p></div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        
        {/* Assignee Type Toggle */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            type="button"
            onClick={() => { setAssigneeType('internal'); setValue('vehicle_request_id', null); }}
            style={{ flex: 1, padding: '1rem', border: `2px solid ${assigneeType === 'internal' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: assigneeType === 'internal' ? 'var(--primary-alpha)' : 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <User size={20} style={{ color: assigneeType === 'internal' ? 'var(--primary)' : 'var(--text-muted)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: assigneeType === 'internal' ? 'var(--primary)' : 'var(--text)' }}>Internal Driver</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assign to a company driver</div>
            </div>
          </button>
          <button 
            type="button"
            onClick={() => { setAssigneeType('external'); setValue('driver_id', null); }}
            style={{ flex: 1, padding: '1rem', border: `2px solid ${assigneeType === 'external' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: assigneeType === 'external' ? 'var(--primary-alpha)' : 'var(--surface)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}

>
            <Users size={20} style={{ color: assigneeType === 'external' ? 'var(--primary)' : 'var(--text-muted)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: assigneeType === 'external' ? 'var(--primary)' : 'var(--text)' }}>External Requester</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assign to an approved web request</div>
            </div>
          </button>
        </div>

        {errors.driver_id && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{errors.driver_id.message}</div>}

        <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          <div className="form-group">
            <label className="form-label">Vehicle *</label>
            <select {...register('vehicle_id')} className="form-control">
              <option value="">Select Vehicle</option>
              {vehicles
                .filter(v => v.current_status === 'available' || v.id == watch('vehicle_id'))
                .map(v => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.brand} {v.model})</option>)
              }
            </select>
            {errors.vehicle_id && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.vehicle_id.message}</span>}
          </div>

          {assigneeType === 'internal' ? (
            <div className="form-group">
              <label className="form-label">Driver *</label>
              <select {...register('driver_id')} className="form-control">
                <option value="">Select Driver</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Approved Request *</label>
              <select {...register('vehicle_request_id')} className="form-control" onChange={(e) => {
                const req = requests.find(r => r.id.toString() === e.target.value);
                if (req) {
                  if (req.request_date) setValue('assignment_date', req.request_date.split('T')[0]);
                  if (req.return_date) setValue('return_date', req.return_date.split('T')[0]);
                }
              }}>
                <option value="">Select Request</option>
                {requests.map(r => <option key={r.id} value={r.id}>{r.requester_name} ({r.requested_vehicle_type})</option>)}
              </select>
            </div>
          )}

          {assigneeType === 'internal' && (
            <div className="form-group">
              <label className="form-label">Department (Optional)</label>
              <select {...register('department_id')} className="form-control">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Purpose</label>
            <input type="text" {...register('purpose')} className="form-control" placeholder="e.g. Employee Transport, Goods Delivery" />
            {errors.purpose && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.purpose.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Payment Type *</label>
            <select {...register('payment_frequency')} className="form-control">
              <option value="monthly">Monthly</option>
              <option value="custom">Custom Date Range</option>
              <option value="weekends">Weekends Only</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {watchPaymentFrequency === 'monthly' ? 'Monthly Rental Amount' : 'Daily Rental Amount'} (LKR)
            </label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ padding: '0.6rem 0.75rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRight: 'none', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)', color: 'var(--text-muted)' }}>Rs</span>
              <input type="number" step="0.01" className="form-control" style={{ borderRadius: '0 var(--radius-md) var(--radius-md) 0' }} placeholder="0.00" value={inputRate} onChange={(e) => setInputRate(e.target.value)} />
            </div>
            {watchPaymentFrequency !== 'monthly' && Number(inputRate) > 0 && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                <strong>Calculated Total Sum:</strong> Rs {totalCalculated.toLocaleString()}
              </div>
            )}
            {errors.amount && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.amount.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Assignment Date *</label>
            <input type="date" {...register('assignment_date')} className="form-control" />
            {errors.assignment_date && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{errors.assignment_date.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Return Date (Optional)</label>
            <input type="date" {...register('return_date')} className="form-control" />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select {...register('status')} className="form-control">
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-control" rows="2" placeholder="Additional details..." />
          </div>

          {/* File Upload Component */}
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <FileUploadField 
              onFilesSelected={setFiles} 
              existingFiles={existingAttachments} 
              onRemoveExistingFile={handleRemoveAttachment}
              label="Assignment Documents & Approvals" 
            />
          </div>

        </div>

        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-2)' }}>
          <button type="button" className="btn btn-ghost" onClick={handleCancel} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Saving…' : isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentForm;
