import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import FuelForm from './FuelForm';

const FuelList = () => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/fuel-entries');
      setEntries((res.data.data || res.data || []));
    } catch { toast.error('Failed to load fuel entries'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchEntries(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchEntries(); };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Fuel Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Track fuel consumption and costs</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> New Fuel Entry</button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Fuel Type</th>
                <th>Quantity (L)</th>
                <th>Total Cost</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No fuel records found.</td></tr>
              ) : entries.map(e => (
                <tr key={e.id}>
                  <td>{format(new Date(e.fill_date), 'MMM dd, yyyy')}</td>
                  <td style={{ fontWeight: 700 }}>{e.vehicle?.vehicle_number || '-'}</td>
                  <td>{e.driver?.name || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{e.fuel_type}</td>
                  <td>{e.quantity}</td>
                  <td>LKR {parseFloat(e.total_cost).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => openEdit(e.id)}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: e.id, name: `Fuel entry ${format(new Date(e.fill_date), 'MMM dd')} – ${e.vehicle?.vehicle_number}` })}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Fuel Entry' : 'New Fuel Entry'} size="lg">
        <FuelForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchEntries(); }}
        endpoint={deleteTarget ? `/fuel-entries/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default FuelList;
