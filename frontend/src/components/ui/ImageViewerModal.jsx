import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, title = '' }) => {
  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <h3 style={{ color: 'white', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{
          background: 'rgba(255, 255, 255, 0.2)', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', cursor: 'pointer'
        }}>
          <X size={24} />
        </button>
      </div>
      <img 
        src={imageUrl} 
        alt={title} 
        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
      />
    </div>,
    document.body
  );
};

export default ImageViewerModal;
