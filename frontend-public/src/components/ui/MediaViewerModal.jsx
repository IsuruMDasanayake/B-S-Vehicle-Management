import React from 'react';
import { X, Download } from 'lucide-react';

const MediaViewerModal = ({ fileUrl, fileType, isOpen, onClose, fileName }) => {
  if (!isOpen) return null;

  const isVideo = fileType?.startsWith('video/') || fileUrl?.match(/\.(mp4|webm|ogg)$/i);
  const isImage = fileType?.startsWith('image/') || fileUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  
  // Also handle PDF viewing fallback if needed
  const isPdf = fileType === 'application/pdf' || fileUrl?.match(/\.pdf$/i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
          <h3 className="font-medium truncate pr-4">{fileName || 'Media Viewer'}</h3>
          <div className="flex items-center gap-2">
            <a 
              href={fileUrl} 
              download 
              target="_blank" 
              rel="noreferrer"
              className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              title="Download"
            >
              <Download size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-red-500 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[50vh]">
          {isVideo ? (
            <video 
              src={fileUrl} 
              controls 
              autoPlay 
              className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
            >
              Your browser does not support the video tag.
            </video>
          ) : isImage ? (
            <img 
              src={fileUrl} 
              alt={fileName || 'Evidence'} 
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          ) : isPdf ? (
            <iframe 
              src={fileUrl} 
              className="w-full h-[70vh] rounded-lg bg-white"
              title="PDF Viewer"
            />
          ) : (
            <div className="text-center text-gray-400">
              <p>Preview not available for this file type.</p>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2 inline-block">
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
