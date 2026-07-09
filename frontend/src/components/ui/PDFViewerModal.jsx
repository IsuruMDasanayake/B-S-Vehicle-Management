import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import Modal from './Modal';

export default function PDFViewerModal({ isOpen, onClose, fileUrl, title = 'Document Viewer' }) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Detect mobile device width (768px is the md breakpoint in Tailwind)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface-2, #f9fafb)', borderRadius: 'var(--radius-lg, 0.5rem)', overflow: 'hidden' }}>
         {isMobile ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', gap: '1.5rem' }}>
                 <div style={{ backgroundColor: 'var(--primary-light, #dbeafe)', padding: '1rem', borderRadius: '9999px' }}>
                     <ExternalLink style={{ height: '2rem', width: '2rem', color: 'var(--primary, #2563eb)' }} />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text, #111827)', marginBottom: '0.5rem' }}>View Document</h3>
                    <p style={{ color: 'var(--text-muted, #4b5563)', fontSize: '0.875rem', maxWidth: '20rem' }}>
                        For the best experience on mobile devices, please open the document in full screen.
                    </p>
                 </div>
                 <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md, 0.5rem)', fontSize: '1rem', fontWeight: 500 }}
                 >
                    Open PDF
                 </a>
             </div>
         ) : (
             <object 
                data={`${fileUrl}#toolbar=0`} 
                type="application/pdf" 
                style={{ width: '100%', height: '100%' }}
             >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.5rem', textAlign: 'center' }}>
                    <div style={{ backgroundColor: 'var(--surface-2, #e5e7eb)', padding: '1rem', borderRadius: '9999px' }}>
                        <ExternalLink style={{ height: '2rem', width: '2rem', color: 'var(--text-muted, #6b7280)' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text, #111827)', marginBottom: '0.5rem' }}>Unable to display PDF</h3>
                        <p style={{ color: 'var(--text-muted, #4b5563)', fontSize: '0.875rem', maxWidth: '20rem' }}>
                            Your browser doesn't support inline PDF viewing.
                        </p>
                    </div>
                    <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md, 0.5rem)', fontSize: '1rem', fontWeight: 500 }}
                    >
                        Download PDF instead
                    </a>
                </div>
             </object>
         )}
      </div>
    </Modal>
  );
}
