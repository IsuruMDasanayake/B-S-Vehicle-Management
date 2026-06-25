import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import ExpenseForm from './ExpenseForm';

const ExpensesList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/expenses'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  const typeLabel = { fuel: 'Fuel', service: 'Service', insurance: 'Insurance', license: 'License', repair: 'Repair', parking: 'Parking', toll: 'Toll', tire: 'Tire', spare_parts: 'Spare Parts', other: 'Other' };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Expenses</h1><p style={{ color: 'var(--text-muted)' }}>Record and track all fleet expenses</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> Record Expense</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Vehicle</th><th>Description</th><th>Amount</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No expenses recorded.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td>{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                    <td><span className="badge badge-primary">{typeLabel[item.expense_type] || item.expense_type}</span></td>
                    <td>{item.vehicle?.vehicle_number || 'General'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '-'}</td>
                    <td style={{ fontWeight: 700 }}>LKR {parseFloat(item.amount).toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: `${typeLabel[item.expense_type]} – LKR ${parseFloat(item.amount).toLocaleString()}` })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Expense' : 'Record Expense'} size="md">
        <ExpenseForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/expenses/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default ExpensesList;
