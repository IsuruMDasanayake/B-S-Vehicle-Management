import React from 'react';
import Modal from './Modal';
import { User, CreditCard, Activity, Phone, MapPin, AlertCircle, FileText } from 'lucide-react';
import api from '../../services/api';
import ImageViewerModal from './ImageViewerModal';

const DriverDetailsModal = ({ isOpen, onClose, driver }) => {
  const [viewImage, setViewImage] = React.useState(null);
  if (!driver) return null;

  let baseUrl = api.defaults.baseURL?.replace('/api', ''); 
  if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
  
  const photoUrl = driver.photo 
    ? `${baseUrl}/storage/${driver.photo}` 
    : (driver.attachments && driver.attachments.length > 0 ? `${baseUrl}/storage/${driver.attachments[0].file_path}` : null);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Driver Details: ${driver.name}`} size="lg">
      <div className="grid-layout-1-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Left Side: Photo & Status */}
        <div className="sticky-desktop">
          <div 
            onClick={() => { if (photoUrl) setViewImage({ url: photoUrl, title: 'Driver Photo' }); }}
            style={{
              width: '100%',
              height: '250px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              border: '1px solid var(--surface-2)',
              cursor: photoUrl ? 'pointer' : 'default'
            }}
          >
            {photoUrl ? (
              <img src={photoUrl} alt={driver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={64} color="var(--text-muted)" />
            )}
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>Status</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Current State:</span>
              <span className={`badge ${
                driver.status === 'active' ? 'badge-success' :
                driver.status === 'on_leave' ? 'badge-warning' : 'badge-danger'
              }`}>
                {driver.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
          {driver.attachments && driver.attachments.length > 0 && (
            <div className="card" style={{ padding: '1rem', marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} /> Attached Documents
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {driver.attachments.map(att => (
                  <a key={att.id} href={`${baseUrl}/storage/${att.file_path}`} target="_blank" rel="noreferrer" 
                     style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', textDecoration: 'none', color: 'var(--text-primary)', border: '1px solid var(--surface-2)', width: '100%' }}>
                    <FileText size={14} color="var(--primary)" /> {att.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Detailed Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          <div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {driver.name}
            </h3>
            
            {/* Identity Information */}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CreditCard size={16} /> Identity & License
            </h4>
            <div className="grid-cols-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--surface-2)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NIC Number</div>
                <div style={{ fontWeight: 600 }}>{driver.nic_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>License Number</div>
                <div style={{ fontWeight: 600 }}>{driver.license_number || 'N/A'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>License Expiry Date</div>
                <div style={{ fontWeight: 600, color: (new Date(driver.license_expiry_date) < new Date()) ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {driver.license_expiry_date ? new Date(driver.license_expiry_date).toLocaleDateString() : 'N/A'}
                  {(new Date(driver.license_expiry_date) < new Date()) && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}>(Expired)</span>}
                </div>
              </div>

              {/* License Images */}
              {(driver.license_front || driver.license_back) && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  {driver.license_front && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>License Front</div>
                      <div 
                        onClick={() => setViewImage({ url: `${baseUrl}/storage/${driver.license_front}`, title: 'License Front' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={`${baseUrl}/storage/${driver.license_front}`} alt="License Front" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dark-2)' }} />
                      </div>
                    </div>
                  )}
                  {driver.license_back && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>License Back</div>
                      <div 
                        onClick={() => setViewImage({ url: `${baseUrl}/storage/${driver.license_back}`, title: 'License Back' })}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={`${baseUrl}/storage/${driver.license_back}`} alt="License Back" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--dark-2)' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Information */}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>
              <Phone size={16} /> Contact Details
            </h4>
            <div className="grid-cols-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Primary Contact</div>
                <div style={{ fontWeight: 600 }}>{driver.contact_number || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Address</div>
                <div style={{ fontWeight: 600 }}>{driver.address || 'N/A'}</div>
              </div>
            </div>

            {/* Emergency Contact */}
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: '2rem', color: 'var(--danger)' }}>
              <AlertCircle size={16} /> Emergency Contact
            </h4>
            <div className="grid-cols-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--danger-light)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Name</div>
                <div style={{ fontWeight: 600 }}>{driver.emergency_contact_name || 'Not Provided'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Phone Number</div>
                <div style={{ fontWeight: 600 }}>{driver.emergency_contact_phone || 'Not Provided'}</div>
              </div>
            </div>

            {/* Notes */}
            {driver.notes && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Additional Notes</h4>
                <div style={{ padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem' }}>
                  {driver.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ImageViewerModal 
        isOpen={!!viewImage} 
        onClose={() => setViewImage(null)} 
        imageUrl={viewImage?.url} 
        title={viewImage?.title} 
      />
    </Modal>
  );
};

export default DriverDetailsModal;
