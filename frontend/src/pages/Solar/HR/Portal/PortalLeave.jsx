import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  pending:          { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Pending' },
  manager_approved: { color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  label: 'Manager Approved' },
  manager_rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Manager Rejected' },
  approved:         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Approved' },
  rejected:         { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Rejected' },
  cancelled:        { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', label: 'Cancelled' },
};

const LEAVE_TYPES = [
  { key: 'annual',  label: 'Annual Leave' },
  { key: 'casual',  label: 'Casual Leave' },
  { key: 'medical', label: 'Medical Leave' },
  { key: 'short',   label: 'Short Leave' },
];

const PortalLeave = () => {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'annual', start_date: '', end_date: '', reason: '', hours_count: 1, is_half_day: false });
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, reqRes] = await Promise.all([
        api.get('/hr/leaves/my-balance'),
        api.get('/hr/leaves/my-requests'),
      ]);
      setBalances(balRes.data);
      setRequests(reqRes.data);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date) { toast.error('Please select start date'); return; }
    
    let submitData = { ...form };
    
    if (form.leave_type === 'short') {
      submitData.end_date = form.start_date;
      submitData.days_count = 0;
    } else {
      if (!form.end_date) { toast.error('Please select end date'); return; }
      submitData.hours_count = null;
      let d = calcDays(form.start_date, form.end_date);
      if (form.is_half_day && form.start_date === form.end_date) d = 0.5;
      submitData.days_count = d;
    }

    setSubmitting(true);
    try {
      await api.post('/hr/leaves', submitData);
      toast.success('Leave request submitted!');
      setShowForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await api.patch(`/hr/leaves/${id}/cancel`);
      toast.success('Request cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel');
    } finally { setCancelling(null); }
  };

  // Working days between dates
  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    let d = new Date(start), count = 0;
    const e = new Date(end);
    while (d <= e) { const day = d.getDay(); if (day !== 0 && day !== 6) count++; d.setDate(d.getDate() + 1); }
    return count;
  };
  const days = calcDays(form.start_date, form.end_date);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>My Leave</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Balance & requests</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={16} /> Apply
        </button>
      </div>

      {/* Balances */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
        {balances.map(b => (
          <div key={b.key} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{b.type}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.used} used · {b.total} total</span>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (b.used / b.total) * 100)}%`, height: '100%', background: b.remaining > 2 ? '#22c55e' : b.remaining > 0 ? '#f59e0b' : '#ef4444', borderRadius: '999px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 700, color: b.remaining > 0 ? '#22c55e' : '#ef4444' }}>
              {b.remaining} {b.unit} remaining
            </div>
          </div>
        ))}
      </div>

      {/* Requests */}
      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>My Requests</div>
      {requests.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {requests.map(r => {
            const s = STATUS_STYLE[r.status];
            return (
              <div key={r.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>{r.leave_type} Leave</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {r.leave_type === 'short' 
                        ? `${r.start_date.split('T')[0]} · ${r.hours_count} hour(s)` 
                        : `${r.start_date.split('T')[0]} → ${r.end_date.split('T')[0]} · ${r.days_count} day(s)`}
                    </div>
                    {r.reason && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>"{r.reason}"</div>}
                    {r.manager_notes && <div style={{ fontSize: '0.72rem', color: '#0ea5e9', marginTop: '0.25rem' }}>Mgr: {r.manager_notes}</div>}
                    {r.hr_notes && <div style={{ fontSize: '0.72rem', color: '#3b82f6', marginTop: '0.25rem' }}>HR: {r.hr_notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: s?.bg, color: s?.color }}>{s?.label || r.status}</span>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        disabled={cancelling === r.id}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600 }}
                      >
                        {cancelling === r.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.1rem' }}>Apply for Leave</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Leave Type</label>
                <select className="form-control" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                  {LEAVE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: form.leave_type === 'short' ? '1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">{form.leave_type === 'short' ? 'Date' : 'Start Date'}</label>
                  <input type="date" className="form-control" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required min={new Date().toISOString().split('T')[0]} />
                </div>
                {form.leave_type !== 'short' && (
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-control" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required min={form.start_date || new Date().toISOString().split('T')[0]} />
                  </div>
                )}
              </div>
              
              {form.leave_type === 'short' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Hours</label>
                  <select className="form-control" value={form.hours_count} onChange={e => setForm({ ...form, hours_count: parseInt(e.target.value) })}>
                    <option value={1}>1 Hour</option>
                    <option value={2}>2 Hours</option>
                  </select>
                </div>
              )}

              {form.leave_type !== 'short' && form.start_date === form.end_date && form.start_date && (
                <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="half_day" checked={form.is_half_day} onChange={e => setForm({ ...form, is_half_day: e.target.checked })} />
                  <label htmlFor="half_day" style={{ margin: 0, fontSize: '0.875rem' }}>This is a half-day leave (0.5 days)</label>
                </div>
              )}

              {form.leave_type !== 'short' && days > 0 && !form.is_half_day && (
                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: '#3b82f6', fontWeight: 600 }}>
                  📅 {days} working day{days > 1 ? 's' : ''}
                </div>
              )}
              {form.leave_type !== 'short' && days > 0 && form.is_half_day && (
                <div style={{ background: 'rgba(59,130,246,0.08)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem', color: '#3b82f6', fontWeight: 600 }}>
                  📅 0.5 working days
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Reason (optional)</label>
                <textarea className="form-control" rows={3} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Brief reason for leave..." />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--surface-2)' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6', borderColor: '#3b82f6' }} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalLeave;
