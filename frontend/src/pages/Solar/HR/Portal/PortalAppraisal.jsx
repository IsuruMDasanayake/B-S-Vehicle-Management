import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, Users, Calendar } from 'lucide-react';
import useAuthStore from '../../../../store/authStore';
import AppraisalSheet from '../Appraisals/AppraisalSheet';
import AppraisalBoard from '../Appraisals/AppraisalBoard';
import api from '../../../../services/api';

const PortalAppraisal = () => {
  const user = useAuthStore(s => s.user);
  const isHrOrSuper = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';
  const [isReportingManager, setIsReportingManager] = useState(false);
  const isAppraiser = isHrOrSuper || isReportingManager;

  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'my' or 'team' (for Reporting Managers & HR)
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['my', 'team'].includes(tabParam)) return tabParam;
    return isHrOrSuper ? 'team' : 'my';
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [historyMonths, setHistoryMonths] = useState([]);

  // Check if current employee is a Reporting Manager (has subordinates) and fetch past months
  useEffect(() => {
    api.get('/hr/employees/me')
      .then(res => {
        const subCount = Number(res.data?.subordinates_count || 0);
        if (subCount > 0) {
          setIsReportingManager(true);
          if (!searchParams.get('tab')) {
            setActiveTab('team');
          }
        }
      })
      .catch(() => {});

    api.get('/hr/appraisals/my')
      .then(res => setHistoryMonths(res.data || []))
      .catch(() => {});
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Header with Month Picker ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--dark)' }}>
            Monthly Performance Appraisal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
            Management by Objectives (MBO) · Circle Engineering (Pvt) Ltd
          </p>
        </div>

        {/* Month Selector for My Sheet */}
        {activeTab === 'my' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid var(--surface-2)' }}>
            <Calendar size={15} color="#0284c7" />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark)' }}
            />
          </div>
        )}
      </div>

      {/* ── Segmented Tab Switcher (Appraiser only) ── */}
      {isAppraiser && (
        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: '0.3rem', borderRadius: '12px', marginBottom: '1.25rem', gap: '4px' }}>
          <button
            type="button"
            onClick={() => handleTabChange('team')}
            style={{
              flex: 1, padding: '0.55rem', borderRadius: '9px', border: 'none',
              background: activeTab === 'team' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'team' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              fontWeight: 700, fontSize: '0.82rem', color: activeTab === 'team' ? '#0284c7' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Users size={16} /> Team Appraisal Board
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('my')}
            style={{
              flex: 1, padding: '0.55rem', borderRadius: '9px', border: 'none',
              background: activeTab === 'my' ? '#fff' : 'transparent',
              boxShadow: activeTab === 'my' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              fontWeight: 700, fontSize: '0.82rem', color: activeTab === 'my' ? '#0284c7' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={16} /> My Performance Sheet
          </button>
        </div>
      )}

      {/* ── TAB 1: Team Board (Appraiser) ── */}
      {isAppraiser && activeTab === 'team' && (
        <AppraisalBoard isHrView={false} />
      )}

      {/* ── TAB 2: My Sheet (All Employees & Appraiser self-view) ── */}
      {activeTab === 'my' && (
        <div>
          {/* Previous Months Quick Bar */}
          {historyMonths.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>
                Cycles:
              </span>
              {historyMonths.map(h => (
                <button
                  key={h.id || h.period_month}
                  type="button"
                  onClick={() => setCurrentMonth(h.period_month)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    border: currentMonth === h.period_month ? '1.5px solid #0284c7' : '1px solid var(--surface-2)',
                    background: currentMonth === h.period_month ? '#e0f2fe' : '#fff',
                    color: currentMonth === h.period_month ? '#0369a1' : 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {h.period_month} {h.grade ? `(${h.grade})` : ''}
                </button>
              ))}
            </div>
          )}

          {/* Single Appraisal Sheet */}
          <AppraisalSheet month={currentMonth} />
        </div>
      )}
    </div>
  );
};

export default PortalAppraisal;
