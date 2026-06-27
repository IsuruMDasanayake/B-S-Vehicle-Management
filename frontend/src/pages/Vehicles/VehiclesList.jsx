import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, LayoutGrid, List, CarFront } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';
import VehicleForm from './VehicleForm';
import VehicleDetailsModal from '../../components/ui/VehicleDetailsModal';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState(null);       // null | 'add' | 'edit'
  const [editId, setEditId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { id, name }
  const [viewMode, setViewMode] = useState('grid'); // 'table' | 'grid'
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/vehicles');
      setVehicles((res.data.data || res.data || []));
    } catch { toast.error('Failed to load vehicles'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchVehicles(); }, []);

  // Listen for live GPS updates to update odometer
  useEffect(() => {
    if (window.Echo) {
      const channel = window.Echo.channel('gps-updates');
      channel.listen('.location.updated', (event) => {
        const data = event.gpsData;
        if (data.distance_added) {
          setVehicles(prev => prev.map(v => 
            v.id === data.vehicle_id 
              ? { ...v, current_odometer: (parseFloat(v.current_odometer) || 0) + data.distance_added }
              : v
          ));
          setSelectedVehicle(prev => prev && prev.id === data.vehicle_id 
            ? { ...prev, current_odometer: (parseFloat(prev.current_odometer) || 0) + data.distance_added }
            : prev
          );
        }
      });
      return () => channel.stopListening('.location.updated');
    }
  }, []);

  const openAdd = () => { setEditId(null); setModal('add'); };
  const openEdit = (id) => { setEditId(id); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditId(null); };
  const onSaved = () => { closeModal(); fetchVehicles(); };

  const statusColors = {
    available: 'badge-success',
    assigned: 'badge-primary',
    under_maintenance: 'badge-warning',
    out_of_service: 'badge-danger',
  };

  const filteredVehicles = vehicles.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.vehicle_number?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.chassis_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Vehicles</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your fleet vehicles</p>
        </div>
        <div className="header-actions-mobile" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search vehicles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', minWidth: '120px' }}
          />
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.25rem', flexShrink: 0 }}>
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
          <button className="btn btn-primary" onClick={openAdd} style={{ flexShrink: 0, padding: '0.5rem 0.75rem' }}>
            <Plus size={18} /> <span className="hide-mobile">Add Vehicle</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="card table-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading vehicles…</div>
      ) : viewMode === 'table' ? (
        <div className="card table-container" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Vehicle No.</th>
                <th>Brand & Model</th>
                <th>Year</th>
                <th>Fuel Type</th>
                <th>Odometer</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No vehicles found.</td></tr>
              ) : filteredVehicles.map(v => (
                <tr key={v.id} onClick={() => setSelectedVehicle(v)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{v.vehicle_number}</td>
                  <td>{v.brand} {v.model}</td>
                  <td>{v.manufacturing_year}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.fuel_type}</td>
                  <td>{Math.round(Number(v.current_odometer || 0)).toLocaleString()} km</td>
                  <td>
                    <span className={`badge ${statusColors[v.current_status] || 'badge-warning'}`}>
                      {v.current_status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); openEdit(v.id); }} title="Edit"><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: v.id, name: v.vehicle_number }); }} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredVehicles.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles found.</div>
          ) : filteredVehicles.map(v => {
            let baseUrl = api.defaults.baseURL?.replace('/api', '');
            if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
            const vehicleImage = v.attachments && v.attachments.length > 0 
              ? `${baseUrl}/storage/${v.attachments[0].file_path}`
              : null;
            
            return (
              <div 
                key={v.id} 
                className="card" 
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--surface-2)' }}
                onClick={() => setSelectedVehicle(v)}
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
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{Math.round(Number(v.current_odometer || 0)).toLocaleString()} km</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="icon-btn edit" onClick={(e) => { e.stopPropagation(); openEdit(v.id); }} title="Edit"><Edit size={16} /></button>
                      <button className="icon-btn delete" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: v.id, name: v.vehicle_number }); }} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'edit' ? 'Edit Vehicle' : 'Add New Vehicle'}
        size="lg"
      >
        <VehicleForm editId={editId} onSuccess={onSaved} onClose={closeModal} />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => { setDeleteTarget(null); fetchVehicles(); }}
        endpoint={deleteTarget ? `/vehicles/${deleteTarget.id}` : ''}
        itemName={deleteTarget?.name}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal 
        isOpen={!!selectedVehicle} 
        onClose={() => setSelectedVehicle(null)} 
        vehicle={selectedVehicle} 
      />
    </div>
  );
};

export default VehiclesList;
