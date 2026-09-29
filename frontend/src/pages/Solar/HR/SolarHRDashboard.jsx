import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, Umbrella, Clock, UserPlus,
  Cake, FileWarning, CalendarClock, Banknote,
  TrendingUp, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../../../services/api';

// ─── Static chart data (will be replaced by attendance/leave API in Phase 2) ──
const MOCK_ATTENDANCE_TREND = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  present: Math.floor(Math.random() * 4) + 9,
  absent: Math.floor(Math.random() * 3) + 1,
  leave: Math.floor(Math.random() * 2),
}));

const MOCK_LEAVE_MONTHLY = [
  { month: 'Apr', annual: 4, casual: 2, medical: 1 },
  { month: 'May', annual: 2, casual: 5, medical: 3 },
  { month: 'Jun', annual: 6, casual: 3, medical: 2 },
  { month: 'Jul', annual: 3, casual: 4, medical: 4 },
  { month: 'Aug', annual: 5, casual: 1, medical: 2 },
  { month: 'Sep', annual: 4, casual: 3, medical: 1 },
  { month: 'Oct', annual: 2, casual: 2, medical: 0 },
];

const MOCK_HEADCOUNT = [
  { month: 'Apr', count: 10 },
  { month: 'May', count: 11 },
  { month: 'Jun', count: 11 },
  { month: 'Jul', count: 12 },
  { month: 'Aug', count: 13 },
  { month: 'Sep', count: 14 },
  { month: 'Oct', count: 14 },
];

const DEPT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, bg, sub }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
    <div style={{
      background: bg, color,
      width: '48px', height: '48px', borderRadius: 'var(--radius-md)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--surface-2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-md)', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--dark)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const HRDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [deptData, setDeptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/hr/dashboard/stats');
      setStats(data);
      setDeptData(data.by_department || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load HR dashboard stats', err);
    }
  };

  useEffect(() => {
    fetchStats().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
      Loading dashboard...
    </div>
  );

  const kpiCards = [
    { icon: Users,         label: 'Total Employees',       value: stats?.total_employees ?? 0,        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { icon: UserCheck,     label: 'Present Today',          value: stats?.present_today ?? 0,          color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { icon: UserX,         label: 'Absent Today',           value: stats?.absent_today ?? 0,           color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { icon: Umbrella,      label: 'On Leave Today',         value: stats?.on_leave_today ?? 0,         color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: Clock,         label: 'Late Arrivals',          value: stats?.late_arrivals ?? 0,          color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    { icon: UserPlus,      label: 'New This Month',         value: stats?.new_this_month ?? 0,         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { icon: Cake,          label: 'Birthdays This Week',    value: stats?.birthdays_this_week ?? 0,    color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { icon: FileWarning,   label: 'Contracts Expiring',     value: stats?.contracts_expiring ?? 0,     color: '#ef4444', bg: 'rgba(239,68,68,0.1)', sub: 'Next 30 days' },
    { icon: CalendarClock, label: 'Pending Leave Requests', value: stats?.pending_leave_requests ?? 0, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
    { icon: Banknote,      label: 'Payroll Status',         value: stats?.payroll_status ?? '—',       color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', sub: 'Current month' },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>HR Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>
            Circle Engineering - Human Resources Overview ·{' '}
            <span style={{ fontSize: '0.8rem' }}>Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleRefresh}
            className="btn btn-ghost"
            style={{ border: '1px solid var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/solar/hr/admin/employees/new')}
            className="btn btn-primary"
            style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
          >
            + Add Employee
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpiCards.map((card, i) => <KpiCard key={i} {...card} />)}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>30-Day Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={MOCK_ATTENDANCE_TREND} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="present" name="Present" stroke="#3b82f6" fill="url(#presentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="absent"  name="Absent"  stroke="#ef4444" fill="url(#absentGrad)"  strokeWidth={2} />
              <Area type="monotone" dataKey="leave"   name="On Leave" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Real department data from API */}
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Employees by Department</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={deptData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {deptData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Monthly Leave by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_LEAVE_MONTHLY} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="annual" name="Annual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="casual" name="Casual" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="medical"   name="Medical"   fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Headcount Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_HEADCOUNT} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Employees" stroke="#8b5cf6" fill="url(#headGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default HRDashboard;
