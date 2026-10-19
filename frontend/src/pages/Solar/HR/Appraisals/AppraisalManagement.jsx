import { useState, useEffect, useCallback } from 'react';
import {
  Award, Target, CheckCircle, Clock, AlertTriangle, Loader2,
  Calendar, FileText, Search, Filter, ShieldAlert, Sparkles,
  ChevronRight, X, TrendingUp, Sliders, CheckSquare, RefreshCw,
  Percent, ArrowRight, Printer, BellRing, Send
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import PrintableScorecardModal from './PrintableScorecardModal';
import PerformanceTrendSparkline from './PerformanceTrendSparkline';

const GRADE_CONFIG = {
  S1: { label: 'S1 · Outstanding', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: '#8b5cf6', pay: '116% - 120%' },
  S2: { label: 'S2 · Excellent',   color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981', pay: '110% - 115%' },
  A1: { label: 'A1 · Meets Exp.',   color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', border: '#0ea5e9', pay: '95% - 109%' },
  A2: { label: 'A2 · Needs Impr.',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', pay: '80% - 94%' },
  C:  { label: 'C · Unacceptable', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', pay: '0%' },
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

export const AppraisalManagement = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [departmentId, setDepartmentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [search, setSearch] = useState('');

  const [departments, setDepartments] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal: HR Deductions
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState(null);
  const [attendanceDed, setAttendanceDed] = useState(0);
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [misconductDed, setMisconductDed] = useState(0);
  const [misconductSeverity, setMisconductSeverity] = useState('none');
  const [misconductNotes, setMisconductNotes] = useState('');
  const [hrComments, setHrComments] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [attendanceBreakdown, setAttendanceBreakdown] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal: View Full Details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState(null);

  // Modal: Printable Official Scorecard
  const [scorecardAppraisalId, setScorecardAppraisalId] = useState(null);
  const [scorecardAppraisalData, setScorecardAppraisalData] = useState(null);
  const [scorecardOpen, setScorecardOpen] = useState(false);

  // Modal: Trigger Reminders
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  const handleTriggerReminders = async (type) => {
    setSendingReminder(true);
    try {
      const res = await api.post('/hr/appraisals/send-reminder', { type });
      toast.success(res.data?.message || 'MBO Reminder notifications dispatched successfully');
      setReminderModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminders');
    } finally {
      setSendingReminder(false);
    }
  };

  // Fetch reference departments
  useEffect(() => {
    api.get('/hr/departments').then(r => setDepartments(r.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month: currentMonth };
      if (departmentId) params.department_id = departmentId;
      if (statusFilter) params.status = statusFilter;
      if (gradeFilter) params.grade = gradeFilter;
      if (search) params.search = search;

      const [listRes, statsRes] = await Promise.all([
        api.get('/hr/appraisals', { params }),
        api.get('/hr/appraisals/stats', { params: { month: currentMonth } }),
      ]);

      setAppraisals(listRes.data?.data || listRes.data || []);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load appraisals data');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, departmentId, statusFilter, gradeFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open HR Deduction modal
  const openDeductionModal = (appraisal) => {
    setSelectedAppraisal(appraisal);
    setAttendanceDed(appraisal.attendance_deduction ?? 0);
    setAttendanceNotes(appraisal.attendance_deduction_notes ?? '');
    setMisconductDed(appraisal.misconduct_deduction ?? 0);
    setMisconductSeverity(appraisal.misconduct_severity ?? 'none');
    setMisconductNotes(appraisal.misconduct_deduction_notes ?? '');
    setHrComments(appraisal.hr_comments ?? '');
    setAttendanceBreakdown(null);
    setDeductionModalOpen(true);
  };

  // Auto-calculate suggested attendance deduction from real clock records
  const handleAutoSuggestAttendance = async () => {
    if (!selectedAppraisal) return;
    setCalcLoading(true);
    try {
      const res = await api.get(`/hr/appraisals/${selectedAppraisal.id}/suggest-attendance`);
      setAttendanceDed(res.data.suggested_deduction);
      setAttendanceNotes(res.data.suggested_notes);
      setAttendanceBreakdown(res.data.details);
      toast.success(`Suggested ${res.data.suggested_deduction} marks deduction based on clock logs.`);
    } catch {
      toast.error('Could not compute attendance logs');
    } finally {
      setCalcLoading(false);
    }
  };

  // Live computed final score in deduction modal
  const objScore = parseFloat(selectedAppraisal?.objective_score || 0);
  const liveFinalScore = Math.max(0, Math.min(100, objScore - parseFloat(attendanceDed || 0) - parseFloat(misconductDed || 0)));

  const handleSaveDeductions = async (e) => {
    e.preventDefault();
    if (!selectedAppraisal) return;

    const misVal = parseFloat(misconductDed || 0);
    if (misconductSeverity === 'minor' && misVal > 10) {
      toast.error('Minor misconduct deduction cannot exceed 10 marks (Section 2.4)');
      return;
    }
    if (misconductSeverity === 'moderate' && (misVal < 11 || misVal > 19)) {
      toast.error('Moderate misconduct deduction must be between 11 and 19 marks (Section 2.4)');
      return;
    }
    if (misconductSeverity === 'serious' && (misVal < 20 || misVal > 30)) {
      toast.error('Serious misconduct deduction must be between 20 and 30 marks (Section 2.4)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/hr/appraisals/${selectedAppraisal.id}/deductions`, {
        attendance_deduction: parseFloat(attendanceDed || 0),
        attendance_deduction_notes: attendanceNotes,
        misconduct_deduction: misVal,
        misconduct_severity: misconductSeverity,
        misconduct_deduction_notes: misconductNotes,
        hr_comments: hrComments,
      });

      toast.success('Deductions applied and submitted to Project Director!');
      setDeductionModalOpen(false);
      setSelectedAppraisal(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply deductions');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '0rem', maxWidth: '1360px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={26} color="#3b82f6" />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Performance Appraisal (MBO)
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
            Monthly Management by Objectives Policy · Circle Engineering (Pvt) Ltd
          </p>
        </div>

        {/* Actions & Month Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setReminderModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '0.5rem 0.85rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <BellRing size={15} color="#f59e0b" />
            <span>Send Reminders</span>
          </button>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.45rem 0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Calendar size={16} color="#3b82f6" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}
            />
          </div>
        </div>
      </div>

      {/* KPI Overview & Bell Curve Guider */}
      {stats && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Total Appraised</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#0284c7', margin: '0.2rem 0' }}>{stats.total_appraisals}</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>{stats.approved_count} Approved</div>
            </div>

            <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pending HR Review</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#8b5cf6', margin: '0.2rem 0' }}>{stats.pending_hr}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Needs Deductions</div>
            </div>

            <div className="card" style={{ padding: '1.1rem', textAlign: 'center', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pending Director</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b', margin: '0.2rem 0' }}>{stats.pending_director}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Final Sign-off</div>
            </div>

            <div className="card" style={{
              padding: '1.1rem', textAlign: 'center', borderRadius: '12px',
              border: stats.bell_curve.s1_quota_warning ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
              background: stats.bell_curve.s1_quota_warning ? 'rgba(239,68,68,0.03)' : '#fff'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>S1 Quota (Max ~5%)</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#8b5cf6', margin: '0.2rem 0' }}>
                {stats.bell_curve.s1_percentage}%
              </div>
              <div style={{ fontSize: '0.7rem', color: stats.bell_curve.s1_quota_warning ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                {stats.bell_curve.s1_quota_warning ? '⚠️ Exceeds 5% Quota' : `${stats.grade_counts?.S1 || 0} Employees`}
              </div>
            </div>

            <div className="card" style={{
              padding: '1.1rem', textAlign: 'center', borderRadius: '12px',
              border: stats.bell_curve.s2_quota_warning ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
              background: stats.bell_curve.s2_quota_warning ? 'rgba(239,68,68,0.03)' : '#fff'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>S2 Quota (5-10%)</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#10b981', margin: '0.2rem 0' }}>
                {stats.bell_curve.s2_percentage}%
              </div>
              <div style={{ fontSize: '0.7rem', color: stats.bell_curve.s2_quota_warning ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                {stats.bell_curve.s2_quota_warning ? '⚠️ Exceeds 10% Quota' : `${stats.grade_counts?.S2 || 0} Employees`}
              </div>
            </div>
          </div>

          {/* Underperformance Warnings (Section 2.8) */}
          {stats.underperformance_alerts?.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#b91c1c' }}>
                <ShieldAlert size={18} />
                <strong style={{ fontSize: '0.9rem' }}>Consecutive Underperformance Monitoring (Policy Section 2.8)</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.6rem' }}>
                {stats.underperformance_alerts.map((alert, idx) => (
                  <div key={idx} style={{ background: '#fff', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong>{alert.full_name}</strong>
                      <span style={{ color: '#b91c1c', fontWeight: 700 }}>{alert.consecutive}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {alert.department} · <span style={{ color: '#b91c1c', fontWeight: 600 }}>{alert.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.25rem', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <input
              type="text"
              className="form-control"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <select
              className="form-control"
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Goal Setting</option>
              <option value="objectives_confirmed">Objectives Confirmed</option>
              <option value="self_submitted">Employee Submitted</option>
              <option value="manager_evaluated">Manager Evaluated</option>
              <option value="hr_reviewed">HR Reviewed</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <div>
            <select
              className="form-control"
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="">All Grades</option>
              <option value="S1">S1 (Outstanding)</option>
              <option value="S2">S2 (Excellent)</option>
              <option value="A1">A1 (Meets Expectations)</option>
              <option value="A2">A2 (Needs Improvement)</option>
              <option value="C">C (Unacceptable)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
          </div>
        ) : appraisals.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Target size={36} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No employee appraisals found matching current filters for {currentMonth}.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Department / Line Mgr</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Obj. Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Att. Ded.</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Mis. Ded.</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Final Score</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Grade & Pay</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appraisals.map(appraisal => {
                  const emp = appraisal.employee;
                  const statusMeta = STATUS_LABELS[appraisal.status] || { label: appraisal.status, color: '#64748b', bg: '#f1f5f9' };
                  const gradeMeta = GRADE_CONFIG[appraisal.grade];

                  return (
                    <tr key={appraisal.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp?.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{emp?.employee_id}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div>{emp?.department?.name || 'Department'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mgr: {appraisal.evaluator?.full_name || 'Unassigned'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: statusMeta.bg, color: statusMeta.color }}>
                          {statusMeta.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                        {Number(appraisal.objective_score).toFixed(1)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#f59e0b', fontWeight: 600 }}>
                        {appraisal.attendance_deduction > 0 ? `-${appraisal.attendance_deduction}` : '0.0'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#ef4444', fontWeight: 600 }}>
                        {appraisal.misconduct_deduction > 0 ? `-${appraisal.misconduct_deduction}` : '0.0'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.9rem' }}>
                        {Number(appraisal.final_score).toFixed(1)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {appraisal.grade ? (
                          <div>
                            <span style={{
                              padding: '0.15rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800,
                              background: gradeMeta?.bg, color: gradeMeta?.color, border: `1px solid ${gradeMeta?.border}`
                            }}>
                              {appraisal.grade}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: '#0284c7', marginTop: '0.15rem', fontWeight: 600 }}>
                              {appraisal.variable_pay_adjustment}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setScorecardAppraisalId(appraisal.id);
                              setScorecardAppraisalData(appraisal);
                              setScorecardOpen(true);
                            }}
                            className="btn btn-sm btn-ghost"
                            title="Print Official Scorecard / PDF"
                            style={{ fontSize: '0.75rem', border: '1px solid #cbd5e1', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Printer size={13} />
                            <span>Scorecard</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setViewDetail(appraisal);
                              setDetailModalOpen(true);
                            }}
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: '0.75rem', border: '1px solid #e2e8f0' }}
                          >
                            Details
                          </button>

                          {(appraisal.status === 'manager_evaluated' || appraisal.status === 'hr_reviewed' || appraisal.status === 'approved') && (
                            <button
                              type="button"
                              onClick={() => openDeductionModal(appraisal)}
                              className="btn btn-sm btn-primary"
                              style={{
                                fontSize: '0.75rem',
                                background: appraisal.status === 'manager_evaluated' ? '#8b5cf6' : '#0284c7',
                                borderColor: appraisal.status === 'manager_evaluated' ? '#8b5cf6' : '#0284c7'
                              }}
                            >
                              <Sliders size={13} style={{ marginRight: '3px' }} />
                              {appraisal.status === 'manager_evaluated' ? 'Review & Deductions' : 'Edit Deductions'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: HR REVIEW & ATTENDANCE / MISCONDUCT DEDUCTIONS
      ───────────────────────────────────────────────────────────────── */}
      {deductionModalOpen && selectedAppraisal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  HR Deductions & Review: {selectedAppraisal.employee?.full_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Cycle: {selectedAppraisal.period_month} · Objective Score: <strong>{selectedAppraisal.objective_score} pts</strong>
                </span>
              </div>
              <button onClick={() => setDeductionModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Live Computed Final Score Card */}
            <div style={{ padding: '0.85rem 1rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.08) 100%)', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Final Score Calculation</div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                  {objScore} (Obj) - {parseFloat(attendanceDed || 0)} (Att) - {parseFloat(misconductDed || 0)} (Mis) =
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7' }}>
                  {liveFinalScore.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}> / 100</span>
              </div>
            </div>

            <form onSubmit={handleSaveDeductions}>
              {/* 1. Attendance Deduction (0 to 10 marks) */}
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    1. Attendance Deduction (0 to 10 Marks - Section 2.4)
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSuggestAttendance}
                    disabled={calcLoading}
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '0.75rem', color: '#0284c7', background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {calcLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
                    <span>Auto-Calculate from Clock Records</span>
                  </button>
                </div>

                {attendanceBreakdown && (
                  <div style={{ padding: '0.5rem 0.75rem', background: '#fff', borderRadius: '6px', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.65rem', border: '1px solid #e2e8f0' }}>
                    <strong>Clock Log Breakdown:</strong> {attendanceBreakdown.late_count} Late, {attendanceBreakdown.absent_count} Absent, {attendanceBreakdown.auto_clockout_count} Missed Punch, {attendanceBreakdown.short_leave_hours}h Short Leave.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Marks (0-10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      className="form-control"
                      value={attendanceDed}
                      onChange={e => setAttendanceDed(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Attendance Deduction Notes / Justification</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 2 late arrivals, 1 unapproved leave..."
                      value={attendanceNotes}
                      onChange={e => setAttendanceNotes(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Misconduct Deduction (0 to 30 marks) */}
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>
                  2. Misconduct Deduction (0 to 30 Marks - Section 2.4)
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 1fr', gap: '0.65rem', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Severity</label>
                    <select
                      className="form-control"
                      value={misconductSeverity}
                      onChange={e => {
                        const sev = e.target.value;
                        setMisconductSeverity(sev);
                        if (sev === 'none') setMisconductDed(0);
                        if (sev === 'minor' && misconductDed === 0) setMisconductDed(5);
                        if (sev === 'moderate' && (misconductDed < 11 || misconductDed > 19)) setMisconductDed(15);
                        if (sev === 'serious' && misconductDed < 20) setMisconductDed(25);
                      }}
                      style={{ fontSize: '0.82rem' }}
                    >
                      <option value="none">None (0 marks)</option>
                      <option value="minor">Minor (0-10)</option>
                      <option value="moderate">Moderate (11-19)</option>
                      <option value="serious">Serious (20-30)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Marks Deducted</label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      className="form-control"
                      value={misconductDed}
                      onChange={e => setMisconductDed(e.target.value)}
                      disabled={misconductSeverity === 'none'}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Misconduct Evidence / Reference</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Disciplinary warning issued on 12/10..."
                      value={misconductNotes}
                      onChange={e => setMisconductNotes(e.target.value)}
                      disabled={misconductSeverity === 'none'}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. HR Comments */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">HR Consolidation & Policy Review Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Verification comments for Project Director..."
                  value={hrComments}
                  onChange={e => setHrComments(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setDeductionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                  {submitting ? 'Submitting...' : 'Save & Submit to Project Director'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: VIEW FULL SCORECARD DETAILS
      ───────────────────────────────────────────────────────────────── */}
      {detailModalOpen && viewDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Appraisal Scorecard: {viewDetail.employee?.full_name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {viewDetail.employee?.department?.name} · Cycle: {viewDetail.period_month}
                </span>
              </div>
              <button onClick={() => setDetailModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Objectives details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {viewDetail.objectives?.map((obj, idx) => (
                <div key={obj.id} style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.85rem' }}>{idx + 1}. {obj.title} ({obj.weight}%)</strong>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                      Marks: {obj.marks ?? '—'} / 100 (Weighted: {obj.weighted_marks ?? '—'}%)
                    </span>
                  </div>
                  {obj.target_kpi && <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.3rem' }}><strong>KPI:</strong> {obj.target_kpi}</div>}
                  {obj.achievement && (
                    <div style={{ fontSize: '0.75rem', color: '#0f172a', background: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', marginBottom: '0.3rem' }}>
                      <strong>Achievement:</strong> {obj.achievement}
                    </div>
                  )}
                  {obj.manager_comments && (
                    <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontStyle: 'italic' }}>
                      Manager: "{obj.manager_comments}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Remarks trails */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem' }}>
              {viewDetail.manager_comments && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(139,92,246,0.06)', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                  <strong style={{ color: '#8b5cf6' }}>Manager Comments: </strong>{viewDetail.manager_comments}
                </div>
              )}
              {viewDetail.hr_comments && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(14,165,233,0.06)', borderRadius: '8px', borderLeft: '3px solid #0ea5e9' }}>
                  <strong style={{ color: '#0ea5e9' }}>HR Comments: </strong>{viewDetail.hr_comments}
                </div>
              )}
              {viewDetail.director_comments && (
                <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(16,185,129,0.06)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                  <strong style={{ color: '#10b981' }}>Project Director Comments: </strong>{viewDetail.director_comments}
                </div>
              )}
            </div>

            {/* 6-Month Performance Trajectory inside Details Modal */}
            <div style={{ marginBottom: '1.25rem' }}>
              <PerformanceTrendSparkline
                employeeId={viewDetail.employee_id}
                compact={false}
                onOpenScorecard={(appId, item) => {
                  setScorecardAppraisalId(appId);
                  setScorecardAppraisalData(item);
                  setScorecardOpen(true);
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setScorecardAppraisalId(viewDetail.id);
                  setScorecardAppraisalData(viewDetail);
                  setScorecardOpen(true);
                }}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontSize: '0.82rem',
                }}
              >
                <Printer size={15} /> Print Official Scorecard
              </button>

              <button type="button" className="btn btn-ghost" onClick={() => setDetailModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          MODAL: SEND MONTHLY MBO REMINDERS
      ───────────────────────────────────────────────────────────────── */}
      {reminderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', borderRadius: '16px', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BellRing size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Dispatch MBO Reminders</h3>
              </div>
              <button onClick={() => setReminderModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Dispatch in-app notifications and lock-screen WebPush alerts directly to employee and manager devices based on the Circle Engineering MBO policy schedule.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>
                    25th Employee Reminder
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    "Please finalize and submit your monthly MBO self-evaluations." (All active staff)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerReminders('employee')}
                  disabled={sendingReminder}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#3b82f6', borderColor: '#3b82f6', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {sendingReminder ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} Send Now
                </button>
              </div>

              <div style={{
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#0f172a' }}>
                    1st Manager & Director Reminder
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    "Team evaluations & Director approvals pending for last month." (Managers, Admins & Directors)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerReminders('manager')}
                  disabled={sendingReminder}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#f59e0b', borderColor: '#f59e0b', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  {sendingReminder ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />} Send Now
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setReminderModalOpen(false)}
                disabled={sendingReminder}
              >
                Close
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

export default AppraisalManagement;
