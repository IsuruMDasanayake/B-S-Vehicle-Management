import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  ExternalLink,
  ArrowLeft,
  Lock,
  Printer
} from 'lucide-react';
import axios from 'axios';
import { numberToWords } from './numberToWords';

export default function VoucherVerificationPage() {
  const [searchParams] = useSearchParams();
  const { ref: paramRef } = useParams();
  const navigate = useNavigate();

  const queryRef = searchParams.get('ref') || paramRef || '';
  const [searchTerm, setSearchTerm] = useState(queryRef);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const verifyVoucher = useCallback(async (voucherRef) => {
    if (!voucherRef || !voucherRef.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Call public verification endpoint
      const res = await axios.get(`/api/solar/finance/vouchers/verify/${encodeURIComponent(voucherRef.trim())}`);
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError(`No official voucher found matching reference "${voucherRef}". This document may be invalid, expired, or counterfeit.`);
      } else {
        setError('Failed to reach the verification service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (queryRef) {
      setSearchTerm(queryRef);
      verifyVoucher(queryRef);
    }
  }, [queryRef, verifyVoucher]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/solar/finance/vouchers/verify?ref=${encodeURIComponent(searchTerm.trim())}`, { replace: true });
      verifyVoucher(searchTerm.trim());
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      padding: '2rem 1rem 4rem',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Navigation Bar / Branding */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <button
            onClick={() => navigate('/solar/finance/admin/dashboard')}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Portal
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#10b981',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px'
            }}>
              C
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.03em' }}>
              CIRCLE ENGINEERING · VERIFY
            </div>
          </div>
        </div>

        {/* Hero Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: '0.75rem',
            letterSpacing: '0.04em'
          }}>
            <Lock size={13} /> OFFICIAL FINANCIAL AUDIT SERVICE
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#ffffff' }}>
            Voucher Authenticity Verification
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Real-time validation for official CircleGroup Solar Division Payment Vouchers (PV) and Petty Cash Vouchers (PCV).
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '0.35rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '0.75rem', color: '#94a3b8' }}>
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter Voucher Ref No (e.g. PCV-2026-0001 or CR-2026-0001)..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                padding: '0.5rem',
              }}
            />
            <button
              type="submit"
              disabled={loading || !searchTerm.trim()}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ fontSize: '1rem', color: '#cbd5e1' }}>Consulting CircleGroup Financial Ledger...</div>
          </div>
        )}

        {/* Error / Invalid State */}
        {!loading && error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1.5px solid #ef4444',
            borderRadius: '12px',
            padding: '1.75rem',
            textAlign: 'center',
            marginBottom: '2rem',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <ShieldAlert size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.5rem' }}>
              Voucher Not Authenticated
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Valid Verified Result */}
        {!loading && result && result.is_valid && (
          <div style={{
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}>
            {/* Verified Header Stamp */}
            <div style={{
              background: '#ecfdf5',
              borderBottom: '2px solid #10b981',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#047857',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}>
                  Authenticity Verified · Official Ledger Match
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#064e3b' }}>
                  {result.voucher_title}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                  Reference No: <strong>{result.voucher_no}</strong>
                </div>
              </div>
              <div style={{
                border: '1.5px solid #10b981',
                background: '#ffffff',
                color: '#047857',
                padding: '0.3rem 0.8rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '0.8rem',
                textTransform: 'uppercase'
              }}>
                {result.status}
              </div>
            </div>

            {/* Voucher Amount Section */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Disbursed Value
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                LKR {Number(result.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', fontWeight: 600 }}>
                {numberToWords(result.amount)}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.5rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Project Site
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.project_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Beneficiary / Payee
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.payee}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Expenditure Purpose
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.purpose}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Category: {result.category}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Disbursement Date
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.created_at ? new Date(result.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Custodian / Requester
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.custodian_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Authorized By
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                    {result.approver_name}
                  </div>
                </div>
              </div>

              {/* Digital Checksum & Issuer Footer */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.9rem 1.2rem',
                fontSize: '0.8rem',
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}>
                <div>
                  <strong>{result.issuer}</strong> ({result.company_reg})<br />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{result.division}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cryptographic Hash:</span><br />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                    SHA-256 #{result.verification_hash}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
