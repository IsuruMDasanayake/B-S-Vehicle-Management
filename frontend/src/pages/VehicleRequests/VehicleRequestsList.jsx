import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import ApproveRequestModal from './ApproveRequestModal';

const VehicleRequestsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);

  const fetchItems = async () => { 
    setIsLoading(true); 
    try { 
      const r = await api.get('/vehicle-requests'); 
      setItems((r.data.data || r.data || [])); 
    } catch { 
      toast.error('Failed to load vehicle requests'); 
    } finally { 
      setIsLoading(false); 
    } 
  };
  
  useEffect(() => { fetchItems(); }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/vehicle-requests/${id}`, { approval_status: status });
      toast.success(`Request ${status} successfully`);
      fetchItems();
    } catch (error) {
      toast.error(`Failed to mark request as ${status}`);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Vehicle Requests</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage external vehicle requests</p>
        </div>
      </div>
      
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Date Requested</th>
                <th>Requester Name</th>
                <th>Email</th>
                <th>Contact Number</th>
                <th>Vehicle Type</th>
                <th>Pickup Date</th>
                <th>Return Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No vehicle requests found.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td>{format(new Date(item.created_at), 'MMM dd, yyyy')}</td>
                    <td style={{ fontWeight: 700 }}>{item.requester_name || (item.requester?.name || '-')}</td>
                    <td>{item.requester_email || '-'}</td>
                    <td>{item.requester_contact || '-'}</td>
                    <td><span className="badge badge-info">{item.requested_vehicle_type || '-'}</span></td>
                    <td>{format(new Date(item.request_date), 'MMM dd, yyyy')}</td>
                    <td>{item.return_date ? format(new Date(item.return_date), 'MMM dd, yyyy') : '-'}</td>
                    <td>
                      <span className={`badge ${item.approval_status === 'approved' ? 'badge-success' : item.approval_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {item.approval_status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        {item.approval_status === 'pending' && (
                          <>
                            <button className="icon-btn" style={{ color: 'var(--success)' }} title="Approve" onClick={() => setApproveTarget(item)}><CheckCircle size={18} /></button>
                            <button className="icon-btn" style={{ color: 'var(--danger)' }} title="Reject" onClick={() => handleStatusUpdate(item.id, 'rejected')}><XCircle size={18} /></button>
                          </>
                        )}
                        <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: `Request by ${item.requester_name || item.requester?.name}` })}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      
      <ConfirmDeleteModal 
        isOpen={!!deleteTarget} 
        onClose={() => setDeleteTarget(null)} 
        onDeleted={() => { setDeleteTarget(null); fetchItems(); }} 
        endpoint={deleteTarget ? `/vehicle-requests/${deleteTarget.id}` : ''} 
        itemName={deleteTarget?.name} 
      />

      <ApproveRequestModal 
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        request={approveTarget}
        onSuccess={() => {
          setApproveTarget(null);
          fetchItems();
        }}
      />
    </div>
  );
};
export default VehicleRequestsList;
