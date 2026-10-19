import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Target, Award, CheckCircle, Clock, AlertTriangle, Loader2,
  Calendar, FileText, Check, ChevronRight, X, TrendingUp,
  Percent, ShieldAlert, Sparkles, Send, Edit3, UserCheck, AlertCircle, Printer
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';
import PrintableScorecardModal from '../Appraisals/PrintableScorecardModal';

const GRADE_CONFIG = {
  S1: { label: 'S1 · Outstanding', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', pay: '116% - 120%' },
  S2: { label: 'S2 · Excellent',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981', pay: '110% - 115%' },
  A1: { label: 'A1 · Meets Expectations', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: '#0ea5e9', pay: '95% - 109%' },
  A2: { label: 'A2 · Needs Improvement',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', pay: '80% - 94%' },
  C:  { label: 'C · Unacceptable',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', pay: '0%' },
};

const STATUS_LABELS = {
  draft:                { label: 'Goal Setting',         color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  objectives_confirmed: { label: 'Objectives Confirmed', color: '#0284c7', bg: 'rgba(2,132,199,0.1)' },
  self_submitted:       { label: 'Employee Submitted',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  manager_evaluated:    { label: 'Manager Evaluated',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  hr_reviewed:          { label: 'HR Reviewed',          color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  approved:             { label: 'Official Approved',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  revision_requested:   { label: 'Revision Requested',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const PortalAppraisal = () => {
  const user = useAuthStore(s => s.user);
  const isDirector = isLeaveApprovalManager(user);
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: 'my' | 'team' | 'director'
  const initialTab = searchParams.get('tab') || 'my';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [myAppraisal, setMyAppraisal] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Team state (for Line Managers)
  const [teamAppraisals, setTeamAppraisals] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Director state (for Hasintha & Eranda)
  const [directorStats, setDirectorStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [directorLoading, setDirectorLoading] = useState(false);

  // Modal: Printable Official Scorecard
  const [scorecardAppraisalId, setScorecardAppraisalId] = useState(null);
  const [scorecardAppraisalData, setScorecardAppraisalData] = useState(null);
  const [scorecardOpen, setScorecardOpen] = useState(false);

  // Modals
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState([]);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [targetAppraisalId, setTargetAppraisalId] = useState(null);

  const [selfSubmitOpen, setSelfSubmitOpen] = useState(false);
  const [selfAchievements, setSelfAchievements] = useState([]);
  const [employeeComments, setEmployeeComments] = useState('');
  const [selfSubmitting, setSelfSubmitting] = useState(false);

  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalAppraisal, setEvalAppraisal] = useState(null);
  const [evalScores, setEvalScores] = useState({});
  const [evalComments, setEvalComments] = useState('');
  const [evalGrade, setEvalGrade] = useState('A1');
  const [evalSubmitting, setEvalSubmitting] = useState(false);

  const [directorModalOpen, setDirectorModalOpen] = useState(false);
  const [selectedForDirector, setSelectedForDirector] = useState(null);
  const [directorRemarks, setDirectorRemarks] = useState('');
  const [overrideGrade, setOverrideGrade] = useState('');
  const [directorSubmitting, setDirectorSubmitting] = useState(false);

  // ── Fetch Personal Appraisals ──
  const fetchMyData = useCallback(async () => {
    setLoading(true);
    try {
      const [currRes, histRes] = await Promise.all([
        api.get('/hr/appraisals/current', { params: { month: currentMonth } }),
        api.get('/hr/appraisals/my')
      ]);
      setMyAppraisal(currRes.data);
      setHistory(histRes.data || []);
    } catch {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  // ── Fetch Team Appraisals ──
  const fetchTeamData = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await api.get('/hr/appraisals/team', { params: { month: currentMonth } });
      setTeamAppraisals(res.data || []);
    } catch {
      toast.error('Failed to load team appraisals');
    } finally {
      setTeamLoading(false);
    }
  }, [currentMonth]);

  // ── Fetch Director Data ──
  const fetchDirectorData = useCallback(async () => {
    if (!isDirector) return;
    setDirectorLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        api.get('/hr/appraisals/stats', { params: { month: currentMonth } }),
        api.get('/hr/appraisals/team', { params: { month: currentMonth } })
      ]);
      setDirectorStats(statsRes.data);
      const readyForDirector = (listRes.data || []).filter(a => 
        a.status === 'hr_reviewed' || a.status === 'manager_evaluated'
      );
      setPendingApprovals(readyForDirector);
    } catch {
      toast.error('Failed to load executive review data');
    } finally {
      setDirectorLoading(false);
    }
  }, [currentMonth, isDirector]);

  useEffect(() => {
    fetchMyData();
    if (activeTab === 'team') fetchTeamData();
    if (activeTab === 'director') fetchDirectorData();
  }, [fetchMyData, fetchTeamData, fetchDirectorData, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ── Open Goals Modal ──
  const openGoalsModal = (appraisal) => {
    setTargetAppraisalId(appraisal.id);
    const existing = (appraisal.objectives || []).map(o => ({
      title: o.title || '',
      description: o.description || '',
      weight: o.weight || 0,
      deadline: o.deadline ? o.deadline.split('T')[0] : '',
      target_kpi: o.target_kpi || '',
      status: o.status || 'in_progress'
    }));

    // If empty, provide 3 default rows
    if (existing.length === 0) {
      setGoalForm([
        { title: '', description: '', weight: 40, deadline: '', target_kpi: '', status: 'in_progress' },
        { title: '', description: '', weight: 30, deadline: '', target_kpi: '', status: 'in_progress' },
        { title: '', description: '', weight: 30, deadline: '', target_kpi: '', status: 'in_progress' },
      ]);
    } else {
      setGoalForm(existing);
    }
    setGoalModalOpen(true);
  };

  // Calculate total weight of goal form
  const totalGoalWeight = goalForm.reduce((acc, row) => acc + (parseFloat(row.weight) || 0), 0);

  const handleSaveGoals = async (confirmLock = false) => {
    if (goalForm.length === 0) {
      toast.error('At least 1 objective is required');
      return;
    }
    for (let i = 0; i < goalForm.length; i++) {
      if (!goalForm[i].title.trim()) {
        toast.error(`Objective #${i + 1} must have a title`);
        return;
      }
      if (!goalForm[i].deadline) {
        toast.error(`Objective #${i + 1} must have a target deadline`);
        return;
      }
    }
    if (confirmLock && Math.abs(totalGoalWeight - 100) > 0.01) {
      toast.error(`Total weight must equal exactly 100%. Current sum: ${totalGoalWeight}%`);
      return;
    }

    setGoalSubmitting(true);
    try {
      await api.post(`/hr/appraisals/${targetAppraisalId}/objectives`, {
        objectives: goalForm,
        confirm: confirmLock,
      });
      toast.success(confirmLock ? 'Objectives confirmed & locked for the month!' : 'Draft objectives saved');
      setGoalModalOpen(false);
      fetchMyData();
      if (activeTab === 'team') fetchTeamData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save objectives');
    } finally {
      setGoalSubmitting(false);
    }
  };

  // ── Open Self Submit Modal ──
  const openSelfSubmitModal = () => {
    const list = (myAppraisal?.objectives || []).map(o => ({
      id: o.id,
      title: o.title,
      weight: o.weight,
      achievement: o.achievement || '',
      evidence_notes: o.evidence_notes || '',
      status: o.status === 'not_started' ? 'in_progress' : o.status
    }));
    setSelfAchievements(list);
    setEmployeeComments(myAppraisal?.employee_comments || '');
    setSelfSubmitOpen(true);
  };

  const handleSelfSubmit = async (e) => {
    e.preventDefault();
    for (let i = 0; i < selfAchievements.length; i++) {
      if (!selfAchievements[i].achievement.trim()) {
        toast.error(`Please provide your actual achievement for: "${selfAchievements[i].title}"`);
        return;
      }
    }

    setSelfSubmitting(true);
    try {
      await api.post(`/hr/appraisals/${myAppraisal.id}/self-submit`, {
        objectives: selfAchievements,
        employee_comments: employeeComments,
      });
      toast.success('Appraisal achievements submitted to Line Manager!');
      setSelfSubmitOpen(false);
      fetchMyData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSelfSubmitting(false);
    }
  };

  // ── Open Evaluation Modal (Manager) ──
  const openEvalModal = (appraisal) => {
    setEvalAppraisal(appraisal);
    const initialScores = {};
    (appraisal.objectives || []).forEach(o => {
      initialScores[o.id] = { marks: o.marks ?? 80, comment: o.manager_comments ?? '' };
    });
    setEvalScores(initialScores);
    setEvalComments(appraisal.manager_comments || '');
    setEvalGrade(appraisal.manager_recommended_grade || 'A1');
    setEvalModalOpen(true);
  };

  // Live weighted total for manager evaluation
  const computedEvalTotal = evalAppraisal?.objectives?.reduce((acc, obj) => {
    const mark = parseFloat(evalScores[obj.id]?.marks) || 0;
    return acc + (mark * parseFloat(obj.weight) / 100);
  }, 0) || 0;

  const handleEvalSubmit = async (e) => {
    e.preventDefault();
    if (!evalComments.trim()) {
      toast.error('Please enter overall manager comments');
      return;
    }

    const payloadObjectives = evalAppraisal.objectives.map(o => ({
      id: o.id,
      marks: parseFloat(evalScores[o.id]?.marks || 0),
      manager_comments: evalScores[o.id]?.comment || '',
    }));

    setEvalSubmitting(true);
    try {
      await api.post(`/hr/appraisals/${evalAppraisal.id}/evaluate`, {
        objectives: payloadObjectives,
        manager_comments: evalComments,
        manager_recommended_grade: evalGrade,
      });
      toast.success('Evaluation saved! Sent to HR review.');
      setEvalModalOpen(false);
      fetchTeamData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setEvalSubmitting(false);
    }
  };

  // ── Director Final Approval Action ──
  const handleDirectorDecision = async (action) => {
    setDirectorSubmitting(true);
    try {
      await api.post(`/hr/appraisals/${selectedForDirector.id}/director-approve`, {
        action,
        grade: overrideGrade || selectedForDirector.grade,
        director_comments: directorRemarks,
      });
      toast.success(action === 'approve' ? 'Official Grade Approved!' : 'Decision updated successfully');
      setDirectorModalOpen(false);
      setSelectedForDirector(null);
      setDirectorRemarks('');
      fetchDirectorData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setDirectorSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--dark)' }}>
            Monthly Performance Appraisal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            Management by Objectives (MBO) Policy · Circle Engineering
          </p>
        </div>

        {/* Month Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid var(--surface-2)' }}>
          <Calendar size={16} color="#3b82f6" />
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.82rem', color: 'var(--dark)' }}
          />
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1.5rem', gap: '4px' }}>
        <button
          type="button"
          onClick={() => handleTabChange('my')}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: '9px', border: 'none',
            background: activeTab === 'my' ? '#fff' : 'transparent',
            boxShadow: activeTab === 'my' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            fontWeight: 700, fontSize: '0.82rem', color: activeTab === 'my' ? '#0284c7' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          My Goals & Appraisal
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('team')}
          style={{
            flex: 1, padding: '0.55rem', borderRadius: '9px', border: 'none',
            background: activeTab === 'team' ? '#fff' : 'transparent',
            boxShadow: activeTab === 'team' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            fontWeight: 700, fontSize: '0.82rem', color: activeTab === 'team' ? '#0284c7' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'all 0.15s ease'
          }}
        >
          Team Appraisals
        </button>

        {isDirector && (
          <button
            type="button"
            onClick={() => handleTabChange('director')}
            style={{
              flex: 1, padding: '0.55rem', borderRadius: '9px', border: 'none',
              background: activeTab === 'director' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'director' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              fontWeight: 700, fontSize: '0.82rem', color: activeTab === 'director' ? '#8b5cf6' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Director Sign-off</span>
            {pendingApprovals.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.62rem', padding: '0.1rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
                {pendingApprovals.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          TAB 1: MY GOALS & PERFORMANCE
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'my' && (
        <div>
          {/* Official Grade Card (If Approved) */}
          {myAppraisal?.status === 'approved' && (
            <div className="card" style={{
              padding: '1.4rem', marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.05) 100%)',
              border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: '16px', position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <Sparkles size={18} color="#10b981" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Official Performance Rating · {myAppraisal.period_month}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 900, color: GRADE_CONFIG[myAppraisal.grade]?.color || '#10b981' }}>
                      {myAppraisal.grade}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                      {myAppraisal.performance_level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Variable Performance Pay Adjustment: <strong style={{ color: '#0284c7' }}>{myAppraisal.variable_pay_adjustment}</strong>
                  </div>
                </div>

                {/* Score Breakdown Pills */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', padding: '0.5rem 0.85rem', borderRadius: '10px', border: '1px solid var(--surface-2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Objective Score</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0284c7' }}>{Number(myAppraisal.objective_score).toFixed(1)}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.5rem 0.85rem', borderRadius: '10px', border: '1px solid var(--surface-2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Attendance Ded.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>-{Number(myAppraisal.attendance_deduction).toFixed(1)}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.5rem 0.85rem', borderRadius: '10px', border: '1px solid var(--surface-2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Misconduct Ded.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>-{Number(myAppraisal.misconduct_deduction).toFixed(1)}</div>
                  </div>
                  <div style={{ background: '#0284c7', color: '#fff', padding: '0.5rem 0.95rem', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 600 }}>Final Score</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900 }}>{Number(myAppraisal.final_score).toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* Feedback text */}
              {(myAppraisal.manager_comments || myAppraisal.director_comments) && (
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(16,185,129,0.2)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {myAppraisal.manager_comments && (
                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Line Manager Feedback:</strong> {myAppraisal.manager_comments}</p>
                  )}
                  {myAppraisal.director_comments && (
                    <p style={{ margin: 0, color: '#059669' }}><strong>Project Director Note:</strong> {myAppraisal.director_comments}</p>
                  )}
                </div>
              )}

              {/* Print Official Scorecard / PDF Button */}
              <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setScorecardAppraisalId(myAppraisal.id);
                    setScorecardAppraisalData(myAppraisal);
                    setScorecardOpen(true);
                  }}
                  className="btn btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: '#fff',
                    border: '1.5px solid #10b981',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Printer size={15} /> Print Official Scorecard / PDF Slip
                </button>
              </div>
            </div>
          )}

          {/* Workflow Status Tracker */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700 }}>
                  Current Cycle Status: {currentMonth}
                </h3>
              </div>
              <span style={{
                padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                background: STATUS_LABELS[myAppraisal?.status]?.bg || 'var(--surface-2)',
                color: STATUS_LABELS[myAppraisal?.status]?.color || 'var(--text-muted)'
              }}>
                {STATUS_LABELS[myAppraisal?.status]?.label || myAppraisal?.status}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Evaluator / Line Manager: <strong>{myAppraisal?.evaluator?.full_name || 'Assigned by Department'}</strong>
            </div>

            {/* Quick Action Buttons for Employee */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {myAppraisal?.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => openGoalsModal(myAppraisal)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Edit3 size={15} /> Propose / Draft Objectives
                </button>
              )}

              {(myAppraisal?.status === 'objectives_confirmed' || myAppraisal?.status === 'revision_requested') && (
                <button
                  type="button"
                  onClick={openSelfSubmitModal}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Send size={15} /> Submit Month-End Achievements
                </button>
              )}
            </div>
          </div>

          {/* Objectives List */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                Agreed Objectives (Max 5)
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total Weight: {myAppraisal?.objectives?.reduce((acc, o) => acc + parseFloat(o.weight), 0) || 0}% / 100%
              </span>
            </div>

            {(!myAppraisal?.objectives || myAppraisal.objectives.length === 0) ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Target size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600 }}>No objectives set for {currentMonth} yet.</p>
                <button
                  type="button"
                  onClick={() => openGoalsModal(myAppraisal)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#3b82f6' }}
                >
                  Create Monthly Objectives
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {myAppraisal.objectives.map((obj, idx) => (
                  <div key={obj.id} className="card" style={{ padding: '1.1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx + 1}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
                          {obj.title}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                          {Number(obj.weight).toFixed(0)}% Weight
                        </span>
                        <span style={{
                          padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                          background: obj.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: obj.status === 'completed' ? '#10b981' : '#f59e0b'
                        }}>
                          {obj.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {obj.description && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>
                        {obj.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {obj.target_kpi && <div><strong>KPI:</strong> {obj.target_kpi}</div>}
                      {obj.deadline && <div><strong>Deadline:</strong> {obj.deadline.split('T')[0]}</div>}
                    </div>

                    {/* Reported Achievement */}
                    {obj.achievement && (
                      <div style={{ padding: '0.55rem 0.75rem', background: 'var(--surface-2)', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '0.4rem' }}>
                        <strong style={{ color: '#0284c7' }}>Your Achievement: </strong>{obj.achievement}
                      </div>
                    )}

                    {/* Evaluated Marks */}
                    {obj.marks !== null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px solid var(--surface-2)', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Score: <strong>{obj.marks} / 100</strong> (Weighted: <strong>{obj.weighted_marks}%</strong>)</span>
                        {obj.manager_comments && <span style={{ color: '#8b5cf6', fontStyle: 'italic' }}>"{obj.manager_comments}"</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Appraisals */}
          {history.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                Performance History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {history.map(item => (
                  <div key={item.id} className="card" style={{ padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.period_month}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Status: {STATUS_LABELS[item.status]?.label || item.status}
                      </div>
                    </div>
                    {item.grade ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Score: {item.final_score}</span>
                        <span style={{
                          padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 800,
                          background: GRADE_CONFIG[item.grade]?.bg, color: GRADE_CONFIG[item.grade]?.color, border: `1px solid ${GRADE_CONFIG[item.grade]?.border}`
                        }}>
                          {item.grade}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setScorecardAppraisalId(item.id);
                            setScorecardAppraisalData(item);
                            setScorecardOpen(true);
                          }}
                          className="btn btn-sm btn-ghost"
                          title="Print Scorecard / Slip"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#2563eb', border: '1px solid var(--surface-2)' }}
                        >
                          <Printer size={12} /> Slip
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>In Progress</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 2: TEAM APPRAISALS (Line Manager View)
      ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Team Members for {currentMonth}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {teamAppraisals.length} Member{teamAppraisals.length === 1 ? '' : 's'}
            </span>
          </div>

          {teamLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#0ea5e9' }} />
            </div>
          ) : teamAppraisals.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <UserCheck size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No direct team members found assigned to you for {currentMonth}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {teamAppraisals.map(appraisal => {
                const emp = appraisal.employee;
                const statusInfo = STATUS_LABELS[appraisal.status] || { label: appraisal.status, color: '#64748b', bg: '#f1f5f9' };

                return (
                  <div key={appraisal.id} className="card" style={{ padding: '1.1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{emp?.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {emp?.department?.name || 'Department'} · {emp?.designation?.title || 'Designation'} ({emp?.employee_id})
                        </div>
                      </div>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <span>Objectives: <strong>{appraisal.objectives?.length || 0} / 5</strong></span>
                      {appraisal.grade && <span>Grade: <strong style={{ color: GRADE_CONFIG[appraisal.grade]?.color }}>{appraisal.grade}</strong> ({appraisal.final_score} pts)</span>}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-2)' }}>
                      {(appraisal.status === 'draft' || appraisal.status === 'objectives_confirmed') && (
                        <button
                          type="button"
                          onClick={() => openGoalsModal(appraisal)}
                          className="btn btn-sm btn-ghost"
                          style={{ border: '1px solid var(--surface-2)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Edit3 size={13} /> Set / Edit Objectives
                        </button>
                      )}

                      {appraisal.status === 'self_submitted' && (
                        <button
                          type="button"
                          onClick={() => openEvalModal(appraisal)}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#8b5cf6', borderColor: '#8b5cf6', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Award size={14} /> Score & Evaluate
                        </button>
                      )}

                      {(appraisal.status === 'manager_evaluated' || appraisal.status === 'hr_reviewed' || appraisal.status === 'approved') && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setScorecardAppraisalId(appraisal.id);
                              setScorecardAppraisalData(appraisal);
                              setScorecardOpen(true);
                            }}
                            className="btn btn-sm btn-ghost"
                            style={{ border: '1px solid var(--surface-2)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb' }}
                          >
                            <Printer size={13} /> Scorecard
                          </button>
                          <button
                            type="button"
                            onClick={() => openEvalModal(appraisal)}
                            className="btn btn-sm btn-ghost"
                            style={{ border: '1px solid var(--surface-2)', fontSize: '0.75rem' }}
                          >
                            View Evaluation Details
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          TAB 3: DIRECTOR SIGN-OFF (Project Director Hasintha & Eranda)
      ───────────────────────────────────────────────────────────────── */}
      {isDirector && activeTab === 'director' && (
        <div>
          {/* Executive Analytics & Bell Curve Stats */}
          {directorStats && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Appraised</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0284c7' }}>{directorStats.total_appraisals}</div>
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Ready for Approval</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{directorStats.pending_director}</div>
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', border: directorStats.bell_curve.s1_quota_warning ? '1px solid #ef4444' : '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>S1 Quota (Max 5%)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{directorStats.bell_curve.s1_percentage}%</div>
                  {directorStats.bell_curve.s1_quota_warning && (
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Exceeds 5% guideline</div>
                  )}
                </div>
                <div className="card" style={{ padding: '1rem', textAlign: 'center', border: directorStats.bell_curve.s2_quota_warning ? '1px solid #ef4444' : '1px solid var(--surface-2)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>S2 Quota (5-10%)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{directorStats.bell_curve.s2_percentage}%</div>
                  {directorStats.bell_curve.s2_quota_warning && (
                    <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>⚠️ Exceeds 10% guideline</div>
                  )}
                </div>
              </div>

              {/* Consecutive Underperformance Alerts (Policy Section 2.8) */}
              {directorStats.underperformance_alerts?.length > 0 && (
                <div className="card" style={{ padding: '1rem 1.2rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#b91c1c' }}>
                    <ShieldAlert size={18} />
                    <strong style={{ fontSize: '0.88rem' }}>Consecutive Underperformance Alerts (Section 2.8)</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {directorStats.underperformance_alerts.map((alert, idx) => (
                      <div key={idx} style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                        <div>
                          <strong>{alert.full_name}</strong> ({alert.department}) — <span style={{ color: '#b91c1c', fontWeight: 700 }}>{alert.consecutive}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(239,68,68,0.1)', color: '#b91c1c', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                          {alert.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Sign-offs List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Appraisals Awaiting Final Approval ({pendingApprovals.length})
            </h3>
          </div>

          {directorLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>All employee appraisals for {currentMonth} have been approved!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingApprovals.map(appraisal => (
                <div key={appraisal.id} className="card" style={{ padding: '1.1rem', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{appraisal.employee?.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {appraisal.employee?.department?.name} · {appraisal.employee?.designation?.title}
                      </div>
                    </div>
                    <span style={{
                      padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800,
                      background: GRADE_CONFIG[appraisal.grade]?.bg, color: GRADE_CONFIG[appraisal.grade]?.color,
                      border: `1px solid ${GRADE_CONFIG[appraisal.grade]?.border}`
                    }}>
                      Proposed: {appraisal.grade} ({appraisal.final_score} pts)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                    <span>Objective: <strong>{appraisal.objective_score}</strong></span>
                    <span>Attendance Ded: <strong style={{ color: '#f59e0b' }}>-{appraisal.attendance_deduction}</strong></span>
                    <span>Misconduct Ded: <strong style={{ color: '#ef4444' }}>-{appraisal.misconduct_deduction}</strong></span>
                    <span>Variable Pay: <strong style={{ color: '#0284c7' }}>{appraisal.variable_pay_adjustment}</strong></span>
                  </div>

                  {appraisal.manager_comments && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--dark)', background: 'var(--surface-2)', padding: '0.45rem 0.65rem', borderRadius: '6px', marginBottom: '0.6rem' }}>
                      <strong>Manager:</strong> "{appraisal.manager_comments}"
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--surface-2)' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setScorecardAppraisalId(appraisal.id);
                        setScorecardAppraisalData(appraisal);
                        setScorecardOpen(true);
                      }}
                      className="btn btn-sm btn-ghost"
                      style={{ border: '1px solid var(--surface-2)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb' }}
                    >
                      <Printer size={13} /> Scorecard Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForDirector(appraisal);
                        setOverrideGrade(appraisal.grade);
                        setDirectorRemarks('');
                        setDirectorModalOpen(true);
                      }}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#8b5cf6', borderColor: '#8b5cf6', fontSize: '0.75rem' }}
                    >
                      Review & Approve Grade
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 1: SET / DRAFT OBJECTIVES (Max 5, 100% Weight)
      ───────────────────────────────────────────────────────────────── */}
      {goalModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Set Monthly Objectives</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Up to 5 objectives · Total weight must equal 100%</span>
              </div>
              <button onClick={() => setGoalModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Weight Bar Gauge */}
            <div style={{
              padding: '0.65rem 0.9rem', borderRadius: '10px', marginBottom: '1.25rem',
              background: Math.abs(totalGoalWeight - 100) < 0.01 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: Math.abs(totalGoalWeight - 100) < 0.01 ? '1px solid #10b981' : '1px solid #f59e0b',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                Total Allocated Weight:
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: Math.abs(totalGoalWeight - 100) < 0.01 ? '#10b981' : '#f59e0b' }}>
                {totalGoalWeight}% {Math.abs(totalGoalWeight - 100) < 0.01 ? '✓ Complete (100%)' : `(Needs ${100 - totalGoalWeight}%)`}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
              {goalForm.map((row, idx) => (
                <div key={idx} style={{ padding: '0.9rem', background: 'var(--surface-2)', borderRadius: '10px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>Objective #{idx + 1}</span>
                    {goalForm.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setGoalForm(goalForm.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Objective title / task expected..."
                      value={row.title}
                      onChange={e => {
                        const copy = [...goalForm];
                        copy[idx].title = e.target.value;
                        setGoalForm(copy);
                      }}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Weight (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-control"
                        value={row.weight}
                        onChange={e => {
                          const copy = [...goalForm];
                          copy[idx].weight = parseFloat(e.target.value) || 0;
                          setGoalForm(copy);
                        }}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Deadline</label>
                      <input
                        type="date"
                        className="form-control"
                        value={row.deadline}
                        onChange={e => {
                          const copy = [...goalForm];
                          copy[idx].deadline = e.target.value;
                          setGoalForm(copy);
                        }}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target / Measurable KPI</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Complete 5 site designs with 0 revisions"
                      value={row.target_kpi}
                      onChange={e => {
                        const copy = [...goalForm];
                        copy[idx].target_kpi = e.target.value;
                        setGoalForm(copy);
                      }}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {goalForm.length < 5 && (
              <button
                type="button"
                onClick={() => setGoalForm([...goalForm, { title: '', description: '', weight: 10, deadline: '', target_kpi: '', status: 'in_progress' }])}
                className="btn btn-sm btn-ghost"
                style={{ width: '100%', border: '1px dashed #cbd5e1', marginBottom: '1.25rem', fontSize: '0.8rem' }}
              >
                + Add Another Objective (Max 5)
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setGoalModalOpen(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleSaveGoals(false)}
                disabled={goalSubmitting}
                style={{ border: '1px solid var(--surface-2)' }}
              >
                Save as Draft
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveGoals(true)}
                disabled={goalSubmitting}
                style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
              >
                {goalSubmitting ? 'Saving...' : 'Confirm & Lock Targets (100%)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 2: SUBMIT ACHIEVEMENTS (Employee End-of-Month)
      ───────────────────────────────────────────────────────────────── */}
      {selfSubmitOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Submit Monthly Achievements</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Fill in actual results for each agreed objective</span>
              </div>
              <button onClick={() => setSelfSubmitOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSelfSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                {selfAchievements.map((item, idx) => (
                  <div key={item.id} style={{ padding: '0.9rem', background: 'var(--surface-2)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.88rem' }}>{idx + 1}. {item.title}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>{item.weight}%</span>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completion Status</label>
                      <select
                        className="form-control"
                        value={item.status}
                        onChange={e => {
                          const copy = [...selfAchievements];
                          copy[idx].status = e.target.value;
                          setSelfAchievements(copy);
                        }}
                        style={{ fontSize: '0.82rem' }}
                      >
                        <option value="completed">Completed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="not_completed">Not Completed</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Your Actual Achievement *</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Detail what was completed, deliverables produced..."
                        value={item.achievement}
                        onChange={e => {
                          const copy = [...selfAchievements];
                          copy[idx].achievement = e.target.value;
                          setSelfAchievements(copy);
                        }}
                        required
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Evidence / Supporting Notes (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Google Drive link, report reference..."
                        value={item.evidence_notes}
                        onChange={e => {
                          const copy = [...selfAchievements];
                          copy[idx].evidence_notes = e.target.value;
                          setSelfAchievements(copy);
                        }}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">General Self-Appraisal Comments (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Any operational challenges, team support, or highlights..."
                  value={employeeComments}
                  onChange={e => setEmployeeComments(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelfSubmitOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={selfSubmitting} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  {selfSubmitting ? 'Submitting...' : 'Send to Line Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 3: MANAGER EVALUATION & SCORING (0 to 100)
      ───────────────────────────────────────────────────────────────── */}
      {evalModalOpen && evalAppraisal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Evaluate: {evalAppraisal.employee?.full_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {evalAppraisal.employee?.department?.name} · Cycle: {evalAppraisal.period_month}
                </span>
              </div>
              <button onClick={() => setEvalModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Live Score Summary */}
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(139,92,246,0.08)', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.25)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8b5cf6' }}>
                Computed Objective Score:
              </span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#8b5cf6' }}>
                {computedEvalTotal.toFixed(1)} / 100
              </span>
            </div>

            <form onSubmit={handleEvalSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                {evalAppraisal.objectives?.map((obj, idx) => (
                  <div key={obj.id} style={{ padding: '0.9rem', background: 'var(--surface-2)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.88rem' }}>{idx + 1}. {obj.title} ({obj.weight}%)</strong>
                      <span style={{ fontSize: '0.72rem', background: '#fff', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                        Status: {obj.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#0284c7', background: '#fff', padding: '0.45rem 0.65rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                      <strong>Employee Achievement:</strong> {obj.achievement || 'No achievement reported'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Marks (0-100) *</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="form-control"
                          value={evalScores[obj.id]?.marks ?? 80}
                          onChange={e => {
                            setEvalScores({
                              ...evalScores,
                              [obj.id]: { ...evalScores[obj.id], marks: e.target.value }
                            });
                          }}
                          required
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Objective Comment</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Met timeline, great quality..."
                          value={evalScores[obj.id]?.comment ?? ''}
                          onChange={e => {
                            setEvalScores({
                              ...evalScores,
                              [obj.id]: { ...evalScores[obj.id], comment: e.target.value }
                            });
                          }}
                          style={{ fontSize: '0.82rem' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Manager Feedback & Evaluation Remarks *</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Provide constructive feedback, key strengths, improvement areas..."
                    value={evalComments}
                    onChange={e => setEvalComments(e.target.value)}
                    required
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label className="form-label">Recommended Grade</label>
                  <select
                    className="form-control"
                    value={evalGrade}
                    onChange={e => setEvalGrade(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="S1">S1 (Outstanding)</option>
                    <option value="S2">S2 (Excellent)</option>
                    <option value="A1">A1 (Meets Exp.)</option>
                    <option value="A2">A2 (Needs Impr.)</option>
                    <option value="C">C (Unacceptable)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEvalModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={evalSubmitting} style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                  {evalSubmitting ? 'Submitting...' : 'Submit Evaluation to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL 4: DIRECTOR FINAL APPROVAL & MODERATION (Hasintha / Eranda)
      ───────────────────────────────────────────────────────────────── */}
      {directorModalOpen && selectedForDirector && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Project Director Final Evaluation
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Appraisee: <strong>{selectedForDirector.employee?.full_name}</strong> ({selectedForDirector.period_month})
                </span>
              </div>
              <button onClick={() => setDirectorModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scorecard Table Summary */}
            <div style={{ background: 'var(--surface-2)', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
              {[
                ['Objective Weighted Score', `${selectedForDirector.objective_score} pts`],
                ['Attendance Deduction', `-${selectedForDirector.attendance_deduction} pts`],
                ['Misconduct Deduction', `-${selectedForDirector.misconduct_deduction} pts (${selectedForDirector.misconduct_severity})`],
                ['Final Computed Score', <strong>{selectedForDirector.final_score} / 100</strong>],
                ['Calculated Grade', <span style={{ fontWeight: 800, color: GRADE_CONFIG[selectedForDirector.grade]?.color }}>{selectedForDirector.grade} ({selectedForDirector.performance_level})</span>],
                ['Variable Performance Pay', <strong style={{ color: '#0284c7' }}>{selectedForDirector.variable_pay_adjustment}</strong>],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontSize: '0.82rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>

            {/* Grade Override Option */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Approved Official Grade</label>
              <select
                className="form-control"
                value={overrideGrade}
                onChange={e => setOverrideGrade(e.target.value)}
                style={{ fontSize: '0.85rem', fontWeight: 700 }}
              >
                <option value="S1">S1 · Outstanding (116% - 120% Variable Pay)</option>
                <option value="S2">S2 · Excellent (110% - 115% Variable Pay)</option>
                <option value="A1">A1 · Meets Expectations (95% - 109% Variable Pay)</option>
                <option value="A2">A2 · Needs Improvement (80% - 94% Variable Pay)</option>
                <option value="C">C · Unacceptable (0% Variable Pay)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Project Director Remarks (Optional)</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Final remarks or recommendations for the employee..."
                value={directorRemarks}
                onChange={e => setDirectorRemarks(e.target.value)}
                style={{ fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => handleDirectorDecision('revision_requested')}
                disabled={directorSubmitting}
                style={{ color: '#ef4444' }}
              >
                Request Revision
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleDirectorDecision('approve')}
                disabled={directorSubmitting}
                style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
              >
                {directorSubmitting ? 'Approving...' : 'Approve & Publish Official Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: PRINTABLE OFFICIAL A4 SCORECARD
      ───────────────────────────────────────────────────────────────── */}
      <PrintableScorecardModal
        appraisalId={scorecardAppraisalId}
        appraisalData={scorecardAppraisalData}
        isOpen={scorecardOpen}
        onClose={() => {
          setScorecardOpen(false);
          setScorecardAppraisalId(null);
          setScorecardAppraisalData(null);
        }}
      />
    </div>
  );
};

export default PortalAppraisal;
