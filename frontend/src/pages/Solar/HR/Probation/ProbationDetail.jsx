import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserCheck, ArrowLeft, Printer, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, AlertTriangle, Users, Award, Calendar, ExternalLink,
  Loader2, ThumbsUp, ThumbsDown, HelpCircle, FileText
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';

export const ProbationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  const isHrAdmin    = isSuperAdmin || user?.role === 'solar_hr_admin' || user?.roles?.includes('solar_hr_admin');
  const isCeo        = isSuperAdmin || (user?.email && user.email.toLowerCase() === 'eranda@circlegroup.lk');

  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);

  // HR Review modal state
  const [hrForm, setHrForm] = useState({
    hr_recommendation: 'confirm',
    proposed_extension_date: '',
    improvement_objectives: '',
    hr_review_notes: '',
  });
  const [submittingHrReview, setSubmittingHrReview] = useState(false);

  // CEO Decision modal state
  const [ceoForm, setCeoForm] = useState({
    ceo_decision: 'confirm',
    ceo_notes: '',
  });
  const [submittingCeoDecision, setSubmittingCeoDecision] = useState(false);

  // Presentation Schedule state
  const [presForm, setPresForm] = useState({
    status: 'scheduled',
    scheduled_at: '',
    notes: '',
  });
  const [schedulingPres, setSchedulingPres] = useState(false);

  // Peer Approval state
  const [approvingPeers, setApprovingPeers] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/probation/evaluations/${id}`);
      setEvaluation(res.data);

      if (res.data) {
        setHrForm({
          hr_recommendation: res.data.hr_recommendation || 'confirm',
          proposed_extension_date: res.data.proposed_extension_date || '',
          improvement_objectives: res.data.improvement_objectives || '',
          hr_review_notes: res.data.hr_review_notes || '',
        });

        setCeoForm({
          ceo_decision: res.data.ceo_decision || 'confirm',
          ceo_notes: res.data.ceo_notes || '',
        });

        if (res.data.presentation_scheduled_at) {
          setPresForm({
            status: res.data.presentation_status || 'scheduled',
            scheduled_at: res.data.presentation_scheduled_at ? res.data.presentation_scheduled_at.replace(' ', 'T').substring(0, 16) : '',
            notes: res.data.presentation_notes || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load probation evaluation details:', err);
      toast.error('Failed to load evaluation details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleApprovePeers = async () => {
    if (!evaluation) return;
    const peerForms = (evaluation.forms || []).filter(f => f.evaluator_role === 'peer');
    const peerEmpIds = peerForms.map(f => f.evaluator_employee_id).filter(Boolean);

    if (peerEmpIds.length === 0) {
      toast.error('No nominated peers found to approve.');
      return;
    }

    setApprovingPeers(true);
    try {
      await api.patch(`/hr/probation/evaluations/${id}/peers`, { peer_employee_ids: peerEmpIds });
      toast.success('Nominated peers approved and notified successfully!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve peers.');
    } finally {
      setApprovingPeers(false);
    }
  };

  const handleSchedulePresentation = async (e) => {
    e.preventDefault();
    setSchedulingPres(true);
    try {
      await api.patch(`/hr/probation/evaluations/${id}/presentation`, presForm);
      toast.success('Presentation details updated!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update presentation.');
    } finally {
      setSchedulingPres(false);
    }
  };

  const handleSubmitHrReview = async (e) => {
    e.preventDefault();
    setSubmittingHrReview(true);
    try {
      await api.post(`/hr/probation/evaluations/${id}/hr-review`, hrForm);
      toast.success('HR review submitted. Dossier forwarded for CEO final approval.');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit HR review.');
    } finally {
      setSubmittingHrReview(false);
    }
  };

  const handleSubmitCeoDecision = async (e) => {
    e.preventDefault();
    setSubmittingCeoDecision(true);
    try {
      const res = await api.post(`/hr/probation/evaluations/${id}/ceo-decision`, ceoForm);
      toast.success(res.data?.message || 'CEO final decision confirmed and employee status updated!');
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record CEO decision.');
    } finally {
      setSubmittingCeoDecision(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0284c7' }} />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h3>Evaluation not found</h3>
        <button onClick={() => navigate('/solar/hr/admin/probation')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to List
        </button>
      </div>
    );
  }

  const emp = evaluation.employee || {};
  const forms = evaluation.forms || [];
  const selfForm = forms.find(f => f.evaluator_role === 'self');
  const lmForm   = forms.find(f => f.evaluator_role === 'line_manager');
  const gmForm   = forms.find(f => f.evaluator_role === 'gm_pd');
  const ceoFormObj = forms.find(f => f.evaluator_role === 'ceo');
  const hrFormObj  = forms.find(f => f.evaluator_role === 'hr');
  const peerForms  = forms.filter(f => f.evaluator_role === 'peer');

  const pendingPeersApproval = peerForms.some(f => f.peer_approval_status === 'pending_hr');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <button
          onClick={() => navigate('/solar/hr/admin/probation')}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #cbd5e1', padding: '0.5rem 0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Probation List</span>
        </button>

        <button
          onClick={() => window.print()}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #cbd5e1', padding: '0.5rem 0.85rem' }}
        >
          <Printer size={16} />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* Main Employee & Evaluation Header Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '1.3rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #bae6fd',
            }}>
              {emp.photo_url ? (
                <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                emp.full_name?.charAt(0) || 'E'
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                  {emp.full_name}
                </h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#f1f5f9', color: '#475569' }}>
                  {emp.employee_id}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px',
                  background: evaluation.status === 'completed' ? '#dcfce7' : '#fef3c7',
                  color: evaluation.status === 'completed' ? '#15803d' : '#b45309',
                }}>
                  {evaluation.status?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {emp.designation?.name || 'Designation'} · {emp.department?.name || 'Department'} · Reporting to: <strong>{evaluation.line_manager?.full_name || 'Line Manager'}</strong>
              </p>
            </div>
          </div>

          {/* Key Dates Badge */}
          <div style={{
            background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px',
            border: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', fontSize: '0.8rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Date Joined</span>
              <strong>{emp.joined_date || '—'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Initiated</span>
              <strong>{evaluation.initiation_date}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Deadline</span>
              <strong style={{ color: '#0284c7' }}>{evaluation.submission_deadline}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Probation End</span>
              <strong style={{ color: '#dc2626' }}>{evaluation.probation_end_date}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Peer Verification & 10-Minute Presentation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Peer Evaluators Approval Block */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem' }}>
              <Users size={17} style={{ color: '#0284c7' }} />
              <span>Peer Evaluators (2–3 Employees)</span>
            </div>
            {pendingPeersApproval && isHrAdmin && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                Pending HR Approval
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem' }}>
            Nominated by the probationary employee during self-evaluation, subject to HR verification.
          </p>

          {peerForms.length === 0 ? (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Awaiting employee's self-evaluation to nominate 2–3 peers.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {peerForms.map((pf, idx) => (
                <div key={pf.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem',
                }}>
                  <div>
                    <strong>Peer {idx + 1}:</strong> {pf.evaluator_name || 'Staff Member'}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      ({pf.status === 'submitted' ? 'Submitted' : 'Pending'})
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px',
                    background: pf.peer_approval_status === 'approved' ? '#dcfce7' : '#fef3c7',
                    color: pf.peer_approval_status === 'approved' ? '#15803d' : '#b45309',
                  }}>
                    {pf.peer_approval_status === 'approved' ? 'Approved by HR' : 'Pending Review'}
                  </span>
                </div>
              ))}

              {pendingPeersApproval && isHrAdmin && (
                <button
                  onClick={handleApprovePeers}
                  disabled={approvingPeers}
                  className="btn btn-primary"
                  style={{
                    marginTop: '0.5rem', background: '#0284c7', borderColor: '#0284c7',
                    padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                  }}
                >
                  {approvingPeers ? 'Approving...' : 'Approve Nominated Peers'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 10-Minute Presentation Request */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            <Award size={17} style={{ color: '#0284c7' }} />
            <span>Optional 10-Minute Employee Presentation</span>
          </div>

          {!evaluation.presentation_requested ? (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No presentation requested by employee. (Allocates no additional marks).
            </div>
          ) : (
            <div>
              <div style={{
                padding: '0.75rem', borderRadius: '8px', background: '#f0fdf4',
                border: '1px solid #bbf7d0', marginBottom: '0.85rem', fontSize: '0.8rem',
              }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.2rem' }}>
                  ✓ Employee Requested 10-Minute Presentation
                </div>
                {evaluation.presentation_notes && (
                  <div style={{ color: '#166534', fontSize: '0.76rem' }}>
                    Note: {evaluation.presentation_notes}
                  </div>
                )}
              </div>

              {isHrAdmin && (
                <form onSubmit={handleSchedulePresentation} style={{ fontSize: '0.82rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.2rem' }}>Status</label>
                      <select
                        value={presForm.status}
                        onChange={e => setPresForm({ ...presForm, status: e.target.value })}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="declined">Not Required / Declined</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.2rem' }}>Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        value={presForm.scheduled_at}
                        onChange={e => setPresForm({ ...presForm, scheduled_at: e.target.value })}
                        style={{ width: '100%', padding: '0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Venue, Zoom link, or instructions..."
                    value={presForm.notes}
                    onChange={e => setPresForm({ ...presForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.65rem' }}
                  />
                  <button
                    type="submit"
                    disabled={schedulingPres}
                    className="btn btn-ghost"
                    style={{ width: '100%', border: '1px solid #cbd5e1', padding: '0.45rem', fontWeight: 600 }}
                  >
                    {schedulingPres ? 'Updating...' : 'Save Presentation Schedule'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* FINAL SUMMARY PROBATION EVALUATION FORM (EXACT MATCH WITH IMAGE 3)   */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem', border: '2px solid #0284c7' }}>
        {/* Table Title Banner */}
        <div style={{
          padding: '1rem 1.25rem', background: '#0284c7', color: '#fff',
          fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.2px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Final Summary Probation Evaluation Form</span>
          <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
            Passing Mark: 80 / 100
          </span>
        </div>

        {/* 5-Source Summary Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Source</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Form Result /100</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Weight</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Weighted Marks</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Employee Self-Evaluation */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>Employee Self-Evaluation</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {selfForm?.status === 'submitted' ? selfForm.form_score : '⏳ Pending'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>10%</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {evaluation.self_score !== null ? evaluation.self_score : '—'}
                </td>
              </tr>

              {/* 2. Line Manager */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>
                  Line Manager ({evaluation.line_manager?.full_name || 'Reporting Manager'})
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {lmForm?.status === 'submitted' ? lmForm.form_score : '⏳ Pending'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>30%</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {evaluation.line_manager_score !== null ? evaluation.line_manager_score : '—'}
                </td>
              </tr>

              {/* 3. General Manager / Project Director */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>General Manager / Project Director</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {gmForm?.status === 'submitted' ? gmForm.form_score : '⏳ Pending'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>20%</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {evaluation.gm_score !== null ? evaluation.gm_score : '—'}
                </td>
              </tr>

              {/* 4. CEO */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>CEO</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {ceoFormObj?.status === 'submitted' ? ceoFormObj.form_score : '⏳ Pending'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>20%</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {evaluation.ceo_score !== null ? evaluation.ceo_score : '—'}
                </td>
              </tr>

              {/* 5. Individual Peer Evaluations */}
              {peerForms.map((pf, idx) => (
                <tr key={pf.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                  <td style={{ padding: '0.55rem 1.25rem 0.55rem 2.25rem', fontSize: '0.82rem', color: '#475569' }}>
                    Peer Evaluation {idx + 1} ({pf.evaluator_name})
                  </td>
                  <td style={{ padding: '0.55rem 1.25rem', textAlign: 'center', fontSize: '0.82rem' }}>
                    {pf.status === 'submitted' ? pf.form_score : '⏳ Pending'}
                  </td>
                  {idx === 0 && (
                    <>
                      <td rowSpan={peerForms.length} style={{ verticalAlign: 'middle', textAlign: 'center', borderLeft: '1px solid #e2e8f0', background: '#fff' }}>
                        10%
                      </td>
                      <td rowSpan={peerForms.length} style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 700, color: '#0f172a', borderLeft: '1px solid #e2e8f0', background: '#fff' }}>
                        {evaluation.peer_avg_score !== null ? evaluation.peer_avg_score : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {/* 6. HR */}
              <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>HR</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {hrFormObj?.status === 'submitted' ? hrFormObj.form_score : '⏳ Pending'}
                </td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>10%</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                  {evaluation.hr_score !== null ? evaluation.hr_score : '—'}
                </td>
              </tr>

              {/* FINAL TOTAL */}
              <tr style={{ background: '#f8fafc', fontWeight: 800, fontSize: '1rem' }}>
                <td style={{ padding: '1rem 1.25rem', color: '#0f172a' }}>FINAL TOTAL</td>
                <td style={{ padding: '1rem 1.25rem' }}></td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>100%</td>
                <td style={{
                  padding: '1rem 1.25rem', textAlign: 'center', fontSize: '1.25rem',
                  color: (evaluation.final_score && evaluation.final_score >= 80) ? '#15803d' : '#dc2626',
                }}>
                  {evaluation.final_score !== null ? evaluation.final_score : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pass Threshold Result Strip */}
        <div style={{
          padding: '1rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <div style={{ fontSize: '0.92rem', color: '#334155' }}>
            Pass threshold: <strong>80 / 100</strong> &nbsp;|&nbsp; Employee score: <strong>{evaluation.final_score ?? 'Pending'}/100</strong>
          </div>

          {evaluation.final_score !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
              background: evaluation.threshold_met ? '#dcfce7' : '#fee2e2',
              color: evaluation.threshold_met ? '#15803d' : '#b91c1c',
            }}>
              <span>Threshold met?</span>
              <strong>{evaluation.threshold_met ? '✓ YES (Eligible for Confirmation)' : '✗ NO (Extend or Non-Confirm)'}</strong>
            </div>
          )}
        </div>

        {/* ──────────────────────────────────────────────────────────────────── */}
        {/* RECOMMENDATIONS & CEO APPROVAL SECTION                               */}
        {/* ──────────────────────────────────────────────────────────────────── */}
        <div style={{ padding: '1.5rem', background: '#fff', borderTop: '2px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            HR Review and CEO Approval
          </h4>

          {/* Three-Tier Recommendations View */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Line Manager Recommendation */}
            <div style={{ padding: '0.85rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Line Manager Recommendation
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem', color: '#0f172a' }}>
                {evaluation.line_manager_recommendation ? (
                  evaluation.line_manager_recommendation === 'confirm' ? '✓ Confirm Employment' :
                  evaluation.line_manager_recommendation === 'extend'  ? '⏳ Extend Probation' : '✗ Do Not Confirm'
                ) : 'Awaiting Line Manager submission'}
              </div>
            </div>

            {/* GM / Project Director Recommendation */}
            <div style={{ padding: '0.85rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                General Manager / Project Director
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem', color: '#0f172a' }}>
                {evaluation.gm_recommendation ? (
                  evaluation.gm_recommendation === 'confirm' ? '✓ Confirm Employment' :
                  evaluation.gm_recommendation === 'extend'  ? '⏳ Extend Probation' : '✗ Do Not Confirm'
                ) : 'Awaiting GM submission'}
              </div>
            </div>

            {/* HR Recommendation */}
            <div style={{ padding: '0.85rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                HR Recommendation
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem', color: '#0f172a' }}>
                {evaluation.hr_recommendation ? (
                  evaluation.hr_recommendation === 'confirm' ? '✓ Confirm Employment' :
                  evaluation.hr_recommendation === 'extend'  ? '⏳ Extend Probation' : '✗ Do Not Confirm'
                ) : 'Awaiting HR final review'}
              </div>
            </div>
          </div>

          {evaluation.proposed_extension_date && (
            <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <strong>Where applicable, proposed extension end date:</strong> {evaluation.proposed_extension_date}
            </div>
          )}

          {evaluation.improvement_objectives && (
            <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <strong>Reasons / improvement objectives / supporting evidence:</strong>
              <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '0.35rem' }}>
                {evaluation.improvement_objectives}
              </div>
            </div>
          )}

          {/* HR Review Form (Active if HR hasn't finalized yet) */}
          {isHrAdmin && !evaluation.hr_recommendation && (
            <form onSubmit={handleSubmitHrReview} style={{
              background: '#f0f9ff', padding: '1.25rem', borderRadius: '10px',
              border: '1px solid #bae6fd', marginBottom: '1.5rem',
            }}>
              <h5 style={{ margin: '0 0 0.85rem', color: '#0369a1', fontWeight: 800 }}>
                Submit HR Recommendation &amp; Forward to CEO
              </h5>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    HR Recommendation
                  </label>
                  <select
                    value={hrForm.hr_recommendation}
                    onChange={e => setHrForm({ ...hrForm, hr_recommendation: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="confirm">Confirm Employment</option>
                    <option value="extend">Extend Probation</option>
                    <option value="do_not_confirm">Do Not Confirm (Termination Process)</option>
                  </select>
                </div>

                {hrForm.hr_recommendation === 'extend' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      Proposed Extension End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={hrForm.proposed_extension_date}
                      onChange={e => setHrForm({ ...hrForm, proposed_extension_date: e.target.value })}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Reasons / Improvement Objectives / Supporting Evidence
                </label>
                <textarea
                  rows={3}
                  value={hrForm.improvement_objectives}
                  onChange={e => setHrForm({ ...hrForm, improvement_objectives: e.target.value })}
                  placeholder="Outline key performance evidence or target objectives if extending..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingHrReview}
                className="btn btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7', padding: '0.5rem 1.25rem', fontWeight: 600 }}
              >
                {submittingHrReview ? 'Forwarding...' : 'Submit Recommendation & Forward to CEO'}
              </button>
            </form>
          )}

          {/* ────────────────────────────────────────────────────────────────── */}
          {/* CEO FINAL DECISION BLOCK                                           */}
          {/* ────────────────────────────────────────────────────────────────── */}
          <div style={{
            padding: '1.25rem', borderRadius: '10px',
            background: evaluation.ceo_decision ? '#f0fdf4' : '#faf5ff',
            border: evaluation.ceo_decision ? '2px solid #86efac' : '2px solid #d8b4fe',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                CEO FINAL DECISION
              </div>
              {evaluation.ceo_decision && (
                <span style={{
                  padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800,
                  background: evaluation.ceo_decision === 'confirm' ? '#16a34a' : '#ea580c', color: '#fff',
                }}>
                  {evaluation.ceo_decision.toUpperCase()}
                </span>
              )}
            </div>

            {evaluation.ceo_decision ? (
              <div style={{ fontSize: '0.88rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Decision:</strong> &nbsp;
                  {evaluation.ceo_decision === 'confirm' && '✓ Confirm Employment'}
                  {evaluation.ceo_decision === 'extend' && `⏳ Extend Probation (New Date: ${evaluation.proposed_extension_date || 'Pending'})`}
                  {evaluation.ceo_decision === 'do_not_confirm' && '✗ Non-confirmation (subject to legal/HR process)'}
                </div>
                {evaluation.ceo_notes && (
                  <div style={{ marginBottom: '0.5rem', color: '#334155' }}>
                    <strong>CEO Remarks:</strong> {evaluation.ceo_notes}
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Approved by CEO: <strong>{evaluation.ceo_approver?.name || 'Eranda Ellepola'}</strong> on {evaluation.ceo_approved_at}
                </div>
              </div>
            ) : isCeo ? (
              <form onSubmit={handleSubmitCeoDecision}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Select Final Decision
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                      { key: 'confirm', label: 'Confirm Employment' },
                      { key: 'extend', label: 'Extend Probation' },
                      { key: 'do_not_confirm', label: 'Non-Confirmation (Exit Process)' },
                    ].map(opt => (
                      <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                        <input
                          type="radio"
                          name="ceo_decision"
                          value={opt.key}
                          checked={ceoForm.ceo_decision === opt.key}
                          onChange={e => setCeoForm({ ...ceoForm, ceo_decision: e.target.value })}
                        />
                        <strong>{opt.label}</strong>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    CEO Notes / Directives
                  </label>
                  <textarea
                    rows={2}
                    value={ceoForm.ceo_notes}
                    onChange={e => setCeoForm({ ...ceoForm, ceo_notes: e.target.value })}
                    placeholder="Enter final executive directives or performance remarks..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCeoDecision}
                  className="btn btn-primary"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed', padding: '0.6rem 1.5rem', fontWeight: 700 }}
                >
                  {submittingCeoDecision ? 'Submitting...' : 'Sign & Apply CEO Final Decision'}
                </button>
              </form>
            ) : (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Awaiting final review and sign-off by Chief Executive Officer (Eranda Ellepola).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProbationDetail;
