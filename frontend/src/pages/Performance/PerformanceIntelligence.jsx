import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, Car,
  Target, BarChart2, Settings, Users, ChevronDown, Download,
  DollarSign, Fuel, Navigation, Activity, Save
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// ─── Helper ────────────────────────────────────────────────────────────────

const fmt = (n) => (n ?? 0).toLocaleString('en-LK', { maximumFractionDigits: 0 });
const fmtDec = (n, d = 2) => (n ?? 0).toLocaleString('en-LK', { minimumFractionDigits: d, maximumFractionDigits: d });

const StatusPill = ({ value, target, higherIsBetter = true, suffix = '' }) => {
  const good = higherIsBetter ? value >= target : value <= target;
  const warn = higherIsBetter ? value >= target * 0.85 : value <= target * 1.15;
  const color = good ? '#10b981' : warn ? '#f59e0b' : '#ef4444';
  const bg = good ? 'rgba(16,185,129,0.12)' : warn ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: bg, color }}>
      {fmtDec(value, 1)}{suffix}
    </span>
  );
};

const KpiCard = ({ icon: Icon, label, value, sub, iconColor, iconBg }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
    <div style={{ background: iconBg, color: iconColor, padding: '0.75rem', borderRadius: '50%', flexShrink: 0 }}>
      <Icon size={26} />
    </div>
    <div>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</p>
      <h3 style={{ margin: '0.1rem 0 0', fontSize: '1.4rem' }}>{value}</h3>
      {sub && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  </div>
);

const Section = ({ title, children, style = {} }) => (
  <div className="card" style={{ marginBottom: '1.5rem', ...style }}>
    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {title}
    </h3>
    {children}
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const PerformanceIntelligence = () => {
  const [data, setData] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('fleet'); // 'fleet' | 'driver'
  const [selectedDriver, setSelectedDriver] = useState('');
  const [dateRange, setDateRange] = useState('30'); // days

  // Business Settings (admin-configurable, stored in state)
  const [settings, setSettings] = useState({
    daily_gross_target: 20000,
    driver_salary_fixed: 120000,
    vehicle_finance: 120000,
    service_cost: 15000,
    service_interval_km: 10000,
    tire_cost: 40000,
    tire_interval_km: 40000,
    other_fixed_costs: 10000,
    working_days_target: 30,
    // EV Settings
    ev_energy_cost_per_km: 10,
    ev_finance_monthly: 190000,
    ev_service_monthly: 2000,
    ev_other_monthly: 5000,
  });
  const [showSettings, setShowSettings] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (viewMode === 'driver' && selectedDriver) params.driver_id = selectedDriver;
      if (dateRange !== 'all') {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - parseInt(dateRange));
        params.start_date = start.toISOString().split('T')[0];
        params.end_date = end.toISOString().split('T')[0];
      }
      const res = await api.get('/intelligence', { params });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, selectedDriver, dateRange]);

  useEffect(() => {
    api.get('/intelligence/drivers').then(r => setDrivers(r.data.data || []));
    
    // Load Settings
    api.get('/settings').then(res => {
      const s = res.data;
      if (Object.keys(s).length > 0) {
        setSettings(prev => ({
          ...prev,
          daily_gross_target: parseFloat(s.daily_gross_target) || prev.daily_gross_target,
          driver_salary_fixed: parseFloat(s.driver_salary_fixed) || prev.driver_salary_fixed,
          vehicle_finance: parseFloat(s.vehicle_finance) || prev.vehicle_finance,
          service_cost: parseFloat(s.service_cost) || prev.service_cost,
          service_interval_km: parseFloat(s.service_interval_km) || prev.service_interval_km,
          tire_cost: parseFloat(s.tire_cost) || prev.tire_cost,
          tire_interval_km: parseFloat(s.tire_interval_km) || prev.tire_interval_km,
          other_fixed_costs: parseFloat(s.other_fixed_costs) || prev.other_fixed_costs,
          working_days_target: parseFloat(s.working_days_target) || prev.working_days_target,
          ev_energy_cost_per_km: parseFloat(s.ev_energy_cost_per_km) || prev.ev_energy_cost_per_km,
          ev_finance_monthly: parseFloat(s.ev_finance_monthly) || prev.ev_finance_monthly,
          ev_service_monthly: parseFloat(s.ev_service_monthly) || prev.ev_service_monthly,
          ev_other_monthly: parseFloat(s.ev_other_monthly) || prev.ev_other_monthly,
        }));
      }
    }).catch(e => console.error("Failed to load settings:", e));
  }, []);

  const saveSettings = async () => {
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
      await api.post('/settings/batch', { settings: settingsArray });
      toast.success('Business settings saved successfully');
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Projections (all frontend math) ───────────────────────────────────────

  const proj = data ? (() => {
    const days = settings.working_days_target;
    const projGross          = data.avg_daily_gross * days;
    const projCommission     = projGross * (data.commission_rate / 100);
    const projNet            = data.avg_daily_net * days;
    const projFuel           = data.avg_daily_fuel * days;
    const projKm             = data.avg_daily_km * days;
    const projOther          = data.avg_daily_other * days;
    const serviceMonthly     = projKm > 0 ? (projKm / settings.service_interval_km) * settings.service_cost : 0;
    const tireMonthly        = projKm > 0 ? (projKm / settings.tire_interval_km) * settings.tire_cost : 0;
    const maintenanceMonthly = serviceMonthly + tireMonthly;

    const totalCosts = projFuel + settings.driver_salary_fixed + settings.vehicle_finance +
      maintenanceMonthly + settings.other_fixed_costs + projOther;
    const companyProfit = projNet - totalCosts;

    // Days till next service
    const daysToService = data.avg_daily_km > 0
      ? Math.round(settings.service_interval_km / data.avg_daily_km) : null;

    // Target hit days (from trend)
    const targetHitDays = (data.daily_trend || []).filter(d => d.gross >= settings.daily_gross_target).length;

    return {
      projGross, projCommission, projNet, projFuel, projKm,
      projOther, serviceMonthly, tireMonthly, maintenanceMonthly,
      totalCosts, companyProfit, daysToService, targetHitDays,
      targetHitRate: data.daily_trend?.length > 0
        ? Math.round(targetHitDays / data.daily_trend.length * 100) : 0,
    };
  })() : null;

  // EV Comparison
  const evComp = proj ? (() => {
    const evEnergyCost   = proj.projKm * settings.ev_energy_cost_per_km;
    const evTotalCosts   = evEnergyCost + settings.driver_salary_fixed + settings.ev_finance_monthly +
      settings.ev_service_monthly + settings.ev_other_monthly;
    const evProfit       = proj.projNet - evTotalCosts;
    const petrolTotalCosts = proj.totalCosts;
    const monthlySavings = petrolTotalCosts - evTotalCosts;
    const extraFinance   = settings.ev_finance_monthly - settings.vehicle_finance;
    const breakEvenMonths = monthlySavings > 0 ? Math.ceil(extraFinance * 12 / (monthlySavings * 12)) : null;

    return { evEnergyCost, evTotalCosts, evProfit, monthlySavings, breakEvenMonths };
  })() : null;

  // ── Alerts ────────────────────────────────────────────────────────────────

  const alerts = data && proj ? [
    data.avg_daily_gross < settings.daily_gross_target * 0.7 && {
      type: 'danger', icon: TrendingDown,
      msg: `Daily gross avg (Rs ${fmt(data.avg_daily_gross)}) is ${Math.round((1 - data.avg_daily_gross / settings.daily_gross_target) * 100)}% below the Rs ${fmt(settings.daily_gross_target)} target.`
    },
    data.empty_run_percent > 25 && {
      type: 'warning', icon: Navigation,
      msg: `Empty run is ${data.empty_run_percent}% of total distance. Target: < 20%. Coaching recommended.`
    },
    proj.daysToService && proj.daysToService <= 20 && {
      type: 'warning', icon: AlertTriangle,
      msg: `Vehicle service due in ~${proj.daysToService} days at current pace (every ${fmt(settings.service_interval_km)} km).`
    },
    proj.companyProfit < 0 && {
      type: 'danger', icon: DollarSign,
      msg: `Projected monthly company loss: Rs ${fmt(Math.abs(proj.companyProfit))}. Immediate action needed.`
    },
    proj.targetHitRate >= 80 && {
      type: 'success', icon: CheckCircle,
      msg: `Excellent! Driver hit the daily gross target on ${proj.targetHitRate}% of days.`
    },
  ].filter(Boolean) : [];

  // ── Waterfall chart data ───────────────────────────────────────────────────

  const waterfallData = proj ? [
    { name: 'Gross', value: proj.projGross, fill: '#10b981' },
    { name: 'Commission', value: -proj.projCommission, fill: '#ef4444' },
    { name: 'Net', value: proj.projNet, fill: '#3b82f6', isNet: true },
    { name: 'Fuel', value: -proj.projFuel, fill: '#f59e0b' },
    { name: 'Salary', value: -settings.driver_salary_fixed, fill: '#8b5cf6' },
    { name: 'Finance', value: -settings.vehicle_finance, fill: '#6366f1' },
    { name: 'Maintenance', value: -proj.maintenanceMonthly, fill: '#f97316' },
    { name: 'Other', value: -(settings.other_fixed_costs + proj.projOther), fill: '#94a3b8' },
    { name: 'Profit', value: proj.companyProfit, fill: proj.companyProfit >= 0 ? '#10b981' : '#ef4444', isProfit: true },
  ] : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Performance Intelligence</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Predictive analytics, P&L projections, and EV feasibility — based on live operational data.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(s => !s)}
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Settings size={16} /> Business Settings
        </button>
      </div>

      {/* Business Settings Panel */}
      {showSettings && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface-2, #f8fafc)', border: '1px dashed var(--success)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--success)' }}>⚙ Business Cost Settings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { key: 'daily_gross_target', label: 'Daily Gross Target (Rs)' },
              { key: 'driver_salary_fixed', label: 'Driver Salary / Month (Rs)' },
              { key: 'vehicle_finance', label: 'Vehicle Finance / Month (Rs)' },
              { key: 'service_cost', label: 'Service Cost (Rs)' },
              { key: 'service_interval_km', label: 'Service Interval (km)' },
              { key: 'tire_cost', label: 'Tire Set Cost (Rs)' },
              { key: 'tire_interval_km', label: 'Tire Interval (km)' },
              { key: 'other_fixed_costs', label: 'Other Fixed Costs / Month (Rs)' },
              { key: 'working_days_target', label: 'Projection Days' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings[key]}
                  onChange={e => setSettings(s => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
          <h4 style={{ margin: '1.25rem 0 1rem', color: '#6366f1' }}>⚡ EV Comparison Settings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { key: 'ev_energy_cost_per_km', label: 'EV Energy Cost / km (Rs)' },
              { key: 'ev_finance_monthly', label: 'EV Finance / Month (Rs)' },
              { key: 'ev_service_monthly', label: 'EV Service / Month (Rs)' },
              { key: 'ev_other_monthly', label: 'EV Other Costs / Month (Rs)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                <input
                  type="number"
                  className="form-control"
                  value={settings[key]}
                  onChange={e => setSettings(s => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveSettings} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={16} /> Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-2, #f1f5f9)', borderRadius: '0.5rem', padding: '0.2rem' }}>
          {['fleet', 'driver'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: '0.4rem 1rem', border: 'none', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              background: viewMode === m ? 'var(--success)' : 'transparent',
              color: viewMode === m ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}>
              {m === 'fleet' ? '🚗 Fleet-Wide' : '👤 Per Driver'}
            </button>
          ))}
        </div>

        {/* Driver Selector */}
        {viewMode === 'driver' && (
          <select
            className="form-control"
            value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}
            style={{ minWidth: '180px', width: 'auto' }}
          >
            <option value="">— Select Driver —</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        {/* Date Range */}
        <select
          className="form-control"
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          style={{ minWidth: '140px', width: 'auto' }}
        >
          <option value="7">Last 7 Days</option>
          <option value="14">Last 14 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="all">All Time</option>
        </select>

        <button onClick={fetchData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={15} /> Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading intelligence data...
        </div>
      )}

      {!isLoading && !data && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3>No approved logs found</h3>
          <p>Approve daily ride logs first to see projections and analytics.</p>
        </div>
      )}

      {!isLoading && data && proj && (
        <>
          {/* ── Alerts ── */}
          {alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {alerts.map((a, i) => {
                const bg = a.type === 'danger' ? 'rgba(239,68,68,0.08)' : a.type === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';
                const border = a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#10b981';
                const Icon = a.icon;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: bg, borderLeft: `3px solid ${border}` }}>
                    <Icon size={18} color={border} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span style={{ fontSize: '0.88rem' }}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Daily Averages KPI Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KpiCard icon={TrendingUp} label="Avg Daily Gross" value={`Rs ${fmt(data.avg_daily_gross)}`} sub={`Target: Rs ${fmt(settings.daily_gross_target)}`} iconColor="#10b981" iconBg="rgba(16,185,129,0.12)" />
            <KpiCard icon={DollarSign} label="Avg Daily Net" value={`Rs ${fmt(data.avg_daily_net)}`} sub={`Commission: ${fmtDec(data.commission_rate)}%`} iconColor="#3b82f6" iconBg="rgba(59,130,246,0.12)" />
            <KpiCard icon={Fuel} label="Avg Daily Fuel" value={`Rs ${fmt(data.avg_daily_fuel)}`} sub={`Rs ${fmtDec(data.fuel_cost_per_km)}/km`} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.12)" />
            <KpiCard icon={Navigation} label="Avg Daily KM" value={`${fmtDec(data.avg_daily_km, 0)} km`} sub={`Hire: ${fmtDec(data.avg_daily_hire_km, 0)} | Empty: ${fmtDec(data.avg_daily_empty_km, 0)}`} iconColor="#8b5cf6" iconBg="rgba(139,92,246,0.12)" />
            <KpiCard icon={Activity} label="Logs Analyzed" value={data.log_count} sub={`${data.period_days} period days`} iconColor="#ec4899" iconBg="rgba(236,72,153,0.12)" />
          </div>

          {/* ── Efficiency KPIs ── */}
          <Section title={<><Target size={18} color="var(--success)" /> Efficiency KPIs</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Daily Gross vs Target', value: data.avg_daily_gross, target: settings.daily_gross_target, suffix: ' Rs', display: `Rs ${fmt(data.avg_daily_gross)} / Rs ${fmt(settings.daily_gross_target)}`, higherIsBetter: true },
                { label: 'Empty Run %', value: data.empty_run_percent, target: 20, suffix: '%', display: `${data.empty_run_percent}% (target: <20%)`, higherIsBetter: false },
                { label: 'Hire KM %', value: data.hire_km_percent, target: 75, suffix: '%', display: `${data.hire_km_percent}% (target: >75%)`, higherIsBetter: true },
                { label: 'Commission Rate', value: data.commission_rate, target: 15, suffix: '%', display: `${data.commission_rate}% (target: <15%)`, higherIsBetter: false },
                { label: 'Fuel Cost / km', value: data.fuel_cost_per_km, target: 55, suffix: ' Rs', display: `Rs ${data.fuel_cost_per_km} / km (target: <55)`, higherIsBetter: false },
                { label: 'Target Hit Rate', value: proj.targetHitRate, target: 80, suffix: '%', display: `${proj.targetHitRate}% of days (target: 80%+)`, higherIsBetter: true },
              ].map(kpi => (
                <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{kpi.label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <StatusPill value={kpi.value} target={kpi.target} higherIsBetter={kpi.higherIsBetter} suffix={kpi.suffix} />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{kpi.display}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Monthly Projection Cards ── */}
          <Section title={<><BarChart2 size={18} color="var(--success)" /> Monthly Projection ({settings.working_days_target} days @ current average)</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'Projected Gross', value: `Rs ${fmt(proj.projGross)}`, color: '#10b981' },
                { label: 'Projected Net', value: `Rs ${fmt(proj.projNet)}`, color: '#3b82f6' },
                { label: 'Projected Fuel', value: `Rs ${fmt(proj.projFuel)}`, color: '#f59e0b' },
                { label: 'Projected KM', value: `${fmt(proj.projKm)} km`, color: '#8b5cf6' },
                { label: 'Maintenance', value: `Rs ${fmt(proj.maintenanceMonthly)}`, color: '#f97316' },
                { label: 'Next Service In', value: proj.daysToService ? `~${proj.daysToService} days` : 'N/A', color: proj.daysToService && proj.daysToService <= 20 ? '#ef4444' : '#64748b' },
              ].map(item => (
                <div key={item.label} style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* P&L Waterfall */}
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Monthly P&L Breakdown</h4>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '600px', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `Rs ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v) => `Rs ${fmt(Math.abs(v))}`} />
                    <ReferenceLine y={0} stroke="#94a3b8" />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* P&L Summary Table */}
            <div style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '0.5rem', background: proj.companyProfit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${proj.companyProfit >= 0 ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Projected Company {proj.companyProfit >= 0 ? 'Profit' : 'Loss'}</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: proj.companyProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {proj.companyProfit >= 0 ? '+' : '-'}Rs {fmt(Math.abs(proj.companyProfit))}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1.5rem', marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {[
                  ['Net Revenue', `+Rs ${fmt(proj.projNet)}`],
                  ['Fuel', `-Rs ${fmt(proj.projFuel)}`],
                  ['Driver Salary', `-Rs ${fmt(settings.driver_salary_fixed)}`],
                  ['Vehicle Finance', `-Rs ${fmt(settings.vehicle_finance)}`],
                  ['Maintenance', `-Rs ${fmt(proj.maintenanceMonthly)}`],
                  ['Other Costs', `-Rs ${fmt(settings.other_fixed_costs + proj.projOther)}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.15rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span>{k}</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Daily Trend Chart ── */}
          <Section title={<><TrendingUp size={18} color="var(--success)" /> Daily Revenue Trend vs Target</>}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '500px', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily_trend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={v => `Rs ${fmt(v)}`} />
                    <Legend />
                    <ReferenceLine y={settings.daily_gross_target} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Target', fill: '#ef4444', fontSize: 11 }} />
                    <Line type="monotone" dataKey="gross" name="Gross Revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="net" name="Net Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="fuel" name="Fuel Cost" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Section>

          {/* ── EV Comparison ── */}
          <Section title={<><Zap size={18} color="#6366f1" /> Electric Vehicle Feasibility Analysis</>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Petrol Card */}
              <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(245,158,11,0.06)', border: '1px solid #f59e0b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Car size={22} color="#f59e0b" /> <h4 style={{ margin: 0, color: '#f59e0b' }}>Current (Petrol)</h4>
                </div>
                {[
                  ['Monthly Fuel Cost', `Rs ${fmt(proj.projFuel)}`],
                  ['Monthly Finance', `Rs ${fmt(settings.vehicle_finance)}`],
                  ['Monthly Service', `Rs ${fmt(proj.maintenanceMonthly)}`],
                  ['Total Monthly Costs', `Rs ${fmt(proj.totalCosts)}`],
                  ['Company Profit/Loss', `${proj.companyProfit >= 0 ? '+' : '-'}Rs ${fmt(Math.abs(proj.companyProfit))}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(245,158,11,0.15)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>

              {/* EV Card */}
              <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(99,102,241,0.06)', border: '2px solid #6366f1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Zap size={22} color="#6366f1" /> <h4 style={{ margin: 0, color: '#6366f1' }}>Electric Vehicle (EV)</h4>
                </div>
                {[
                  ['Monthly Energy Cost', `Rs ${fmt(evComp.evEnergyCost)}`],
                  ['Monthly Finance', `Rs ${fmt(settings.ev_finance_monthly)}`],
                  ['Monthly Service', `Rs ${fmt(settings.ev_service_monthly)}`],
                  ['Total Monthly Costs', `Rs ${fmt(evComp.evTotalCosts)}`],
                  ['Company Profit/Loss', `${evComp.evProfit >= 0 ? '+' : '-'}Rs ${fmt(Math.abs(evComp.evProfit))}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(99,102,241,0.15)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Verdict Banner */}
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem', background: evComp.monthlySavings > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${evComp.monthlySavings > 0 ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {evComp.monthlySavings > 0 ? '✅ EV saves' : '⚠️ EV costs more by'} Rs {fmt(Math.abs(evComp.monthlySavings))} / month
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    At {fmtDec(data.avg_daily_km, 0)} km/day avg. EV energy at Rs {settings.ev_energy_cost_per_km}/km.
                    {evComp.breakEvenMonths && ` Extra finance breaks even in ~${evComp.breakEvenMonths} months.`}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Petrol fuel cost</p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#f59e0b' }}>Rs {fmtDec(data.fuel_cost_per_km)}/km</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>EV energy cost</p>
                  <p style={{ margin: 0, fontWeight: 700, color: '#6366f1' }}>Rs {settings.ev_energy_cost_per_km}/km</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Driver Breakdown (Fleet view) ── */}
          {viewMode === 'fleet' && data.driver_breakdown?.length > 0 && (
            <Section title={<><Users size={18} color="var(--success)" /> Driver Breakdown</>}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Days</th>
                      <th>Avg Daily Gross</th>
                      <th>Avg Daily Net</th>
                      <th>Avg Daily KM</th>
                      <th>Fuel/KM</th>
                      <th>Empty Run %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.driver_breakdown.map(d => (
                      <tr key={d.driver_id}>
                        <td style={{ fontWeight: 600 }}>{d.driver_name}</td>
                        <td>{d.days_logged}</td>
                        <td style={{ color: d.avg_daily_gross >= settings.daily_gross_target ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                          Rs {fmt(d.avg_daily_gross)}
                        </td>
                        <td>Rs {fmt(d.avg_daily_net)}</td>
                        <td>{fmtDec(d.avg_daily_km, 0)} km</td>
                        <td>Rs {fmtDec(d.fuel_per_km)}</td>
                        <td>
                          <StatusPill value={d.empty_run_pct} target={20} higherIsBetter={false} suffix="%" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ── Coaching Tips ── */}
          <Section title={<>💡 Coaching Recommendations</>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                data.empty_run_percent > 20 && {
                  title: 'Reduce Empty Runs',
                  desc: `Current empty run is ${data.empty_run_percent}%. Reducing to 15% would save ~Rs ${fmt(data.avg_daily_empty_km * 0.5 * data.fuel_cost_per_km * settings.working_days_target)}/month in fuel.`,
                  color: '#f59e0b'
                },
                data.avg_daily_gross < settings.daily_gross_target && {
                  title: 'Increase Daily Earnings',
                  desc: `Driver is Rs ${fmt(settings.daily_gross_target - data.avg_daily_gross)}/day below target. Consider extending working hours or prioritizing long-distance hires.`,
                  color: '#ef4444'
                },
                data.fuel_cost_per_km > 60 && {
                  title: 'High Fuel Cost per KM',
                  desc: `Rs ${data.fuel_cost_per_km}/km is above the Rs 55 benchmark. Consider fuel-efficient driving coaching or vehicle servicing.`,
                  color: '#f97316'
                },
                evComp.monthlySavings > 50000 && {
                  title: '⚡ EV Upgrade Recommended',
                  desc: `Based on current ${fmtDec(data.avg_daily_km, 0)} km/day, switching to EV would save ~Rs ${fmt(evComp.monthlySavings)}/month in operating costs.`,
                  color: '#6366f1'
                },
                data.hire_km_percent < 70 && {
                  title: 'Improve Hire KM Ratio',
                  desc: `Only ${data.hire_km_percent}% of km driven are hire runs. Improving route acceptance rate can significantly increase net revenue.`,
                  color: '#3b82f6'
                },
              ].filter(Boolean).map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-2, #f8fafc)', borderLeft: `3px solid ${tip.color}` }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: tip.color }}>{tip.title}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{tip.desc}</p>
                  </div>
                </div>
              ))}
              {data.avg_daily_gross >= settings.daily_gross_target && data.empty_run_percent <= 20 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                  ✅ Excellent performance! All major KPIs are within target range.
                </div>
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
};

export default PerformanceIntelligence;
