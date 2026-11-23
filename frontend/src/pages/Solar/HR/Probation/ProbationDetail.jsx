import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserCheck, ArrowLeft, Printer, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, AlertTriangle, Users, Award, Calendar, ExternalLink,
  Loader2, ThumbsUp, ThumbsDown, HelpCircle, FileText, X, Edit3
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
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

const RATING_SCALE = [
  { rating: 5, label: '5 - Outstanding', desc: 'Consistently performs significantly above expectations.' },
  { rating: 4, label: '4 - Exceeds Expectations', desc: 'Frequently performs above required standards.' },
  { rating: 3, label: '3 - Meets Expectations', desc: 'Consistently meets the expected job requirements.' },
  { rating: 2, label: '2 - Needs Improvement', desc: 'Partially meets requirements; noticeable improvement needed.' },
  { rating: 1, label: '1 - Unsatisfactory', desc: 'Fails to meet essential performance requirements.' },
];

export const ProbationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  const isHrAdmin    = isSuperAdmin || user?.role === 'solar_hr_admin' || user?.roles?.includes('solar_hr_admin');

  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState(null);

  const isCeo = (evaluation?.ceo_user_id && evaluation.ceo_user_id === user?.id) || (user?.email && user.email.toLowerCase() === 'eranda@circlegroup.lk');
  const isFinalized = !!(evaluation?.ceo_decision || evaluation?.status === 'completed');

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

  // Peer Approval / Edit state
  const [approvingPeers, setApprovingPeers] = useState(false);
  const [isEditingPeers, setIsEditingPeers] = useState(false);
  const [editPeerIds, setEditPeerIds] = useState(['', '', '']);
  const [savingPeers, setSavingPeers] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);

  // HR Evaluation Marks Form Modal state
  const [hrMarksModalOpen, setHrMarksModalOpen] = useState(false);
  const [hrRatings, setHrRatings] = useState({
    1: { rating: 4, comments: '' },
    2: { rating: 4, comments: '' },
    3: { rating: 4, comments: '' },
    4: { rating: 4, comments: '' },
    5: { rating: 4, comments: '' },
    6: { rating: 4, comments: '' },
    7: { rating: 4, comments: '' },
  });
  const [hrComments, setHrComments] = useState('');
  const [hrRecommendation, setHrRecommendation] = useState('confirm');
  const [hrExtensionDate, setHrExtensionDate] = useState('');
  const [submittingHrMarks, setSubmittingHrMarks] = useState(false);

  const handleOpenHrMarksModal = () => {
    if (isFinalized) {
      toast.error('This evaluation dossier has been finalized by CEO final decision and cannot be edited.');
      return;
    }
    const hrObj = (evaluation?.forms || []).find(f => f.evaluator_role === 'hr');
    if (hrObj && hrObj.ratings && Object.keys(hrObj.ratings).length > 0) {
      setHrRatings(hrObj.ratings);
    }
    if (hrObj?.general_comments) {
      setHrComments(hrObj.general_comments);
    }
    if (hrObj?.recommendation) {
      setHrRecommendation(hrObj.recommendation);
    }
    if (hrObj?.proposed_extension_date) {
      setHrExtensionDate(hrObj.proposed_extension_date.split('T')[0]);
    }
    setHrMarksModalOpen(true);
  };

  const handleRatingChange = (critId, rating) => {
    setHrRatings(prev => ({
      ...prev,
      [critId]: { ...(prev[critId] || {}), rating },
    }));
  };

  const handleCommentChange = (critId, comments) => {
    setHrRatings(prev => ({
      ...prev,
      [critId]: { ...(prev[critId] || {}), comments },
    }));
  };

  const calculateHrScore = () => {
    let total = 0;
    EVALUATOR_CRITERIA.forEach(c => {
      const r = hrRatings[c.id]?.rating || 0;
      total += (c.weight * r) / 5;
    });
    return Math.round(total * 100) / 100;
  };

  const handleSubmitHrMarks = async (e) => {
    e.preventDefault();
    if (isFinalized) {
      toast.error('This evaluation dossier has been finalized by CEO final decision and cannot be edited.');
      return;
    }
    const hrObj = (evaluation?.forms || []).find(f => f.evaluator_role === 'hr');
    if (!hrObj) {
      toast.error('HR evaluator form not found for this dossier.');
      return;
    }

    setSubmittingHrMarks(true);
    try {
      await api.post(`/hr/probation/forms/${hrObj.id}/submit`, {
        ratings: hrRatings,
        recommendation: hrRecommendation,
        proposed_extension_date: hrExtensionDate || null,
        general_comments: hrComments,
      });

      toast.success('HR Evaluation Marks (10%) submitted successfully!');
      setHrMarksModalOpen(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit HR marks.');
    } finally {
      setSubmittingHrMarks(false);
    }
  };

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

  useEffect(() => {
    if (isHrAdmin) {
      api.get('/hr/employees')
        .then(res => {
          const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          // Include all active and probation employees; exclude only resigned and terminated
          const eligible = raw.filter(e => e.status !== 'resigned' && e.status !== 'terminated');
          setEmployeesList(eligible);
        })
        .catch(() => {});
    }
  }, [isHrAdmin]);

  const handleStartEditPeers = () => {
    const peerForms = (evaluation?.forms || []).filter(f => f.evaluator_role === 'peer');
    const sorted = [...peerForms].sort((a, b) => (a.peer_index || 0) - (b.peer_index || 0));
    const existing = sorted.map(f => String(f.evaluator_employee_id || f.evaluator_employee?.id || ''));
    while (existing.length < 3) {
      existing.push('');
    }
    setEditPeerIds([existing[0] || '', existing[1] || '', existing[2] || '']);
    setIsEditingPeers(true);
  };

  const handleSavePeers = async () => {
    const valid = editPeerIds.filter(Boolean);
    if (valid.length < 2) {
      toast.error('Please select at least 2 peer evaluators.');
      return;
    }
    const unique = [...new Set(valid)];
    if (unique.length !== valid.length) {
      toast.error('Please select distinct colleagues for each peer nomination.');
      return;
    }

    setSavingPeers(true);
    try {
      await api.patch(`/hr/probation/evaluations/${id}/peers`, {
        peer_employee_ids: unique.map(Number),
      });
      toast.success('Peer evaluators updated and approved successfully!');
      setIsEditingPeers(false);
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update peer evaluators.');
    } finally {
      setSavingPeers(false);
    }
  };

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
    <div style={{ padding: '0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
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
              background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: '1.3rem',
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
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
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
              <strong>{formatDate(emp.joined_date)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Initiated</span>
              <strong>{formatDate(evaluation.initiation_date)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Deadline</span>
              <strong style={{ color: '#0284c7' }}>{formatDate(evaluation.submission_deadline)}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Probation End</span>
              <strong style={{ color: '#dc2626' }}>{formatDate(evaluation.probation_end_date)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Peer Verification & 10-Minute Presentation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Peer Evaluators Approval Block */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem' }}>
              <Users size={17} style={{ color: '#0284c7' }} />
              <span>Peer Evaluators (2–3 Employees)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {pendingPeersApproval && isHrAdmin && !isFinalized && !isEditingPeers && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  Pending HR Approval
                </span>
              )}
              {isHrAdmin && !isFinalized && (
                <button
                  type="button"
                  onClick={() => {
                    if (isEditingPeers) {
                      setIsEditingPeers(false);
                    } else {
                      handleStartEditPeers();
                    }
                  }}
                  className="btn btn-ghost"
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: isEditingPeers ? '#64748b' : '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: '1px solid #e0f2fe',
                    background: isEditingPeers ? '#f1f5f9' : '#f0f9ff'
                  }}
                >
                  <Edit3 size={13} />
                  <span>{isEditingPeers ? 'Cancel' : 'Edit Peers'}</span>
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 0.85rem' }}>
            Nominated by the probationary employee during self-evaluation, subject to HR verification and adjustments.
          </p>

          {isEditingPeers ? (() => {
            // Build comprehensive colleague list that always includes current nominated peers
            const combinedList = [...employeesList];
            (evaluation?.forms || []).forEach(f => {
              if (f.evaluator_role === 'peer' && f.evaluator_employee_id) {
                if (!combinedList.some(e => String(e.id) === String(f.evaluator_employee_id))) {
                  combinedList.push({
                    id: f.evaluator_employee_id,
                    full_name: f.evaluator_name || 'Staff Member',
                    employee_id: f.evaluator_employee?.employee_id || '',
                    department: f.evaluator_employee?.department,
                    designation: f.evaluator_employee?.designation,
                  });
                }
              }
            });
            const selectableColleagues = combinedList
              .filter(emp => String(emp.id) !== String(evaluation?.employee_id) && String(emp.id) !== String(evaluation?.line_manager_id))
              .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', background: '#f0f9ff', borderRadius: '6px', fontSize: '0.76rem', color: '#0369a1', border: '1px solid #bae6fd' }}>
                  ℹ️ Select 2 to 3 peer evaluators. The probationary employee and reporting line manager are excluded.
                </div>

                {[0, 1, 2].map(idx => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.3rem', color: '#1e293b' }}>
                      Peer {idx + 1} {idx < 2 ? <span style={{ color: '#dc2626' }}>* (Required)</span> : <span style={{ color: 'var(--text-muted)' }}>(Optional 3rd)</span>}
                    </label>
                    <select
                      value={String(editPeerIds[idx] || '')}
                      onChange={e => {
                        const updated = [...editPeerIds];
                        updated[idx] = e.target.value;
                        setEditPeerIds(updated);
                      }}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
                    >
                      <option value="">-- Select Colleague --</option>
                      {selectableColleagues.map(emp => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.full_name} {emp.employee_id ? `(${emp.employee_id})` : ''} · {emp.designation?.title || emp.department?.name || 'Staff'}{emp.status === 'probation' ? ' · [Probation]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingPeers(false)}
                    className="btn btn-ghost"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePeers}
                    disabled={savingPeers}
                    className="btn btn-primary"
                    style={{
                      background: '#0284c7', borderColor: '#0284c7',
                      padding: '0.45rem 1.25rem', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                    }}
                  >
                    {savingPeers ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={14} />}
                    <span>{savingPeers ? 'Saving...' : 'Save & Approve Peers'}</span>
                  </button>
                </div>
              </div>
            );
          })() : peerForms.length === 0 ? (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 0.5rem' }}>Awaiting employee's self-evaluation to nominate 2–3 peers.</p>
              {isHrAdmin && !isFinalized && (
                <button
                  type="button"
                  onClick={handleStartEditPeers}
                  className="btn btn-outline"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', color: '#0284c7', borderColor: '#0284c7' }}
                >
                  + Nominate / Assign Peers Manually
                </button>
              )}
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

              {isHrAdmin && !isFinalized && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {pendingPeersApproval && (
                    <button
                      type="button"
                      onClick={handleApprovePeers}
                      disabled={approvingPeers}
                      className="btn btn-primary"
                      style={{
                        flex: 1, background: '#0284c7', borderColor: '#0284c7',
                        padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      {approvingPeers ? 'Approving...' : 'Approve Nominated Peers'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleStartEditPeers}
                    className="btn btn-outline"
                    style={{
                      flex: pendingPeersApproval ? undefined : 1,
                      padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                      color: '#0284c7', borderColor: '#0284c7'
                    }}
                  >
                    Edit / Change Peers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 10-Minute Presentation Request */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.75rem' }}>
            <Award size={17} style={{ color: '#7c3aed' }} />
            <span>10-Minute Management Presentation (Requested by CEO)</span>
          </div>

          {!evaluation.presentation_requested ? (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No presentation requested by Chief Executive Officer. (Allocates no additional marks).
            </div>
          ) : (
            <div>
              <div style={{
                padding: '0.75rem', borderRadius: '8px', background: '#faf5ff',
                border: '1px solid #e9d5ff', marginBottom: '0.85rem', fontSize: '0.8rem',
              }}>
                <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '0.2rem' }}>
                  ✓ Presentation Requested by CEO ({evaluation.ceo_user?.name || 'Eranda Ellepola'})
                </div>
                {evaluation.presentation_scheduled_at && (
                  <div style={{ color: '#0369a1', fontWeight: 600, fontSize: '0.78rem', marginTop: '0.25rem' }}>
                    Scheduled: {formatDateTime(evaluation.presentation_scheduled_at)}
                  </div>
                )}
                {evaluation.presentation_notes && (
                  <div style={{ color: '#581c87', fontSize: '0.76rem', marginTop: '0.2rem' }}>
                    CEO Directive / Topic: {evaluation.presentation_notes}
                  </div>
                )}
              </div>

              {isHrAdmin && !isFinalized && (
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
          fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.2px',
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

              {/* 2. Individual Peer Evaluations */}
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

              {/* 3. Line Manager */}
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

              {/* 4. General Manager / Project Director */}
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

              {/* 5. CEO */}
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

              {/* 6. HR */}
              <tr style={{ borderBottom: '2px solid #cbd5e1' }}>
                <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>HR</td>
                <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center', color: '#0369a1', fontWeight: 700 }}>
                  {hrFormObj?.status === 'submitted' ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 800 }}>{hrFormObj.form_score}</span>
                      {isHrAdmin && !isFinalized && (
                        <button
                          type="button"
                          onClick={handleOpenHrMarksModal}
                          style={{
                            background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer',
                            fontSize: '0.72rem', textDecoration: 'underline', padding: 0,
                          }}
                        >
                          (Edit)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <span style={{ color: '#d97706', fontWeight: 600 }}>⏳ Pending</span>
                      {isHrAdmin && !isFinalized && (
                        <button
                          type="button"
                          onClick={handleOpenHrMarksModal}
                          className="btn btn-primary"
                          style={{
                            background: '#0284c7', borderColor: '#0284c7',
                            padding: '0.25rem 0.65rem', fontSize: '0.74rem', fontWeight: 700,
                            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          }}
                        >
                          <Award size={13} />
                          <span>Enter HR Marks</span>
                        </button>
                      )}
                    </div>
                  )}
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
              {evaluation.hr_reviewed_at && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Reviewed on {formatDateTime(evaluation.hr_reviewed_at)}
                </div>
              )}
            </div>
          </div>

          {evaluation.proposed_extension_date && (
            <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              <strong>Where applicable, proposed extension end date:</strong> {formatDate(evaluation.proposed_extension_date)}
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

          {/* Notice if HR 10% Evaluation Marks are still pending */}
          {isHrAdmin && hrFormObj?.status !== 'submitted' && !isFinalized && (
            <div style={{
              padding: '0.85rem 1rem', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#b45309', fontSize: '0.84rem', fontWeight: 600 }}>
                <AlertCircle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                <span>
                  <strong>HR Evaluation Marks Pending (10% Weight):</strong> Please rate the 7 standardized performance criteria to calculate HR's score.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenHrMarksModal}
                className="btn btn-primary"
                style={{ background: '#d97706', borderColor: '#d97706', padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Award size={14} />
                <span>Enter HR Marks</span>
              </button>
            </div>
          )}

          {/* HR Review Form (Active if HR hasn't finalized yet) */}
          {isHrAdmin && !evaluation.hr_recommendation && !isFinalized && (
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
                  {evaluation.ceo_decision === 'extend' && `⏳ Extend Probation (New Date: ${formatDate(evaluation.proposed_extension_date) || 'Pending'})`}
                  {evaluation.ceo_decision === 'do_not_confirm' && '✗ Non-confirmation (subject to legal/HR process)'}
                </div>
                {evaluation.ceo_notes && (
                  <div style={{ marginBottom: '0.5rem', color: '#334155' }}>
                    <strong>CEO Remarks:</strong> {evaluation.ceo_notes}
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Approved by CEO: <strong>{evaluation.ceo_approver?.name || 'Eranda Ellepola'}</strong> on {formatDateTime(evaluation.ceo_approved_at)}
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
              <div style={{
                padding: '1rem 1.25rem', borderRadius: '8px', background: '#faf5ff',
                border: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}>
                <ShieldCheck size={24} style={{ color: '#7c3aed', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#581c87' }}>
                    Awaiting Executive Review &amp; Sign-Off
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6b21a8', marginTop: '0.2rem' }}>
                    The final confirmation decision must be signed off by Chief Executive Officer (<strong>{evaluation.ceo_user?.name || 'Eranda Ellepola'}</strong>) via the CEO Employee Portal.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODAL: HR EVALUATION MARKS FORM (10% WEIGHT, 7 CRITERIA)            */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {hrMarksModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '920px', width: '100%',
            maxHeight: '92vh', overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0',
          }}>
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                    HR Performance Evaluation (10% Weight)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#ffffff' }}>
                    Employee: {emp.full_name} ({emp.employee_id}) · {emp.designation?.name || 'Staff'} · {emp.department?.name || 'Department'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHrMarksModalOpen(false)}
                disabled={submittingHrMarks}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.9, padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitHrMarks} style={{ padding: '1.5rem' }}>
              <div style={{
                background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px',
                border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#334155',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
              }}>
                <span>Rate all 7 criteria using the 1–5 scale. Marks are computed automatically: <code>(Weight × Rating) ÷ 5</code>.</span>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>Passing mark threshold: 80 / 100</span>
              </div>

              {/* Table of 7 Criteria */}
              <div style={{ overflowX: 'auto', marginBottom: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#1e293b' }}>
                      <th style={{ padding: '0.65rem 0.85rem', width: '40px', textAlign: 'center' }}>No.</th>
                      <th style={{ padding: '0.65rem 0.85rem' }}>Criterion and Performance Prompt</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '70px', textAlign: 'center' }}>Weight</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '220px', textAlign: 'center' }}>Rating (1–5)</th>
                      <th style={{ padding: '0.65rem 0.85rem', width: '80px', textAlign: 'center' }}>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EVALUATOR_CRITERIA.map(crit => {
                      const curRating = hrRatings[crit.id]?.rating || 0;
                      const curComments = hrRatings[crit.id]?.comments || '';
                      const rowMarks = curRating ? ((crit.weight * curRating) / 5).toFixed(0) : '0';

                      return (
                        <tr key={crit.id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                          <td style={{ padding: '0.85rem 0.85rem', fontWeight: 700, color: '#0284c7', textAlign: 'center' }}>
                            {crit.id}
                          </td>
                          <td style={{ padding: '0.85rem 0.85rem' }}>
                            <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.86rem', marginBottom: '0.2rem' }}>
                              {crit.title}
                            </strong>
                            <p style={{ margin: '0 0 0.5rem', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
                              {crit.prompt}
                            </p>
                            <input
                              type="text"
                              placeholder="Evaluator comments / evidence on this criterion (optional)..."
                              value={curComments}
                              onChange={e => handleCommentChange(crit.id, e.target.value)}
                              style={{
                                width: '100%', padding: '0.35rem 0.6rem', borderRadius: '6px',
                                border: '1px solid #cbd5e1', fontSize: '0.76rem',
                              }}
                            />
                          </td>
                          <td style={{ padding: '0.85rem 0.85rem', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                            {crit.weight}%
                          </td>
                          <td style={{ padding: '0.85rem 0.85rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                              {[1, 2, 3, 4, 5].map(val => {
                                const selected = curRating === val;
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleRatingChange(crit.id, val)}
                                    title={`Rate ${val}/5`}
                                    style={{
                                      width: '34px', height: '34px', borderRadius: '6px',
                                      border: selected ? '2px solid #ca8a04' : '1px solid #cbd5e1',
                                      background: selected ? '#fef08a' : '#fff',
                                      color: selected ? '#854d0e' : '#334155',
                                      fontWeight: selected ? 800 : 500,
                                      cursor: 'pointer', transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 0.85rem', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                            {rowMarks}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Total Score Calculation Card */}
              <div style={{
                background: '#f8fafc', padding: '1rem', borderRadius: '10px',
                border: '1px solid #e2e8f0', marginBottom: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    HR Form Result
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>
                    {calculateHrScore()} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    HR Weighted Score (10% Weight)
                  </span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
                    {(calculateHrScore() * 0.10).toFixed(2)} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 10 Marks</span>
                  </div>
                </div>
              </div>

              {/* Recommendation & General Comments */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    HR Recommendation <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={hrRecommendation}
                    onChange={e => setHrRecommendation(e.target.value)}
                    required
                    style={{
                      width: '100%', padding: '0.5rem', borderRadius: '6px',
                      border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff',
                    }}
                  >
                    <option value="confirm">✓ Confirm Employment</option>
                    <option value="extend">⏳ Extend Probation Period</option>
                    <option value="do_not_confirm">✗ Do Not Confirm (Non-Confirmation)</option>
                  </select>
                </div>

                {hrRecommendation === 'extend' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Proposed Extension End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={hrExtensionDate}
                      onChange={e => setHrExtensionDate(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  General Evaluator Feedback &amp; Justification Notes
                </label>
                <textarea
                  rows={3}
                  value={hrComments}
                  onChange={e => setHrComments(e.target.value)}
                  placeholder="Enter overall HR evaluation observations, conduct remarks, and justification..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setHrMarksModalOpen(false)}
                  disabled={submittingHrMarks}
                  className="btn btn-ghost"
                  style={{ border: '1px solid #cbd5e1', padding: '0.55rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHrMarks}
                  className="btn btn-primary"
                  style={{
                    background: '#0284c7', borderColor: '#0284c7',
                    padding: '0.55rem 1.5rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  {submittingHrMarks ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Award size={16} />}
                  <span>{submittingHrMarks ? 'Saving Marks...' : 'Submit & Lock HR Marks'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProbationDetail;
