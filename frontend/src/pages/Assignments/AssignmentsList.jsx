import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import AssignmentForm from './AssignmentForm';

const AssignmentsList = () => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/assignments');
      setAssignments((res.data.data || res.data || []));
    } catch { toast.error('Failed to load assignments'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchAssignments(); };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Vehicle Assignments</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage vehicle to driver allocations</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> New Assignment</button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No assignments found.</td></tr>
              ) : assignments.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 700 }}>{a.vehicle?.vehicle_number || '-'}</td>
                  <td>{a.driver?.name || '-'}</td>
                  <td>{a.assignment_date ? format(new Date(a.assignment_date), 'MMM dd, yyyy') : '-'}</td>
                  <td>{a.return_date ? format(new Date(a.return_date), 'MMM dd, yyyy') : 'Present'}</td>
                  <td>
                    <span className={`badge ${a.status === 'active' ? 'badge-success' : a.status === 'completed' ? 'badge-info' : 'badge-danger'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => openEdit(a.id)}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: a.id, name: `${a.vehicle?.vehicle_number} → ${a.driver?.name}` })}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Assignment' : 'New Assignment'} size="md">
        <AssignmentForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchAssignments(); }}
        endpoint={deleteTarget ? `/assignments/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default AssignmentsList;
