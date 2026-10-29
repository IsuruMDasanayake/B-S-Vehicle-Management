import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Award, Target, CheckCircle2, Clock, AlertTriangle, Loader2,
  Calendar, FileText, Check, ChevronRight, X, TrendingUp,
  Percent, ShieldAlert, Sparkles, Send, Edit3, UserCheck, AlertCircle,
  Printer, History, Save, RotateCcw, Lock, Unlock, Plus, Trash2, HelpCircle
} from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import PrintableScorecardModal from './PrintableScorecardModal';

const GRADE_CONFIG = {
  S1: { label: 'S1 · Outstanding', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', pay: '116% - 120%' },
  S2: { label: 'S2 · Excellent',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981', pay: '110% - 115%' },
  A1: { label: 'A1 · Meets Expectations', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: '#0ea5e9', pay: '95% - 109%' },
  A2: { label: 'A2 · Needs Improvement',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', pay: '80% - 94%' },
  C:  { label: 'C · Unacceptable',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', pay: '0%' },
};

const STATUS_BADGES = {
  not_assigned: { label: 'Not Assigned', bg: '#f1f5f9', color: '#64748b' },
  open:         { label: 'Open · In Progress', bg: '#e0f2fe', color: '#0369a1' },
  submitted:    { label: 'Submitted by Employee', bg: '#fef3c7', color: '#b45309' },
  finalized:    { label: 'Finalized', bg: '#dcfce7', color: '#15803d' },
};

/**
 * AppraisalSheet: The exact single-table representation of the Circle Engineering
 * Monthly Performance Appraisal Form.
 *
 * Props:
 *  - employeeId: (optional) employee ID to view/manage; if omitted, views current user's sheet
 *  - month: YYYY-MM string
 *  - onBack: (optional) back button callback when viewed inside a board/modal
 *  - onSheetUpdated: (optional) callback to refresh parent board when sheet changes
 */
export const AppraisalSheet = ({ employeeId, month, onBack, onSheetUpdated }) => {
  const user = useAuthStore(s => s.user);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  // Editable local state
  const [objectives, setObjectives] = useState([]);
  const [employeeComments, setEmployeeComments] = useState('');
  const [appraiserComments, setAppraiserComments] = useState('');
  const [attendanceDed, setAttendanceDed] = useState(0);
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [misconductDed, setMisconductDed] = useState(0);
  const [misconductNotes, setMisconductNotes] = useState('');

  // Objectives editing mode (Hasintha only)
  const [editingObjectives, setEditingObjectives] = useState(false);
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');

  // Revisions history drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Return to employee modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnNote, setReturnNote] = useState('');

  // Printable Scorecard Modal
  const [scorecardOpen, setScorecardOpen] = useState(false);

  // Finalize confirmation modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

  // Reopen confirmation modal
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  // Attendance suggestion helper
  const [suggestingAtt, setSuggestingAtt] = useState(false);

  // ── Load Sheet ─────────────────────────────────────────────────────────────
  const loadSheet = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month };
      if (employeeId) params.employee_id = employeeId;
      const res = await api.get('/hr/appraisals/sheet', { params });
      const d = res.data;
      setData(d);

      const sheet = d.sheet;
      const objs = (sheet?.objectives || []).map(o => ({
        id: o.id,
        title: o.title || '',
        weight: o.weight !== null ? parseFloat(o.weight) : 0,
        deadline: o.deadline ? o.deadline.split('T')[0] : '',
        achievement: o.achievement || '',
        status: o.status || 'not_started',
        actual_marks: o.actual_marks !== null && o.actual_marks !== undefined ? parseFloat(o.actual_marks) : '',
      }));

      // If appraiser opening an unassigned sheet, prep 3 empty rows by default
      if (objs.length === 0 && d.permissions?.is_appraiser) {
        setObjectives([
          { id: null, title: '', weight: 40, deadline: '', achievement: '', status: 'not_started', actual_marks: '' },
          { id: null, title: '', weight: 30, deadline: '', achievement: '', status: 'not_started', actual_marks: '' },
          { id: null, title: '', weight: 30, deadline: '', achievement: '', status: 'not_started', actual_marks: '' },
        ]);
        setEditingObjectives(true);
      } else {
        setObjectives(objs);
        setEditingObjectives(false);
      }

      setEmployeeComments(sheet?.employee_comments || '');
      setAppraiserComments(sheet?.manager_comments || '');
      setAttendanceDed(sheet?.attendance_deduction !== null && sheet?.attendance_deduction !== undefined ? parseFloat(sheet.attendance_deduction) : 0);
      setAttendanceNotes(sheet?.attendance_deduction_notes || '');
      setMisconductDed(sheet?.misconduct_deduction !== null && sheet?.misconduct_deduction !== undefined ? parseFloat(sheet.misconduct_deduction) : 0);
      setMisconductNotes(sheet?.misconduct_deduction_notes || '');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load appraisal sheet');
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    loadSheet();
  }, [loadSheet]);

  const sheet = data?.sheet;
  const permissions = data?.permissions || {};
  const employee = data?.employee;
  const appraiser = data?.appraiser;

  // ── Live Score Calculations ────────────────────────────────────────────────
  const totalWeight = useMemo(() => {
    return Math.round(objectives.reduce((sum, o) => sum + (parseFloat(o.weight) || 0), 0) * 100) / 100;
  }, [objectives]);

  const totalActualMarks = useMemo(() => {
    return Math.round(objectives.reduce((sum, o) => {
      const m = parseFloat(o.actual_marks);
      return sum + (!isNaN(m) ? m : 0);
    }, 0) * 100) / 100;
  }, [objectives]);

  const liveFinalScore = useMemo(() => {
    const raw = totalActualMarks - (parseFloat(attendanceDed) || 0) - (parseFloat(misconductDed) || 0);
    return Math.max(0, Math.min(100, Math.round(raw * 100) / 100));
  }, [totalActualMarks, attendanceDed, misconductDed]);

  const liveGrade = useMemo(() => {
    if (liveFinalScore >= 96) return 'S1';
    if (liveFinalScore >= 90) return 'S2';
    if (liveFinalScore >= 75) return 'A1';
    if (liveFinalScore >= 60) return 'A2';
    return 'C';
  }, [liveFinalScore]);

  // Has existing objectives assigned
  const hasAssignedObjectives = Boolean(sheet?.objectives && sheet.objectives.length > 0);

  // ── Objective Row Manipulation (Hasintha only) ─────────────────────────────
  const addObjectiveRow = () => {
    if (objectives.length >= 5) {
      toast.error('Maximum 5 objectives allowed per policy.');
      return;
    }
    const currentSum = objectives.reduce((s, o) => s + (parseFloat(o.weight) || 0), 0);
    const rem = Math.max(0, 100 - currentSum);
    setObjectives([...objectives, {
      id: null,
      title: '',
      weight: rem > 0 ? rem : 10,
      deadline: '',
      achievement: '',
      status: 'not_started',
      actual_marks: '',
    }]);
  };

  const removeObjectiveRow = (idx) => {
    if (objectives.length <= 1) {
      toast.error('At least 1 objective is required.');
      return;
    }
    setObjectives(objectives.filter((_, i) => i !== idx));
  };

  const updateObjectiveField = (idx, field, value) => {
    setObjectives(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  };

  // ── Save Objectives (Hasintha) ─────────────────────────────────────────────
  const handleInitiateSaveObjectives = () => {
    if (objectives.length === 0) {
      toast.error('Add at least 1 objective.');
      return;
    }
    for (let i = 0; i < objectives.length; i++) {
      if (!objectives[i].title.trim()) {
        toast.error(`Objective #${i + 1} must have a title.`);
        return;
      }
    }
    if (Math.abs(totalWeight - 100.0) > 0.01) {
      toast.error(`Combined weight of all objectives must equal 100%. Current: ${totalWeight}%`);
      return;
    }

    // If objectives were already assigned before, require a reason for procedure audit
    if (hasAssignedObjectives) {
      setChangeReason('');
      setReasonModalOpen(true);
    } else {
      executeSaveObjectives('');
    }
  };

  const executeSaveObjectives = async (reason) => {
    setSaving(true);
    try {
      const payload = {
        employee_id: employee.id,
        month,
        objectives: objectives.map(o => ({
          id: o.id || undefined,
          title: o.title.trim(),
          weight: parseFloat(o.weight),
          deadline: o.deadline || null,
        })),
        reason: reason || undefined,
      };

      const res = await api.put('/hr/appraisals/objectives', payload);
      toast.success(res.data?.message || 'Objectives saved successfully');
      setEditingObjectives(false);
      setReasonModalOpen(false);
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save objectives');
    } finally {
      setSaving(false);
    }
  };

  // ── Employee: Save Achievements & Submit ───────────────────────────────────
  const handleSaveAchievements = async (isSubmit = false) => {
    if (!sheet) return;
    setSaving(true);
    try {
      const payload = {
        objectives: objectives.map(o => ({
          id: o.id,
          achievement: o.achievement || '',
          status: o.status,
        })),
        employee_comments: employeeComments,
        submit: isSubmit,
      };

      const res = await api.put(`/hr/appraisals/${sheet.id}/achievements`, payload);
      toast.success(res.data?.message || (isSubmit ? 'Appraisal submitted to Appraiser!' : 'Progress saved'));
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save achievements');
    } finally {
      setSaving(false);
    }
  };

  // ── Hasintha: Save Marks ───────────────────────────────────────────────────
  const handleSaveMarks = async () => {
    if (!sheet) return;
    // Validate marks against weight
    for (const o of objectives) {
      if (o.actual_marks !== '' && o.actual_marks !== null && parseFloat(o.actual_marks) > parseFloat(o.weight)) {
        toast.error(`Marks for "${o.title}" cannot exceed its weight (${o.weight}).`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        objectives: objectives.map(o => ({
          id: o.id,
          actual_marks: o.actual_marks !== '' && o.actual_marks !== null ? parseFloat(o.actual_marks) : null,
        })),
        appraiser_comments: appraiserComments,
      };

      const res = await api.put(`/hr/appraisals/${sheet.id}/marks`, payload);
      toast.success(res.data?.message || 'Actual marks recorded successfully');
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  // ── HR: Save Deductions ────────────────────────────────────────────────────
  const handleSaveDeductions = async () => {
    if (!sheet) return;
    const att = parseFloat(attendanceDed) || 0;
    const mis = parseFloat(misconductDed) || 0;

    if (att < 0 || att > 10) {
      toast.error('Attendance deduction must be between 0 and 10 marks.');
      return;
    }
    if (mis < 0 || mis > 30) {
      toast.error('Misconduct deduction must be between 0 and 30 marks.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        attendance_deduction: att,
        attendance_deduction_notes: attendanceNotes,
        misconduct_deduction: mis,
        misconduct_deduction_notes: misconductNotes,
      };

      const res = await api.put(`/hr/appraisals/${sheet.id}/deductions`, payload);
      toast.success(res.data?.message || 'HR deductions applied successfully');
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply deductions');
    } finally {
      setSaving(false);
    }
  };

  // ── HR: Auto-suggest attendance deductions ────────────────────────────────
  const handleSuggestAttendance = async () => {
    if (!sheet) return;
    setSuggestingAtt(true);
    try {
      const res = await api.get(`/hr/appraisals/${sheet.id}/suggest-attendance`);
      setAttendanceDed(res.data.suggested_deduction);
      setAttendanceNotes(res.data.suggested_notes);
      toast.success(`Suggested ${res.data.suggested_deduction} marks from attendance logs.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to calculate attendance logs');
    } finally {
      setSuggestingAtt(false);
    }
  };

  // ── Hasintha: Finalize ─────────────────────────────────────────────────────
  const handleInitiateFinalize = () => {
    if (!sheet) return;
    // Check all marks
    const unassignedMarks = objectives.some(o => o.actual_marks === '' || o.actual_marks === null);
    if (unassignedMarks) {
      toast.error('Please enter Actual Marks for every objective before finalizing.');
      return;
    }
    setFinalizeModalOpen(true);
  };

  const handleExecuteFinalize = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      const res = await api.post(`/hr/appraisals/${sheet.id}/finalize`);
      toast.success(res.data?.message || 'Appraisal officially finalized!');
      setFinalizeModalOpen(false);
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finalize appraisal');
    } finally {
      setSaving(false);
    }
  };

  // ── Hasintha: Return to employee ───────────────────────────────────────────
  const handleReturnToEmployee = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      const res = await api.post(`/hr/appraisals/${sheet.id}/return`, { note: returnNote });
      toast.success(res.data?.message || 'Appraisal returned to employee for updates.');
      setReturnModalOpen(false);
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return appraisal');
    } finally {
      setSaving(false);
    }
  };

  // ── Hasintha: Reopen finalized sheet ──────────────────────────────────────
  const handleInitiateReopen = () => {
    if (!sheet) return;
    setReopenModalOpen(true);
  };

  const handleExecuteReopen = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      const res = await api.post(`/hr/appraisals/${sheet.id}/reopen`);
      toast.success(res.data?.message || 'Appraisal reopened for editing.');
      setReopenModalOpen(false);
      setData(res.data);
      if (onSheetUpdated) onSheetUpdated();
      loadSheet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen appraisal');
    } finally {
      setSaving(false);
    }
  };

  // ── Load Change History (Revisions) ────────────────────────────────────────
  const openHistoryDrawer = async () => {
    if (!sheet) return;
    setHistoryOpen(true);
    setLoadingRevisions(true);
    try {
      const res = await api.get(`/hr/appraisals/${sheet.id}/revisions`);
      setRevisions(res.data || []);
    } catch {
      toast.error('Failed to load change history');
    } finally {
      setLoadingRevisions(false);
    }
  };

  // Format month for header
  const formattedMonth = useMemo(() => {
    try {
      return new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    } catch {
      return month;
    }
  }, [month]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '0.75rem' }}>
        <Loader2 size={32} className="animate-spin" color="#0284c7" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading appraisal sheet...</span>
      </div>
    );
  }

  const isFinalized = sheet?.status === 'finalized';
  const statusKey = !hasAssignedObjectives ? 'not_assigned' : (sheet?.status || 'open');
  const statusBadge = STATUS_BADGES[statusKey] || STATUS_BADGES.open;

  // Permissions convenience
  const canEditObj = permissions.can_edit_objectives && editingObjectives;
  const canEditAch = permissions.can_edit_achievements;
  const canEditMarks = permissions.can_edit_marks && !isFinalized;
  const canEditDed = permissions.can_edit_deductions;
  const canPrint = Boolean(permissions.can_print ?? permissions.is_hr);

  return (
    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--surface-2, #e2e8f0)', padding: '0rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-2, #e2e8f0)' }}>
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: 'none', color: '#0284c7', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '0.4rem' }}
            >
              ← Back to Overview
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--dark, #0f172a)' }}>
              Monthly Performance Appraisal
            </h2>
            <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: statusBadge.bg, color: statusBadge.color }}>
              {statusBadge.label}
            </span>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
            Circle Engineering (Pvt) Ltd · Performance Cycle: <strong style={{ color: 'var(--dark, #0f172a)' }}>{formattedMonth}</strong>
          </p>
        </div>

        {/* Action Controls & Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sheet?.revisions_count > 0 && (
            <button
              type="button"
              onClick={openHistoryDrawer}
              className="btn btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569', fontWeight: 600, padding: '0.4rem 0.75rem', borderRadius: '8px' }}
            >
              <History size={14} /> Change History ({sheet.revisions_count})
            </button>
          )}

          {sheet && canPrint && (
            <button
              type="button"
              onClick={() => setScorecardOpen(true)}
              className="btn btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#fff', border: '1.5px solid #10b981', color: '#047857', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 0.85rem', borderRadius: '8px' }}
            >
              <Printer size={14} /> Printable Form
            </button>
          )}
        </div>
      </div>

      {/* ── Employee & Appraiser Header Pill ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '0.85rem 1.1rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
        <div>
          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>Employee</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
              {employee?.full_name?.charAt(0) || 'E'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>{employee?.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {employee?.epf_no || employee?.employee_id ? `${employee.epf_no || employee.employee_id} · ` : ''}{employee?.designation || 'Staff'} {employee?.department ? `(${employee.department})` : ''}
              </div>
            </div>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em' }}>Appraiser / Project Director</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
              {appraiser?.full_name?.charAt(0) || 'H'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--dark)' }}>
                {appraiser?.full_name || 'Hasintha Rathnayake'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {appraiser?.designation || 'GM / Project Director'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Appraiser Control Banner (When Hasintha is managing objectives) ─ */}
      {permissions.is_appraiser && !isFinalized && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.65rem 1rem', borderRadius: '10px', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#1e40af' }}>
            <Edit3 size={16} />
            <span>
              {editingObjectives
                ? 'Editing mode active: Adjust objectives, weights, and deadlines directly in the table.'
                : hasAssignedObjectives
                  ? 'Objectives are active for this month. You can adjust them anytime with a change reason.'
                  : 'No objectives assigned yet. Add up to 5 objectives (total weight must be 100%).'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {!editingObjectives ? (
              <button
                type="button"
                onClick={() => setEditingObjectives(true)}
                className="btn btn-sm btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
              >
                <Edit3 size={14} style={{ marginRight: '0.3rem' }} /> Edit Objectives
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    loadSheet();
                    setEditingObjectives(false);
                  }}
                  className="btn btn-sm"
                  style={{ background: '#fff', border: '1px solid #cbd5e1', fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInitiateSaveObjectives}
                  disabled={saving}
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} style={{ marginRight: '0.3rem' }} />}
                  Save Objectives
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Scroll Hint (Hidden on Desktop) ── */}
      <div className="portal-scroll-hint">
        <span>↔ Swipe table horizontally to view all columns & marks</span>
      </div>

      {/* ── MAIN APPRAISAL TABLE (Paper-Style) ─────────────────────────────── */}
      <div className="portal-table-scroll" style={{ border: '1px solid #0f172a', borderRadius: '8px', marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#0f172a' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800, width: '28%', borderRight: '1px solid #cbd5e1' }}>
                Objective
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '10%', borderRight: '1px solid #cbd5e1' }}>
                Weight
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '13%', borderRight: '1px solid #cbd5e1' }}>
                Dead Line
              </th>
              <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', fontWeight: 800, width: '27%', borderRight: '1px solid #cbd5e1' }}>
                Achievement
                <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#64748b' }}>
                  (Employee fill end of the month)
                </span>
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '12%', borderRight: '1px solid #cbd5e1' }}>
                Status of objectives
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '10%' }}>
                Actual Marks
              </th>
            </tr>
          </thead>
          <tbody>
            {objectives.map((obj, idx) => {
              const maxMark = parseFloat(obj.weight) || 0;
              const markVal = obj.actual_marks !== '' && obj.actual_marks !== null ? parseFloat(obj.actual_marks) : null;
              const markValid = markVal === null || (markVal >= 0 && markVal <= maxMark);

              return (
                <tr key={obj.id || `temp-${idx}`} style={{ borderBottom: '1px solid #cbd5e1', verticalAlign: 'top', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {/* 1. Objective Title & Description */}
                  <td style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid #cbd5e1' }}>
                    {canEditObj ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7' }}>Objective #{idx + 1}</span>
                          {objectives.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeObjectiveRow(idx)}
                              title="Remove objective"
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 0.2rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={obj.title}
                          onChange={(e) => updateObjectiveField(idx, 'title', e.target.value)}
                          placeholder="Enter objective title..."
                          style={{ width: '100%', padding: '0.4rem 0.55rem', border: '1px solid #94a3b8', borderRadius: '6px', fontSize: '0.83rem', fontWeight: 600 }}
                        />
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                          Objective {idx + 1}: {obj.title || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending assignment</span>}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* 2. Weight % */}
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                    {canEditObj ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={obj.weight}
                          onChange={(e) => updateObjectiveField(idx, 'weight', e.target.value)}
                          style={{ width: '55px', padding: '0.35rem', textAlign: 'center', border: '1px solid #94a3b8', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                        />
                        <span style={{ fontWeight: 700 }}>%</span>
                      </div>
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                        {obj.weight ? `${obj.weight}%` : '—'}
                      </span>
                    )}
                  </td>

                  {/* 3. Dead Line */}
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                    {canEditObj ? (
                      <input
                        type="date"
                        value={obj.deadline}
                        onChange={(e) => updateObjectiveField(idx, 'deadline', e.target.value)}
                        style={{ width: '100%', padding: '0.35rem 0.4rem', border: '1px solid #94a3b8', borderRadius: '6px', fontSize: '0.78rem' }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: obj.deadline ? '#334155' : '#94a3b8' }}>
                        {obj.deadline ? new Date(obj.deadline).toLocaleDateString('en-GB') : '—'}
                      </span>
                    )}
                  </td>

                  {/* 4. Achievement */}
                  <td style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid #cbd5e1' }}>
                    {canEditAch ? (
                      <textarea
                        rows={2}
                        value={obj.achievement}
                        onChange={(e) => updateObjectiveField(idx, 'achievement', e.target.value)}
                        placeholder="Describe your achievement / progress..."
                        style={{ width: '100%', padding: '0.4rem 0.55rem', border: '1.5px solid #0284c7', borderRadius: '6px', fontSize: '0.82rem', resize: 'vertical' }}
                      />
                    ) : (
                      <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: obj.achievement ? '#0f172a' : '#94a3b8', fontStyle: obj.achievement ? 'normal' : 'italic' }}>
                        {obj.achievement || (isFinalized ? 'No achievement notes' : 'Employee will fill at end of month')}
                      </div>
                    )}
                  </td>

                  {/* 5. Status of objectives */}
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                    {canEditAch ? (
                      <select
                        value={obj.status}
                        onChange={(e) => updateObjectiveField(idx, 'status', e.target.value)}
                        style={{ padding: '0.35rem 0.4rem', border: '1.5px solid #0284c7', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, width: '100%' }}
                      >
                        <option value="not_started">Not started</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: obj.status === 'completed' ? '#dcfce7' : obj.status === 'in_progress' ? '#e0f2fe' : '#f1f5f9',
                        color: obj.status === 'completed' ? '#15803d' : obj.status === 'in_progress' ? '#0369a1' : '#64748b'
                      }}>
                        {obj.status === 'completed' ? 'Completed' : obj.status === 'in_progress' ? 'In progress' : 'Not started'}
                      </span>
                    )}
                  </td>

                  {/* 6. Actual Marks (entered out of weight) */}
                  <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>
                    {canEditMarks ? (
                      <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <input
                            type="number"
                            min="0"
                            max={maxMark}
                            step="0.5"
                            value={obj.actual_marks}
                            onChange={(e) => updateObjectiveField(idx, 'actual_marks', e.target.value)}
                            placeholder="0"
                            style={{
                              width: '55px',
                              padding: '0.35rem',
                              textAlign: 'center',
                              border: markValid ? '1.5px solid #8b5cf6' : '2px solid #ef4444',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              background: '#faf5ff'
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>/{maxMark}</span>
                        </div>
                        {!markValid && (
                          <div style={{ fontSize: '0.65rem', color: '#ef4444', marginTop: '0.2rem' }}>
                            Max {maxMark}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontWeight: 900, fontSize: '0.95rem', color: markVal !== null ? '#0f172a' : '#94a3b8' }}>
                        {markVal !== null ? markVal : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Add row button for Appraiser in editing mode */}
            {canEditObj && objectives.length < 5 && (
              <tr>
                <td colSpan={6} style={{ padding: '0.5rem', textAlign: 'center', background: '#f8fafc' }}>
                  <button
                    type="button"
                    onClick={addObjectiveRow}
                    style={{ background: 'transparent', border: '1px dashed #0284c7', color: '#0284c7', padding: '0.35rem 0.9rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Objective Row ({objectives.length}/5)
                  </button>
                </td>
              </tr>
            )}

            {/* ── Appraiser's Comments & Deductions Block ────────────────── */}
            {/* Row 1: Appraiser Comments (spanning cols 1-3, rows 1-2) + Attendance Notes + Attendance Label + Attendance Marks */}
            <tr style={{ borderTop: '2px solid #0f172a', borderBottom: '1px solid #cbd5e1' }}>
              <td rowSpan={2} colSpan={3} style={{ padding: '0.75rem 0.85rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'top', width: '51%' }}>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                  Appraiser's Comments
                </div>
                {permissions.is_appraiser && !isFinalized ? (
                  <textarea
                    rows={4}
                    value={appraiserComments}
                    onChange={(e) => setAppraiserComments(e.target.value)}
                    placeholder="Enter appraisal evaluation feedback & notes..."
                    style={{ width: '100%', padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
                  />
                ) : (
                  <div style={{ fontSize: '0.82rem', color: appraiserComments ? '#0f172a' : '#94a3b8', fontStyle: appraiserComments ? 'normal' : 'italic' }}>
                    {appraiserComments || 'No appraiser remarks recorded.'}
                  </div>
                )}
              </td>

              {/* Attendance Notes (under Achievement column) */}
              <td style={{ padding: '0.65rem 0.75rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle', width: '27%', borderBottom: '1px solid #e2e8f0' }}>
                {canEditDed ? (
                  <input
                    type="text"
                    value={attendanceNotes}
                    onChange={(e) => setAttendanceNotes(e.target.value)}
                    placeholder="Attendance notes (Late arrivals, missed punch)..."
                    title="Attendance deduction notes"
                    style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #0891b2', borderRadius: '6px', fontSize: '0.8rem', background: '#f0fdfa' }}
                  />
                ) : (
                  <div style={{ fontSize: '0.82rem', color: attendanceNotes ? '#0f172a' : '#94a3b8', fontStyle: attendanceNotes ? 'normal' : 'italic', wordBreak: 'break-word', lineHeight: 1.35 }}>
                    {attendanceNotes || '—'}
                  </div>
                )}
              </td>

              {/* Attendance label (under Status column) */}
              <td style={{ padding: '0.65rem 0.65rem', borderRight: '1px solid #cbd5e1', fontWeight: 800, verticalAlign: 'middle', textAlign: 'right', width: '12%', borderBottom: '1px solid #e2e8f0', color: '#0f172a' }}>
                Attendance
              </td>

              {/* Attendance deduction marks (under Actual Marks column) */}
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', width: '10%', borderBottom: '1px solid #e2e8f0' }}>
                {canEditDed ? (
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={attendanceDed}
                    onChange={(e) => setAttendanceDed(e.target.value)}
                    title="Attendance deduction marks (0 to 10)"
                    style={{ width: '55px', padding: '0.25rem', textAlign: 'center', border: '1.5px solid #0891b2', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}
                  />
                ) : (
                  <span style={{ fontWeight: 800, color: attendanceDed > 0 ? '#b45309' : '#0f172a' }}>
                    {attendanceDed > 0 ? `-${attendanceDed}` : '0'}
                  </span>
                )}
              </td>
            </tr>

            {/* Row 2: Misconduct Notes + Misconduct Label + Misconduct Marks */}
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              {/* Misconduct Notes (under Achievement column) */}
              <td style={{ padding: '0.65rem 0.75rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle', width: '27%' }}>
                {canEditDed ? (
                  <input
                    type="text"
                    value={misconductNotes}
                    onChange={(e) => setMisconductNotes(e.target.value)}
                    placeholder="Misconduct notes (Discipline, policy violations)..."
                    title="Misconduct deduction notes"
                    style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #ef4444', borderRadius: '6px', fontSize: '0.8rem', background: '#fef2f2' }}
                  />
                ) : (
                  <div style={{ fontSize: '0.82rem', color: misconductNotes ? '#0f172a' : '#94a3b8', fontStyle: misconductNotes ? 'normal' : 'italic', wordBreak: 'break-word', lineHeight: 1.35 }}>
                    {misconductNotes || '—'}
                  </div>
                )}
              </td>

              {/* Misconduct label (under Status column) */}
              <td style={{ padding: '0.65rem 0.65rem', borderRight: '1px solid #cbd5e1', fontWeight: 800, verticalAlign: 'middle', textAlign: 'right', width: '12%', color: '#0f172a' }}>
                Misconduct
              </td>

              {/* Misconduct deduction marks (under Actual Marks column) */}
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', width: '10%' }}>
                {canEditDed ? (
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="1"
                    value={misconductDed}
                    onChange={(e) => setMisconductDed(e.target.value)}
                    title="Misconduct deduction marks (0 to 30)"
                    style={{ width: '55px', padding: '0.25rem', textAlign: 'center', border: '1.5px solid #ef4444', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 800 }}
                  />
                ) : (
                  <span style={{ fontWeight: 800, color: misconductDed > 0 ? '#ef4444' : '#0f172a' }}>
                    {misconductDed > 0 ? `-${misconductDed}` : '0'}
                  </span>
                )}
              </td>
            </tr>

            {/* ── Summary & Grade Row ────────────────────────────────────── */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #0f172a', fontWeight: 800 }}>
              <td style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Combined Weight Target: </span>
                <strong style={{ color: Math.abs(totalWeight - 100) < 0.01 ? '#15803d' : '#ef4444' }}>
                  {totalWeight}% {Math.abs(totalWeight - 100) < 0.01 ? '✓' : '(Must equal 100%)'}
                </strong>
              </td>
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', fontSize: '0.95rem' }}>
                100%
              </td>
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>
                Appraiser
              </td>
              <td style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>
                {appraiser?.full_name || 'Hasintha Rathnayake - GM'}
              </td>
              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontWeight: 900 }}>
                Total
              </td>
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontSize: '1.15rem', fontWeight: 900, color: '#0284c7' }}>
                {liveFinalScore}
              </td>
            </tr>

            {/* Performance Grade Row */}
            <tr style={{ background: GRADE_CONFIG[liveGrade]?.bg || '#f1f5f9', fontWeight: 800 }}>
              <td colSpan={4} style={{ padding: '0.65rem 0.85rem', borderRight: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#475569' }}>
                Variable Performance Pay: <strong>{GRADE_CONFIG[liveGrade]?.pay}</strong> ({GRADE_CONFIG[liveGrade]?.label})
              </td>
              <td style={{ padding: '0.65rem 0.65rem', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontWeight: 900, fontSize: '0.82rem' }}>
                Monthly Performance Grade
              </td>
              <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, color: GRADE_CONFIG[liveGrade]?.color || '#0f172a' }}>
                {liveGrade}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Policy Footer Text ─────────────────────────────────────────────── */}
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 0 1.25rem 0', lineHeight: 1.5, fontStyle: 'italic' }}>
        Employee performance is not limited to completion of operational objectives. Attendance, discipline, professional conduct and compliance with Company policies are also considered part of overall performance.
      </p>

      {/* ── HR Deductions Notes & Helper (Visible to HR or when populated) ── */}
      {permissions.is_hr && !isFinalized && (
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldAlert size={15} /> HR Deduction Management
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleSuggestAttendance}
                disabled={suggestingAtt}
                className="btn btn-sm"
                style={{ background: '#fff', border: '1px solid #0d9488', color: '#0f766e', fontSize: '0.74rem', padding: '0.25rem 0.65rem', borderRadius: '6px', fontWeight: 600 }}
              >
                {suggestingAtt ? <Loader2 size={12} className="animate-spin" /> : 'Suggest from Clock Logs'}
              </button>
              <button
                type="button"
                onClick={handleSaveDeductions}
                disabled={saving}
                className="btn btn-sm btn-primary"
                style={{ background: '#0d9488', borderColor: '#0d9488', fontSize: '0.74rem', padding: '0.25rem 0.75rem', borderRadius: '6px' }}
              >
                Save Deductions
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#134e4a', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                Attendance deduction notes (Late, absent, unclosed punch)
              </label>
              <input
                type="text"
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                placeholder="Reason / breakdown..."
                style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#134e4a', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                Misconduct deduction notes (Discipline, policy violations)
              </label>
              <input
                type="text"
                value={misconductNotes}
                onChange={(e) => setMisconductNotes(e.target.value)}
                placeholder="Incident details / warning ref..."
                style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Employee Comment / Feedback Input ──────────────────────────────── */}
      {permissions.is_self && !isFinalized && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dark)', display: 'block', marginBottom: '0.3rem' }}>
            Employee Self-Comments / Monthly Reflections (Optional)
          </label>
          <textarea
            rows={2}
            value={employeeComments}
            onChange={(e) => setEmployeeComments(e.target.value)}
            disabled={!canEditAch}
            placeholder="Add any context on obstacles, key wins, or support needed..."
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem' }}
          />
        </div>
      )}

      {/* ── Action Toolbar (Role-Specific) ─────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--surface-2, #e2e8f0)', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {isFinalized && sheet?.finalized_at && (
            <span>
              Official grade published by <strong>{sheet.finalized_by?.name || 'Appraiser'}</strong> on {new Date(sheet.finalized_at).toLocaleDateString('en-GB')}.
            </span>
          )}
          {sheet?.status === 'submitted' && (
            <span style={{ color: '#b45309', fontWeight: 600 }}>
              Submitted by employee on {new Date(sheet.submitted_at || Date.now()).toLocaleDateString('en-GB')}. Pending marks and finalization.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Employee: Save Progress or Submit */}
          {canEditAch && (
            <>
              <button
                type="button"
                onClick={() => handleSaveAchievements(false)}
                disabled={saving}
                className="btn btn-sm"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', fontWeight: 600, padding: '0.45rem 0.9rem', borderRadius: '8px' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} style={{ marginRight: '0.3rem' }} />}
                Save Progress
              </button>
              <button
                type="button"
                onClick={() => handleSaveAchievements(true)}
                disabled={saving}
                className="btn btn-sm btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700, padding: '0.45rem 1.1rem', borderRadius: '8px' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} style={{ marginRight: '0.3rem' }} />}
                Submit to Appraiser
              </button>
            </>
          )}

          {/* Hasintha: Save Marks / Return / Finalize */}
          {permissions.is_appraiser && !isFinalized && hasAssignedObjectives && (
            <>
              <button
                type="button"
                onClick={handleSaveMarks}
                disabled={saving}
                className="btn btn-sm"
                style={{ background: '#faf5ff', border: '1.5px solid #8b5cf6', color: '#6d28d9', fontWeight: 700, padding: '0.45rem 0.9rem', borderRadius: '8px' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} style={{ marginRight: '0.3rem' }} />}
                Save Marks
              </button>

              {permissions.can_return && (
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(true)}
                  disabled={saving}
                  className="btn btn-sm"
                  style={{ background: '#fff', border: '1px solid #f59e0b', color: '#b45309', fontWeight: 600, padding: '0.45rem 0.85rem', borderRadius: '8px' }}
                >
                  <RotateCcw size={14} style={{ marginRight: '0.3rem' }} /> Return to Employee
                </button>
              )}

              <button
                type="button"
                onClick={handleInitiateFinalize}
                disabled={saving}
                className="btn btn-sm btn-primary"
                style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: 800, padding: '0.45rem 1.25rem', borderRadius: '8px' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} style={{ marginRight: '0.3rem' }} />}
                Finalize Appraisal
              </button>
            </>
          )}

          {/* Hasintha: Reopen Finalized Sheet */}
          {permissions.is_appraiser && isFinalized && (
            <button
              type="button"
              onClick={handleInitiateReopen}
              disabled={saving}
              className="btn btn-sm"
              style={{ background: '#fff', border: '1.5px solid #ef4444', color: '#dc2626', fontWeight: 700, padding: '0.45rem 1rem', borderRadius: '8px' }}
            >
              <Unlock size={14} style={{ marginRight: '0.3rem' }} /> Reopen for Adjustments
            </button>
          )}
        </div>
      </div>

      {/* ── MODAL: Reason for Changing Assigned Objectives ────────────────── */}
      {reasonModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#b45309' }}>
              <AlertCircle size={20} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--dark)' }}>
                Procedure: Reason for Objective Change
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.4 }}>
              These objectives were already assigned for {formattedMonth}. To maintain audit compliance, please state the reason for modifying or reallocating the objectives (e.g. project scope change, client priority shift).
            </p>

            <textarea
              rows={3}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="E.g., Site A commissioning delayed by CEB; redistributed weight to inverter installation..."
              style={{ width: '100%', padding: '0.6rem', border: '1.5px solid #0284c7', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="btn btn-sm"
                style={{ background: '#f1f5f9', border: 'none', padding: '0.45rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!changeReason.trim()) {
                    toast.error('Reason is required.');
                    return;
                  }
                  executeSaveObjectives(changeReason.trim());
                }}
                disabled={saving}
                className="btn btn-sm btn-primary"
                style={{ padding: '0.45rem 1.1rem' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Return to Employee Note ─────────────────────────────────── */}
      {returnModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
              Return Appraisal to Employee
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              The sheet will be reopened for {employee.full_name} to revise their achievements.
            </p>
            <textarea
              rows={3}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Add feedback on what needs revision (e.g. provide evidence for Objective 2)..."
              style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                className="btn btn-sm"
                style={{ background: '#f1f5f9', border: 'none' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReturnToEmployee}
                disabled={saving}
                className="btn btn-sm btn-primary"
                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER: Revision History ───────────────────────────────────────── */}
      {historyOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1300, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '440px', height: '100%', padding: '1.5rem', overflowY: 'auto', boxShadow: '-4px 0 20px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Objective Change Log</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {loadingRevisions ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} className="animate-spin" color="#0284c7" />
              </div>
            ) : revisions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No mid-month objective changes recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {revisions.map((rev) => (
                  <div key={rev.id} style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: rev.action === 'added' ? '#dcfce7' : rev.action === 'removed' ? '#fee2e2' : '#e0f2fe',
                        color: rev.action === 'added' ? '#15803d' : rev.action === 'removed' ? '#b91c1c' : '#0369a1'
                      }}>
                        {rev.action}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {new Date(rev.created_at).toLocaleString('en-GB')}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: '0.25rem' }}>
                      {rev.new_values?.title || rev.old_values?.title}
                    </div>

                    {rev.old_values && rev.new_values && (
                      <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: '0.35rem' }}>
                        Weight: {rev.old_values.weight}% → <strong>{rev.new_values.weight}%</strong>
                      </div>
                    )}

                    {rev.reason && (
                      <div style={{ background: '#fff', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.74rem', color: '#334155', fontStyle: 'italic' }}>
                        "{rev.reason}"
                      </div>
                    )}

                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                      Changed by: {rev.changed_by?.name || 'Hasintha'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm Finalization & Lock ─────────────────────────────── */}
      {finalizeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setFinalizeModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              position: 'relative',
            }}
          >
            {/* Close 'X' button */}
            <button
              type="button"
              onClick={() => !saving && setFinalizeModalOpen(false)}
              disabled={saving}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'transparent',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                color: '#94a3b8',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Header with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                }}
              >
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Finalize & Lock Appraisal
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Performance Cycle · <strong>{formattedMonth} ({month})</strong>
                </p>
              </div>
            </div>

            {/* Employee Info Pill */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {employee?.full_name?.charAt(0) || 'E'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  {employee?.full_name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {employee?.employee_id ? `${employee.employee_id} · ` : ''}{employee?.designation || 'Staff'} {employee?.department ? `(${employee.department})` : ''}
                </div>
              </div>
            </div>

            {/* Score & Grade Highlight Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '1rem 1.15rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#047857', letterSpacing: '0.04em' }}>
                    Calculated Final Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.1rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#065f46', lineHeight: 1 }}>
                      {liveFinalScore}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#059669' }}>/ 100</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      background: GRADE_CONFIG[liveGrade]?.bg || 'rgba(16,185,129,0.12)',
                      color: GRADE_CONFIG[liveGrade]?.color || '#059669',
                      border: `1px solid ${GRADE_CONFIG[liveGrade]?.border || '#10b981'}`,
                    }}
                  >
                    Grade {liveGrade}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '0.25rem', fontWeight: 600 }}>
                    {GRADE_CONFIG[liveGrade]?.label?.split('·')[1]?.trim() || ''}
                  </div>
                </div>
              </div>

              {/* Score Breakdown Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '0.5rem',
                  paddingTop: '0.65rem',
                  borderTop: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.74rem',
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ color: '#047857', fontSize: '0.66rem', fontWeight: 600 }}>Objectives Marks</div>
                  <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.88rem' }}>{totalActualMarks}</div>
                </div>
                <div>
                  <div style={{ color: '#047857', fontSize: '0.66rem', fontWeight: 600 }}>Attendance Ded.</div>
                  <div style={{ fontWeight: 800, color: attendanceDed > 0 ? '#b91c1c' : '#065f46', fontSize: '0.88rem' }}>
                    {attendanceDed > 0 ? `-${attendanceDed}` : '0'}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#047857', fontSize: '0.66rem', fontWeight: 600 }}>Misconduct Ded.</div>
                  <div style={{ fontWeight: 800, color: misconductDed > 0 ? '#b91c1c' : '#065f46', fontSize: '0.88rem' }}>
                    {misconductDed > 0 ? `-${misconductDed}` : '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Lock Warning Notice */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                padding: '0.75rem 0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '1px' }} />
              <div style={{ fontSize: '0.76rem', color: '#92400e', lineHeight: 1.45 }}>
                Finalizing will officially <strong>lock this appraisal sheet</strong>. The final score and grade will become official records for HR and annual increment assessments. You can reopen it later if modifications are required.
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setFinalizeModalOpen(false)}
                disabled={saving}
                className="btn btn-ghost"
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteFinalize}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  background: '#059669',
                  borderColor: '#059669',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.55rem 1.35rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                <span>Confirm & Lock Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Confirm Reopen Sheet ────────────────────────────────────── */}
      {reopenModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1250,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setReopenModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '460px',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Unlock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Reopen Appraisal Sheet
                </h3>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                  Unlock sheet for {employee?.full_name} ({formattedMonth})
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Reopening this appraisal will return its status from <strong>Finalized</strong> back to <strong>In Progress</strong>. You will be able to update actual marks, evaluator comments, or request HR to adjust deductions.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setReopenModalOpen(false)}
                disabled={saving}
                className="btn btn-ghost"
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReopen}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  background: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#fff',
                  fontWeight: 700,
                  padding: '0.5rem 1.25rem',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />}
                <span>Confirm & Reopen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRINTABLE SCORECARD MODAL ──────────────────────────────────────── */}
      {scorecardOpen && sheet && canPrint && (
        <PrintableScorecardModal
          appraisalId={sheet.id}
          appraisalData={{ ...sheet, employee: data?.employee || sheet?.employee, evaluator: data?.appraiser || sheet?.evaluator }}
          isOpen={scorecardOpen}
          onClose={() => setScorecardOpen(false)}
        />
      )}
    </div>
  );
};

export default AppraisalSheet;
