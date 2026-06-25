import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import InspectionForm from './InspectionForm';

const InspectionsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/inspections'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  const Check = ({ ok }) => ok
    ? <CheckCircle size={16} color="var(--success)" />
    : <XCircle size={16} color="var(--danger)" />;

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Inspections</h1><p style={{ color: 'var(--text-muted)' }}>Pre-trip and post-trip vehicle inspection records</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> New Inspection</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Date</th><th>Vehicle</th><th>Type</th><th>Tires</th><th>Brakes</th><th>Lights</th><th>Engine</th><th>Result</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No inspections recorded.</td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td>{format(new Date(item.inspected_at), 'MMM dd, yyyy HH:mm')}</td>
                    <td style={{ fontWeight: 700 }}>{item.vehicle?.vehicle_number || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.inspection_type?.replace('_', '-')}</td>
                    <td style={{ textAlign: 'center' }}><Check ok={item.tires_ok} /></td>
                    <td style={{ textAlign: 'center' }}><Check ok={item.brakes_ok} /></td>
                    <td style={{ textAlign: 'center' }}><Check ok={item.lights_ok} /></td>
                    <td style={{ textAlign: 'center' }}><Check ok={item.engine_ok} /></td>
                    <td><span className={`badge ${item.overall_status === 'pass' ? 'badge-success' : item.overall_status === 'fail' ? 'badge-danger' : 'badge-warning'}`}>{item.overall_status}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: `Inspection – ${item.vehicle?.vehicle_number}` })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Inspection' : 'New Vehicle Inspection'} size="lg">
        <InspectionForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/inspections/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default InspectionsList;
