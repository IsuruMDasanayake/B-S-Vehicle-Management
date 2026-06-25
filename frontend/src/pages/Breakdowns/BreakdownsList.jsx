import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import BreakdownForm from './BreakdownForm';

const BreakdownsList = () => {
  const [breakdowns, setBreakdowns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchBreakdowns = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/breakdowns');
      setBreakdowns((res.data.data || res.data || []));
    } catch { toast.error('Failed to load breakdown records'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchBreakdowns(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchBreakdowns(); };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Breakdowns</h1>
          <p style={{ color: 'var(--text-muted)' }}>Emergency breakdown incidents</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Report Breakdown</button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Location</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {breakdowns.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No breakdown records found.</td></tr>
              ) : breakdowns.map(b => (
                <tr key={b.id}>
                  <td>{format(new Date(b.breakdown_date), 'MMM dd, yyyy HH:mm')}</td>
                  <td style={{ fontWeight: 700 }}>{b.vehicle?.vehicle_number || '-'}</td>
                  <td>{b.driver?.name || '-'}</td>
                  <td>{b.location}</td>
                  <td>
                    <span className={`badge ${b.status === 'resolved' ? 'badge-success' : b.status === 'reported' ? 'badge-danger' : 'badge-warning'}`}>
                      {b.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => openEdit(b.id)}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: b.id, name: `Breakdown at ${b.location}` })}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Breakdown' : 'Report Breakdown'} size="lg">
        <BreakdownForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchBreakdowns(); }}
        endpoint={deleteTarget ? `/breakdowns/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default BreakdownsList;
