import Modal from './Modal';
import { User, Phone, MapPin, AlertCircle, DollarSign, CarFront } from 'lucide-react';
import api from '../../services/api';

const HiringDetailsModal = ({ isOpen, onClose, vehicle }) => {
  if (!vehicle || !vehicle.hired_details) return null;

  const { hired_details } = vehicle;
  
  let baseUrl = api.defaults.baseURL?.replace('/api', ''); if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
  const vehicleImage = vehicle.attachments && vehicle.attachments.length > 0 
    ? `${baseUrl}/storage/${vehicle.attachments[0].file_path}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Hiring Details: ${vehicle.vehicle_number}`} size="lg">
      <div className="grid-layout-1-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Left Side: Image & Quick Stats */}
        <div className="sticky-desktop">
          <div style={{
            width: '100%',
            height: '200px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            border: '1px solid var(--surface-2)'
          }}>
            {vehicleImage ? (
              <img src={vehicleImage} alt={vehicle.vehicle_number} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <CarFront size={64} color="var(--text-muted)" />
            )}
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Quick Status</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className={`badge badge-${vehicle.current_status === 'available' ? 'success' : 'warning'}`}>
                {vehicle.current_status?.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Odometer:</span>
              <span style={{ fontWeight: 600 }}>{vehicle.current_odometer ? `${Number(vehicle.current_odometer).toLocaleString()} km` : '-'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Number</div>
              <div style={{ fontWeight: 600 }}>{vehicle.vehicle_number || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registration Number</div>
              <div style={{ fontWeight: 600 }}>{vehicle.registration_number || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CarFront size={20} /> {vehicle.brand} {vehicle.model} ({vehicle.manufacturing_year})
            </h3>
            
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <User size={16} /> Owner Information
            </h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <User size={18} color="var(--text-muted)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Owner Name</div>
                  <div style={{ fontWeight: 500 }}>{hired_details.owner_name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Phone size={18} color="var(--text-muted)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Contact Number</div>
                  <div style={{ fontWeight: 500 }}>{hired_details.contact_no}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <MapPin size={18} color="var(--text-muted)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Address</div>
                  <div style={{ fontWeight: 500 }}>{hired_details.address}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--surface-2)', margin: '0.5rem 0' }}></div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertCircle size={18} color="var(--warning)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Emergency Contact</div>
                  <div style={{ fontWeight: 500 }}>{hired_details.emergency_person} ({hired_details.emergency_contact})</div>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--surface-2)', margin: '0.5rem 0' }}></div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <DollarSign size={18} color="var(--success)" style={{ marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Monthly Amount</div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--success)' }}>
                    LKR {Number(hired_details.monthly_amount).toLocaleString()}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HiringDetailsModal;
