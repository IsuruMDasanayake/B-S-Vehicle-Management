import { useState, useEffect } from 'react';
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Printer
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import VoucherModal from '../Vouchers/VoucherModal';

const STATUS_TABS = [
  { key: 'all', label: 'All Requests' },
  { key: 'pending_pm', label: 'Pending PM' },
  { key: 'pending_director', label: 'Pending Director' },
  { key: 'approved', label: 'Approved (Ready to Disburse)' },
  { key: 'disbursed', label: 'Disbursed' },
  { key: 'settled', label: 'Settled' },
  { key: 'rejected', label: 'Rejected' },
];

const CashRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');

  // Modal Review
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRequestForPrint, setSelectedRequestForPrint] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeStatus !== 'all') {
        params.status = activeStatus;
      }
      const res = await api.get('/solar/finance/cash-requests', { params });
      setRequests(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load cash requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeStatus]);

  const openReviewModal = (req) => {
    setSelectedRequest(req);
    setApprovalAmount(req.amount_requested);
    setComments('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      await api.post(`/solar/finance/cash-requests/${selectedRequest.id}/approve`, {
        amount_approved: Number(approvalAmount),
        comments: comments || 'Approved',
      });
      toast.success(`Request #${selectedRequest.request_no} approved!`);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!comments.trim()) {
      toast.error('Please specify rejection comments');
      return;
    }
    try {
      setActionLoading(true);
      await api.post(`/solar/finance/cash-requests/${selectedRequest.id}/reject`, {
        comments,
      });
      toast.success(`Request #${selectedRequest.request_no} rejected.`);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async () => {
    if (!selectedRequest) return;
    try {
      setActionLoading(true);
      await api.post(`/solar/finance/cash-requests/${selectedRequest.id}/disburse`);
      toast.success(`Cash disbursed for #${selectedRequest.request_no}!`);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disburse');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: '0rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Banknote size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
              Cash Requests & Approvals
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Multi-tier approval workflows for field cash advances, procurement, and emergency site expenses.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className="btn btn-ghost"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: activeStatus === tab.key ? '#10b981' : 'var(--surface)',
              color: activeStatus === tab.key ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--surface-2)',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>Request No</th>
                <th style={{ padding: '1rem' }}>Requester</th>
                <th style={{ padding: '1rem' }}>Project</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Urgency</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No cash requests matching this status.
                  </td>
                </tr>
              ) : (
                requests.map(req => {
                  const isPending = req.status.startsWith('pending');
                  const isApproved = req.status === 'approved';
                  const isDisbursed = req.status === 'disbursed';
                  const isSettled = req.status === 'settled';
                  const isRejected = req.status === 'rejected';

                  const badgeColor = isApproved ? '#10b981' : isDisbursed ? '#3b82f6' : isSettled ? '#059669' : isRejected ? '#ef4444' : '#f59e0b';

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{req.request_no}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{req.requester?.name || 'Employee'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.category}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {req.project?.name || 'General Field Work'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          LKR {Number(req.amount_requested).toLocaleString()}
                        </div>
                        {req.amount_approved && req.amount_approved !== req.amount_requested && (
                          <div style={{ fontSize: '0.72rem', color: '#10b981' }}>
                            Approved: LKR {Number(req.amount_approved).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor: req.urgency === 'emergency' ? 'rgba(239, 68, 68, 0.15)' : req.urgency === 'urgent' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface-2)',
                          color: req.urgency === 'emergency' ? '#ef4444' : req.urgency === 'urgent' ? '#f59e0b' : 'var(--text-muted)',
                        }}>
                          {req.urgency}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          backgroundColor: `${badgeColor}15`,
                          color: badgeColor,
                        }}>
                          {req.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {['approved', 'disbursed', 'settled'].includes(req.status) && (
                            <button
                              onClick={() => {
                                setSelectedRequestForPrint(req);
                                setShowPrintModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontWeight: 600,
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a'
                              }}
                              title="Print Official Payment Voucher (PV)"
                            >
                              <Printer size={13} color="#10b981" /> Print PV
                            </button>
                          )}

                          <button
                            onClick={() => openReviewModal(req)}
                            className="btn btn-ghost"
                            style={{
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.8rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px solid var(--surface-2)',
                              color: isPending ? '#f59e0b' : isApproved ? '#10b981' : 'var(--text-primary)',
                            }}
                          >
                            <Eye size={14} /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Action Modal */}
      {selectedRequest && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1100,
        }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reviewing Request</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
                  {selectedRequest.request_no}
                </h2>
              </div>
              <span style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
              }}>
                {selectedRequest.status}
              </span>
            </div>

            {/* Request Summary details */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              backgroundColor: 'var(--surface-2)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem',
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Requester</span>
                <strong>{selectedRequest.requester?.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Project Site</span>
                <strong>{selectedRequest.project?.name || 'General Field'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Amount Requested</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                  LKR {Number(selectedRequest.amount_requested).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Urgency</span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedRequest.urgency}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Purpose & Reason</span>
              <p style={{ margin: 0, padding: '0.75rem', backgroundColor: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.88rem' }}>
                {selectedRequest.purpose}
              </p>
            </div>

            {/* Receipt Proof Photo if uploaded */}
            {selectedRequest.receipt_proof_url && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Attached Receipt / Estimate</span>
                <a href={selectedRequest.receipt_proof_url} target="_blank" rel="noreferrer">
                  <img
                    src={selectedRequest.receipt_proof_url}
                    alt="Receipt Proof"
                    style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid var(--surface-2)' }}
                  />
                </a>
              </div>
            )}

            {/* Approver Action Inputs */}
            {selectedRequest.status.startsWith('pending') && (
              <div style={{ borderTop: '1px solid var(--surface-2)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Approver Decision</h3>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Amount to Approve (LKR)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Approval / Rejection Comments
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="e.g. Verified with site supervisor. Approved for purchase."
                    style={{ width: '100%', resize: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="btn btn-ghost"
              >
                Close
              </button>

              {['approved', 'disbursed', 'settled'].includes(selectedRequest.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequestForPrint(selectedRequest);
                    setShowPrintModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 600,
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <Printer size={15} color="#10b981" /> Official Payment Voucher (PV)
                </button>
              )}

              {selectedRequest.status.startsWith('pending') && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleReject}
                    className="btn"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleApprove}
                    className="btn"
                    style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
                  >
                    {actionLoading ? 'Processing...' : 'Approve Request'}
                  </button>
                </>
              )}

              {selectedRequest.status === 'approved' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDisburse}
                  className="btn"
                  style={{ backgroundColor: '#3b82f6', color: '#fff', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Banknote size={16} /> Disburse Cash Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Payment Voucher Modal */}
      <VoucherModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        voucher={selectedRequestForPrint}
        type="PV"
      />
    </div>
  );
};

export default CashRequestsList;
