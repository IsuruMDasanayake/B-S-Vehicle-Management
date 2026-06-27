import React, { useCallback, useState } from 'react';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import api from '../../services/api';

const FileUploadField = ({ onFilesSelected, existingFiles = [], onRemoveExistingFile, label = "Upload Images/Documents", multiple = true }) => {
  const [inputId] = useState(() => 'file-upload-' + Math.random().toString(36).substr(2, 9));
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    const newFiles = multiple ? [...selectedFiles, ...files] : [files[0]];
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    let baseUrl = api?.defaults?.baseURL?.replace('/api', ''); if (baseUrl === undefined || baseUrl === null) baseUrl = 'http://localhost';
    return `${baseUrl}/storage/${path}`;
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>
        {label}
      </label>
      
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--dark-2)'}`,
          borderRadius: 'var(--radius-md)',
          padding: (!multiple && selectedFiles.length > 0) ? '0' : '2rem',
          textAlign: 'center',
          backgroundColor: dragActive ? 'var(--primary-alpha)' : 'var(--dark-1)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={() => document.getElementById(inputId).click()}
      >
        {(!multiple && selectedFiles.length > 0) ? (
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            {selectedFiles[0].type.startsWith('image/') ? (
              <img src={URL.createObjectURL(selectedFiles[0])} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <FileIcon size={32} color="var(--text-muted)" style={{ marginTop: '2.5rem' }} />
            )}
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); removeFile(0); }}
              style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'rgba(0,0,0,0.6)', color: 'white',
                border: 'none', borderRadius: '50%',
                width: '24px', height: '24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud size={32} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Drag & drop files here, or click to browse
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supports JPG, PNG, PDF (Max 10MB)
            </p>
          </>
        )}
        <input 
          type="file" 
          id={inputId} 
          multiple={multiple} 
          style={{ display: 'none' }} 
          onChange={handleChange} 
        />
      </div>

      {/* Existing Files Preview */}
      {existingFiles.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Attached Files:</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {existingFiles.map((file, idx) => (
              <div key={idx} style={{ 
                position: 'relative', 
                width: '80px', height: '80px', 
                borderRadius: 'var(--radius-sm)', 
                overflow: 'hidden',
                backgroundColor: 'var(--dark-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {file.file_type?.startsWith('image/') ? (
                  <img src={getFileUrl(file.file_path)} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FileIcon size={32} color="var(--text-muted)" />
                )}
                {onRemoveExistingFile && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemoveExistingFile(file.id); }}
                    style={{
                      position: 'absolute', top: '4px', right: '4px',
                      background: 'rgba(220,53,69,0.9)', color: 'white',
                      border: 'none', borderRadius: '50%',
                      width: '20px', height: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10
                    }}
                    title="Remove existing file"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Files Preview (Only for multiple uploads) */}
      {(multiple && selectedFiles.length > 0) && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>New Uploads:</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {selectedFiles.map((file, idx) => (
              <div key={idx} style={{ 
                position: 'relative', 
                width: '80px', height: '80px', 
                borderRadius: 'var(--radius-sm)', 
                overflow: 'hidden',
                backgroundColor: 'var(--dark-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FileIcon size={32} color="var(--text-muted)" />
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  style={{
                    position: 'absolute', top: '4px', right: '4px',
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    border: 'none', borderRadius: '50%',
                    width: '20px', height: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadField;
