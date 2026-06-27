import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Filter } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import VendorForm from './VendorForm';

const VendorsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/vendors'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  const typeColors = { fuel_station: 'badge-warning', workshop: 'badge-primary', insurance_provider: 'badge-success', spare_parts_supplier: 'badge-info', other: 'badge-danger' };
  const typeLabel = { fuel_station: 'Fuel Station', workshop: 'Workshop / Garage', insurance_provider: 'Insurance Provider', spare_parts_supplier: 'Spare Parts Supplier', other: 'Other' };

  const filteredItems = filterType === 'all' ? items : items.filter(item => item.vendor_type === filterType);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>Vendors</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Fuel stations, workshops, suppliers and partners</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
          
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div className="btn" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', height: '100%', borderRadius: 'var(--radius-md)' }}>
              <Filter size={18} /> <span className="hide-mobile">{filterType === 'all' ? 'Filter' : typeLabel[filterType]}</span>
            </div>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            >
              <option value="all">All Vendors</option>
              <option value="fuel_station">Fuel Station</option>
              <option value="workshop">Workshop / Garage</option>
              <option value="insurance_provider">Insurance Provider</option>
              <option value="spare_parts_supplier">Spare Parts Supplier</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={() => { setEditId(null); setModal('add'); }} style={{ padding: '0.5rem 0.75rem', flexShrink: 0 }}>
            <Plus size={18} /> <span className="hide-mobile">Add Vendor</span>
          </button>
        </div>
      </div>
      <div className="card table-container" style={{ padding: 0, overflowX: 'auto' }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table" style={{ minWidth: '800px' }}>
            <thead><tr><th>Name</th><th>Type</th><th>Contact Person</th><th>Phone</th><th>Email</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {filteredItems.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No vendors found.</td></tr>
                : filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>{item.name}</td>
                    <td><span className={`badge ${typeColors[item.vendor_type] || 'badge-primary'}`}>{typeLabel[item.vendor_type] || item.vendor_type}</span></td>
                    <td>{item.contact_person || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td>{item.email || '-'}</td>
                    <td style={{ textAlign: 'right' }}><div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={() => { setEditId(item.id); setModal('edit'); }}><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: item.id, name: item.name })}><Trash2 size={16} /></button>
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Vendor' : 'Add Vendor'} size="md">
        <VendorForm editId={editId} onSuccess={() => { setModal(null); setEditId(null); fetchItems(); }} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>
      <ConfirmDeleteModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); fetchItems(); }} endpoint={deleteTarget ? `/vendors/${deleteTarget.id}` : ''} itemName={deleteTarget?.name} />
    </div>
  );
};
export default VendorsList;
