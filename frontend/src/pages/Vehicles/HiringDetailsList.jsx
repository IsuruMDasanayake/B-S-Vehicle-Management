import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Eye, Trash2, LayoutGrid, List, CarFront, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import Modal from '../../components/ui/Modal';
import VehicleForm from './VehicleForm';
import HiringDetailsModal from '../../components/ui/HiringDetailsModal';
import OwnerPaymentsModal from '../../components/ui/OwnerPaymentsModal';

const statusColors = {
  available: 'badge-success',
  hired: 'badge-info',
  maintenance: 'badge-warning',
  out_of_service: 'badge-danger'
};

const HiringDetailsList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modal, setModal] = useState(null); // 'add', 'edit'
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [paymentsId, setPaymentsId] = useState(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/vehicles?ownership=Hired');
      setVehicles(data.data || data);
    } catch (e) {
      toast.error('Failed to load hired vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/vehicles/${deleteTarget.id}`);
      toast.success('Vehicle deleted successfully');
      fetchVehicles();
    } catch (e) {
      toast.error('Failed to delete vehicle');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleEdit = (id) => {
    setEditId(id);
    setModal('edit');
  };

  const handleSuccess = () => {
    setModal(null);
    setEditId(null);
    fetchVehicles();
  };

  const filteredVehicles = vehicles.filter(v => 
    v.vehicle_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.hired_details?.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.hired_details?.contact_no?.includes(search)
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Hiring Details</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage hired vehicles and owner information</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search hiring details..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '250px' }}
          />
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
            <button 
              className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
              style={{ background: viewMode === 'grid' ? 'var(--surface)' : 'transparent', boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none' }}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`icon-btn ${viewMode === 'table' ? 'active' : ''}`} 
              onClick={() => setViewMode('table')}
              style={{ background: viewMode === 'table' ? 'var(--surface)' : 'transparent', boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none' }}
              title="Table View"
            >
              <List size={18} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={18} /> Add Hired Vehicle
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card table-container" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading vehicles...</div>
      ) : filteredVehicles.length === 0 ? (
        <div className="card table-container" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No hired vehicles found.</div>
      ) : viewMode === 'table' ? (
        <div className="card table-container" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle No.</th>
                <th>Type / Brand</th>
                <th>Owner Name</th>
                <th>Contact No.</th>
                
                <th>Monthly Amount (LKR)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{v.vehicle_number}</td>
                  <td>{v.vehicle_type} - {v.brand}</td>
                  <td>{v.hired_details?.owner_name || '-'}</td>
                  <td>{v.hired_details?.contact_no || '-'}</td>
                  <td>{v.hired_details?.monthly_amount ? parseFloat(v.hired_details.monthly_amount).toLocaleString() : '-'}</td>
                  <td>
                    <span className={`badge ${statusColors[v.current_status] || 'badge-warning'}`}>
                      {v.current_status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn" style={{ background: 'var(--success-light)', color: 'var(--success)', border: 'none', padding: '0.25rem', borderRadius: 'var(--radius-sm)' }} onClick={() => setPaymentsId(v.id)} title="Payments"><DollarSign size={16} /></button>
                      <button className="icon-btn view" onClick={() => setViewId(v.id)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn edit" onClick={() => handleEdit(v.id)} title="Edit"><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: v.id, name: v.vehicle_number })} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredVehicles.map(v => {
            let baseUrl = api.defaults.baseURL?.replace('/api', ''); if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
            const vehicleImage = v.attachments && v.attachments.length > 0 
              ? `${baseUrl}/storage/${v.attachments[0].file_path}`
              : v.photos && v.photos.length > 0
              ? `${baseUrl}/storage/${v.photos[0].photo_path}`
              : null;
            
            return (
              <div 
                key={v.id} 
                className="card" 
                style={{ padding: 0, overflow: 'hidden', transition: 'transform 0.2s', border: '1px solid var(--surface-2)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '160px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {vehicleImage ? (
                    <img src={vehicleImage} alt={v.vehicle_number} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CarFront size={48} color="var(--text-muted)" />
                  )}
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{v.vehicle_number}</h3>
                    <span className={`badge ${statusColors[v.current_status] || 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                      {v.current_status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{v.brand} {v.model}</div>
                  
                  <div style={{ background: 'var(--surface-2)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Owner:</span>
                      <span style={{ fontWeight: 600 }}>{v.hired_details?.owner_name || '-'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Rate:</span>
                      <span style={{ fontWeight: 600 }}>LKR {v.hired_details?.monthly_amount ? parseFloat(v.hired_details.monthly_amount).toLocaleString() : '-'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)' }}>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', background: 'var(--success-light)', color: 'var(--success)', border: 'none' }} onClick={() => setPaymentsId(v.id)}>
                      <DollarSign size={14} style={{ marginRight: '0.25rem' }} /> Payments
                    </button>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="icon-btn view" onClick={() => setViewId(v.id)} title="View"><Eye size={16} /></button>
                      <button className="icon-btn edit" onClick={() => handleEdit(v.id)} title="Edit"><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: v.id, name: v.vehicle_number })} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!modal} onClose={() => { setModal(null); setEditId(null); }} title={modal === 'edit' ? 'Edit Vehicle' : 'Add Vehicle'} size="lg">
        <VehicleForm editId={editId} onSuccess={handleSuccess} onClose={() => { setModal(null); setEditId(null); }} />
      </Modal>

      {viewId && (
        <HiringDetailsModal isOpen={!!viewId} onClose={() => setViewId(null)} vehicle={vehicles.find(v => v.id === viewId)} />
      )}

      {paymentsId && (
        <OwnerPaymentsModal isOpen={!!paymentsId} onClose={() => setPaymentsId(null)} vehicle={vehicles.find(v => v.id === paymentsId)} />
      )}

      <ConfirmDeleteModal 
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemName={`Vehicle ${deleteTarget?.name}`}
      />
    </div>
  );
};

export default HiringDetailsList;
