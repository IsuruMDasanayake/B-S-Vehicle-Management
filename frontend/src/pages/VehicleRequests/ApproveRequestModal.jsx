import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Save, Eye } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ImageViewerModal from '../../components/ui/ImageViewerModal';
import { format, differenceInDays, isWeekend, addDays } from 'date-fns';

const ApproveRequestModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    payment_frequency: 'monthly',
    inputRate: ''
  });
  const [totalCalculated, setTotalCalculated] = useState(0);
  const [imageViewer, setImageViewer] = useState({ isOpen: false, url: '', title: '' });

  const getImageUrl = (path) => {
    if (!path) return '';
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    return `${baseUrl}/storage/${path}`;
  };

  useEffect(() => {
    if (isOpen && request) {
      setFormData({ vehicle_id: request.vehicle_id || '', payment_frequency: request.payment_frequency || 'monthly', inputRate: '' });
      fetchAvailableVehicles();
    }
  }, [isOpen, request]);

  useEffect(() => {
    if (!request || !formData.inputRate) {
      setTotalCalculated(0);
      return;
    }
    const rate = Number(formData.inputRate) || 0;
    if (formData.payment_frequency === 'monthly') {
      setTotalCalculated(rate);
    } else {
      const start = new Date(request.request_date);
      const end = request.return_date ? new Date(request.return_date) : start;
      if (formData.payment_frequency === 'custom') {
        const days = differenceInDays(end, start) + 1;
        setTotalCalculated(days * rate);
      } else if (formData.payment_frequency === 'weekends') {
        let weekendDays = 0;
        let curr = start;
        while (curr <= end) {
          if (isWeekend(curr)) weekendDays++;
          curr = addDays(curr, 1);
        }
        setTotalCalculated(weekendDays * rate);
      }
    }
  }, [formData.inputRate, formData.payment_frequency, request]);

  const fetchAvailableVehicles = async () => {
    try {
      // Fetch vehicles that are 'available'
      const { data } = await api.get('/vehicles?status=available');
      setVehicles(data.data || data);
    } catch (e) {
      toast.error('Failed to load available vehicles');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id) {
      toast.error('Please select a vehicle to assign.');
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/vehicle-requests/${request.id}`, {
        approval_status: 'approved',
        vehicle_id: formData.vehicle_id,
        payment_frequency: formData.payment_frequency,
        amount: Number(formData.inputRate) || 0
      });
      toast.success('Request approved and assignment created!');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve request');
    } finally {
      setIsLoading(false);
    }
  };

  if (!request) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Approve Vehicle Request" size="md">
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
        <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Request Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
          <div><strong>Requester:</strong> {request.requester_name || request.requester?.name || 'N/A'}</div>
          <div><strong>Requested Type:</strong> {request.requested_vehicle_type || 'N/A'}</div>
          <div><strong>Request Date:</strong> {format(new Date(request.request_date), 'MMM dd, yyyy')}</div>
          <div><strong>Return Date:</strong> {request.return_date ? format(new Date(request.return_date), 'MMM dd, yyyy') : 'N/A'}</div>
          <div><strong>Contact:</strong> {request.requester_contact || 'N/A'}</div>
          <div><strong>WhatsApp:</strong> {request.whatsapp_number || 'N/A'}</div>
        </div>
      </div>

      {(request.id_card_front_path || request.id_card_back_path || request.drivers_license_path) && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
          <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Verification Documents</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {request.id_card_front_path && (
              <div 
                style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setImageViewer({ isOpen: true, url: getImageUrl(request.id_card_front_path), title: 'ID Card (Front)' })}
              >
                <img src={getImageUrl(request.id_card_front_path)} alt="ID Front" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>ID Front</div>
              </div>
            )}
            {request.id_card_back_path && (
              <div 
                style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setImageViewer({ isOpen: true, url: getImageUrl(request.id_card_back_path), title: 'ID Card (Back)' })}
              >
                <img src={getImageUrl(request.id_card_back_path)} alt="ID Back" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>ID Back</div>
              </div>
            )}
            {request.drivers_license_path && (
              <div 
                style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setImageViewer({ isOpen: true, url: getImageUrl(request.drivers_license_path), title: 'Driver\'s License' })}
              >
                <img src={getImageUrl(request.drivers_license_path)} alt="License" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>License</div>
              </div>
            )}
            {request.residency_bill_path && (
              <div 
                style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setImageViewer({ isOpen: true, url: getImageUrl(request.residency_bill_path), title: 'Proof of Residency' })}
              >
                <img src={getImageUrl(request.residency_bill_path)} alt="Bill" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Bill</div>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Assign Vehicle *</label>
          <select 
            className="form-control" 
            value={formData.vehicle_id}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            required
          >
            <option value="">Select an available vehicle...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.vehicle_number} - {v.brand} {v.model} ({v.current_status})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <label className="form-label">Payment Type</label>
          <select 
            className="form-control" 
            value={formData.payment_frequency}
            onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Date Range</option>
            <option value="weekends">Weekends Only</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">
            {formData.payment_frequency === 'monthly' ? 'Monthly Rental Amount (LKR)' : 'Daily Rental Amount (LKR)'}
          </label>
          <input 
            type="number" 
            className="form-control" 
            placeholder="0.00" 
            step="0.01"
            value={formData.inputRate}
            onChange={(e) => setFormData({ ...formData, inputRate: e.target.value })}
          />
          {formData.payment_frequency !== 'monthly' && formData.inputRate > 0 && (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
              <strong>Calculated Total Sum:</strong> Rs {totalCalculated.toLocaleString()}
            </div>
          )}
          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>Optional. Can be added/edited later.</small>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ border: '1px solid var(--surface-2)' }}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            <Save size={16} /> {isLoading ? 'Approving...' : 'Approve & Assign'}
          </button>
        </div>
      </form>
      
      <ImageViewerModal 
        isOpen={imageViewer.isOpen} 
        onClose={() => setImageViewer({ ...imageViewer, isOpen: false })} 
        imageUrl={imageViewer.url} 
        title={imageViewer.title} 
      />
    </Modal>
  );
};
export default ApproveRequestModal;
