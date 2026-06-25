import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import RouteForm from './RouteForm';

const RoutesList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/routes'); setItems((r.data.data || r.data || []) || []); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Routes</h1><p style={{ color: 'var(--text-muted)' }}>Manage predefined vehicle routes</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> New Route</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Route Name</th><th>From</th><th>To</th><th>Distance</th><th>Est. Time</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No routes found.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.route_name}</td>
                    <td>{item.starting_point}</td>
                    <td>{item.destination}</td>
                    <td>{item.distance_km ? `${item.distance_km} km` : '-'}</td>
                    <td>{item.estimated_time_minutes ? `${item.estimated_time_minutes} min` : '-'}</td>
                    <td><span className={`badge ${item.is_active ? 'badge-success' : 'badge-danger'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: item.route_name })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Route' : 'New Route'} size="md">
        <RouteForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/routes/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default RoutesList;
