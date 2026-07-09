import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { FileText, Wrench, Calendar, User, DollarSign, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import ImageViewerModal from '../../components/ui/ImageViewerModal';

const MaintenanceDetailsModal = ({ isOpen, onClose, record }) => {
  const [viewImageUrl, setViewImageUrl] = useState(null);

  if (!record) return null;

  let baseUrl = api.defaults.baseURL?.replace('/api', ''); if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Maintenance Details: ${record.vehicle?.vehicle_number}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Status & Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Service Type</div>
            <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{record.service_type || 'N/A'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
            <span className={`badge ${record.status === 'completed' ? 'badge-success' : record.status === 'scheduled' ? 'badge-info' : 'badge-warning'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
              {record.status?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Service Date</div>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Calendar size={14} color="var(--primary)" />
              {record.service_date ? format(new Date(record.service_date), 'MMM dd, yyyy') : 'N/A'}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Odometer</div>
            <div style={{ fontWeight: 500 }}>
              {record.odometer_reading ? `${record.odometer_reading} km` : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Cost</div>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <DollarSign size={14} color="var(--danger)" />
              LKR {parseFloat(record.cost || 0).toLocaleString()}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mechanic/Workshop</div>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} color="var(--text-muted)" />
              {record.mechanic_name || record.workshop || 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Service Date</div>
            <div style={{ fontWeight: 500 }}>
              {record.next_service_date ? format(new Date(record.next_service_date), 'MMM dd, yyyy') : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Service Odometer</div>
            <div style={{ fontWeight: 500 }}>
              {record.next_service_km ? `${record.next_service_km} km` : 'N/A'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Description of Work</div>
          <div style={{ background: 'var(--surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
            {record.notes || 'No description provided.'}
          </div>
        </div>

        {record.parts_replaced && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Parts Replaced</div>
            <div style={{ background: 'var(--surface-1)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
              {record.parts_replaced}
            </div>
          </div>
        )}

        {record.attachments && record.attachments.length > 0 && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attached Files:</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {record.attachments.map(att => {
                const isImage = att.file_path?.match(/\.(jpeg|jpg|gif|png)$/i);
                const fileUrl = `${baseUrl}/storage/${att.file_path}`;
                return (
                  <div key={att.id} style={{ position: 'relative' }}>
                    {isImage ? (
                      <img 
                        src={fileUrl} 
                        alt="Attachment" 
                        onClick={() => setViewImageUrl(fileUrl)}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border)' }} 
                      />
                    ) : (
                      <a href={fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                        <FileText size={24} color="var(--primary)" />
                        <span style={{ fontSize: '0.65rem', marginTop: '0.5rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 0.25rem' }}>Document</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <ImageViewerModal 
        isOpen={!!viewImageUrl} 
        onClose={() => setViewImageUrl(null)} 
        imageUrl={viewImageUrl} 
      />
    </Modal>
  );
};

export default MaintenanceDetailsModal;
