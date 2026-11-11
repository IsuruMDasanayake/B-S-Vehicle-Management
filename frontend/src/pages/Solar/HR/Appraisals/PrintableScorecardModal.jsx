import { useState, useEffect } from 'react';
import { Printer, X, Award, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../../store/authStore';
import { isLeaveApprovalManager } from '../../../../utils/hrRoles';

const GRADE_INFO = {
  S1: { label: 'Outstanding',         color: '#10b981', bg: 'rgba(16,185,129,0.12)', pay: '116% – 120%' },
  S2: { label: 'Excellent',           color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', pay: '110% – 115%' },
  A1: { label: 'Meets Expectations',  color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', pay: '95% – 109%' },
  A2: { label: 'Needs Improvement',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', pay: '80% – 94%' },
  C:  { label: 'Unacceptable',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  pay: '0%' },
};

export const PrintableScorecardModal = ({ appraisalId, appraisalData, isOpen, onClose }) => {
  const user = useAuthStore(s => s.user);
  const isAuthorized = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';

  const [data, setData] = useState(appraisalData || null);
  const [loading, setLoading] = useState(!appraisalData);

  useEffect(() => {
    if (!isOpen || !isAuthorized) return;

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

  if (!isOpen || !isAuthorized) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-scorecard-root');
    if (!printContent) {
      window.print();
      return;
    }

    // Create an invisible iframe dedicated to printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Appraisal Scorecard - ${emp?.full_name || 'Scorecard'} - ${formattedMonth}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 10mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              line-height: 1.45;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            .print-sheet {
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
            }
          </style>
        </head>
        <body>
          <div style="background: #fff; padding: 0;">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print error, falling back to window.print', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };

  const emp = data?.employee || appraisalData?.employee;
  const evaluator = data?.evaluator || appraisalData?.evaluator;
  const gradeKey = data?.grade || appraisalData?.grade || 'A1';
  const gradeMeta = GRADE_INFO[gradeKey] || GRADE_INFO.A1;

  const formattedMonth = data?.period_month
    ? new Date(data.period_month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '—';

  const objectives = data?.objectives || [];
  const totalWeight = objectives.reduce((acc, o) => acc + (parseFloat(o.weight) || 0), 0);
  const totalMarks = objectives.reduce((acc, o) => acc + (parseFloat(o.actual_marks) || 0), 0);

  return (
    <>
      <style>{`
        @media print {
          /* Hide everything in the body by default */
          body * {
            visibility: hidden !important;
          }

          /* Reset modal backdrop so it does not darken or fix page */
          .scorecard-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            z-index: auto !important;
          }

          .scorecard-modal-card {
            position: static !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
          }

          /* Hide modal header with buttons */
          .scorecard-modal-header,
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }

          /* Scorecard content must be visible and placed cleanly at top of page */
          #printable-scorecard-root,
          #printable-scorecard-root * {
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
            overflow: visible !important;
            display: block !important;
          }

          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
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

      {/* Backdrop */}
      <div
        className="scorecard-modal-backdrop"
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
          className="scorecard-modal-card"
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
          {/* Top Control Bar */}
          <div
            className="scorecard-modal-header no-print"
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
                  Monthly Performance Appraisal Scorecard
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Circle Engineering (Pvt) Ltd · Single Form
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button
                type="button"
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

          {/* Body */}
          <div
            id="printable-scorecard-root"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '2rem',
              background: '#fff',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '0.6rem', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" />
                <span>Loading appraisal scorecard...</span>
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
                {/* ── Document Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                      Circle Engineering (Private) Limited
                    </h1>
                    <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
                      Monthly Performance Appraisal Policy · Management by Objectives (MBO)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0284c7' }}>
                      Period: {formattedMonth}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Status: <strong style={{ textTransform: 'capitalize' }}>{data.status}</strong>
                    </div>
                  </div>
                </div>

                {/* ── Employee Information Header ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.65rem 0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <div><strong>Employee Name:</strong> {emp?.full_name || '—'}</div>
                    <div><strong>Employee ID:</strong> {emp?.epf_no || emp?.employee_id || '—'}</div>
                    <div><strong>Department:</strong> {emp?.department?.name || '—'}</div>
                    <div><strong>Designation:</strong> {emp?.designation?.title || '—'}</div>
                  </div>
                  <div>
                    <div><strong>Appraiser:</strong> {evaluator?.full_name || (emp?.manager?.full_name ? `${emp.manager.full_name} / Approval Managers` : 'Reporting Manager & Approval Managers')}</div>
                    <div><strong>Appraiser Role:</strong> {evaluator?.designation?.title || evaluator?.designation || (emp?.manager?.designation?.title || emp?.manager?.designation ? `${emp.manager.designation?.title || emp.manager.designation} / Approval Manager` : 'Reporting Manager / Approval Manager')}</div>
                    <div><strong>Cycle Month:</strong> {formattedMonth}</div>
                  </div>
                </div>

                {/* ── The Exact Paper Table ── */}
                <div style={{ border: '1.5px solid #0f172a', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #0f172a' }}>
                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 800, width: '24%', borderRight: '1px solid #cbd5e1' }}>
                          Objective
                        </th>
                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 800, width: '26%', borderRight: '1px solid #cbd5e1' }}>
                          Subtask
                        </th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, width: '7%', borderRight: '1px solid #cbd5e1' }}>
                          Target
                        </th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, width: '9%', borderRight: '1px solid #cbd5e1' }}>
                          Deadline
                        </th>
                        <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 800, width: '18%', borderRight: '1px solid #cbd5e1' }}>
                          Achievement
                        </th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, width: '8%', borderRight: '1px solid #cbd5e1' }}>
                          Status
                        </th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, width: '8%', borderRight: '1px solid #cbd5e1' }}>
                          Weight
                        </th>
                        <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, width: '8%' }}>
                          Actual Marks
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectives.map((obj, objIdx) => {
                        const subtasks = (obj.subtasks && Array.isArray(obj.subtasks) && obj.subtasks.length > 0)
                          ? obj.subtasks
                          : [{
                              id: `st-${objIdx}-0`,
                              code: `${objIdx + 1}.1`,
                              title: obj.description || obj.title || '',
                              target: '100%',
                              deadline: obj.deadline || '',
                              achievement: obj.achievement || '',
                              status: obj.status || 'not_started',
                            }];
                        const rowCount = subtasks.length;

                        return subtasks.map((st, stIdx) => {
                          const isFirstRow = stIdx === 0;
                          const isLastRow = stIdx === rowCount - 1;

                          return (
                            <tr
                              key={`${obj.id || objIdx}-${st.id || stIdx}`}
                              style={{
                                borderBottom: isLastRow ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                                verticalAlign: 'top',
                              }}
                            >
                              {/* 1. Objective (Goal Title + Main Monthly Goal) */}
                              {isFirstRow && (
                                <td
                                  rowSpan={rowCount}
                                  style={{
                                    padding: '0.5rem 0.6rem',
                                    borderRight: '1px solid #cbd5e1',
                                    borderBottom: '1.5px solid #0f172a',
                                    verticalAlign: 'top',
                                    width: '24%',
                                  }}
                                >
                                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
                                    {obj.title}
                                  </div>
                                  {obj.description && (
                                    <div style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.4 }}>
                                      <strong style={{ color: '#0f172a' }}>Main Monthly Goal: </strong>
                                      {obj.description.replace(/^Main Monthly Goal:\s*/i, '')}
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* 2. Subtask */}
                              <td style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1', width: '26%' }}>
                                <div style={{ fontSize: '0.78rem', lineHeight: 1.35 }}>
                                  <strong style={{ color: '#0284c7', marginRight: '0.35rem' }}>{st.code || `${objIdx + 1}.${stIdx + 1}`}</strong>
                                  {st.title}
                                </div>
                              </td>

                              {/* 3. Target */}
                              <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', width: '7%', verticalAlign: 'middle', fontWeight: 700 }}>
                                {st.target || '100%'}
                              </td>

                              {/* 4. Deadline */}
                              <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', width: '9%', verticalAlign: 'middle', fontSize: '0.76rem' }}>
                                {st.deadline ? new Date(st.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : (obj.deadline ? new Date(obj.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—')}
                              </td>

                              {/* 5. Achievement */}
                              <td style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1', width: '18%', fontSize: '0.76rem', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>
                                {st.achievement || '—'}
                              </td>

                              {/* 6. Status */}
                              <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', width: '8%', verticalAlign: 'middle', textTransform: 'capitalize', fontSize: '0.74rem' }}>
                                {st.status?.replace('_', ' ') || 'In progress'}
                              </td>

                              {/* 7. Weight */}
                              {isFirstRow && (
                                <td
                                  rowSpan={rowCount}
                                  style={{
                                    padding: '0.5rem 0.4rem',
                                    textAlign: 'center',
                                    borderRight: '1px solid #cbd5e1',
                                    borderBottom: '1.5px solid #0f172a',
                                    verticalAlign: 'middle',
                                    fontWeight: 800,
                                    width: '8%',
                                  }}
                                >
                                  {obj.weight ? `${obj.weight}%` : '—'}
                                </td>
                              )}

                              {/* 8. Actual Marks */}
                              {isFirstRow && (
                                <td
                                  rowSpan={rowCount}
                                  style={{
                                    padding: '0.5rem 0.4rem',
                                    textAlign: 'center',
                                    borderBottom: '1.5px solid #0f172a',
                                    verticalAlign: 'middle',
                                    fontWeight: 900,
                                    fontSize: '0.9rem',
                                    width: '8%',
                                  }}
                                >
                                  {obj.actual_marks !== null && obj.actual_marks !== undefined ? obj.actual_marks : '—'}
                                </td>
                              )}
                            </tr>
                          );
                        });
                      })}

                      {/* Comments & Deductions */}
                      {/* Row 1: Appraiser Comments + Attendance Notes + Attendance Label + Marks */}
                      <tr style={{ borderTop: '1.5px solid #0f172a', borderBottom: '1px solid #cbd5e1' }}>
                        <td rowSpan={2} colSpan={4} style={{ padding: '0.6rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'top', width: '66%' }}>
                          <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.2rem' }}>Appraiser's Comments</strong>
                          <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                            {data.manager_comments || 'No remarks recorded.'}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', fontSize: '0.76rem', width: '18%', color: data.attendance_deduction_notes ? '#0f172a' : '#94a3b8', fontStyle: data.attendance_deduction_notes ? 'normal' : 'italic' }}>
                          {data.attendance_deduction_notes || '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', borderRight: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', width: '8%' }}>
                          Attendance
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', borderRight: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', width: '8%', fontSize: '0.72rem', color: '#64748b' }}>
                          Max -10
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, verticalAlign: 'middle', borderBottom: '1px solid #e2e8f0', width: '8%' }}>
                          {data.attendance_deduction > 0 ? `-${data.attendance_deduction}` : '0'}
                        </td>
                      </tr>

                      {/* Row 2: Misconduct Notes + Misconduct Label + Marks */}
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1', verticalAlign: 'middle', fontSize: '0.76rem', width: '18%', color: data.misconduct_deduction_notes ? '#0f172a' : '#94a3b8', fontStyle: data.misconduct_deduction_notes ? 'normal' : 'italic' }}>
                          {data.misconduct_deduction_notes || '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', borderRight: '1px solid #cbd5e1', fontWeight: 800, textAlign: 'right', verticalAlign: 'middle', width: '8%' }}>
                          Misconduct
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', borderRight: '1px solid #cbd5e1', textAlign: 'center', verticalAlign: 'middle', width: '8%', fontSize: '0.72rem', color: '#64748b' }}>
                          Max -30
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 800, verticalAlign: 'middle', width: '8%' }}>
                          {data.misconduct_deduction > 0 ? `-${data.misconduct_deduction}` : '0'}
                        </td>
                      </tr>

                      {/* Summary Row */}
                      <tr style={{ background: '#f8fafc', borderTop: '1.5px solid #0f172a', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1' }}>
                          Total Weight: 100%
                        </td>
                        <td colSpan={2} style={{ padding: '0.5rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.78rem' }}>
                          Appraiser: {evaluator?.full_name || emp?.manager?.full_name || 'Reporting Manager & Approval Managers'}
                        </td>
                        <td colSpan={2} style={{ padding: '0.5rem 0.4rem', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontWeight: 900 }}>
                          Total
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', borderRight: '1px solid #cbd5e1', fontWeight: 800 }}>
                          100%
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#0284c7' }}>
                          {data.final_score}
                        </td>
                      </tr>

                      {/* Grade Row */}
                      <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                        <td colSpan={5} style={{ padding: '0.5rem 0.6rem', borderRight: '1px solid #cbd5e1', fontSize: '0.76rem' }}>
                          Variable Performance Pay: <strong>{data.variable_pay_adjustment || '100%'}</strong> ({data.performance_level || gradeMeta.label})
                        </td>
                        <td colSpan={2} style={{ padding: '0.5rem 0.4rem', textAlign: 'right', borderRight: '1px solid #cbd5e1', fontWeight: 900, fontSize: '0.78rem' }}>
                          Monthly Performance Grade
                        </td>
                        <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 900, color: gradeMeta.color }}>
                          {data.grade || 'A1'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Policy Footer Statement */}
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 2rem 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                  Employee performance is not limited to completion of operational objectives. Attendance, discipline, professional conduct and compliance with Company policies are also considered part of overall performance.
                </p>

                {/* ── Signatures ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', paddingTop: '2.5rem', borderTop: '1px solid #cbd5e1', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>{emp?.full_name || 'Employee'}</strong>
                    <div style={{ color: '#64748b' }}>Employee Signature & Date</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>{evaluator?.full_name || emp?.manager?.full_name || 'Reporting Manager & Approval Managers'}</strong>
                    <div style={{ color: '#64748b' }}>Appraiser / Reporting Manager Signature</div>
                  </div>

                  <div>
                    <div style={{ borderBottom: '1px solid #0f172a', marginBottom: '0.4rem', height: '24px' }}></div>
                    <strong>HR Admin / Management</strong>
                    <div style={{ color: '#64748b' }}>Official HR Sign-off</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintableScorecardModal;
