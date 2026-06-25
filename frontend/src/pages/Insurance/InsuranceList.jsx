import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import InsuranceForm from './InsuranceForm';

const InsuranceList = () => {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/insurance-policies');
      setPolicies((res.data.data || res.data || []));
    } catch { toast.error('Failed to load insurance policies'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchPolicies(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchPolicies(); };

  const isExpiringSoon = (dateStr) => {
    const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Insurance Policies</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage vehicle insurance coverage</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={18} /> Add Policy</button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Policy No.</th>
                <th>Insurance Co.</th>
                <th>Start Date</th>
                <th>Expiry Date</th>
                <th>Premium</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No insurance policies found.</td></tr>
              ) : policies.map(p => (
                <tr key={p.id} style={{ background: isExpiringSoon(p.expiry_date) ? 'var(--warning-light)' : '' }}>
                  <td style={{ fontWeight: 700 }}>{p.vehicle?.vehicle_number || '-'}</td>
                  <td>{p.policy_number}</td>
                  <td>{p.insurance_company}</td>
                  <td>{format(new Date(p.start_date), 'MMM dd, yyyy')}</td>
                  <td>
                    {format(new Date(p.expiry_date), 'MMM dd, yyyy')}
                    {isExpiringSoon(p.expiry_date) && <span className="badge badge-warning" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>Expiring</span>}
                  </td>
                  <td>LKR {parseFloat(p.premium_amount).toLocaleString()}</td>
                  <td><span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{p.status}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => openEdit(p.id)}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: p.id, name: `Policy ${p.policy_number}` })}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Insurance Policy' : 'Add Insurance Policy'} size="lg">
        <InsuranceForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchPolicies(); }}
        endpoint={deleteTarget ? `/insurance-policies/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};

export default InsuranceList;
