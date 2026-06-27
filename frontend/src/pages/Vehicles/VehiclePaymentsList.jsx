import { useState, useEffect } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import VehiclePaymentsModal from '../../components/ui/VehiclePaymentsModal';
import { CarFront } from 'lucide-react';

const statusColors = {
  available: 'badge-success',
  hired: 'badge-info',
  maintenance: 'badge-warning',
  out_of_service: 'badge-danger'
};

const VehiclePaymentsList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/vehicles');
      setVehicles(data.data || data);
    } catch (error) {
      toast.error('Failed to load vehicles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(v => {
    const q = searchQuery.toLowerCase();
    return (
      v.vehicle_number.toLowerCase().includes(q) ||
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.chassis_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Rental Income</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage payments received from parties who have rented our vehicles.</p>
        </div>
        <div className="header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search vehicles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: '250px' }}
          />
          <div className="view-mode-toggle" style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.25rem' }}>
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
        </div>
      </div>

      {isLoading ? (
        <div className="card table-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading vehicles…</div>
      ) : viewMode === 'table' ? (
        <div className="card table-container" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Vehicle No.</th>
                <th>Brand & Model</th>
                <th>Type</th>
                <th>Ownership</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No vehicles found.</td></tr>
              ) : filteredVehicles.map(v => (
                <tr key={v.id} onClick={() => setSelectedVehicle(v)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{v.vehicle_number}</td>
                  <td>{v.brand} {v.model}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.vehicle_type}</td>
                  <td style={{ textTransform: 'capitalize' }}>{v.ownership}</td>
                  <td>
                    <span className={`badge ${statusColors[v.current_status] || 'badge-warning'}`}>
                      {v.current_status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelectedVehicle(v); }}>
                        Manage Payments
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
          {filteredVehicles.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles found.</div>
          ) : filteredVehicles.map(v => {
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
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{v.ownership}</span>
                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); setSelectedVehicle(v); }}>
                      Manage Payments
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVehicle && (
        <VehiclePaymentsModal 
          isOpen={!!selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
          vehicle={selectedVehicle} 
        />
      )}
    </div>
  );
};

export default VehiclePaymentsList;
