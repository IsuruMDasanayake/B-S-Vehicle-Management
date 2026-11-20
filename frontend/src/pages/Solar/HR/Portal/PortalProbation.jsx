import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Award, Clock, CheckCircle2, AlertCircle, ArrowLeft,
  Loader2, Save, Send, Users, ChevronRight, FileText, ExternalLink, ShieldCheck
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';

// 5 Self-Evaluation Criteria (Image 1)
const SELF_CRITERIA = [
  {
    id: 1,
    title: 'Personal Achievements & Contributions',
    prompt: 'How satisfied are you with your overall achievements and contributions to the company during probation?',
    weight: 20,
  },
  {
    id: 2,
    title: 'Overcoming Challenges',
    prompt: 'How effectively have you identified and managed difficulties encountered in your role?',
    weight: 20,
  },
  {
    id: 3,
    title: 'Adaptation to the Work Environment',
    prompt: 'How successfully have you adjusted to the company’s working environment, culture and operational practices?',
    weight: 20,
  },
  {
    id: 4,
    title: 'Personal Motivation & Commitment',
    prompt: 'How would you assess your motivation, engagement and commitment to continuing your career with Circle Engineering?',
    weight: 20,
  },
  {
    id: 5,
    title: 'Readiness for Employment Confirmation',
    prompt: 'How confident are you in your ability to independently handle your responsibilities after probation?',
    weight: 20,
  },
];

// 7 Standardized Evaluator Criteria (Image 2)
const EVALUATOR_CRITERIA = [
  {
    id: 1,
    title: 'Job Knowledge & Technical Competency',
    prompt: 'Evaluate the employee’s understanding of job responsibilities, technical knowledge, practical skills, and ability to perform assigned duties effectively.',
    weight: 20,
  },
  {
    id: 2,
    title: 'Achievement of Assigned Objectives',
    prompt: 'Assess the employee’s success in completing assigned tasks, achieving agreed objectives, and delivering expected results during the probation period.',
    weight: 25,
  },
  {
    id: 3,
    title: 'Quality, Accuracy & Timeliness',
    prompt: 'Evaluate the quality and accuracy of completed work, attention to detail, ability to meet deadlines, and consistency of performance.',
    weight: 15,
  },
  {
    id: 4,
    title: 'Teamwork & Communication',
    prompt: 'Assess the employee’s ability to cooperate with colleagues, communicate clearly, share information, and maintain positive working relationships.',
    weight: 10,
  },
  {
    id: 5,
    title: 'Accountability, Discipline & Reliability',
    prompt: 'Evaluate the employee’s responsibility for assigned duties, punctuality, attendance, adherence to instructions, and dependability in completing commitments.',
    weight: 10,
  },
  {
    id: 6,
    title: 'Initiative, Problem-Solving & Adaptability',
    prompt: 'Assess the employee’s willingness to take initiative, identify and resolve problems, accept feedback, learn new skills, and adapt to changing work requirements.',
    weight: 10,
  },
  {
    id: 7,
    title: 'Safety, Ethics & Company Compliance',
    prompt: 'Evaluate the employee’s compliance with company policies, workplace safety procedures, professional ethics, confidentiality requirements, and expected standards of conduct.',
    weight: 10,
  },
];

// Rating Scale Guidelines (Image 4)
const RATING_SCALE = [
  { rating: 5, label: '5 - Outstanding', desc: 'Consistently performs significantly above expectations.' },
  { rating: 4, label: '4 - Exceeds Expectations', desc: 'Frequently performs above required standards.' },
  { rating: 3, label: '3 - Meets Expectations', desc: 'Consistently meets the expected job requirements.' },
  { rating: 2, label: '2 - Needs Improvement', desc: 'Partially meets requirements; noticeable improvement needed.' },
  { rating: 1, label: '1 - Unsatisfactory', desc: 'Fails to meet essential performance requirements.' },
];

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

const formatDateTime = (val) => {
  if (!val) return '—';
  if (!String(val).includes('T') && !String(val).includes(':')) {
    return formatDate(val);
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return formatDate(val);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} ${month} ${year}, ${timeStr.toUpperCase()}`;
  } catch (e) {
    return formatDate(val);
  }
};

export const PortalProbation = () => {
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(true);

  const [myEval, setMyEval] = useState(null);
  const [pendingForms, setPendingForms] = useState([]);
  const [completedForms, setCompletedForms] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);

  // Active form being filled
  const [activeFormMode, setActiveFormMode] = useState(null); // 'self' | 'evaluator'
  const [activeFormItem, setActiveFormItem] = useState(null);

  // Self Form State
  const [selfRatings, setSelfRatings] = useState({ 1: { rating: 5 }, 2: { rating: 4 }, 3: { rating: 4 }, 4: { rating: 5 }, 5: { rating: 4 } });
  const [selfAchievements, setSelfAchievements] = useState('');
  const [selfChallenges, setSelfChallenges] = useState('');
  const [selfPeers, setSelfPeers] = useState(['', '', '']);
  const [submittingSelf, setSubmittingSelf] = useState(false);

  // Evaluator Form State
  const [evalRatings, setEvalRatings] = useState({ 1: { rating: 4 }, 2: { rating: 4 }, 3: { rating: 4 }, 4: { rating: 4 }, 5: { rating: 4 }, 6: { rating: 4 }, 7: { rating: 4 } });
  const [evalRecommendation, setEvalRecommendation] = useState('confirm');
  const [evalProposedDate, setEvalProposedDate] = useState('');
  const [evalComments, setEvalComments] = useState('');
  const [ceoPresentation, setCeoPresentation] = useState(false);
  const [ceoPresentationNotes, setCeoPresentationNotes] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // CEO Final Sign-off State (for CEO Eranda Ellepola / Assigned CEO)
  const [ceoDecisions, setCeoDecisions] = useState([]);
  const [ceoDecisionChoice, setCeoDecisionChoice] = useState('confirm');
  const [ceoExtensionDate, setCeoExtensionDate] = useState('');
  const [ceoDecisionNotes, setCeoDecisionNotes] = useState('');
  const [ceoDecisionPresentation, setCeoDecisionPresentation] = useState(false);
  const [ceoDecisionPresentationNotes, setCeoDecisionPresentationNotes] = useState('');
  const [submittingPortalCeo, setSubmittingPortalCeo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [evalRes, empRes] = await Promise.all([
        api.get('/hr/probation/my-evaluations'),
        api.get('/hr/employees').catch(() => ({ data: [] })),
      ]);

      setMyEval(evalRes.data?.my_probation_evaluation || null);
      setPendingForms((evalRes.data?.pending_forms || []).filter(f => f.evaluator_role !== 'self'));
      setCompletedForms((evalRes.data?.completed_forms || []).filter(f => f.evaluator_role !== 'self'));
      setCeoDecisions(evalRes.data?.ceo_pending_decisions || []);
      setEmployeesList(empRes.data || []);
    } catch (err) {
      console.error('Failed to load portal probation evaluations:', err);
      toast.error('Failed to load probation evaluations.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmitPortalCeoDecision = async (evalId) => {
    setSubmittingPortalCeo(true);
    try {
      await api.post(`/hr/probation/evaluations/${evalId}/ceo-decision`, {
        ceo_decision: ceoDecisionChoice,
        ceo_notes: ceoDecisionNotes,
        proposed_extension_date: ceoDecisionChoice === 'extend' ? ceoExtensionDate : undefined,
        presentation_requested: ceoDecisionPresentation,
        presentation_notes: ceoDecisionPresentationNotes,
      });
      toast.success('CEO final decision confirmed and employee confirmation status updated!');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit CEO decision.');
    } finally {
      setSubmittingPortalCeo(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Self Evaluation Form
  const handleOpenSelf = () => {
    if (!myEval) return;
    const forms = myEval.forms || [];
    const sf = forms.find(f => f.evaluator_role === 'self');
    if (sf && sf.ratings) {
      setSelfRatings(sf.ratings);
      setSelfAchievements(sf.achievements_evidence || '');
      setSelfChallenges(sf.challenges_support || '');
    }

    setActiveFormItem(sf || null);
    setActiveFormMode('self');
  };

  // Open Evaluator Form for colleague
  const handleOpenEvaluatorForm = (formItem) => {
    setActiveFormItem(formItem);
    if (formItem.ratings) {
      setEvalRatings(formItem.ratings);
    } else {
      setEvalRatings({ 1: { rating: 4 }, 2: { rating: 4 }, 3: { rating: 4 }, 4: { rating: 4 }, 5: { rating: 4 }, 6: { rating: 4 }, 7: { rating: 4 } });
    }
    setEvalRecommendation(formItem.recommendation || 'confirm');
    setEvalProposedDate(formItem.proposed_extension_date || '');
    setEvalComments(formItem.general_comments || '');
    if (formItem.evaluator_role === 'ceo') {
      setCeoPresentation(!!formItem.evaluation?.presentation_requested);
      setCeoPresentationNotes(formItem.evaluation?.presentation_notes || '');
    }
    setActiveFormMode('evaluator');
  };

  // Compute Self Marks live
  const calculateSelfScore = () => {
    let total = 0;
    SELF_CRITERIA.forEach(c => {
      const r = selfRatings[c.id]?.rating || 0;
      total += (r / 5) * c.weight;
    });
    return Math.round(total);
  };

  // Compute Evaluator Score live
  const calculateEvalScore = () => {
    let total = 0;
    EVALUATOR_CRITERIA.forEach(c => {
      const r = evalRatings[c.id]?.rating || 0;
      total += (r / 5) * c.weight;
    });
    return Math.round(total);
  };

  // Submit Self Evaluation
  const handleSubmitSelf = async (e) => {
    e.preventDefault();
    if (!myEval) return;

    // Validate 2-3 distinct peers selected
    const selectedPeers = selfPeers.filter(Boolean);
    if (selectedPeers.length < 2) {
      toast.error('Please select at least 2 peer evaluators.');
      return;
    }
    if (new Set(selectedPeers).size !== selectedPeers.length) {
      toast.error('Please select distinct colleagues for each peer nomination.');
      return;
    }

    setSubmittingSelf(true);
    try {
      const payload = {
        ratings: selfRatings,
        achievements_evidence: selfAchievements,
        challenges_support: selfChallenges,
        peer_employee_ids: selectedPeers.map(Number),
      };

      const res = await api.post(`/hr/probation/evaluations/${myEval.id}/self-evaluation`, payload);
      toast.success(res.data?.message || 'Self-evaluation submitted and locked successfully!');
      setActiveFormMode(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit self-evaluation.');
    } finally {
      setSubmittingSelf(false);
    }
  };

  // Submit Evaluator Form
  const handleSubmitEvaluator = async (e) => {
    e.preventDefault();
    if (!activeFormItem) return;

    setSubmittingEval(true);
    try {
      const isCeo = activeFormItem.evaluator_role === 'ceo';
      const payload = {
        ratings: evalRatings,
        recommendation: evalRecommendation,
        proposed_extension_date: evalProposedDate,
        general_comments: evalComments,
        ceo_decision: isCeo ? evalRecommendation : undefined,
        ceo_notes: isCeo ? evalComments : undefined,
        presentation_requested: isCeo ? ceoPresentation : undefined,
        presentation_notes: isCeo ? ceoPresentationNotes : undefined,
      };

      const res = await api.post(`/hr/probation/forms/${activeFormItem.id}/submit`, payload);
      toast.success(res.data?.message || (isCeo ? 'Evaluation submitted and CEO Final Decision recorded!' : 'Evaluation submitted and locked successfully!'));
      setActiveFormMode(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit evaluation.');
    } finally {
      setSubmittingEval(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#0284c7' }} />
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW: Active Self-Evaluation Form (Image 1)
  // ───────────────────────────────────────────────────────────────────────────
  if (activeFormMode === 'self') {
    const isLocked = activeFormItem?.status === 'submitted';

    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
        <button
          onClick={() => setActiveFormMode(null)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', border: '1px solid #cbd5e1' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Probation Hub</span>
        </button>

        <form onSubmit={handleSubmitSelf} className="card" style={{ padding: '1.5rem', border: '2px solid #0284c7' }}>
          {/* Header matching Image 1 */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Probation Evaluation – Self Evaluation Form
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Complete all 5 self-assessment criteria (20% each) and nominate 2–3 peer evaluators.
            </p>
          </div>

          {/* Info Banner */}
          <div style={{
            background: '#f8fafc', borderRadius: '10px', padding: '0.85rem 1rem',
            border: '1px solid #e2e8f0', marginBottom: '1.5rem',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.82rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Employee Name &amp; ID</span>
              <strong>{myEval.employee?.full_name} ({myEval.employee?.employee_id})</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Designation / Department</span>
              <strong>{myEval.employee?.designation?.name} · {myEval.employee?.department?.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Submission Deadline</span>
              <strong style={{ color: '#0284c7' }}>{formatDate(myEval.submission_deadline)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Probation End Date</span>
              <strong style={{ color: '#dc2626' }}>{formatDate(myEval.probation_end_date)}</strong>
            </div>
          </div>

          {/* Table of 5 Criteria */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b' }}>
                  <th style={{ padding: '0.75rem', width: '40px', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '0.75rem' }}>Criterion and self-assessment prompt</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '70px' }}>Weight</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '260px' }}>Rating (1–5)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '70px' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {SELF_CRITERIA.map(c => {
                  const currentRating = selfRatings[c.id]?.rating || 3;
                  const rowMarks = Math.round((currentRating / 5) * c.weight);

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>
                        {c.id}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.15rem' }}>{c.title}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>{c.prompt}</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        {c.weight}%
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {[1, 2, 3, 4, 5].map(r => (
                            <button
                              key={r}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setSelfRatings(prev => ({ ...prev, [c.id]: { rating: r } }))}
                              title={RATING_SCALE.find(s => s.rating === r)?.desc}
                              style={{
                                width: '38px', height: '36px', borderRadius: '6px',
                                border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem',
                                cursor: isLocked ? 'default' : 'pointer',
                                background: currentRating === r ? '#fde047' : '#fff',
                                color: currentRating === r ? '#0f172a' : '#64748b',
                                boxShadow: currentRating === r ? 'inset 0 0 0 2px #eab308' : 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {rowMarks}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ padding: '0.75rem', textAlign: 'right' }}>Total Weight:</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>100%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>Total Self Score:</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.15rem', color: '#0284c7' }}>
                    {calculateSelfScore()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Qualitative Text Areas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                Achievements / evidence:
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={selfAchievements}
                onChange={e => setSelfAchievements(e.target.value)}
                placeholder="Highlight your key achievements, successful tasks, project deliveries, or contributions during probation..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                Challenges and support requested:
              </label>
              <textarea
                rows={3}
                disabled={isLocked}
                value={selfChallenges}
                onChange={e => setSelfChallenges(e.target.value)}
                placeholder="Describe any challenges faced, learning curves overcome, or resources/tools you request for post-confirmation..."
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Nominate 2-3 Peer Evaluators */}
          {!isLocked && (
            <div style={{
              background: '#f8fafc', padding: '1.25rem', borderRadius: '10px',
              border: '1px solid #e2e8f0', marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                <Users size={18} style={{ color: '#0284c7' }} />
                <span>Nominate Peer Evaluators (Select 2 to 3 Colleagues)</span>
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Select colleagues who work closely with you. Your peer nominations will be verified and approved by HR.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {[0, 1, 2].map(idx => (
                  <div key={idx}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Peer {idx + 1} {idx < 2 ? <span style={{ color: '#dc2626' }}>* (Required)</span> : '(Optional 3rd)'}
                    </label>
                    <select
                      value={selfPeers[idx]}
                      onChange={e => {
                        const updated = [...selfPeers];
                        updated[idx] = e.target.value;
                        setSelfPeers(updated);
                      }}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
                    >
                      <option value="">-- Select Colleague --</option>
                      {employeesList
                        .filter(emp => emp.id !== myEval.employee_id && emp.id !== myEval.line_manager_id)
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.employee_id}) · {emp.department?.name || 'Staff'}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isLocked ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={submittingSelf}
                className="btn btn-primary"
                style={{
                  background: '#0284c7', borderColor: '#0284c7',
                  padding: '0.65rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                }}
              >
                {submittingSelf ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                <span>Submit &amp; Lock Self-Evaluation</span>
              </button>
            </div>
          ) : (
            <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '8px', color: '#15803d', fontWeight: 700, textAlign: 'center', fontSize: '0.88rem' }}>
              ✓ Self-Evaluation Submitted &amp; Locked
            </div>
          )}
        </form>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // VIEW: Active Standardized Evaluator Form (Image 2)
  // ───────────────────────────────────────────────────────────────────────────
  if (activeFormMode === 'evaluator' && activeFormItem) {
    const isLocked = activeFormItem.status === 'submitted';
    const evalTarget = activeFormItem.evaluation?.employee;
    const isManagerRole = inArrayRole(activeFormItem.evaluator_role, ['line_manager', 'gm_pd', 'hr']);

    return (
      <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
        <button
          onClick={() => setActiveFormMode(null)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', border: '1px solid #cbd5e1' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Pending Tasks</span>
        </button>

        <form onSubmit={handleSubmitEvaluator} className="card" style={{ padding: '1.5rem', border: '2px solid #0284c7' }}>
          {/* Header matching Image 2 */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Probation Evaluation Form
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Evaluator Stream: <strong>{formatRoleName(activeFormItem.evaluator_role)}</strong>
            </p>
          </div>

          {/* Info Banner */}
          <div style={{
            background: '#f8fafc', borderRadius: '10px', padding: '0.85rem 1rem',
            border: '1px solid #e2e8f0', marginBottom: '1.5rem',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.82rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Employee Name &amp; ID</span>
              <strong>{evalTarget?.full_name} ({evalTarget?.employee_id})</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Designation / Department</span>
              <strong>{evalTarget?.designation?.name} · {evalTarget?.department?.name}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Probation End Date</span>
              <strong style={{ color: '#dc2626' }}>{formatDate(activeFormItem.evaluation?.probation_end_date)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Evaluated By</span>
              <strong style={{ color: '#0369a1' }}>{activeFormItem.evaluator_name} ({formatRoleName(activeFormItem.evaluator_role)})</strong>
            </div>
          </div>

          {/* Table of 7 Performance Criteria (Image 2) */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b' }}>
                  <th style={{ padding: '0.75rem', width: '40px', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '0.75rem' }}>Criterion and assessment prompt</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '70px' }}>Weight</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '260px' }}>Rating (1–5)</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '70px' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {EVALUATOR_CRITERIA.map(c => {
                  const currentRating = evalRatings[c.id]?.rating || 4;
                  const rowMarks = Math.round((currentRating / 5) * c.weight);

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: '#0369a1' }}>
                        {c.id}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <strong style={{ display: 'block', color: '#0f172a', marginBottom: '0.15rem' }}>{c.title}</strong>
                        <span style={{ fontSize: '0.78rem', color: '#475569' }}>{c.prompt}</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                        {c.weight}%
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {[1, 2, 3, 4, 5].map(r => (
                            <button
                              key={r}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setEvalRatings(prev => ({ ...prev, [c.id]: { rating: r } }))}
                              title={RATING_SCALE.find(s => s.rating === r)?.desc}
                              style={{
                                width: '38px', height: '36px', borderRadius: '6px',
                                border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.88rem',
                                cursor: isLocked ? 'default' : 'pointer',
                                background: currentRating === r ? '#fde047' : '#fff',
                                color: currentRating === r ? '#0f172a' : '#64748b',
                                boxShadow: currentRating === r ? 'inset 0 0 0 2px #eab308' : 'none',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        {rowMarks}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Row */}
                <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                  <td colSpan={2} style={{ padding: '0.75rem', textAlign: 'right' }}>Total Weight:</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>100%</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>Raw Form Score %:</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '1.15rem', color: '#0284c7' }}>
                    {calculateEvalScore()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rating Scale Legend Reference (Image 4) */}
          <div style={{
            background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px',
            border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.78rem',
          }}>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>Rating Scale Reference:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {RATING_SCALE.map(s => (
                <div key={s.rating}>
                  <strong style={{ color: '#0f172a' }}>{s.label}:</strong> {s.desc}
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation Block for Managers & HR */}
          {isManagerRole && (
            <div style={{
              background: '#f8fafc', padding: '1.25rem', borderRadius: '10px',
              border: '1px solid #e2e8f0', marginBottom: '1.5rem',
            }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.45rem', color: '#0f172a' }}>
                Your Formal Employment Recommendation <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {[
                  { key: 'confirm', label: 'Confirm Employment' },
                  { key: 'extend', label: 'Extend Probation' },
                  { key: 'do_not_confirm', label: 'Do Not Confirm' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isLocked ? 'default' : 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      disabled={isLocked}
                      name="eval_recommendation"
                      value={opt.key}
                      checked={evalRecommendation === opt.key}
                      onChange={e => setEvalRecommendation(e.target.value)}
                    />
                    <strong>{opt.label}</strong>
                  </label>
                ))}
              </div>

              {evalRecommendation === 'extend' && (
                <div style={{ maxWidth: '280px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                    Proposed Extension End Date
                  </label>
                  <input
                    type="date"
                    disabled={isLocked}
                    value={evalProposedDate}
                    onChange={e => setEvalProposedDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* CEO Executive Final Decision Block (For CEO Eranda Ellepola / Assigned CEO) */}
          {activeFormItem.evaluator_role === 'ceo' && (
            <div style={{
              background: '#faf5ff', padding: '1.25rem', borderRadius: '10px',
              border: '2px solid #c4b5fd', marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
                <ShieldCheck size={20} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#581c87' }}>
                  CEO Executive Final Decision &amp; Sign-Off
                </span>
              </div>
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#6b21a8' }}>
                As Chief Executive Officer, please select the official confirmation determination for this employee.
              </p>

              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {[
                  { key: 'confirm', label: '✓ Confirm Employment' },
                  { key: 'extend', label: '⏳ Extend Probation' },
                  { key: 'do_not_confirm', label: '✗ Non-Confirmation (Exit Process)' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isLocked ? 'default' : 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="radio"
                      disabled={isLocked}
                      name="ceo_final_decision"
                      value={opt.key}
                      checked={evalRecommendation === opt.key}
                      onChange={e => setEvalRecommendation(e.target.value)}
                    />
                    <strong>{opt.label}</strong>
                  </label>
                ))}
              </div>

              {evalRecommendation === 'extend' && (
                <div style={{ maxWidth: '280px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                    Proposed Extension End Date
                  </label>
                  <input
                    type="date"
                    disabled={isLocked}
                    value={evalProposedDate}
                    onChange={e => setEvalProposedDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              {/* CEO Request for 10-Minute Presentation */}
              <div style={{
                marginTop: '1rem', background: '#fff', padding: '0.85rem 1rem', borderRadius: '8px',
                border: '1px solid #d8b4fe',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: isLocked ? 'default' : 'pointer', fontWeight: 700, fontSize: '0.85rem', color: '#6b21a8' }}>
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={ceoPresentation}
                    onChange={e => setCeoPresentation(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: isLocked ? 'default' : 'pointer' }}
                  />
                  <span>Request a 10-Minute Presentation</span>
                </label>
                <div style={{ fontSize: '0.74rem', color: '#7e22ce', marginTop: '0.35rem', marginLeft: '1.8rem' }}>
                  Note: Allocates no additional marks. HR will arrange a schedule with the executive panel where approved.
                </div>

                {ceoPresentation && (
                  <div style={{ marginTop: '0.65rem', marginLeft: '1.8rem' }}>
                    <input
                      type="text"
                      disabled={isLocked}
                      placeholder="Focus topics, key project review, or presentation instructions for HR to schedule..."
                      value={ceoPresentationNotes}
                      onChange={e => setCeoPresentationNotes(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '0.8rem' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Qualitative General Comments */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
              Evaluator Feedback &amp; Performance Comments:
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={evalComments}
              onChange={e => setEvalComments(e.target.value)}
              placeholder="Provide constructive feedback, key strengths observed, or areas requiring development..."
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
            />
          </div>

          {/* Actions */}
          {!isLocked ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={submittingEval}
                className="btn btn-primary"
                style={{
                  background: activeFormItem.evaluator_role === 'ceo' ? '#7c3aed' : '#0284c7',
                  borderColor: activeFormItem.evaluator_role === 'ceo' ? '#7c3aed' : '#0284c7',
                  padding: '0.65rem 1.75rem', fontWeight: 700, fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                }}
              >
                {submittingEval ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : activeFormItem.evaluator_role === 'ceo' ? (
                  <ShieldCheck size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>
                  {activeFormItem.evaluator_role === 'ceo'
                    ? 'Submit Evaluation & Apply CEO Final Decision'
                    : 'Submit & Lock Evaluation'}
                </span>
              </button>
            </div>
          ) : (
            <div style={{ padding: '0.75rem', background: '#dcfce7', borderRadius: '8px', color: '#15803d', fontWeight: 700, textAlign: 'center', fontSize: '0.88rem' }}>
              ✓ Evaluation Form Submitted &amp; Locked
            </div>
          )}
        </form>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // DEFAULT VIEW: Portal Probation Hub
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0.5rem' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
          {/* <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={20} />
          </div> */}
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Probation Evaluations
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Manage your own probation evaluation or complete assigned evaluation forms for your team members and colleagues.
        </p>
      </div>

      {/* SECTION 1: MY OWN PROBATION EVALUATION (IF ON PROBATION) */}
      {myEval && (
        <div className="card" style={{
          padding: '1.5rem', marginBottom: '1.75rem',
          border: '2px solid #0284c7', background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#0369a1', letterSpacing: '0.04em' }}>
                Your Employment Confirmation
              </span>
              <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Probation Evaluation
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                Probation End Date: <strong>{formatDate(myEval.probation_end_date)}</strong> &nbsp;|&nbsp; Deadline: <strong>{formatDate(myEval.submission_deadline)}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{
                padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800,
                background: myEval.status === 'completed' ? '#dcfce7' : '#fef3c7',
                color: myEval.status === 'completed' ? '#15803d' : '#b45309',
              }}>
                {myEval.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #bae6fd', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            {myEval.self_score === null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontSize: '0.82rem', fontWeight: 600 }}>
                <Clock size={16} />
                <span>Your Self-Evaluation and Peer Nomination is pending submission.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontSize: '0.82rem', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>Self-Evaluation submitted (Score: {myEval.self_score * 10}/100).</span>
              </div>
            )}

            <button
              onClick={handleOpenSelf}
              className="btn btn-primary"
              style={{
                background: '#0284c7', borderColor: '#0284c7',
                padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <FileText size={16} />
              <span>{myEval.self_score === null ? 'Fill Self-Evaluation Form →' : 'View Submitted Self-Evaluation'}</span>
            </button>
          </div>

          {/* Executive Presentation Requested by CEO */}
          {myEval.presentation_requested && (
            <div style={{
              marginTop: '1.25rem', padding: '0.85rem 1rem', borderRadius: '8px',
              background: '#faf5ff', border: '1px solid #d8b4fe',
            }}>
              <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={16} />
                <span>Executive 10-Minute Presentation Requested by CEO</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b21a8', marginTop: '0.25rem' }}>
                {myEval.presentation_scheduled_at ? (
                  <span>Scheduled Date &amp; Time: <strong>{formatDateTime(myEval.presentation_scheduled_at)}</strong></span>
                ) : (
                  <span>HR is coordinating the panel schedule. You will be notified once the date and time are confirmed.</span>
                )}
              </div>
              {myEval.presentation_notes && (
                <div style={{ fontSize: '0.76rem', color: '#4c1d95', marginTop: '0.2rem' }}>
                  CEO Instructions / Focus: {myEval.presentation_notes}
                </div>
              )}
            </div>
          )}

          {/* If Completed by CEO, show transparent results ("nothing to hide") */}
          {myEval.status === 'completed' && (
            <div style={{
              marginTop: '1.25rem', padding: '1rem', borderRadius: '8px', background: '#fff',
              border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
            }}>
              <div>
                <strong style={{ fontSize: '0.95rem', color: '#15803d' }}>
                  Outcome: {myEval.ceo_decision?.toUpperCase()}
                </strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Final Score: <strong>{myEval.final_score} / 100</strong> (Pass mark: 80)
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700 }}>
                  ✓ Decision Approved by CEO
                </span>
                {myEval.ceo_approved_at && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {formatDateTime(myEval.ceo_approved_at)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION: CEO EXECUTIVE FINAL APPROVALS (Visible to CEO Eranda Ellepola) */}
      {ceoDecisions.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
            color: '#fff', padding: '1.25rem 1.5rem', borderRadius: '12px',
            marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  CEO Executive Approvals Required ({ceoDecisions.length})
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                  All 270° multi-party evaluations are submitted. Please render the final executive employment confirmation decision.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ceoDecisions.map(ev => {
              const emp = ev.employee || {};

              return (
                <div key={ev.id} className="card" style={{ padding: '1.25rem', border: '2px solid #c4b5fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#7c3aed' }}>
                        Ready for CEO Final Sign-Off
                      </span>
                      <h4 style={{ margin: '0.2rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        {emp.full_name} ({emp.employee_id})
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {emp.designation?.name || 'Staff'} · {emp.department?.name || 'Department'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Final Weighted Score</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: ev.final_score >= 80 ? '#15803d' : '#dc2626' }}>
                        {ev.final_score} / 100
                      </div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: ev.threshold_met ? '#15803d' : '#dc2626' }}>
                        {ev.threshold_met ? '✓ Threshold Met (≥ 80)' : '✗ Below Threshold (< 80)'}
                      </span>
                    </div>
                  </div>

                  {/* Summary of Recommendations */}
                  <div style={{
                    marginTop: '1rem', padding: '0.75rem 1rem', background: '#f5f3ff', borderRadius: '8px',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.78rem',
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>Line Manager</span>
                      <strong>{ev.line_manager_recommendation ? `✓ ${ev.line_manager_recommendation.toUpperCase()}` : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>General Manager</span>
                      <strong>{ev.gm_recommendation ? `✓ ${ev.gm_recommendation.toUpperCase()}` : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.68rem' }}>HR Recommendation</span>
                      <strong>{ev.hr_recommendation ? `✓ ${ev.hr_recommendation.toUpperCase()}` : '—'}</strong>
                    </div>
                  </div>

                  {/* Sign-off Form */}
                  <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a' }}>
                        Executive Decision:
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                          { key: 'confirm', label: '✓ Confirm Employment' },
                          { key: 'extend', label: '⏳ Extend Probation' },
                          { key: 'do_not_confirm', label: '✗ Non-Confirmation (Exit)' },
                        ].map(opt => (
                          <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input
                              type="radio"
                              name={`ceo_dec_${ev.id}`}
                              value={opt.key}
                              checked={ceoDecisionChoice === opt.key}
                              onChange={() => setCeoDecisionChoice(opt.key)}
                            />
                            <strong>{opt.label}</strong>
                          </label>
                        ))}
                      </div>
                    </div>

                    {ceoDecisionChoice === 'extend' && (
                      <div style={{ marginBottom: '0.85rem', maxWidth: '280px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Proposed Extension End Date:
                        </label>
                        <input
                          type="date"
                          value={ceoExtensionDate}
                          onChange={e => setCeoExtensionDate(e.target.value)}
                          style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                        />
                      </div>
                    )}

                    <div style={{ marginBottom: '0.85rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        CEO Remarks / Directives (Optional):
                      </label>
                      <input
                        type="text"
                        value={ceoDecisionNotes}
                        onChange={e => setCeoDecisionNotes(e.target.value)}
                        placeholder="Enter any directives or performance observations..."
                        style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div style={{
                      background: '#faf5ff', padding: '0.75rem 1rem', borderRadius: '8px',
                      border: '1px solid #e9d5ff', marginBottom: '0.85rem',
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#6b21a8' }}>
                        <input
                          type="checkbox"
                          checked={ceoDecisionPresentation}
                          onChange={e => setCeoDecisionPresentation(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span>Request a 10-Minute Presentation to Management Panel</span>
                      </label>
                      <div style={{ fontSize: '0.73rem', color: '#7e22ce', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                        Note: HR will coordinate and schedule the panel presentation session.
                      </div>
                      {ceoDecisionPresentation && (
                        <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                          <input
                            type="text"
                            value={ceoDecisionPresentationNotes}
                            onChange={e => setCeoDecisionPresentationNotes(e.target.value)}
                            placeholder="Presentation focus, required topics, or instructions for HR..."
                            style={{ width: '100%', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #d8b4fe', fontSize: '0.78rem' }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleSubmitPortalCeoDecision(ev.id)}
                        disabled={submittingPortalCeo}
                        className="btn btn-primary"
                        style={{
                          background: '#7c3aed', borderColor: '#7c3aed',
                          padding: '0.55rem 1.5rem', fontWeight: 800, fontSize: '0.85rem',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                        }}
                      >
                        {submittingPortalCeo ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={16} />}
                        <span>{submittingPortalCeo ? 'Signing...' : 'Sign & Apply CEO Final Decision'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: PENDING EVALUATIONS ASSIGNED TO ME TO RATE OTHERS */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={18} style={{ color: '#f59e0b' }} />
          <span>Pending Evaluation Tasks ({pendingForms.length})</span>
        </h3>

        {pendingForms.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            You have no pending probation evaluation forms assigned to you.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {pendingForms.map(item => {
              const target = item.evaluation?.employee;

              return (
                <div key={item.id} className="card" style={{ padding: '1.25rem', borderLeft: '0px solid #0284c7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Role: {formatRoleName(item.evaluator_role)}
                      </div>
                      <h4 style={{ margin: '0.2rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        {target?.full_name}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {target?.employee_id} · {target?.designation?.name || 'Staff'}
                      </div>
                    </div>

                    <span style={{
                      padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                      background: '#fef3c7', color: '#b45309',
                    }}>
                      Pending Your Review
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Deadline: <strong>{formatDate(item.evaluation?.submission_deadline)}</strong>
                  </div>

                  <button
                    onClick={() => handleOpenEvaluatorForm(item)}
                    className="btn btn-primary"
                    style={{
                      width: '100%', background: '#0284c7', borderColor: '#0284c7',
                      padding: '0.55rem', fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    }}
                  >
                    <span>Complete Evaluation Form</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: COMPLETED EVALUATION FORMS */}
      {completedForms.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
            <span>Completed Evaluations ({completedForms.length})</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {completedForms.map(item => (
              <div key={item.id} className="card" style={{ padding: '1rem', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{item.evaluation?.employee?.full_name}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Evaluated as {formatRoleName(item.evaluator_role)} · {formatDateTime(item.submitted_at)}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                    Submitted ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function formatRoleName(role) {
  const map = {
    self: 'Self-Evaluation',
    line_manager: 'Line Manager',
    gm_pd: 'General Manager / Project Director',
    ceo: 'Chief Executive Officer',
    peer: 'Peer Evaluator',
    hr: 'HR Admin',
  };
  return map[role] || role;
}

function inArrayRole(val, arr) {
  return arr.includes(val);
}

export default PortalProbation;
