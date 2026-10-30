import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Calendar, Filter, Users, CheckCircle2, Clock,
  AlertTriangle, Loader2, ArrowRight, ShieldAlert, Sparkles,
  Award, BellRing, RefreshCw
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../../store/authStore';
import AppraisalSheet from './AppraisalSheet';

const STATUS_PILLS = [
  { key: '',             label: 'All Staff' },
  { key: 'not_assigned', label: 'Not Assigned' },
  { key: 'open',         label: 'In Progress (Open)' },
  { key: 'submitted',    label: 'Ready for Marks (Submitted)' },
  { key: 'finalized',    label: 'Finalized' },
  { key: 'hr_pending',   label: 'Pending HR Review' },
];

const GRADE_COLORS = {
  S1: '#8b5cf6',
  S2: '#10b981',
  A1: '#0ea5e9',
  A2: '#f59e0b',
  C:  '#ef4444',
};

export const AppraisalBoard = ({ isHrView = false }) => {
  const user = useAuthStore(s => s.user);
  const isHr = isHrView || user?.role === 'solar_hr_admin' || user?.role === 'super_admin';

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [boardData, setBoardData] = useState(null);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected employee sheet to view
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Reminders modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Fetch departments
  useEffect(() => {
    api.get('/hr/departments').then(r => setDepartments(r.data || [])).catch(() => {});
  }, []);

  // Fetch board data
  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month };
      if (deptFilter) params.department_id = deptFilter;
      if (search) params.search = search;

      const res = await api.get('/hr/appraisals/board', { params });
      setBoardData(res.data);
    } catch {
      toast.error('Failed to load appraisals board');
    } finally {
      setLoading(false);
    }
  }, [month, deptFilter, search]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Handle Trigger Reminders
  const handleTriggerReminders = async (type) => {
    setSendingReminder(true);
    try {
      const res = await api.post('/hr/appraisals/send-reminder', { type, month });
      toast.success(res.data?.message || 'Reminders dispatched successfully');
      setReminderModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminders');
    } finally {
      setSendingReminder(false);
    }
  };

  // HR Nudge Reporting Manager / Appraiser for a specific employee
  const handleRemindAppraiser = async (sheetId, empName, managerName) => {
    try {
      const res = await api.post(`/hr/appraisals/${sheetId}/remind-appraiser`);
      toast.success(res.data?.message || `Reminder sent to ${managerName || 'Reporting Manager'} for ${empName}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminder');
    }
  };

  const rows = boardData?.rows || [];
  const summary = boardData?.summary || { total: 0, not_assigned: 0, open: 0, submitted: 0, finalized: 0, hr_pending: 0 };

  // Filter rows locally by status filter
  const filteredRows = useMemo(() => {
    if (!statusFilter) return rows;
    if (statusFilter === 'hr_pending') {
      return rows.filter(r => r.sheet && !r.sheet.hr_reviewed && r.sheet.status !== 'finalized');
    }
    return rows.filter(r => {
      const st = r.sheet ? r.sheet.status : 'not_assigned';
      return st === statusFilter;
    });
  }, [rows, statusFilter]);

  // If viewing a specific employee's sheet
  if (selectedEmployeeId) {
    return (
      <AppraisalSheet
        employeeId={selectedEmployeeId}
        month={month}
        onBack={() => {
          setSelectedEmployeeId(null);
          fetchBoard();
        }}
        onSheetUpdated={fetchBoard}
      />
    );
  }

  return (
    <div>
      {/* ── Top Filter Bar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: '0 0 0.2rem 0', color: 'var(--dark)' }}>
            {isHrView ? 'MBO Appraisals & HR Deductions' : 'Monthly Performance Appraisal Board'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Circle Engineering · Single-Sheet Management by Objectives (MBO)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Month Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: '#fff', padding: '0.4rem 0.75rem', borderRadius: '10px', border: '1px solid var(--surface-2)' }}>
            <Calendar size={15} color="#0284c7" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark)' }}
            />
          </div>

          {/* Trigger Reminders Button */}
          <button
            type="button"
            onClick={() => setReminderModalOpen(true)}
            className="btn btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#fff', border: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#334155', fontWeight: 600, padding: '0.45rem 0.85rem', borderRadius: '8px' }}
          >
            <BellRing size={14} color="#f59e0b" /> Reminders
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchBoard}
            className="btn btn-sm"
            title="Refresh"
            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.45rem 0.6rem', borderRadius: '8px', color: '#475569' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Summary Statistic Cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: '1px solid var(--surface-2)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Staff</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--dark)' }}>{summary.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'not_assigned' ? '' : 'not_assigned')}
          style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: statusFilter === 'not_assigned' ? '2px solid #64748b' : '1px solid var(--surface-2)', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Needs Objectives</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#64748b' }}>{summary.not_assigned}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'open' ? '' : 'open')}
          style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: statusFilter === 'open' ? '2px solid #0284c7' : '1px solid var(--surface-2)', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>In Progress</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7' }}>{summary.open}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'submitted' ? '' : 'submitted')}
          style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: statusFilter === 'submitted' ? '2px solid #f59e0b' : '1px solid var(--surface-2)', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>Ready for Marks</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b45309' }}>{summary.submitted}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'finalized' ? '' : 'finalized')}
          style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: statusFilter === 'finalized' ? '2px solid #10b981' : '1px solid var(--surface-2)', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>Finalized</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d' }}>{summary.finalized}</div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'hr_pending' ? '' : 'hr_pending')}
          style={{ background: '#fff', padding: '0.85rem', borderRadius: '12px', border: statusFilter === 'hr_pending' ? '2px solid #06b6d4' : '1px solid var(--surface-2)', textAlign: 'center', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.7rem', color: '#0891b2', fontWeight: 600 }}>HR Pending</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0891b2' }}>{summary.hr_pending}</div>
        </div>
      </div>

      {/* ── Filters (Search & Dept) ────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name or ID..."
            style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2.2rem', border: '1px solid var(--surface-2)', borderRadius: '10px', fontSize: '0.82rem', background: '#fff' }}
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--surface-2)', borderRadius: '10px', fontSize: '0.82rem', background: '#fff', color: 'var(--dark)' }}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Status Filter Badges */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {STATUS_PILLS.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => setStatusFilter(p.key)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              border: statusFilter === p.key ? '1.5px solid #0284c7' : '1px solid var(--surface-2)',
              background: statusFilter === p.key ? '#e0f2fe' : '#fff',
              color: statusFilter === p.key ? '#0369a1' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Employees Table ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
            <Loader2 size={28} className="animate-spin" color="#0284c7" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No employee appraisals match the selected filters for {month}.
          </div>
        ) : (
          <div className="portal-table-scroll" style={{ width: '100%' }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--surface-2)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>Reporting Manager / Appraiser</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Objectives</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Marks</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Deductions</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Total Score</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ employee: emp, sheet }) => {
                  const hasSheet = Boolean(sheet && sheet.objectives_count > 0);
                  const isFinal = sheet?.status === 'finalized';
                  const managerName = emp.manager?.full_name || emp.appraiser?.full_name || null;
                  const managerTitle = emp.manager?.designation || emp.appraiser?.designation || null;

                  return (
                    <tr
                      key={emp.id}
                      style={{ borderBottom: '1px solid var(--surface-2)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Employee Info */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem' }}>
                            {emp.full_name?.charAt(0) || 'E'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--dark)' }}>{emp.full_name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {emp.employee_id ? `${emp.employee_id} · ` : ''}{emp.designation || 'Staff'} {emp.department ? `(${emp.department})` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reporting Manager / Appraiser */}
                      <td style={{ padding: '0.75rem 0.75rem' }}>
                        {managerName ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1e293b' }}>{managerName}</div>
                            {managerTitle && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{managerTitle}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>HR / Unassigned</span>
                        )}
                      </td>

                      {/* Objectives Count */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {hasSheet ? (
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {sheet.objectives_count} targets
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600 }}>
                            Not Assigned
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: isFinal ? '#dcfce7' : sheet?.status === 'submitted' ? '#fef3c7' : hasSheet ? '#e0f2fe' : '#f1f5f9',
                          color: isFinal ? '#15803d' : sheet?.status === 'submitted' ? '#b45309' : hasSheet ? '#0369a1' : '#64748b'
                        }}>
                          {isFinal ? 'Finalized' : sheet?.status === 'submitted' ? 'Ready for Marks' : hasSheet ? 'In Progress' : 'Not Assigned'}
                        </span>
                      </td>

                      {/* Marks Entered */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {hasSheet ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: sheet.marks_entered === sheet.objectives_count ? '#15803d' : '#f59e0b' }}>
                            {sheet.marks_entered}/{sheet.objectives_count}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Deductions */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {hasSheet ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {sheet.attendance_deduction > 0 && <span style={{ color: '#b45309', marginRight: '4px' }}>Att: -{sheet.attendance_deduction}</span>}
                            {sheet.misconduct_deduction > 0 && <span style={{ color: '#ef4444' }}>Mis: -{sheet.misconduct_deduction}</span>}
                            {sheet.attendance_deduction === 0 && sheet.misconduct_deduction === 0 && 'None'}
                          </div>
                        ) : '—'}
                      </td>

                      {/* Total Score */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {hasSheet && sheet.final_score !== null ? (
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0284c7' }}>
                            {sheet.final_score}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Grade */}
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                        {sheet?.grade ? (
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: GRADE_COLORS[sheet.grade] || '#0f172a' }}>
                            {sheet.grade}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          {isHr && sheet?.status === 'submitted' && (
                            <button
                              type="button"
                              onClick={() => handleRemindAppraiser(sheet.id, emp.full_name, managerName)}
                              className="btn btn-sm"
                              title={`Send reminder to ${managerName || 'Reporting Manager'} to evaluate ${emp.full_name}`}
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.35rem 0.65rem',
                                borderRadius: '7px',
                                background: '#faf5ff',
                                border: '1px solid #d8b4fe',
                                color: '#7e22ce',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <BellRing size={12} color="#9333ea" />
                              <span>Nudge {managerName ? managerName.split(' ')[0] : 'Manager'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '7px' }}
                          >
                            Open Sheet →
                          </button>
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

      {/* ── Reminders Modal ────────────────────────────────────────────────── */}
      {reminderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '460px', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <BellRing size={20} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Dispatch MBO Reminders</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Automated notifications normally dispatch on the 25th (for employees) and 1st (for Reporting Managers & HR). You can also trigger them on-demand:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {/* Option 1: Remind Reporting Managers & HR about pending evaluations */}
              <button
                type="button"
                onClick={() => handleTriggerReminders('appraiser')}
                disabled={sendingReminder}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: '10px', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#6b21a8' }}>
                    Remind Reporting Managers & HR (Pending Evaluations)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#7e22ce' }}>
                    "HR Reminder: Team member appraisals for {month} are submitted and awaiting your final marks & sign-off."
                  </div>
                </div>
                {sendingReminder ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} color="#9333ea" />}
              </button>

              {/* Option 2: Remind Reporting Managers & HR to assign objectives */}
              <button
                type="button"
                onClick={() => handleTriggerReminders('objectives')}
                disabled={sendingReminder}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '10px', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0369a1' }}>
                    Remind Reporting Managers & HR (Assign Objectives)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>
                    "HR Reminder: Please assign monthly MBO objectives and weights for your team for {month}."
                  </div>
                </div>
                {sendingReminder ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} color="#0284c7" />}
              </button>

              {/* Option 3: Remind All Employees */}
              <button
                type="button"
                onClick={() => handleTriggerReminders('employee')}
                disabled={sendingReminder}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark)' }}>Remind All Employees</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>"Please finalize & submit your monthly MBO self-evaluations for {month}."</div>
                </div>
                {sendingReminder ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} color="#0284c7" />}
              </button>

              {/* Option 4: Remind Line Managers & HR */}
              <button
                type="button"
                onClick={() => handleTriggerReminders('manager')}
                disabled={sendingReminder}
                className="btn btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', textAlign: 'left' }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark)' }}>Remind Managers & HR Admins</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>"Team evaluations & deductions pending for previous month."</div>
                </div>
                {sendingReminder ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} color="#8b5cf6" />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReminderModalOpen(false)}
                className="btn btn-sm"
                style={{ background: '#f1f5f9', border: 'none' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalBoard;
