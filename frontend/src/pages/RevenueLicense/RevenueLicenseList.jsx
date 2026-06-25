import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import RevenueLicenseForm from './RevenueLicenseForm';

const RevenueLicenseList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetch = async () => { setIsLoading(true); try { const r = await api.get('/revenue-licenses'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetch(); }, []);

  const isExpiringSoon = (d) => { const diff = (new Date(d) - new Date()) / 86400000; return diff >= 0 && diff <= 30; };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Revenue Licenses</h1><p style={{ color: 'var(--text-muted)' }}>Track vehicle revenue license renewals</p></div>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }}><Plus size={18} /> Add License</button>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Vehicle</th><th>License No.</th><th>Issue Date</th><th>Expiry Date</th><th>Fee</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No revenue licenses found.</td></tr>
                : items.map(item => (
                  <tr key={item.id} style={{ background: isExpiringSoon(item.expiry_date) ? 'var(--warning-light)' : '' }}>
                    <td style={{ fontWeight: 700 }}>{item.vehicle?.vehicle_number || '-'}</td>
                    <td>{item.license_number}</td>
                    <td>{format(new Date(item.issue_date), 'MMM dd, yyyy')}</td>
                    <td>{format(new Date(item.expiry_date), 'MMM dd, yyyy')} {isExpiringSoon(item.expiry_date) && <span className="badge badge-warning" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Expiring</span>}</td>
                    <td>{item.fee ? `LKR ${parseFloat(item.fee).toLocaleString()}` : '-'}</td>
                    <td><span className={`badge ${item.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span></td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: item.license_number })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Revenue License' : 'Add Revenue License'} size="md">
        <RevenueLicenseForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetch(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetch(); }} endpoint={deleteTarget ? `/revenue-licenses/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default RevenueLicenseList;
