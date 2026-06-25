import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import TireForm from './TireForm';

const TiresList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/tires'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  const positionLabel = { front_left: 'Front Left', front_right: 'Front Right', rear_left: 'Rear Left', rear_right: 'Rear Right', spare: 'Spare', other: 'Other' };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Tires</h1><p style={{ color: 'var(--text-muted)' }}>Track tire installation and replacements</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> Add Tire</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Vehicle</th><th>Brand</th><th>Size</th><th>Position</th><th>Installed</th><th>Mileage</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tire records found.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.vehicle?.vehicle_number || '-'}</td>
                    <td>{item.tire_brand}</td>
                    <td>{item.tire_size || '-'}</td>
                    <td>{positionLabel[item.position] || item.position}</td>
                    <td>{format(new Date(item.installation_date), 'MMM dd, yyyy')}</td>
                    <td>{item.installation_mileage ? `${item.installation_mileage.toLocaleString()} km` : '-'}</td>
                    <td><span className={`badge ${item.status === 'active' ? 'badge-success' : item.status === 'replaced' ? 'badge-info' : 'badge-danger'}`}>{item.status}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: `${item.tire_brand} – ${positionLabel[item.position]}` })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Tire' : 'Add Tire Record'} size="md">
        <TireForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/tires/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default TiresList;
