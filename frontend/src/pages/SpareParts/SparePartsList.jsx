import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import SparePartForm from './SparePartForm';

const SparePartsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/spare-parts'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Spare Parts</h1><p style={{ color: 'var(--text-muted)' }}>Inventory management for spare parts</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}>
          <Plus size={18} /> <span className="hide-mobile">Add Part</span></button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Part Name</th><th>Part No.</th><th>Quantity</th><th>Min Alert</th><th>Unit Cost</th><th>Location</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No spare parts found.</td></tr>
                : items.map(item => (
                  <tr key={item.id} style={{ background: item.quantity <= item.min_stock_alert ? 'var(--danger-light)' : '' }}>
                    <td style={{ fontWeight: 700 }}>
                      {item.part_name}
                      {item.quantity <= item.min_stock_alert && <AlertTriangle size={14} style={{ marginLeft: '0.5rem', color: 'var(--danger)', verticalAlign: 'middle' }} />}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{item.part_number || '-'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: item.quantity <= item.min_stock_alert ? 'var(--danger)' : 'inherit' }}>
                        {item.quantity}
                      </span>
                    </td>
                    <td>{item.min_stock_alert}</td>
                    <td>{item.purchase_cost ? `LKR ${parseFloat(item.purchase_cost).toLocaleString()}` : '-'}</td>
                    <td>{item.location || '-'}</td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: item.part_name })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Spare Part' : 'Add Spare Part'} size="md">
        <SparePartForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/spare-parts/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default SparePartsList;
