import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from './Modal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import VehiclePaymentForm from '../../pages/Vehicles/VehiclePaymentForm';

const VehiclePaymentsModal = ({ isOpen, onClose, vehicle }) => {
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAction, setActiveAction] = useState(null); // 'add' | 'edit'
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPayments = async () => {
    if (!vehicle) return;
    setIsLoading(true);
    try {
      const { data } = await api.get(`/vehicle-payments?vehicle_id=${vehicle.id}`);
      setPayments(data || []);
    } catch (e) {
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      fetchPayments();
    }
  }, [isOpen, vehicle]);

  const handleSuccess = () => {
    setActiveAction(null);
    setEditId(null);
    fetchPayments();
  };

  if (!vehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rental Income: ${vehicle.vehicle_number}`} size="xl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Payment History</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Vehicle: <strong>{vehicle.brand} {vehicle.model}</strong> • 
            Ownership: <strong style={{ textTransform: 'capitalize' }}>{vehicle.ownership}</strong>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveAction('add')}>
          <Plus size={18} /> Record Payment
        </button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading payments...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Payment Month</th>
                <th>Amount (LKR)</th>
                <th>Status</th>
                <th>Date Received</th>
                <th>Receipt</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map(p => {
                  const receiptAttachment = p.attachments && p.attachments.length > 0 ? p.attachments[0] : null;
                  let baseUrl = api.defaults.baseURL?.replace('/api', ''); if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
                  const receiptUrl = receiptAttachment ? `${baseUrl}/storage/${receiptAttachment.file_path}` : null;
                  
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.payment_month}</td>
                      <td>{Number(p.amount).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${p.status === 'paid' ? 'success' : 'warning'}`}>
                          {p.status === 'paid' ? 'Received' : 'Pending'}
                        </span>
                      </td>
                      <td>{p.payment_date ? format(new Date(p.payment_date), 'MMM dd, yyyy') : '-'}</td>
                      <td>
                        {receiptUrl ? (
                          <a href={receiptUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <DollarSign size={14} /> View Receipt
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                          <button className="icon-btn edit" onClick={() => { setEditId(p.id); setActiveAction('edit'); }} title="Edit"><Edit size={16} /></button>
                          <button className="icon-btn delete" onClick={() => setDeleteTarget(p.id)} title="Delete"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={activeAction !== null} onClose={() => { setActiveAction(null); setEditId(null); }} title={activeAction === 'edit' ? 'Edit Payment' : 'Record Payment'} size="md">
        <VehiclePaymentForm 
          vehicleId={vehicle.id} 
          editId={editId} 
          onSuccess={handleSuccess} 
          onClose={() => { setActiveAction(null); setEditId(null); }} 
        />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchPayments(); }}
        endpoint={deleteTarget ? `/vehicle-payments/${deleteTarget}` : ''}
        itemName="Payment Record"
      />
    </Modal>
  );
};

export default VehiclePaymentsModal;
