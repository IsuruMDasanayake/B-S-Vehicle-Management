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
      <div className="flex flex-col h-[75vh] w-full items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
         {isMobile ? (
             <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
                 <div className="bg-blue-100 p-4 rounded-full">
                     <ExternalLink className="h-8 w-8 text-blue-600" />
                 </div>
                 <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">View Document</h3>
                    <p className="text-gray-600 text-sm max-w-xs">
                        For the best experience on mobile devices, please open the document in full screen.
                    </p>
                 </div>
                 <a 
                    href={fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full"
                 >
                    Open PDF
                 </a>
             </div>
         ) : (
             <object 
                data={`${fileUrl}#toolbar=0`} 
                type="application/pdf" 
                className="w-full h-full"
             >
                <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
                    <div className="bg-gray-200 p-4 rounded-full">
                        <ExternalLink className="h-8 w-8 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to display PDF</h3>
                        <p className="text-gray-600 text-sm max-w-xs">
                            Your browser doesn't support inline PDF viewing.
                        </p>
                    </div>
                    <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
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
