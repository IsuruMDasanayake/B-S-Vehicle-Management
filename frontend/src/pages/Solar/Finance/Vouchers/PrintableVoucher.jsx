import React, { forwardRef } from 'react';
import QRCodeSVG from './QRCodeSVG';
import { numberToWords } from './numberToWords';

/**
 * Official Printable Voucher (PCV & PV)
 * Formatted for standard ISO A4 / Half-A4 corporate vouchers with 300dpi print sharpness.
 */
const PrintableVoucher = forwardRef(({ voucher, type = 'PCV' }, ref) => {
  if (!voucher) return null;

  const isPCV = type === 'PCV';
  const voucherNo = isPCV
    ? (voucher.voucher_no || `PCV-${voucher.id}`)
    : (voucher.request_no || `PV-${voucher.id}`);

  const title = isPCV ? 'OFFICIAL PETTY CASH VOUCHER' : 'OFFICIAL PAYMENT VOUCHER';
  const subTitle = isPCV ? 'Petty Cash Disbursement & Expense Voucher' : 'Cash Advance & Procurement Disbursement Voucher';

  const amount = Number(isPCV ? voucher.amount : (voucher.amount_approved || voucher.amount_requested || 0));
  const amountWords = numberToWords(amount);

  const projectName = voucher.project?.name || voucher.solar_project?.name || 'General Operations / HQ';
  const projectCode = voucher.project?.code || (voucher.solar_project_id ? `PRJ-${String(voucher.solar_project_id).padStart(3, '0')}` : 'CORP-01');

  const payee = isPCV ? (voucher.paid_to || 'Bearer / Cash') : (voucher.requester?.name || 'Assigned Custodian');
  const payeeNic = voucher.payee_nic || voucher.beneficiary_nic || 'N/A';
  const category = voucher.category || 'Site Materials & Consumables';
  const purpose = isPCV ? (voucher.notes || voucher.purpose || 'Petty cash field expense') : (voucher.purpose || 'Site cash advance');

  const custodianName = isPCV
    ? (voucher.recorder?.name || voucher.account?.custodian?.name || 'Field Custodian')
    : (voucher.requester?.name || 'Site Supervisor');

  const approverName = isPCV
    ? (voucher.approved_by?.name || voucher.approver?.name || 'Finance Officer')
    : (voucher.approvals?.find(a => a.action === 'approved')?.approver?.name || 'Project Director');

  const createdAt = voucher.created_at ? new Date(voucher.created_at) : new Date();
  const dateStr = createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const status = (voucher.status || 'approved').toUpperCase();
  const isSettled = status === 'SETTLED' || status === 'DISBURSED' || isPCV;

  // Verification URL & Digital Hash
  const hashSource = `${voucherNo}:${amount}:${dateStr}:${payee}`;
  let hashVal = 0;
  for (let i = 0; i < hashSource.length; i++) {
    hashVal = ((hashVal << 5) - hashVal) + hashSource.charCodeAt(i);
    hashVal |= 0;
  }
  const verificationHash = Math.abs(hashVal).toString(16).toUpperCase().padStart(8, '0');
  const origin = window.location.origin;
  const verificationUrl = `${origin}/solar/finance/vouchers/verify?ref=${encodeURIComponent(voucherNo)}&h=${verificationHash}`;

  return (
    <div
      ref={ref}
      className="printable-voucher"
      style={{
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        padding: '24px 32px',
        maxWidth: '820px',
        margin: '0 auto',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        position: 'relative',
        fontSize: '12px',
        lineHeight: 1.45,
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner / Corporate Branding */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '2.5px solid #0f172a',
        paddingBottom: '14px',
        marginBottom: '14px'
      }}>
        {/* Company Identity */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px'
            }}>
              C
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '0.04em', color: '#0f172a', textTransform: 'uppercase' }}>
                Circle Engineering (Pvt) Ltd
              </div>
              <div style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>
                Solar Division · Renewable Energy & Engineering Solutions
              </div>
            </div>
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>
            Head Office: No. 45/2, Nawala Road, Narahenpita, Colombo 05, Sri Lanka<br />
            Company Reg: <strong>PV-00234190</strong> | Tel: +94 11 234 5678 | Email: accounts@circlegroup.lk
          </div>
        </div>

        {/* Voucher Meta & Scannable QR Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#10b981',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Official Financial Document
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' }}>
              {voucherNo}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
              Date: <strong>{dateStr}</strong> {timeStr}
            </div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
              Ref Hash: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{verificationHash}</span>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            padding: '4px',
            border: '1px solid #e2e8f0',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <QRCodeSVG value={verificationUrl} size={70} />
            <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
              SCAN TO VERIFY
            </span>
          </div>
        </div>
      </div>

      {/* Title & Official Stamp Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        padding: '8px 12px',
        marginBottom: '14px'
      }}>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </div>
          <div style={{ fontSize: '9.5px', color: '#64748b' }}>
            {subTitle}
          </div>
        </div>

        {/* Status Stamp */}
        <div style={{
          border: isSettled ? '2px solid #10b981' : '2px solid #f59e0b',
          color: isSettled ? '#047857' : '#b45309',
          padding: '3px 12px',
          borderRadius: '4px',
          fontWeight: 800,
          fontSize: '11px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: isSettled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'
        }}>
          {isSettled ? 'PAID & DISBURSED' : status}
        </div>
      </div>

      {/* 2-Column Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '14px'
      }}>
        {/* Left Column: Project & Account Details */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '10px 12px',
          background: '#ffffff'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Project & Cost Center
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '4px', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>Project:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{projectName}</span>

            <span style={{ color: '#64748b' }}>Project Code:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{projectCode}</span>

            <span style={{ color: '#64748b' }}>Account:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {isPCV ? (voucher.account?.account_name || 'Petty Cash Float') : 'Cash Advance Account'}
            </span>

            <span style={{ color: '#64748b' }}>Category:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{category}</span>
          </div>
        </div>

        {/* Right Column: Payee & Disbursement Details */}
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '10px 12px',
          background: '#ffffff'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Beneficiary & Payment Terms
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '4px', fontSize: '11px' }}>
            <span style={{ color: '#64748b' }}>Payee / Beneficiary:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{payee}</span>

            <span style={{ color: '#64748b' }}>Payee NIC / Reg:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{payeeNic}</span>

            <span style={{ color: '#64748b' }}>Payment Mode:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {isPCV ? 'Cash on Site / Float' : 'Cash Advance Disbursed'}
            </span>

            <span style={{ color: '#64748b' }}>Custodian / Req:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{custodianName}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '14px',
        border: '1px solid #cbd5e1'
      }}>
        <thead>
          <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', fontSize: '10px', textTransform: 'uppercase', color: '#475569' }}>
            <th style={{ padding: '6px 8px', width: '35px', textAlign: 'center' }}>#</th>
            <th style={{ padding: '6px 10px', textAlign: 'left' }}>Particulars / Purpose of Expenditure</th>
            <th style={{ padding: '6px 10px', width: '130px', textAlign: 'left' }}>Cost Code</th>
            <th style={{ padding: '6px 10px', width: '120px', textAlign: 'right' }}>Amount (LKR)</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '11px' }}>
          <tr style={{ borderBottom: '1px solid #e2e8f0', minHeight: '48px' }}>
            <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>1</td>
            <td style={{ padding: '8px 10px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{purpose}</div>
              <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                Classification: {category} · Allocated to {projectName}
              </div>
            </td>
            <td style={{ padding: '8px 10px', color: '#475569', fontFamily: 'monospace' }}>
              {projectCode}-EXP
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
              {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>

          {/* Subtotal / Total Rows */}
          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
            <td colSpan="3" style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11.5px', textTransform: 'uppercase' }}>
              Total Disbursed Amount:
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '13px', color: '#0f172a' }}>
              LKR {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in Words Box */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        padding: '8px 12px',
        marginBottom: '18px',
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px'
      }}>
        <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', whiteSpace: 'nowrap' }}>
          Amount in Words:
        </span>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic' }}>
          {amountWords}
        </span>
      </div>

      {/* 4-Tier Official Signature & Sign-Off Blocks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        border: '1px solid #cbd5e1',
        borderRadius: '4px',
        padding: '10px 8px',
        marginBottom: '14px',
        background: '#ffffff'
      }}>
        {/* Tier 1: Prepared By */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            1. Prepared By
          </div>
          <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: '17px', color: '#1e293b' }}>
              {custodianName.split(' ')[0]}
            </span>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>{custodianName}</div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>Requester / Custodian</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>{dateStr}</div>
          </div>
        </div>

        {/* Tier 2: Checked By (Accountant) */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            2. Checked By
          </div>
          <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#059669',
              background: '#ecfdf5',
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid #a7f3d0'
            }}>
              ✓ VERIFIED
            </span>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>Finance Officer</div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>Accounts Department</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>{dateStr}</div>
          </div>
        </div>

        {/* Tier 3: Authorized & Approved By */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '6px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            3. Authorized By
          </div>
          <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{
              fontSize: '8.5px',
              fontWeight: 800,
              color: '#1e40af',
              border: '1px solid #93c5fd',
              background: '#eff6ff',
              padding: '2px 4px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}>
              APPROVED
            </div>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>{approverName}</div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>Project Director / PM</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>{dateStr}</div>
          </div>
        </div>

        {/* Tier 4: Received By (Beneficiary) */}
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            4. Received By
          </div>
          <div style={{ height: '42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ fontSize: '9.5px', color: '#94a3b8', fontStyle: 'italic' }}>
              (Signature on Receipt)
            </span>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#0f172a' }}>{payee}</div>
            <div style={{ fontSize: '8.5px', color: '#64748b' }}>NIC: {payeeNic}</div>
            <div style={{ fontSize: '8px', color: '#94a3b8' }}>Date: ____/____/20__</div>
          </div>
        </div>
      </div>

      {/* Security Footer Notice */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #cbd5e1',
        paddingTop: '8px',
        fontSize: '8.5px',
        color: '#64748b'
      }}>
        <div>
          <strong>CONFIDENTIAL & OFFICIAL:</strong> Issued under CircleGroup Solar Division Financial Governance.
          Verify online at <strong>{origin}/solar/finance/vouchers/verify</strong>
        </div>
        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
          SHA-256 CHECK: {verificationHash} · Page 1 of 1
        </div>
      </div>
    </div>
  );
});

export default PrintableVoucher;
