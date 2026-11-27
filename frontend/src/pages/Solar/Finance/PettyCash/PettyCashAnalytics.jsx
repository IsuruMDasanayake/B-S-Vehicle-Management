import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  Receipt,
  PieChart as PieIcon,
  BarChart2,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Users,
  Sun,
  DollarSign,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#6366f1', '#f97316', '#64748b'
];

// ─── KPI Card matching Image 2 ────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color, bg, icon: Icon, onClick }) => (
  <div
    className="card"
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1.25rem',
      cursor: onClick ? 'pointer' : 'default',
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

const CustomChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--white)',
      border: '1px solid var(--surface-2)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 1rem',
      boxShadow: 'var(--shadow-md)',
      fontSize: '0.82rem',
    }}>
      <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--dark)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>LKR {Number(p.value).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

const PettyCashAnalytics = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/solar/finance/petty-cash/analytics');
      setAnalytics(res.data);
    } catch (err) {
      toast.error('Failed to load petty cash analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const summary = analytics?.summary || {};
  const categories = analytics?.categories || [];
  const accounts = analytics?.accounts || [];
  const monthlyTrend = analytics?.monthly_trend || [];
  const topPayees = analytics?.top_payees || [];
  const projectAllocations = analytics?.project_allocation || [];

  const exportCSV = () => {
    if (!accounts.length) return;
    const headers = ['Account Name,Custodian,Project Site,Initial Float,Current Balance,Total Spent,Total Replenished,Utilization %'];
    const rows = accounts.map(a =>
      `"${a.account_name}","${a.custodian_name}","${a.project_name}",${a.initial_float},${a.current_balance},${a.total_spent},${a.total_replenished},${a.utilization_pct}%`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `petty_cash_accounts_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header matching Image 2 */}
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
            Petty Cash Analytics & Float Control
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Comprehensive float utilization, replenishment velocity, category spend breakdown, and custodian performance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/solar/finance/admin/petty-cash')}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
          >
            <Wallet size={15} /> Float Accounts
          </button>
          <button
            onClick={exportCSV}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Top 5 KPI Cards Matching Image 2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <KpiCard
          label="Total Allocated Float"
          value={`LKR ${Number(summary.total_float_allocated || 0).toLocaleString()}`}
          sub={`${summary.active_accounts_count || 0} Float Accounts`}
          color="#059669"
          bg="#ecfdf5"
          icon={Wallet}
        />
        <KpiCard
          label="Current Field Balance"
          value={`LKR ${Number(summary.current_field_balance || 0).toLocaleString()}`}
          sub="Live cash available on site"
          color="#2563eb"
          bg="#eff6ff"
          icon={DollarSign}
        />
        <KpiCard
          label="This Month's Spend"
          value={`LKR ${Number(summary.month_expenses || 0).toLocaleString()}`}
          sub="Month PCV disbursements"
          color="#e11d48"
          bg="#fff1f2"
          icon={Receipt}
        />
        <KpiCard
          label="Month Replenished"
          value={`LKR ${Number(summary.month_replenished || 0).toLocaleString()}`}
          sub="Float top-up transfers"
          color="#9333ea"
          bg="#faf5ff"
          icon={TrendingUp}
        />
        <KpiCard
          label="Low Balance Floats"
          value={summary.low_balance_count || 0}
          sub="Below alert threshold"
          color="#dc2626"
          bg="#fef2f2"
          icon={AlertTriangle}
          onClick={() => navigate('/solar/finance/admin/petty-cash')}
        />
      </div>

      {/* Charts Grid: Monthly Outflow vs Top-ups + Category Donut */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.75rem',
      }}>
        {/* Chart 1: 6-Month Monthly Trend */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                6-Month Spending vs Replenishment Velocity
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>
                Monthly cash outflows against float top-ups
              </p>
            </div>
            <BarChart2 size={18} color="#10b981" />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTopup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="expenses" name="Petty Cash Spent" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                  <Area type="monotone" dataKey="replenished" name="Float Replenished" stroke="#10b981" fillOpacity={1} fill="url(#colorTopup)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--text-muted)' }}>
                No monthly transactions recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                Petty Cash Category Distribution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>
                Breakdown of all on-site minor disbursements
              </p>
            </div>
            <PieIcon size={18} color="#3b82f6" />
          </div>

          {categories.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ width: '200px', height: 220, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, minWidth: '180px', maxHeight: '220px', overflowY: 'auto' }}>
                {categories.map((cat, i) => {
                  const total = summary.total_expenses_all_time || 1;
                  const pct = Math.round((cat.value / total) * 100);

                  return (
                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--surface-2)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{cat.name}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        LKR {Number(cat.value).toLocaleString()} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', paddingTop: '5rem', color: 'var(--text-muted)' }}>
              No category transactions recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Custodian / Float Account Performance Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.75rem' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
              Custodian Float Accounts Performance & Utilization
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.2rem' }}>
              Real-time balance status, cumulative disbursements, top-ups, and float velocity
            </p>
          </div>
          <button
            onClick={() => navigate('/solar/finance/admin/petty-cash')}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            Manage Accounts <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.9rem 1.25rem' }}>Float Account & Custodian</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Assigned Project</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Initial Float</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Current Balance</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Total Spent</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Replenishments</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Float Utilization</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading float accounts...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No petty cash float accounts configured yet.
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{acc.account_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Custodian: {acc.custodian_name}
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {acc.project_name}
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      LKR {Number(acc.initial_float).toLocaleString()}
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span style={{ fontWeight: 700, color: acc.is_low ? '#ef4444' : '#10b981' }}>
                        LKR {Number(acc.current_balance).toLocaleString()}
                      </span>
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      LKR {Number(acc.total_spent).toLocaleString()} ({acc.vouchers_count} PCVs)
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      LKR {Number(acc.total_replenished).toLocaleString()}
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem', minWidth: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>{acc.utilization_pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(acc.utilization_pct, 100)}%`,
                          height: '100%',
                          backgroundColor: acc.is_low ? '#ef4444' : '#10b981',
                          borderRadius: '999px'
                        }} />
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: acc.is_low ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: acc.is_low ? '#ef4444' : '#10b981',
                      }}>
                        {acc.is_low ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                        {acc.is_low ? 'Low Float' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Insights: Top Payees & Project Consumption Rankings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Top Payees Ranking */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
              Top Petty Cash Payees / Vendors
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By cumulative amount</span>
          </div>

          {topPayees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No payee records available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {topPayees.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.72rem',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{item.payee}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>
                      LKR {Number(item.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {item.count} Vouchers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Petty Cash Consumption Ranking */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
              Petty Cash Consumption by Solar Site
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By site spend</span>
          </div>

          {projectAllocations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No site project tags on petty cash yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projectAllocations.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Sun size={15} color="#f59e0b" />
                    <span style={{ fontWeight: 600, color: 'var(--dark)' }}>{item.project_name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: 'var(--dark)' }}>
                      LKR {Number(item.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {item.count} Transactions
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PettyCashAnalytics;
