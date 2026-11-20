import { useState, useEffect } from 'react';
import { X, Calendar, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const formatDate = (val) => {
  if (!val) return '—';
  const cleanStr = String(val).split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${d} ${monthName} ${y}`;
  }
  return cleanStr;
};

export const InitiateProbationModal = ({ isOpen, onClose, employee, onInitiated }) => {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    submission_deadline: '',
    line_manager_id: '',
    gm_user_id: '',
    ceo_user_id: '',
  });

  useEffect(() => {
    if (!isOpen || !employee) return;

    // Default deadline: 7 days before probation end date (if in future) or 14 days from today
    const now = new Date();
    const fallbackDate = new Date(now);
    fallbackDate.setDate(now.getDate() + 14);

    let defaultDeadline = fallbackDate.toISOString().split('T')[0];

    if (employee.probation_end_date) {
      const cleanProb = String(employee.probation_end_date).split('T')[0];
      const probEnd = new Date(cleanProb);
      const sevenDaysBefore = new Date(probEnd);
      sevenDaysBefore.setDate(probEnd.getDate() - 7);

      if (sevenDaysBefore > now) {
        defaultDeadline = sevenDaysBefore.toISOString().split('T')[0];
      } else if (probEnd > now) {
        defaultDeadline = probEnd.toISOString().split('T')[0];
      } else {
        defaultDeadline = fallbackDate.toISOString().split('T')[0];
      }
    }

    setForm({
      submission_deadline: defaultDeadline,
      line_manager_id: employee.manager_id ? String(employee.manager_id) : '',
      gm_user_id: '',
      ceo_user_id: '',
    });

    const fetchData = async () => {
      try {
        const [empRes, usersRes, expiringRes] = await Promise.all([
          api.get('/hr/employees'),
          api.get('/solar/users').catch(() => ({ data: [] })),
          api.get('/hr/probation/expiring-employees'),
        ]);

        setManagers(empRes.data || []);
        const uList = usersRes.data || [];
        setUsers(uList);

        // Pre-fill default GM and CEO
        const defaultGm = expiringRes.data?.default_gm;
        const defaultCeo = expiringRes.data?.default_ceo;

        setForm(prev => ({
          ...prev,
          gm_user_id: defaultGm?.id ? String(defaultGm.id) : (prev.gm_user_id || ''),
          ceo_user_id: defaultCeo?.id ? String(defaultCeo.id) : (prev.ceo_user_id || ''),
        }));
      } catch (err) {
        console.error('Failed to load modal prefill data:', err);
      }
    };

    fetchData();
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.submission_deadline) {
      toast.error('Please enter a submission deadline.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee_id: employee.id,
        submission_deadline: form.submission_deadline,
        line_manager_id: form.line_manager_id ? Number(form.line_manager_id) : null,
        gm_user_id: form.gm_user_id ? Number(form.gm_user_id) : null,
        ceo_user_id: form.ceo_user_id ? Number(form.ceo_user_id) : null,
      };

      const res = await api.post('/hr/probation/evaluations', payload);
      toast.success(res.data?.message || '270° Probation Evaluation initiated successfully!');
      onInitiated?.(res.data?.evaluation);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate evaluation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '14px', maxWidth: '520px', width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
        border: '1px solid #e2e8f0', maxHeight: '94vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '0.75rem 1.25rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', flexShrink: 0,
            }}>
              <UserCheck size={18} />
            </div> */}
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#ffffff' }}>Initiate 270° Probation Evaluation</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#ffffff' }}>
                Target: {employee.full_name} ({employee.employee_id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', opacity: 0.9, padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '0.85rem 1.25rem' }}>
          {/* Employee Info Strip */}
          <div style={{
            background: '#f8fafc', borderRadius: '8px', padding: '0.45rem 0.75rem',
            border: '1px solid #e2e8f0', marginBottom: '0.65rem',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.76rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Department</span>
              <strong>{employee.department || '—'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Joined Date</span>
              <strong>{formatDate(employee.joined_date)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.66rem' }}>Probation End</span>
              <strong style={{ color: '#0369a1' }}>{formatDate(employee.probation_end_date)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Submission Deadline */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  Submission Deadline <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Evaluators must submit by this date
                </span>
              </div>
              <input
                type="date"
                required
                value={form.submission_deadline}
                onChange={e => setForm({ ...form, submission_deadline: e.target.value })}
                style={{
                  width: '100%', padding: '0.42rem 0.65rem', borderRadius: '7px',
                  border: '1px solid #cbd5e1', fontSize: '0.82rem',
                }}
              />
            </div>

            {/* Line Manager Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                Reporting Line Manager (Weight: 30%)
              </label>
              <select
                value={form.line_manager_id}
                onChange={e => setForm({ ...form, line_manager_id: e.target.value })}
                style={{
                  width: '100%', padding: '0.42rem 0.65rem', borderRadius: '7px',
                  border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff',
                }}
              >
                <option value="">-- Select Reporting Manager --</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.employee_id}) {m.designation?.name ? `· ${m.designation.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* GM / Project Director */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                General Manager / Project Director (Weight: 20%)
              </label>
              <select
                value={form.gm_user_id}
                onChange={e => setForm({ ...form, gm_user_id: e.target.value })}
                style={{
                  width: '100%', padding: '0.42rem 0.65rem', borderRadius: '7px',
                  border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff',
                }}
              >
                <option value="">-- Default: Hasintha Rathnayaka (hasintha@circlegroup.lk) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* CEO */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                Chief Executive Officer (Weight: 20% &amp; Final Decision)
              </label>
              <select
                value={form.ceo_user_id}
                onChange={e => setForm({ ...form, ceo_user_id: e.target.value })}
                style={{
                  width: '100%', padding: '0.42rem 0.65rem', borderRadius: '7px',
                  border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff',
                }}
              >
                <option value="">-- Default: Eranda Ellepola (eranda@circlegroup.lk) --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              background: '#eff6ff', borderRadius: '7px', padding: '0.45rem 0.65rem',
              border: '1px solid #bfdbfe', fontSize: '0.72rem', color: '#1e40af',
              display: 'flex', alignItems: 'center', gap: '0.45rem',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <div>
                <strong>Workflow Note:</strong> Evaluator forms are dispatched concurrently. Employee will submit Self-Evaluation and nominate 2–3 peers.
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.85rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost"
              style={{ border: '1px solid #cbd5e1', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                background: '#0284c7', borderColor: '#0284c7',
                padding: '0.45rem 1.25rem', fontWeight: 600, fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={15} />}
              <span>{loading ? 'Initiating...' : 'Confirm & Initiate'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitiateProbationModal;
