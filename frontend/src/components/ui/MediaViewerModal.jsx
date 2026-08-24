import React from 'react';
import { X, Download } from 'lucide-react';

const MediaViewerModal = ({ fileUrl, fileType, isOpen, onClose, fileName }) => {
  if (!isOpen) return null;

  const isVideo = fileType?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg)$/i);
  const isImage = fileType?.startsWith('image/') || fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  
  // Also handle PDF viewing fallback if needed
  const isPdf = fileType === 'application/pdf' || fileUrl?.match(/\.pdf$/i);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(4px)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '900px', maxHeight: '90vh', backgroundColor: '#111827', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#1f2937', color: 'white' }}>
          <h3 style={{ margin: 0, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '16px' }}>{fileName || 'Media Viewer'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a 
              href={fileUrl} 
              download 
              target="_blank" 
              rel="noreferrer"
              style={{ padding: '8px', borderRadius: '9999px', color: 'white', textDecoration: 'none', display: 'flex' }}
              title="Download"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={onClose}
              style={{ padding: '8px', borderRadius: '9999px', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          {isVideo ? (
            <video 
              src={fileUrl} 
              controls 
              autoPlay 
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            >
              Your browser does not support the video tag.
            </video>
          ) : isImage ? (
            <img 
              src={fileUrl} 
              alt={fileName || 'Evidence'} 
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            />
          ) : isPdf ? (
            <iframe 
              src={fileUrl} 
              style={{ width: '100%', height: '70vh', borderRadius: '8px', backgroundColor: 'white', border: 'none' }}
              title="PDF Viewer"
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af' }}>
              <p>Preview not available for this file type.</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewerModal;
