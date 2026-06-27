import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import DriverDetailsModal from '../../components/ui/DriverDetailsModal';
import DriverForm from './DriverForm';

const DriversList = () => {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewDriver, setViewDriver] = useState(null);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/drivers');
      setDrivers((res.data.data || res.data || []));
    } catch { toast.error('Failed to load drivers'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchDrivers(); };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Drivers</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage your fleet drivers</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} /> <span className="hide-mobile">Add Driver</span>
        </button>
      </div>

      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading drivers…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>NIC Number</th>
                <th>Contact</th>
                <th>License No.</th>
                <th>Expiry</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No drivers found.</td></tr>
              ) : drivers.map(d => (
                <tr key={d.id} onClick={() => setViewDriver(d)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{d.name}</td>
                  <td>{d.nic_number}</td>
                  <td>{d.contact_number}</td>
                  <td>{d.license_number}</td>
                  <td>{d.license_expiry_date ? new Date(d.license_expiry_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`badge ${
                      d.status === 'active' ? 'badge-success' :
                      d.status === 'on_leave' ? 'badge-warning' : 'badge-danger'
                    }`}>{d.status?.replace('_', ' ')}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); openEdit(d.id); }} title="Edit"><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: d.id, name: d.name }); }} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'edit' ? 'Edit Driver' : 'Add New Driver'} size="lg">
        <DriverForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      <ConfirmDeleteModal
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchDrivers(); }}
        endpoint={deleteTarget ? `/drivers/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />

      <DriverDetailsModal 
        isOpen={!!viewDriver} 
        onClose={() => setViewDriver(null)} 
        driver={viewDriver} 
      />
    </div>
  );
};

export default DriversList;
