import { useState } from 'react';
import Modal from './Modal';
import { CarFront, Calendar, Fuel, Activity, Image as ImageIcon, Shield, FileText, Wind, Plus, History } from 'lucide-react';
import api from '../../services/api';

import InsuranceForm from '../../pages/Insurance/InsuranceForm';
import RevenueLicenseForm from '../../pages/RevenueLicense/RevenueLicenseForm';
import EmissionTestForm from '../../pages/EmissionTest/EmissionTestForm';
import ComplianceHistoryModal from './ComplianceHistoryModal';

const VehicleDetailsModal = ({ isOpen, onClose, vehicle }) => {
  const [activeAction, setActiveAction] = useState(null); // 'add-insurance', 'view-insurance', etc.
  const [editId, setEditId] = useState(null);

  if (!vehicle) return null;

  const handleCloseAction = () => {
    setActiveAction(null);
    setEditId(null);
  };

  // Retrieve the first image attachment if available
  const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost';
  const vehicleImage = vehicle.attachments && vehicle.attachments.length > 0 
    ? `${baseUrl}/storage/${vehicle.attachments[0].file_path}`
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vehicle Details: ${vehicle.vehicle_number}`} size="lg">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Side: Image & Quick Stats */}
        <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
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
              <span style={{ fontWeight: 600 }}>{Math.round(Number(vehicle.current_odometer || 0)).toLocaleString()} km</span>
            </div>
          </div>
          <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
            {/* <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={16} /> Compliance & Legal</h3> */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* Insurance */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  <Shield size={16} color="var(--primary)" /> Insurance
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--primary-alpha)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('add-insurance')} title="Add">
                    <Plus size={14} />
                  </button>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('view-insurance')} title="View">
                    <History size={14} />
                  </button>
                </div>
              </div>

              {/* License */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  <FileText size={16} color="var(--info)" /> Licenses
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--info-light)', color: 'var(--info)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('add-license')} title="Add">
                    <Plus size={14} />
                  </button>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('view-license')} title="View">
                    <History size={14} />
                  </button>
                </div>
              </div>

              {/* Emissions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
                  <Wind size={16} color="var(--success)" /> Emissions
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('add-emission')} title="Add">
                    <Plus size={14} />
                  </button>
                  <button className="icon-btn" style={{ width: '28px', height: '28px', padding: 0, background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }} onClick={() => setActiveAction('view-emission')} title="View">
                    <History size={14} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Side: Detailed Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CarFront size={20} /> {vehicle.brand} {vehicle.model} ({vehicle.manufacturing_year})
            </h3>
            
            {/* Primary Identifiers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Number</div>
                <div style={{ fontWeight: 600 }}>{vehicle.vehicle_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registration Number</div>
                <div style={{ fontWeight: 600 }}>{vehicle.registration_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chassis Number</div>
                <div style={{ fontWeight: 600 }}>{vehicle.chassis_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engine Number</div>
                <div style={{ fontWeight: 600 }}>{vehicle.engine_number || 'N/A'}</div>
              </div>
            </div>

            {/* Specifications */}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>
              <Fuel size={16} /> Specifications
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vehicle Type</div>
                <div style={{ fontWeight: 600 }}>{vehicle.vehicle_type || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</div>
                <div style={{ fontWeight: 600 }}>{vehicle.vehicle_category || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Color</div>
                <div style={{ fontWeight: 600 }}>{vehicle.color || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fuel Type</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{vehicle.fuel_type || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Engine Capacity</div>
                <div style={{ fontWeight: 600 }}>{vehicle.engine_capacity ? `${vehicle.engine_capacity} cc` : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seating Capacity</div>
                <div style={{ fontWeight: 600 }}>{vehicle.seating_capacity || 'N/A'}</div>
              </div>
            </div>

            {/* Ownership & Purchase */}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>
              <Activity size={16} /> Ownership & Purchase
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ownership</div>
                <div style={{ fontWeight: 600 }}>{vehicle.ownership || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purchase Date</div>
                <div style={{ fontWeight: 600 }}>{vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Purchase Cost</div>
                <div style={{ fontWeight: 600 }}>{vehicle.purchase_cost ? `LKR ${Number(vehicle.purchase_cost).toLocaleString()}` : 'N/A'}</div>
              </div>
            </div>

            {vehicle.ownership === 'Hired' && vehicle.hired_details && (
              <>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>
                  <Activity size={16} /> Hired Details
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Owner Name</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.owner_name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contact No</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.contact_no || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Amount</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.monthly_amount ? `LKR ${Number(vehicle.hired_details.monthly_amount).toLocaleString()}` : 'N/A'}</div>
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.address || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Person</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.emergency_person || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emergency Contact</div>
                    <div style={{ fontWeight: 600 }}>{vehicle.hired_details.emergency_contact || 'N/A'}</div>
                  </div>
                </div>
              </>
            )}



          </div>
        </div>
      </div>
      {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div> */}

      {/* Sub-Modals for Adding Data */}
      <Modal isOpen={activeAction === 'add-insurance'} onClose={handleCloseAction} title={editId ? "Edit Insurance Policy" : "Add Insurance Policy"} size="lg">
        {activeAction === 'add-insurance' && <InsuranceForm editId={editId} onSuccess={handleCloseAction} onClose={handleCloseAction} defaultVehicleId={vehicle.id} />}
      </Modal>

      <Modal isOpen={activeAction === 'add-license'} onClose={handleCloseAction} title={editId ? "Edit Revenue License" : "Add Revenue License"} size="lg">
        {activeAction === 'add-license' && <RevenueLicenseForm editId={editId} onSuccess={handleCloseAction} onClose={handleCloseAction} defaultVehicleId={vehicle.id} />}
      </Modal>

      <Modal isOpen={activeAction === 'add-emission'} onClose={handleCloseAction} title={editId ? "Edit Emission Test" : "Add Emission Test"} size="lg">
        {activeAction === 'add-emission' && <EmissionTestForm editId={editId} onSuccess={handleCloseAction} onClose={handleCloseAction} defaultVehicleId={vehicle.id} />}
      </Modal>

      {/* History Modals */}
      <ComplianceHistoryModal 
        isOpen={activeAction === 'view-insurance'} 
        onClose={handleCloseAction} 
        vehicle={vehicle} 
        type="insurance" 
        onEdit={(id) => { setEditId(id); setActiveAction('add-insurance'); }}
      />
      <ComplianceHistoryModal 
        isOpen={activeAction === 'view-license'} 
        onClose={handleCloseAction} 
        vehicle={vehicle} 
        type="license" 
        onEdit={(id) => { setEditId(id); setActiveAction('add-license'); }}
      />
      <ComplianceHistoryModal 
        isOpen={activeAction === 'view-emission'} 
        onClose={handleCloseAction} 
        vehicle={vehicle} 
        type="emission" 
        onEdit={(id) => { setEditId(id); setActiveAction('add-emission'); }}
      />

    </Modal>
  );
};

export default VehicleDetailsModal;
