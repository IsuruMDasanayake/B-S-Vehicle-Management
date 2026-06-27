import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import api from '../../services/api';
import toast from 'react-hot-toast';

/**
 * Generic delete confirmation modal.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onDeleted: () => void   — called after successful delete
 *  - endpoint: string        — e.g. "/vehicles/12"
 *  - itemName: string        — e.g. "Vehicle WP-1234"
 */
const ConfirmDeleteModal = ({ isOpen, onClose, onDeleted, endpoint, itemName }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.delete(endpoint);
      toast.success(`${itemName || 'Record'} deleted successfully`);
      onClose();
      onDeleted?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Deletion" size="sm">
      <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
        {/* Warning Icon */}
        <div
          style={{
            width: '72px',
            height: '72px',
            background: 'var(--danger-alpha)',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}
        >
          <AlertTriangle size={34} color="var(--danger)" />
        </div>

        <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>Are you sure?</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          You are about to permanently delete:
        </p>
        <p
          style={{
            fontWeight: 700,
            color: 'var(--text-primary)',
            background: 'var(--surface)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            display: 'inline-block',
            marginBottom: '2rem',
          }}
        >
          {itemName || 'this record'}
        </p>
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          This action <strong>cannot</strong> be undone.
        </p>

        <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isDeleting}
            style={{ border: '1px solid var(--surface-2)', minWidth: '120px' }}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={isDeleting}
            style={{ minWidth: '140px' }}>
            {isDeleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteModal;
