import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import MaintenanceForm from './MaintenanceForm';

const MaintenanceList = () => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/maintenance-records');
      setRecords((res.data.data || res.data || []));
    } catch { toast.error('Failed to load maintenance records'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchRecords(); };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Maintenance</h1>
          <p style={{ color: 'var(--text-muted)' }}>Service and repair history</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> New Record</button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Type</th>
                <th>Description</th>
                <th>Cost</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No maintenance records found.</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td>{format(new Date(r.service_date), 'MMM dd, yyyy')}</td>
                  <td style={{ fontWeight: 700 }}>{r.vehicle?.vehicle_number || '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.service_type}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                  <td>LKR {parseFloat(r.cost).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${r.status === 'completed' ? 'badge-success' : r.status === 'scheduled' ? 'badge-info' : 'badge-warning'}`}>
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => openEdit(r.id)}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: r.id, name: `${r.service_type} – ${r.vehicle?.vehicle_number}` })}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Maintenance Record' : 'New Maintenance Record'} size="lg">
        <MaintenanceForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchRecords(); }}
        endpoint={deleteTarget ? `/maintenance-records/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default MaintenanceList;
