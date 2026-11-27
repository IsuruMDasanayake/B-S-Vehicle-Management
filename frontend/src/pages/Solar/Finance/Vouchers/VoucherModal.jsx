import React, { useRef } from 'react';
import {
  Printer,
  Copy,
  ExternalLink,
  X,
  FileCheck,
  ShieldCheck,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import PrintableVoucher from './PrintableVoucher';

export default function VoucherModal({
  isOpen,
  onClose,
  voucher,
  type = 'PCV'
}) {
  const voucherRef = useRef(null);

  if (!isOpen || !voucher) return null;

  const isPCV = type === 'PCV';
  const voucherNo = isPCV
    ? (voucher.voucher_no || `PCV-${voucher.id}`)
    : (voucher.request_no || `PV-${voucher.id}`);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/solar/finance/vouchers/verify?ref=${encodeURIComponent(voucherNo)}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard!');
  };

  const receiptUrl = voucher.receipt_url || voucher.receipt_proof_url;

  return (
    <div
      className="voucher-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        className="voucher-modal-content"
        style={{
          backgroundColor: 'var(--white, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--surface-2, #e2e8f0)',
        }}
      >
        {/* Modal Top Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--surface-2, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-1, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--dark, #0f172a)' }}>
                Official {isPCV ? 'Petty Cash Voucher' : 'Payment Voucher'} #{voucherNo}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                Print-ready official document with verifiable QR cryptographic checksum
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {receiptUrl && (
              <a
                href={receiptUrl.startsWith('http') ? receiptUrl : `/storage/${receiptUrl}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={14} /> Attached Receipt
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="btn btn-secondary"
              title="Copy QR Verification URL"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.8rem',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <Copy size={14} /> Copy QR Link
            </button>

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                backgroundColor: '#10b981',
                borderColor: '#10b981',
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Voucher Container */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PrintableVoucher ref={voucherRef} voucher={voucher} type={type} />
        </div>
      </div>

      {/* Global Print Style for clean 1-page A4 print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-voucher, .printable-voucher * {
            visibility: visible !important;
          }
          .printable-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
