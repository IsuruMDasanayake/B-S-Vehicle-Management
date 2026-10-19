import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Award, Calendar, ChevronRight,
  Printer, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';
import api from '../../../../services/api';

const GRADE_COLORS = {
  S1: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  S2: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  A1: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  A2: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  C:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const PerformanceTrendSparkline = ({
  employeeId,
  initialData = null,
  compact = false,
  onOpenScorecard = null,
}) => {
  const [trendData, setTrendData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData && !!employeeId);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    if (initialData) {
      setTrendData(initialData);
      setLoading(false);
      return;
    }

    if (!employeeId) return;

    let mounted = true;
    setLoading(true);
    api.get(`/hr/appraisals/employee/${employeeId}/trend`)
      .then(res => {
        if (mounted) {
          setTrendData(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [employeeId, initialData]);

  if (loading) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.78rem' }}>
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading trend...</span>
      </div>
    );
  }

  const list = trendData?.trend || [];
  const scores = trendData?.scores || list.map(item => parseFloat(item.final_score || 0));
  const avg = trendData?.average ?? (scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null);
  const delta = trendData?.delta ?? (scores.length >= 2 ? (scores[scores.length - 1] - scores[0]).toFixed(1) : 0);
  const trajectory = trendData?.trajectory || (delta >= 2 ? 'improving' : delta <= -2 ? 'declining' : 'stable');

  if (!scores || scores.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>
        No prior appraisal history
      </div>
    );
  }

  // Calculate SVG Points for Sparkline
  const width = compact ? 120 : 540;
  const height = compact ? 36 : 140;
  const paddingX = compact ? 6 : 30;
  const paddingY = compact ? 6 : 24;

  const minScore = Math.max(0, Math.min(...scores) - (compact ? 5 : 10));
  const maxScore = Math.min(100, Math.max(...scores) + (compact ? 5 : 10));
  const scoreRange = maxScore - minScore || 1;

  const points = scores.map((val, idx) => {
    const x = scores.length === 1
      ? width / 2
      : paddingX + (idx / (scores.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((val - minScore) / scoreRange) * (height - paddingY * 2);
    return { x, y, val, item: list[idx] };
  });

  const pathD = points.length === 1
    ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`
    : points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  const areaD = points.length > 1
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : '';

  const strokeColor = trajectory === 'improving' ? '#10b981' : trajectory === 'declining' ? '#f59e0b' : '#3b82f6';
  const fillColor = trajectory === 'improving' ? 'rgba(16,185,129,0.15)' : trajectory === 'declining' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)';

  // ── Compact View (Ideal for table rows or cards) ───────────────────────────
  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id={`grad-spark-${employeeId || 'sub'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {areaD && <path d={areaD} fill={`url(#grad-spark-${employeeId || 'sub'})`} />}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? 3.5 : 2}
              fill={i === points.length - 1 ? strokeColor : '#fff'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          ))}
        </svg>

        {/* Trajectory Badge */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.78rem', fontWeight: 700, color: strokeColor }}>
            {trajectory === 'improving' ? <ArrowUpRight size={14} /> : trajectory === 'declining' ? <ArrowDownRight size={14} /> : <Minus size={14} />}
            <span>{scores[scores.length - 1]}</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            Avg: {avg}
          </span>
        </div>
      </div>
    );
  }

  // ── Full Rich Chart View (For Employee Profile & Modals) ───────────────────
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header Metric Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Award size={18} color="#3b82f6" />
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              6-Month Performance Trajectory
            </h4>
          </div>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Score progression across official monthly MBO evaluations
          </p>
        </div>

        {/* Key Metrics */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', padding: '0.35rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500 }}>6-Mo Average</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{avg}</div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            background: fillColor,
            color: strokeColor,
            fontWeight: 700,
            fontSize: '0.82rem',
          }}>
            {trajectory === 'improving' ? (
              <>
                <TrendingUp size={16} />
                <span>Improving (+{delta} pts)</span>
              </>
            ) : trajectory === 'declining' ? (
              <>
                <TrendingDown size={16} />
                <span>Declining ({delta} pts)</span>
              </>
            ) : (
              <>
                <Minus size={16} />
                <span>Stable Trajectory</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', marginBottom: '1rem' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', maxHeight: '160px', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`grad-trend-full-${employeeId || 'full'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Grid Lines */}
          {[60, 75, 90].map(gridVal => {
            if (gridVal < minScore || gridVal > maxScore) return null;
            const y = height - paddingY - ((gridVal - minScore) / scoreRange) * (height - paddingY * 2);
            return (
              <g key={gridVal}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={paddingX - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* Gradient Fill Area */}
          {areaD && <path d={areaD} fill={`url(#grad-trend-full-${employeeId || 'full'})`} />}

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points with Score Badges */}
          {points.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            const item = pt.item || {};
            const grade = item.grade || (pt.val >= 96 ? 'S1' : pt.val >= 90 ? 'S2' : pt.val >= 75 ? 'A1' : pt.val >= 60 ? 'A2' : 'C');
            const gColor = GRADE_COLORS[grade]?.color || strokeColor;

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle cx={pt.x} cy={pt.y} r="10" fill={fillColor} />
                )}
                {/* Outer Node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill="#fff"
                  stroke={gColor}
                  strokeWidth="2.5"
                />

                {/* Score Label above point */}
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {pt.val}
                </text>

                {/* Month label below axis */}
                {item.period_month && (
                  <text
                    x={pt.x}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill={isHovered ? '#0f172a' : '#64748b'}
                  >
                    {new Date(item.period_month + '-01').toLocaleDateString('en-GB', { month: 'short' })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Monthly Evaluation History Cards / Sequence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
        {list.map((item, idx) => {
          const score = parseFloat(item.final_score || 0);
          const grade = item.grade || 'A1';
          const gMeta = GRADE_COLORS[grade] || GRADE_COLORS.A1;
          const monthLabel = item.period_month
            ? new Date(item.period_month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
            : `Month ${idx + 1}`;

          return (
            <div
              key={item.id || idx}
              style={{
                background: hoveredIdx === idx ? '#f8fafc' : '#ffffff',
                border: hoveredIdx === idx ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.55rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>{monthLabel}</span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: gMeta.bg,
                  color: gMeta.color,
                }}>
                  {grade}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{score.toFixed(1)}</span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>/ 100</span>
              </div>

              {onOpenScorecard && (
                <button
                  onClick={() => onOpenScorecard(item.id, item)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <Printer size={12} /> View Slip
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceTrendSparkline;
