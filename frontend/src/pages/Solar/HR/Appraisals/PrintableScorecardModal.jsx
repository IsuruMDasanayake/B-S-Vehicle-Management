import { useState, useEffect } from 'react';
import {
  Printer, X, Award, CheckCircle2, AlertCircle, Building2, User,
  Calendar, Clock, ShieldCheck, Download, Loader2
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const GRADE_INFO = {
  S1: { label: 'Outstanding',         color: '#10b981', bg: 'rgba(16,185,129,0.12)', pay: '116% – 120%', desc: 'Significantly exceeds all targets, outstanding technical & operational impact.' },
  S2: { label: 'Excellent',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', pay: '110% – 115%', desc: 'Consistently surpasses expected benchmarks with high quality delivery.' },
  A1: { label: 'Meets Expectations',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)', pay: '95% – 109%',  desc: 'Achieves required KPI benchmarks and fulfills core responsibilities.' },
  A2: { label: 'Needs Improvement',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', pay: '80% – 94%',   desc: 'Falls below expected targets in key areas. Requires targeted coaching.' },
  C:  { label: 'Unacceptable',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  pay: '0%',          desc: 'Significant underperformance against established monthly benchmarks.' },
};

export const PrintableScorecardModal = ({ appraisalId, appraisalData, isOpen, onClose }) => {
  const [data, setData] = useState(appraisalData || null);
  const [loading, setLoading] = useState(!appraisalData);

  useEffect(() => {
    if (!isOpen) return;

    if (appraisalData) {
      setData(appraisalData);
      setLoading(false);
      return;
    }

    if (appraisalId) {
      let mounted = true;
      setLoading(true);
      api.get(`/hr/appraisals/${appraisalId}`)
        .then(res => {
          if (mounted) {
            setData(res.data);
            setLoading(false);
          }
        })
        .catch(err => {
          if (mounted) {
            toast.error(err.response?.data?.message || 'Failed to load appraisal scorecard');
            setLoading(false);
            onClose();
          }
        });
      return () => { mounted = false; };
    }
  }, [isOpen, appraisalId, appraisalData, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const emp = data?.employee;
  const evaluator = data?.evaluator;
  const gradeKey = data?.grade || 'A1';
  const gradeMeta = GRADE_INFO[gradeKey] || GRADE_INFO.A1;

  const formattedMonth = data?.period_month
    ? new Date(data.period_month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <>
      {/* ── Scoped Print Stylesheet ────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-scorecard-root, #printable-scorecard-root * {
            visibility: visible !important;
          }
          #printable-scorecard-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Modal Backdrop */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1400,
          padding: '1rem',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}
        >
          {/* Modal Top Control Bar */}
          <div
            style={{
              padding: '1rem 1.5rem',
              background: '#0f172a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #334155',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Award size={20} color="#38bdf8" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Performance Appraisal Scorecard
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Official Monthly MBO Assessment · Circle Engineering (Pvt) Ltd
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  border: 'none',
                  padding: '0.45rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body / Scrollable Printable Container */}
          <div
            id="printable-scorecard-root"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              background: '#fff',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '0.6rem', color: '#64748b' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Loading official appraisal scorecard...</span>
              </div>
            ) : !data ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 0.75rem auto' }} />
                <p>Appraisal record could not be loaded.</p>
              </div>
            ) : (
              <div
                className="print-sheet"
                style={{
                  background: '#fff',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  color: '#0f172a',
                  lineHeight: 1.45,
                }}
              >
                {/* ── Document Header ────────────────────────────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #071A3D, #00A651)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      letterSpacing: '-1px',
                    }}>
                      CE
                    </div>
                    <div>
                      <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#071A3D', letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                        Circle Engineering (Private) Limited
                      </h1>
                      <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                        Monthly Performance Appraisal Scorecard · Management by Objectives (MBO)
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', padding: '0.2rem 0.65rem', borderRadius: '6px', background: data.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: data.status === 'approved' ? '#047857' : '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      {data.status === 'approved' ? '✓ Officially Approved' : `Status: ${data.status}`}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Ref: <strong>#MBO-{String(data.id).padStart(5, '0')}</strong> · Period: <strong>{formattedMonth}</strong>
                    </div>
                  </div>
                </div>

                {/* ── Employee & Evaluator Summary Block ─────────────────────── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 0.9fr',
                  gap: '1rem',
                  padding: '0.85rem 1rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                      Employee Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: '0.25rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Name:</span>
                      <strong style={{ color: '#0f172a' }}>{emp?.full_name || '—'}</strong>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Employee ID:</span>
                      <strong style={{ color: '#0f172a' }}>{emp?.employee_id || '—'}</strong>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Department:</span>
                      <span>{emp?.department?.name || '—'}</span>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Designation:</span>
                      <span>{emp?.designation?.title || '—'}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                      Appraisal & Review Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: '0.25rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Evaluated By:</span>
                      <strong style={{ color: '#0f172a' }}>{evaluator?.full_name || 'Line Manager'}</strong>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Evaluator Role:</span>
                      <span>{evaluator?.designation?.title || 'Team Lead'}</span>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Assessment Month:</span>
                      <strong style={{ color: '#0f172a' }}>{formattedMonth}</strong>

                      <span style={{ color: '#64748b', fontWeight: 500 }}>Director Sign-Off:</span>
                      <span>{data.directorApprovedBy?.name || (data.status === 'approved' ? 'Executive Director' : 'Pending')}</span>
                    </div>
                  </div>
                </div>

                {/* ── Section 1: Objectives & KPI Table ───────────────────────── */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Section 1: Key Performance Objectives & KPI Evaluation
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Weights sum to strictly 100% · Evaluated on 0–100 scale
                    </span>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.6rem', width: '28px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '0.5rem 0.6rem' }}>Objective & Measurable KPI Target</th>
                        <th style={{ padding: '0.5rem 0.6rem', width: '80px', textAlign: 'center' }}>Weight (%)</th>
                        <th style={{ padding: '0.5rem 0.6rem', width: '80px', textAlign: 'center' }}>Self Score</th>
                        <th style={{ padding: '0.5rem 0.6rem', width: '90px', textAlign: 'center' }}>Manager Mark</th>
                        <th style={{ padding: '0.5rem 0.6rem', width: '100px', textAlign: 'right' }}>Weighted Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.objectives || []).map((obj, i) => {
                        const weighted = ((parseFloat(obj.manager_marks || 0) * parseFloat(obj.weight || 0)) / 100).toFixed(2);
                        return (
                          <tr key={obj.id || i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                            <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                              {i + 1}
                            </td>
                            <td style={{ padding: '0.55rem 0.6rem' }}>
                              <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.82rem' }}>{obj.title}</strong>
                              {obj.description && (
                                <span style={{ color: '#64748b', fontSize: '0.74rem', display: 'block', marginTop: '0.15rem' }}>
                                  {obj.description}
                                </span>
                              )}
                              {obj.target_kpi && (
                                <span style={{ color: '#0284c7', fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', marginTop: '0.2rem' }}>
                                  KPI Target: {obj.target_kpi}
                                </span>
                              )}
                              {obj.self_achievement && (
                                <div style={{ fontSize: '0.7rem', color: '#475569', fontStyle: 'italic', background: 'rgba(59,130,246,0.06)', padding: '0.25rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                                  Employee Achievement: {obj.self_achievement}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 600 }}>
                              {parseFloat(obj.weight)}%
                            </td>
                            <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', color: '#64748b' }}>
                              {obj.employee_self_marks !== null ? `${parseFloat(obj.employee_self_marks)}/100` : '—'}
                            </td>
                            <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                              {obj.manager_marks !== null ? `${parseFloat(obj.manager_marks)}/100` : '—'}
                            </td>
                            <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                              {weighted}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan={2} style={{ padding: '0.55rem 0.6rem', textAlign: 'right', color: '#0f172a' }}>
                          Total Weight & Raw Objective Score:
                        </td>
                        <td style={{ padding: '0.55rem 0.6rem', textAlign: 'center', color: '#0f172a' }}>
                          {(data.objectives || []).reduce((acc, o) => acc + parseFloat(o.weight || 0), 0)}%
                        </td>
                        <td colSpan={2} style={{ padding: '0.55rem 0.6rem' }}></td>
                        <td style={{ padding: '0.55rem 0.6rem', textAlign: 'right', color: '#2563eb', fontSize: '0.9rem' }}>
                          {parseFloat(data.objective_score || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ── Section 2: Deductions & Final Score Calculation ───────── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                }}>
                  {/* Deductions Breakdown */}
                  <div style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>
                      Section 2: Policy Deductions
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Attendance Deduction (0 to 10 marks max):</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {data.attendance_deduction_notes || 'Clean attendance record. No deductions.'}
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: data.attendance_deduction > 0 ? '#ef4444' : '#10b981', minWidth: '60px', textAlign: 'right' }}>
                          -{parseFloat(data.attendance_deduction || 0).toFixed(1)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>Misconduct Deduction (0 to 30 marks):</strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {data.misconduct_deduction_notes || 'No disciplinary infractions recorded.'}
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: data.misconduct_deduction > 0 ? '#ef4444' : '#10b981', minWidth: '60px', textAlign: 'right' }}>
                          -{parseFloat(data.misconduct_deduction || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Final Grading Box */}
                  <div style={{
                    border: `2px solid ${gradeMeta.color}`,
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    background: gradeMeta.bg,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569' }}>
                          Final Monthly Score
                        </span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: gradeMeta.color }}>
                          {parseFloat(data.final_score || 0).toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ 100</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          background: gradeMeta.color,
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          letterSpacing: '0.5px',
                        }}>
                          GRADE {data.grade || '—'}
                        </span>
                        <strong style={{ color: '#0f172a', fontSize: '0.85rem' }}>{gradeMeta.label}</strong>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed rgba(0,0,0,0.12)', paddingTop: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#475569' }}>Variable Pay Adjustment:</span>
                        <strong style={{ color: '#0f172a' }}>{data.variable_pay_adjustment_pct || gradeMeta.pay}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 3: Qualitative Feedback & Remarks ──────────────── */}
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.78rem',
                  background: '#fff',
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a' }}>
                    Section 3: Qualitative Feedback & Development Remarks
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <strong style={{ color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                        Employee Feedback & Self-Reflection:
                      </strong>
                      <div style={{ minHeight: '44px', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                        {data.employee_comments || 'No self-reflection notes submitted.'}
                      </div>
                    </div>

                    <div>
                      <strong style={{ color: '#475569', display: 'block', marginBottom: '0.2rem' }}>
                        Line Manager / Evaluator Comments & Action Plan:
                      </strong>
                      <div style={{ minHeight: '44px', padding: '0.4rem 0.6rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                        {data.manager_comments || 'No manager evaluation comments recorded.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section 4: Sign-Off & Official Audit Stamp ─────────────── */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #cbd5e1',
                  fontSize: '0.78rem',
                }}>
                  {/* Evaluator Sign-off */}
                  <div>
                    <div style={{ color: '#64748b', marginBottom: '1.75rem' }}>
                      Evaluated and Submitted by Line Manager:
                    </div>
                    <div style={{ borderTop: '1px solid #475569', paddingTop: '0.35rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{evaluator?.full_name || 'Line Manager'}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                        {evaluator?.designation?.title || 'Evaluator'} · Date: {data.evaluated_at ? new Date(data.evaluated_at).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Director Official Stamp */}
                  <div>
                    <div style={{ color: '#64748b', marginBottom: '1.75rem' }}>
                      Project Director / CEO Approval & Sign-Off:
                    </div>
                    <div style={{ borderTop: '1px solid #475569', paddingTop: '0.35rem' }}>
                      {data.status === 'approved' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#047857' }}>
                          <CheckCircle2 size={16} />
                          <div>
                            <strong style={{ display: 'block', color: '#0f172a' }}>
                              {data.directorApprovedBy?.name || 'Director Sign-off'}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Digitally Approved on {data.director_approved_at ? new Date(data.director_approved_at).toLocaleString('en-GB') : '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Executive Sign-off</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.65rem', color: '#94a3b8' }}>
                  Circle Engineering (Pvt) Ltd · Confidential Human Resources Performance Record · Generated from HR Management System
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer (No Print) */}
          <div
            className="no-print"
            style={{
              padding: '0.85rem 1.5rem',
              background: '#f1f5f9',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: '#fff',
                border: '1px solid #cbd5e1',
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '0.45rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
              }}
            >
              <Printer size={16} /> Print Official Scorecard
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintableScorecardModal;
