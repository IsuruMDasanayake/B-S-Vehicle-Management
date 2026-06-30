import { useState } from 'react';
import Modal from './Modal';
import { format } from 'date-fns';
import ImageViewerModal from './ImageViewerModal';
import api from '../../services/api';

const ViewAccidentModal = ({ isOpen, onClose, accident }) => {
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!accident) return null;

  const getDriverName = () => {
    if (accident.assignee_type === 'internal') return accident.driver?.name || 'Unknown';
    if (accident.assignee_type === 'external') return accident.vehicleRequest?.requester_name || 'Unknown';
    if (accident.assignee_type === 'manual') return accident.driver_name || 'Unknown';
    // Fallback for older records
    return accident.driver?.name || accident.driver_name || 'Unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return 'var(--danger)';
      case 'under_investigation': return 'var(--warning)';
      case 'resolved': return 'var(--success)';
      default: return 'var(--text-muted)';
    }
  };

  const openViewer = (images, startIndex) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setIsViewerOpen(true);
  };

  const photoUrls = accident.photos 
    ? accident.photos.map(p => `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost'}/storage/${p}`)
    : [];

  const policeReportUrl = accident.police_report_path
    ? `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost'}/storage/${accident.police_report_path}`
    : null;

  const isPdf = policeReportUrl?.toLowerCase().endsWith('.pdf');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Accident Details: ${accident.vehicle?.vehicle_number}`} size="xl">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>General Information</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
              <span style={{ fontWeight: 500 }}>{format(new Date(accident.accident_date), 'MMM dd, yyyy h:mm a')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Location:</span>
              <span style={{ fontWeight: 500 }}>{accident.location}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Driver / Assignee:</span>
              <span style={{ fontWeight: 500 }}>{getDriverName()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ color: getStatusColor(accident.status), fontWeight: 600, textTransform: 'capitalize' }}>
                {accident.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Insurance & Repair</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Police Report No:</span>
              <span style={{ fontWeight: 500 }}>{accident.police_report_number || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Claim Number:</span>
              <span style={{ fontWeight: 500 }}>{accident.insurance_claim_number || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Repair Cost:</span>
              <span style={{ fontWeight: 500 }}>
                {accident.repair_cost ? `Rs ${Number(accident.repair_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Description</h4>
        <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          {accident.description}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Police Report</h4>
          {policeReportUrl ? (
            isPdf ? (
              <a 
                href={policeReportUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                View PDF Report
              </a>
            ) : (
              <div 
                style={{ 
                  height: '150px', 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  cursor: 'pointer',
                  border: '1px solid var(--border)' 
                }}
                onClick={() => openViewer([{ url: policeReportUrl }], 0)}
              >
                <img src={policeReportUrl} alt="Police Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
              No police report uploaded
            </div>
          )}
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Accident & Odometer Photos</h4>
          {photoUrls.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
              {photoUrls.map((url, i) => (
                <div 
                  key={i} 
                  style={{ 
                    aspectRatio: '1', 
                    borderRadius: 'var(--radius-md)', 
                    overflow: 'hidden', 
                    cursor: 'pointer',
                    border: '1px solid var(--border)' 
                  }}
                  onClick={() => openViewer(photoUrls.map(u => ({ url: u })), i)}
                >
                  <img src={url} alt={`Photo ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
              No photos uploaded
            </div>
          )}
        </div>
      </div>

      {isViewerOpen && (
        <ImageViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          imageUrl={viewerImages[viewerIndex]?.url}
        />
      )}
    </Modal>
  );
};

export default ViewAccidentModal;
