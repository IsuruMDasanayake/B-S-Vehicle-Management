import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Banknote,
  TrendingUp,
  Clock,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Sun,
  DollarSign,
  RefreshCw,
  Plus,
  ArrowRight,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

// ─── KPI Card Matching Image 2 ────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, bg, sub, onClick }) => (
  <div
    className="card"
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1.25rem',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
    }}
  >
    <div style={{
      background: bg,
      color,
      width: '48px',
      height: '48px',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={22} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.45rem',
        fontWeight: 700,
        color: 'var(--dark)',
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
          {sub}
        </div>
      )}
    </div>
  </div>
);

const SolarFinanceDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/solar/finance/dashboard/stats');
      setStats(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      toast.error('Failed to load financial statistics');
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const overview = stats?.overview || {};
  const projects = stats?.projects_financials || [];

  const timeFormatted = lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  // Action required items
  const actionCount = (overview.pending_approvals_count || 0) + (overview.low_float_alerts || 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header Row matching Image 2 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '0.25rem' }}>
            Finance Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Circle Engineering - Cash & Expense Management Overview · Updated {timeFormatted}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/solar/finance/admin/petty-cash')}
            className="btn btn-primary"
            style={{
              background: '#10b981',
              borderColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Action Required Banner Matching Image 2 */}
      <div style={{
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bell size={15} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark)' }}>
              Action Required ({actionCount})
            </span>
          </div>

          <button
            onClick={() => navigate('/solar/finance/admin/requests')}
            style={{
              background: 'none', border: 'none', color: '#10b981',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
            }}
          >
            Open Cash Approvals <ArrowRight size={14} />
          </button>
        </div>

        {/* Action Items Cards Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid var(--surface-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)' }}>
                Field Cash Advance Approvals
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {overview.pending_approvals_count || 0} requests awaiting review by PM / Director
              </div>
            </div>
            <button
              onClick={() => navigate('/solar/finance/admin/requests')}
              style={{
                background: 'none', border: 'none', color: '#10b981',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Review →
            </button>
          </div>

          <div style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid var(--surface-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)' }}>
                Ready for Cash Disbursement
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {overview.ready_to_disburse_count || 0} approved advances pending payout by Cashier
              </div>
            </div>
            <button
              onClick={() => navigate('/solar/finance/admin/requests')}
              style={{
                background: 'none', border: 'none', color: '#10b981',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Disburse →
            </button>
          </div>

          <div style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid var(--surface-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark)' }}>
                Float Replenishment Alerts
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {overview.low_float_alerts || 0} mobile floats below minimum threshold
              </div>
            </div>
            <button
              onClick={() => navigate('/solar/finance/admin/petty-cash')}
              style={{
                background: 'none', border: 'none', color: '#10b981',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Top Up →
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid Matching Image 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
      }}>
        <KpiCard
          icon={Wallet}
          label="Total Field Floats"
          value={Number(overview.total_petty_cash_in_field || 0).toLocaleString()}
          color="#059669"
          bg="#ecfdf5"
          sub="Active custodian balances"
          onClick={() => navigate('/solar/finance/admin/petty-cash')}
        />
        <KpiCard
          icon={Clock}
          label="Pending Approvals"
          value={overview.pending_approvals_count || 0}
          color="#d97706"
          bg="#fffbeb"
          sub="Requires decision"
          onClick={() => navigate('/solar/finance/admin/requests')}
        />
        <KpiCard
          icon={Banknote}
          label="Ready to Disburse"
          value={overview.ready_to_disburse_count || 0}
          color="#2563eb"
          bg="#eff6ff"
          sub="Awaiting cash release"
          onClick={() => navigate('/solar/finance/admin/requests')}
        />
        <KpiCard
          icon={TrendingUp}
          label="Disbursed Month"
          value={Number(overview.disbursed_this_month || 0).toLocaleString()}
          color="#9333ea"
          bg="#faf5ff"
          sub="Current month advances"
        />
        <KpiCard
          icon={Receipt}
          label="Petty Cash Spent"
          value={Number(overview.petty_cash_spent_month || 0).toLocaleString()}
          color="#e11d48"
          bg="#fff1f2"
          sub="Month PCV vouchers"
          onClick={() => navigate('/solar/finance/admin/petty-cash')}
        />
      </div>

      {/* Row 2 of KPI cards matching Image 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <KpiCard
          icon={AlertTriangle}
          label="Low Float Alerts"
          value={overview.low_float_alerts || 0}
          color="#dc2626"
          bg="#fef2f2"
          sub="Need replenishment"
          onClick={() => navigate('/solar/finance/admin/petty-cash')}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Settled Advances"
          value="100%"
          color="#0d9488"
          bg="#f0fdfa"
          sub="With verified bills"
        />
        <KpiCard
          icon={Sun}
          label="Active Solar Sites"
          value={projects.length}
          color="#ea580c"
          bg="#fff7ed"
          sub="Tracked projects"
        />
        <KpiCard
          icon={DollarSign}
          label="Cash Flow Status"
          value="Healthy"
          color="#059669"
          bg="#ecfdf5"
          sub="Float coverage active"
        />
      </div>

      {/* Solar Projects Cash Tracking Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
              Solar Projects Direct Cash Tracking
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>
              Realized petty cash and field advance expenditures per installation site
            </p>
          </div>
          <button
            onClick={() => navigate('/solar/finance/admin/roles')}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            Role Permissions <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.9rem 1.25rem' }}>Project Name</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Client</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Petty Cash Vouchers</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Disbursed Advances</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Total Cash Spent</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading financial data...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No projects found.
                  </td>
                </tr>
              ) : (
                projects.map(proj => (
                  <tr key={proj.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{proj.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID #{proj.id}</div>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {proj.client || 'N/A'}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      LKR {Number(proj.petty_cash_spent || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      LKR {Number(proj.cash_advances || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>
                        LKR {Number(proj.total_cash_spent || 0).toLocaleString()}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: proj.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-2)',
                        color: proj.status === 'active' ? '#10b981' : 'var(--text-muted)',
                      }}>
                        {proj.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SolarFinanceDashboard;
