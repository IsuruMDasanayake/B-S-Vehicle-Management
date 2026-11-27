import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Smartphone,
  Banknote,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Send,
  X,
  Receipt,
  RotateCcw
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Materials & Hardware',
  'Site Labor Payment',
  'Transport & Fuel',
  'Tools & Equipment Rental',
  'Team Meals / Allowance',
  'Emergency Site Repair',
  'Permits & Site Fees',
  'Other / Miscellaneous'
];

const SolarFinanceMobileRequest = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'history' | 'settle'

  // Request Form
  const [formData, setFormData] = useState({
    solar_project_id: '',
    amount_requested: '',
    category: CATEGORIES[0],
    purpose: '',
    urgency: 'normal',
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Settlement Form
  const [selectedSettlementRequest, setSelectedSettlementRequest] = useState(null);
  const [settlementData, setSettlementData] = useState({
    settled_amount: '',
    returned_cash_amount: '',
  });
  const [settlementFile, setSettlementFile] = useState(null);
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [settling, setSettling] = useState(false);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/solar/finance-mobile/token/${token}`);
      setSession(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired mobile link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSessionData();
    }
  }, [token]);

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount_requested || Number(formData.amount_requested) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('solar_project_id', formData.solar_project_id || '');
      data.append('amount_requested', formData.amount_requested);
      data.append('category', formData.category);
      data.append('purpose', formData.purpose);
      data.append('urgency', formData.urgency);
      if (receiptFile) {
        data.append('receipt_proof', receiptFile);
      }

      await api.post(`/solar/finance-mobile/token/${token}/request`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Cash Request submitted to Project Manager!');
      setFormData({
        solar_project_id: '',
        amount_requested: '',
        category: CATEGORIES[0],
        purpose: '',
        urgency: 'normal',
      });
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchSessionData();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSettlementRequest) return;

    try {
      setSettling(true);
      const data = new FormData();
      data.append('request_id', selectedSettlementRequest.id);
      data.append('settled_amount', settlementData.settled_amount);
      data.append('returned_cash_amount', settlementData.returned_cash_amount);
      if (settlementFile) {
        data.append('receipt_photo', settlementFile);
      }

      await api.post(`/solar/finance-mobile/token/${token}/settle`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Advance settled successfully!');
      setSelectedSettlementRequest(null);
      setSettlementFile(null);
      setSettlementPreview(null);
      fetchSessionData();
      setActiveTab('history');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit settlement');
    } finally {
      setSettling(false);
    }
  };

  const addPresetAmount = (amt) => {
    setFormData(prev => ({
      ...prev,
      amount_requested: String((Number(prev.amount_requested) || 0) + amt),
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '3px solid rgba(16,185,129,0.3)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#94a3b8' }}>Verifying secure token...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '1.5rem' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center', backgroundColor: '#1e293b', padding: '2rem', borderRadius: '16px', border: '1px solid #334155' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Link Expired</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {error || 'This mobile link is no longer valid. Please ask your Finance Admin to generate a new link.'}
          </p>
        </div>
      </div>
    );
  }

  const { user, projects, recent_requests } = session;
  const pendingSettlement = recent_requests.filter(r => r.status === 'disbursed');

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      paddingBottom: '3rem',
    }}>
      {/* Mobile Top App Bar */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #1e293b',
        padding: '0.85rem 1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Banknote size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                CircleGroup Solar
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                FIELD CASH PORTAL
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{user.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
              {user.finance_role?.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
          <button
            onClick={() => setActiveTab('request')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'request' ? '#10b981' : '#1e293b',
              color: activeTab === 'request' ? '#fff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            + New Request
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 600,
              backgroundColor: activeTab === 'history' ? '#10b981' : '#1e293b',
              color: activeTab === 'history' ? '#fff' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            My Requests ({recent_requests.length})
          </button>
          {pendingSettlement.length > 0 && (
            <button
              onClick={() => setActiveTab('settle')}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                backgroundColor: activeTab === 'settle' ? '#f59e0b' : '#1e293b',
                color: activeTab === 'settle' ? '#000' : '#f59e0b',
                transition: 'all 0.2s',
              }}
            >
              Settle ({pendingSettlement.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '1.25rem' }}>
        {/* TAB 1: New Cash Request Form */}
        {activeTab === 'request' && (
          <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* User Limit Notice */}
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Max Single Request Limit</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                  LKR {Number(user.max_limit).toLocaleString()}
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', backgroundColor: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#94a3b8' }}>
                Auto-Tier
              </span>
            </div>

            {/* Solar Project Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Select Solar Site / Project
              </label>
              <select
                value={formData.solar_project_id}
                onChange={(e) => setFormData(prev => ({ ...prev, solar_project_id: e.target.value }))}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  fontSize: '0.9rem',
                }}
              >
                <option value="">General Field Work (No specific site)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.client_name || 'Client'})</option>
                ))}
              </select>
            </div>

            {/* Requested Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Amount Needed (LKR) *
              </label>
              <input
                type="number"
                required
                value={formData.amount_requested}
                onChange={(e) => setFormData(prev => ({ ...prev, amount_requested: e.target.value }))}
                placeholder="0.00"
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              />
              {/* Quick Preset Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                {[5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => addPresetAmount(amt)}
                    style={{
                      flex: 1,
                      backgroundColor: '#334155',
                      border: 'none',
                      color: '#cbd5e1',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    +{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Expense Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  fontSize: '0.9rem',
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Urgency Level
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { key: 'normal', label: 'Normal', color: '#10b981' },
                  { key: 'urgent', label: 'Urgent', color: '#f59e0b' },
                  { key: 'emergency', label: 'Emergency', color: '#ef4444' },
                ].map(u => (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urgency: u.key }))}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: `1px solid ${formData.urgency === u.key ? u.color : '#334155'}`,
                      backgroundColor: formData.urgency === u.key ? `${u.color}20` : '#1e293b',
                      color: formData.urgency === u.key ? u.color : '#94a3b8',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Purpose */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Reason / Detailed Purpose *
              </label>
              <textarea
                required
                rows="3"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Describe why cash is needed (e.g. 5 laborers for module lifting, transport hire, emergency hardware)..."
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.8rem',
                  fontSize: '0.88rem',
                  resize: 'none',
                }}
              />
            </div>

            {/* Camera / Receipt Photo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                Attach Quotation Note / Bill Photo (Optional)
              </label>
              <label style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem',
                border: '1px dashed #475569',
                borderRadius: '12px',
                backgroundColor: '#1e293b',
                cursor: 'pointer',
              }}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileChange(e, setReceiptFile, setReceiptPreview)}
                  style={{ display: 'none' }}
                />
                <Camera size={28} color="#10b981" style={{ marginBottom: '0.5rem' }} />
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500 }}>
                  Tap to Take Photo with Camera
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Proforma invoices, hardware estimate slips, etc.
                </span>
              </label>

              {receiptPreview && (
                <div style={{ position: 'relative', marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={receiptPreview} alt="Receipt Preview" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    style={{
                      position: 'absolute', top: '8px', right: '8px',
                      backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                      borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Send size={18} />
              {submitting ? 'Submitting to Approver...' : 'Send Cash Request'}
            </button>
          </form>
        )}

        {/* TAB 2: Request History & Live Tracking */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recent_requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No cash requests submitted yet.</p>
              </div>
            ) : (
              recent_requests.map(req => {
                const isApproved = ['approved', 'disbursed', 'settled'].includes(req.status);
                const isRejected = req.status === 'rejected';
                const isPending = req.status.startsWith('pending');

                return (
                  <div
                    key={req.id}
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      padding: '1.1rem',
                      border: '1px solid #334155',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{req.request_no}</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                          LKR {Number(req.amount_requested).toLocaleString()}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: isApproved ? '#10b981' : isRejected ? '#ef4444' : '#f59e0b',
                      }}>
                        {req.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem' }}>
                      {req.purpose}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: '0.75rem' }}>
                      <span>Site: {req.project?.name || 'General Field'}</span>
                      <span>•</span>
                      <span>Cat: {req.category}</span>
                    </div>

                    {/* Quick Settlement Action for disbursed advances */}
                    {req.status === 'disbursed' && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSettlementRequest(req);
                            setActiveTab('settle');
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid #f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            color: '#f59e0b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Settle Advance & Upload Receipts
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: Settlement Submission */}
        {activeTab === 'settle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Settle Disbursed Cash Advance
            </h2>

            {!selectedSettlementRequest ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Select an advance to settle with physical bill receipts:
                </p>
                {pendingSettlement.map(req => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedSettlementRequest(req)}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #f59e0b',
                      borderRadius: '10px',
                      padding: '1rem',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#fff' }}>{req.request_no}</div>
                    <div style={{ color: '#f59e0b', fontWeight: 700 }}>
                      LKR {Number(req.amount_requested).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>{req.purpose}</div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSettlementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '0.85rem', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Settling Request:</div>
                  <div style={{ fontWeight: 700, color: '#fff' }}>{selectedSettlementRequest.request_no}</div>
                  <div style={{ color: '#10b981', fontWeight: 700 }}>
                    Advance Given: LKR {Number(selectedSettlementRequest.amount_requested).toLocaleString()}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                    Total Amount Spent (with receipts) *
                  </label>
                  <input
                    type="number"
                    required
                    value={settlementData.settled_amount}
                    onChange={(e) => setSettlementData(prev => ({ ...prev, settled_amount: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                    Cash Returned to Cashier (LKR)
                  </label>
                  <input
                    type="number"
                    value={settlementData.returned_cash_amount}
                    onChange={(e) => setSettlementData(prev => ({ ...prev, returned_cash_amount: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '0.85rem',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                    }}
                  />
                </div>

                {/* Upload Bill Receipt Photo */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#cbd5e1' }}>
                    Photo of Signed Bills / Receipts *
                  </label>
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.25rem',
                    border: '1px dashed #f59e0b',
                    borderRadius: '12px',
                    backgroundColor: '#1e293b',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, setSettlementFile, setSettlementPreview)}
                      style={{ display: 'none' }}
                    />
                    <Camera size={28} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
                    <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 500 }}>
                      Take Photo of Actual Invoices
                    </span>
                  </label>

                  {settlementPreview && (
                    <div style={{ position: 'relative', marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={settlementPreview} alt="Receipt Preview" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => { setSettlementFile(null); setSettlementPreview(null); }}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          backgroundColor: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                          borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedSettlementRequest(null)}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '10px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#94a3b8',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settling}
                    style={{
                      flex: 2,
                      padding: '0.8rem',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#f59e0b',
                      color: '#000',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {settling ? 'Settling...' : 'Submit Settlement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SolarFinanceMobileRequest;
