import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import TripForm from './TripForm';

const TripsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/trips'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Trips</h1><p style={{ color: 'var(--text-muted)' }}>Track vehicle trips and journeys</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> Create Trip</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Trip Code</th><th>Vehicle</th><th>Driver</th><th>Route</th><th>Start Time</th><th>Distance</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No trips found.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{item.trip_code}</td>
                    <td>{item.vehicle?.vehicle_number || '-'}</td>
                    <td>{item.driver?.name || '-'}</td>
                    <td>{item.start_location} → {item.destination}</td>
                    <td>{format(new Date(item.start_time), 'MMM dd, HH:mm')}</td>
                    <td>{item.distance_km ? `${item.distance_km} km` : '-'}</td>
                    <td><span className={`badge ${item.status === 'completed' ? 'badge-success' : item.status === 'ongoing' ? 'badge-primary' : 'badge-danger'}`}>{item.status}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: item.trip_code })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Trip' : 'Create Trip'} size="lg">
        <TripForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/trips/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default TripsList;
