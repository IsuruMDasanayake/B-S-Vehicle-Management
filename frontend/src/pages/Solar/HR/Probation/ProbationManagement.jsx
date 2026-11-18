import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, AlertTriangle, Clock, CheckCircle2, Search,
  Calendar, ArrowRight, RefreshCw, FileText, ChevronRight,
  ShieldCheck, AlertCircle, Award
} from 'lucide-react';
import api from '../../../../services/api';
import InitiateProbationModal from './InitiateProbationModal';
import toast from 'react-hot-toast';

export const ProbationManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('expiring'); // 'expiring' | 'active' | 'pending_ceo' | 'completed'
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Data states
  const [expiringEmployees, setExpiringEmployees] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [evalCounts, setEvalCounts] = useState({ all: 0, active: 0, pending_hr_review: 0, pending_ceo_approval: 0, completed: 0 });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, evalRes] = await Promise.all([
        api.get('/hr/probation/expiring-employees'),
        api.get('/hr/probation/evaluations', { params: { status: activeTab, search } }),
      ]);

      setExpiringEmployees(expRes.data?.data || []);
      setEvaluations(evalRes.data?.data?.data || []);
      setEvalCounts(evalRes.data?.counts || { all: 0, active: 0, pending_hr_review: 0, pending_ceo_approval: 0, completed: 0 });
    } catch (err) {
      console.error('Failed to load probation data:', err);
      toast.error('Failed to load probation data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenInitiate = (emp) => {
    setSelectedEmp(emp);
    setModalOpen(true);
  };

  const urgentCount = expiringEmployees.filter(e => e.days_remaining !== null && e.days_remaining <= 14 && !e.has_active_eval).length;

  return (
    <div style={{ padding: '0.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            {/* <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={22} />
            </div> */}
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
              Probation Evaluation Management
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Track probationary staff, initiate multi-party 270° evaluations, and process CEO confirmation decisions.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-ghost"
          style={{
            display: 'flex', alignItems: 'center', gap: '0.45rem',
            border: '1px solid #cbd5e1', padding: '0.55rem 0.9rem', fontSize: '0.82rem',
          }}
        >
          <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1.75rem',
      }}>
        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Probationers</span>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f0f9ff', color: '#0284c7', fontSize: '0.72rem', fontWeight: 700 }}>
              Active
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {expiringEmployees.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Staff currently under probation period
          </div>
        </div>

        <div className="card" style={{
          padding: '1.15rem',
          border: urgentCount > 0 ? '1px solid #fecaca' : '1px solid var(--border-color)',
          background: urgentCount > 0 ? 'linear-gradient(135deg, #fff 0%, #fef2f2 100%)' : '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: urgentCount > 0 ? '#b91c1c' : 'var(--text-muted)' }}>
              Expiring Soon (≤14 Days)
            </span>
            <AlertTriangle size={16} style={{ color: urgentCount > 0 ? '#dc2626' : 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: urgentCount > 0 ? '#dc2626' : '#0f172a' }}>
            {urgentCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: urgentCount > 0 ? '#b91c1c' : 'var(--text-muted)', marginTop: '0.25rem' }}>
            Needs 270° evaluation initiation
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Evaluations in Progress</span>
            <Clock size={16} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
            {evalCounts.active}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Awaiting evaluator / self submissions
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Awaiting CEO Approval</span>
            <ShieldCheck size={16} style={{ color: '#7c3aed' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7c3aed' }}>
            {evalCounts.pending_ceo_approval}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Ready for executive confirmation sign-off
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Completed Dossiers</span>
            <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>
            {evalCounts.completed}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Confirmed, extended, or concluded
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '2px solid #e2e8f0', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { key: 'expiring', label: `Probation Staff & Expiry (${expiringEmployees.length})` },
            { key: 'active', label: `Active Evaluations (${evalCounts.active})` },
            { key: 'pending_ceo_approval', label: `Awaiting CEO Decision (${evalCounts.pending_ceo_approval})` },
            { key: 'completed', label: `Completed Archives (${evalCounts.completed})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.65rem 1rem', border: 'none', background: 'transparent',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '0.85rem', cursor: 'pointer',
                color: activeTab === tab.key ? '#0284c7' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '3px solid #0284c7' : '3px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'expiring' && (
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search employee or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
                borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem',
              }}
            />
          </div>
        )}
      </div>

      {/* Tab 1: Probation Staff & Expiry Alerts */}
      {activeTab === 'expiring' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Department &amp; Designation</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Reporting Manager</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Date Joined</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Probation End Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Days Remaining</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expiringEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No employees currently on probation.
                    </td>
                  </tr>
                ) : (
                  expiringEmployees.map(emp => {
                    const days = emp.days_remaining;
                    const isUrgent = days !== null && days <= 14;
                    const isExpired = days !== null && days < 0;

                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '50%',
                              background: '#e0f2fe', color: '#0369a1', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem',
                            }}>
                              {emp.photo_url ? (
                                <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                emp.full_name?.charAt(0) || 'E'
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.full_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.employee_id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{emp.designation || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{emp.department || '—'}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                          {emp.manager_name || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {emp.joined_date || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ color: isUrgent ? '#dc2626' : '#0f172a' }}>
                            {emp.probation_end_date || '—'}
                          </strong>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {days !== null ? (
                            <span style={{
                              padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                              background: isExpired ? '#fee2e2' : isUrgent ? '#fef3c7' : '#f0fdf4',
                              color: isExpired ? '#b91c1c' : isUrgent ? '#b45309' : '#15803d',
                            }}>
                              {isExpired ? `Expired (${Math.abs(days)}d ago)` : `${days} days left`}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          {emp.has_active_eval ? (
                            <button
                              onClick={() => navigate(`/solar/hr/admin/probation/${emp.active_eval_id}`)}
                              className="btn btn-ghost"
                              style={{
                                border: '1px solid #bae6fd', color: '#0284c7', background: '#f0f9ff',
                                padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              }}
                            >
                              <span>View Dossier</span>
                              <ChevronRight size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenInitiate(emp)}
                              className="btn btn-primary"
                              style={{
                                background: isUrgent ? '#dc2626' : '#0284c7',
                                borderColor: isUrgent ? '#dc2626' : '#0284c7',
                                padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              }}
                            >
                              <UserCheck size={14} />
                              <span>Initiate Evaluation</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabs 2, 3, 4: Evaluations List */}
      {activeTab !== 'expiring' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Employee</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Initiated Date</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Deadline</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Submissions Progress</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Score (/100)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No evaluation dossiers found in this tab.
                    </td>
                  </tr>
                ) : (
                  evaluations.map(item => {
                    const forms = item.forms || [];
                    const submittedCount = forms.filter(f => f.status === 'submitted').length;
                    const totalForms = forms.length;
                    const pct = totalForms > 0 ? Math.round((submittedCount / totalForms) * 100) : 0;

                    const statusLabels = {
                      initiated: { label: 'Initiated', bg: '#f1f5f9', color: '#475569' },
                      in_progress: { label: 'In Progress', bg: '#fef3c7', color: '#b45309' },
                      pending_hr_review: { label: 'Ready for HR Review', bg: '#e0f2fe', color: '#0369a1' },
                      pending_ceo_approval: { label: 'Awaiting CEO Decision', bg: '#ede9fe', color: '#6d28d9' },
                      completed: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
                    };
                    const badge = statusLabels[item.status] || { label: item.status, bg: '#f1f5f9', color: '#475569' };

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.employee?.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {item.employee?.employee_id} · {item.employee?.designation?.name || 'Staff'}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                          {item.initiation_date}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                          {item.submission_deadline}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', minWidth: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                            <span>{submittedCount} / {totalForms} forms</span>
                            <strong>{pct}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#16a34a' : '#0284c7', borderRadius: '999px' }} />
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {item.final_score !== null ? (
                            <div>
                              <strong style={{ fontSize: '1rem', color: item.final_score >= 80 ? '#15803d' : '#dc2626' }}>
                                {item.final_score}
                              </strong>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}> / 100</span>
                              {item.threshold_met !== null && (
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: item.threshold_met ? '#15803d' : '#dc2626' }}>
                                  {item.threshold_met ? '✓ Threshold Met' : '✗ Below Threshold'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Pending all forms</span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                            background: badge.bg, color: badge.color,
                          }}>
                            {badge.label}
                          </span>
                          {item.ceo_decision && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Decision: <strong>{item.ceo_decision.toUpperCase()}</strong>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => navigate(`/solar/hr/admin/probation/${item.id}`)}
                            className="btn btn-primary"
                            style={{
                              background: '#0284c7', borderColor: '#0284c7',
                              padding: '0.4rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                            }}
                          >
                            <span>Open Dossier</span>
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Initiation Modal */}
      <InitiateProbationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={selectedEmp}
        onInitiated={() => {
          fetchData();
          setActiveTab('active');
        }}
      />
    </div>
  );
};

export default ProbationManagement;
