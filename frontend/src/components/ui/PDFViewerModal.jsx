import { Download } from 'lucide-react';
import Modal from './Modal';

const PDFViewerModal = ({ isOpen, onClose, fileUrl, title }) => {
  if (!isOpen || !fileUrl) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title || "Document Viewer"} 
      size="xl"
      headerActions={
        <a 
          href={fileUrl} 
          download
          target="_blank"
          rel="noreferrer"
          className="icon-btn" 
          style={{ color: 'var(--text-muted)' }}
          title="Download Original"
        >
          <Download size={20} />
        </a>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', width: '100%' }}>
        <div style={{ 
          flex: 1, 
          background: 'var(--surface-2)', 
          borderRadius: 'var(--radius-md)', 
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {fileUrl.toLowerCase().endsWith('.pdf') ? (
            <object 
              data={fileUrl} 
              type="application/pdf" 
              width="100%" 
              height="100%"
              style={{ flex: 1 }}
            >
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>It appears your browser does not support inline PDFs.</p>
                <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                  Click here to download the PDF
                </a>
              </div>
            </object>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '1rem' }}>
              <img 
                src={fileUrl} 
                alt="Document Preview" 
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PDFViewerModal;
