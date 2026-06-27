import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import AccidentForm from './AccidentForm';

const AccidentsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/accidents'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Accidents</h1><p style={{ color: 'var(--text-muted)' }}>Record and manage vehicle accident reports</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}>
          <Plus size={18} /> <span className="hide-mobile">Report Accident</span></button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Vehicle</th><th>Driver</th><th>Location</th><th>Repair Cost</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No accidents reported.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td>{format(new Date(item.accident_date), 'MMM dd, yyyy HH:mm')}</td>
                    <td style={{ fontWeight: 700 }}>{item.vehicle?.vehicle_number || '-'}</td>
                    <td>{item.driver?.name || '-'}</td>
                    <td>{item.location}</td>
                    <td>{item.repair_cost ? `LKR ${parseFloat(item.repair_cost).toLocaleString()}` : '-'}</td>
                    <td><span className={`badge ${item.status === 'resolved' ? 'badge-success' : item.status === 'reported' ? 'badge-danger' : 'badge-warning'}`}>{item.status?.replace('_', ' ')}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: `Accident at ${item.location}` })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Accident Report' : 'Report Accident'} size="lg">
        <AccidentForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/accidents/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default AccidentsList;
