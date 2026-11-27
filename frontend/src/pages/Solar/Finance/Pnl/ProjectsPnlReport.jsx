import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Wallet,
  Banknote,
  FileText,
  Download
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

// ─── KPI Card matching Image 2 ────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, color, bg, icon: Icon }) => (
  <div
    className="card"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1.25rem',
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

const ProjectsPnlReport = () => {
  const [data, setData] = useState({
    summary: {
      total_contract_value: 0,
      total_direct_costs: 0,
      total_gross_profit: 0,
      overall_margin_pct: 0,
      total_projects_count: 0,
      at_risk_count: 0,
    },
    projects: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [marginFilter, setMarginFilter] = useState('all');

  // Modal States
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Budget Edit Modal
  const [editingBudgetProject, setEditingBudgetProject] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ contract_value: '', budget_limit: '' });
  const [savingBudget, setSavingBudget] = useState(false);

  const fetchPnlData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/solar/finance/projects-pnl');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load Projects P&L data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPnlData();
  }, [fetchPnlData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPnlData();
    setRefreshing(false);
  };

  const openDetailsModal = async (project) => {
    setSelectedProject(project);
    try {
      setLoadingDetails(true);
      const res = await api.get(`/solar/finance/projects-pnl/${project.id}`);
      setProjectDetails(res.data);
    } catch (err) {
      toast.error('Failed to load project cost details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openBudgetModal = (project) => {
    setEditingBudgetProject(project);
    setBudgetForm({
      contract_value: project.contract_value || '',
      budget_limit: project.budget_limit || '',
    });
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    if (!editingBudgetProject) return;

    try {
      setSavingBudget(true);
      await api.put(`/solar/finance/projects-pnl/${editingBudgetProject.id}/budget`, {
        contract_value: Number(budgetForm.contract_value),
        budget_limit: Number(budgetForm.budget_limit),
      });
      toast.success(`Contract value updated for ${editingBudgetProject.name}`);
      setEditingBudgetProject(null);
      fetchPnlData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update contract value');
    } finally {
      setSavingBudget(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return (data.projects || []).filter(p => {
      const matchesSearch =
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.client_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

      let matchesMargin = true;
      if (marginFilter === 'high') matchesMargin = p.margin_pct >= 25;
      else if (marginFilter === 'moderate') matchesMargin = p.margin_pct >= 10 && p.margin_pct < 25;
      else if (marginFilter === 'risk') matchesMargin = p.margin_pct < 10 || p.is_at_risk;

      return matchesSearch && matchesStatus && matchesMargin;
    });
  }, [data.projects, search, statusFilter, marginFilter]);

  const { summary } = data;

  const exportCSV = () => {
    if (!filteredProjects.length) return;
    const headers = ['Project Name,Client,Status,Contract Value,Budget Limit,Petty Cash Spent,Cash Advances,Total Costs,Gross Profit,Margin %'];
    const rows = filteredProjects.map(p =>
      `"${p.name}","${p.client_name || ''}","${p.status}",${p.contract_value},${p.budget_limit},${p.petty_cash_total},${p.cash_advances_total},${p.total_direct_costs},${p.gross_profit},${p.margin_pct}%`
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `solar_projects_pnl_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header Row matching Image 2 */}
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
            Profit & Loss (P&L)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            Real-time project contract revenue, realized direct field cash outflows, gross margin %, and budget control.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top KPI Cards matching Image 2 style */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <KpiCard
          label="Total Contract Revenue"
          value={`LKR ${Number(summary.total_contract_value || 0).toLocaleString()}`}
          sub={`${summary.total_projects_count || 0} Total Projects`}
          color="#059669"
          bg="#ecfdf5"
          icon={DollarSign}
        />
        <KpiCard
          label="Total Field Outflows"
          value={`LKR ${Number(summary.total_direct_costs || 0).toLocaleString()}`}
          sub="Petty cash + advances"
          color="#e11d48"
          bg="#fff1f2"
          icon={Wallet}
        />
        <KpiCard
          label="Net Realized Profit"
          value={`LKR ${Number(summary.total_gross_profit || 0).toLocaleString()}`}
          sub="Contract value minus costs"
          color="#2563eb"
          bg="#eff6ff"
          icon={TrendingUp}
        />
        <KpiCard
          label="Overall Margin"
          value={`${summary.overall_margin_pct || 0}%`}
          sub="Target margin: > 25%"
          color="#9333ea"
          bg="#faf5ff"
          icon={PieChart}
        />
        <KpiCard
          label="At Risk Projects"
          value={summary.at_risk_count || 0}
          sub="Margin < 10% or over budget"
          color="#dc2626"
          bg="#fef2f2"
          icon={AlertTriangle}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by solar project or client..."
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 200px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Status:</label>
          <select
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 230px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Profitability:</label>
          <select
            className="form-control"
            value={marginFilter}
            onChange={(e) => setMarginFilter(e.target.value)}
          >
            <option value="all">All Margins</option>
            <option value="high">Healthy (≥ 25%)</option>
            <option value="moderate">Moderate (10% - 24%)</option>
            <option value="risk">At Risk / Over Budget (&lt; 10%)</option>
          </select>
        </div>
      </div>

      {/* Projects P&L Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.9rem 1.25rem' }}>Project & Client</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Contract Value (LKR)</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Budget Limit</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Petty Cash</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Cash Advances</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Total Cost</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Gross Profit</th>
                <th style={{ padding: '0.9rem 1.25rem' }}>Margin %</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    Calculating project profit & loss metrics...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    No solar projects matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(proj => {
                  const isHealthy = proj.margin_pct >= 25;
                  const isModerate = proj.margin_pct >= 10 && proj.margin_pct < 25;
                  const isAtRisk = proj.is_at_risk || proj.margin_pct < 10;

                  const marginBadgeColor = isAtRisk ? '#ef4444' : isModerate ? '#f59e0b' : '#10b981';

                  return (
                    <tr key={proj.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{proj.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {proj.client_name || 'Client N/A'} · <span style={{ textTransform: 'capitalize' }}>{proj.status}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {proj.contract_value > 0 ? (
                          <span style={{ fontWeight: 600 }}>LKR {Number(proj.contract_value).toLocaleString()}</span>
                        ) : (
                          <button
                            onClick={() => openBudgetModal(proj)}
                            style={{
                              background: 'none', border: '1px dashed #10b981', borderRadius: '4px',
                              padding: '0.2rem 0.5rem', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer'
                            }}
                          >
                            + Set Contract Value
                          </button>
                        )}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {proj.budget_limit > 0 ? `LKR ${Number(proj.budget_limit).toLocaleString()}` : '—'}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                        LKR {Number(proj.petty_cash_total).toLocaleString()}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>
                        LKR {Number(proj.cash_advances_total).toLocaleString()}
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{ fontWeight: 700, color: '#e11d48' }}>
                          LKR {Number(proj.total_direct_costs).toLocaleString()}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{
                          fontWeight: 700,
                          color: proj.gross_profit >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          LKR {Number(proj.gross_profit).toLocaleString()}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: `${marginBadgeColor}15`,
                          color: marginBadgeColor,
                        }}>
                          {proj.margin_pct >= 10 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {proj.margin_pct}%
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => openDetailsModal(proj)}
                            className="btn btn-ghost"
                            title="View Cost Breakdown"
                            style={{
                              padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                              border: '1px solid var(--surface-2)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                            }}
                          >
                            <Eye size={13} /> Breakdown
                          </button>
                          <button
                            onClick={() => openBudgetModal(proj)}
                            className="btn btn-ghost"
                            title="Edit Contract & Budget"
                            style={{
                              padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                              border: '1px solid var(--surface-2)'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Cost Breakdown Drawer / Modal */}
      {selectedProject && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', zIndex: 1100,
        }}>
          <div className="card" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Project Financial Breakdown</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
                  {selectedProject.name}
                </h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Client: {selectedProject.client_name || 'N/A'} · Site: {selectedProject.site_name}
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Financial Performance Summary Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.85rem',
              backgroundColor: 'var(--surface-2)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Contract Value</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' }}>
                  LKR {Number(selectedProject.contract_value).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Cash Outflow</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e11d48' }}>
                  LKR {Number(selectedProject.total_direct_costs).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gross Profit</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedProject.gross_profit >= 0 ? '#10b981' : '#ef4444' }}>
                  LKR {Number(selectedProject.gross_profit).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Margin %</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
                  {selectedProject.margin_pct}%
                </div>
              </div>
            </div>

            {/* Category Outflow Distribution */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Spending Distribution by Category
              </h3>
              {Object.keys(selectedProject.category_breakdown || {}).length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '1rem', backgroundColor: 'var(--surface-2)', borderRadius: '8px' }}>
                  No categorized expenses recorded yet for this solar project.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Object.entries(selectedProject.category_breakdown).map(([cat, amt]) => {
                    const pct = selectedProject.total_direct_costs > 0
                      ? Math.round((amt / selectedProject.total_direct_costs) * 100)
                      : 0;

                    return (
                      <div key={cat} style={{ backgroundColor: 'var(--surface-2)', padding: '0.65rem 1rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontWeight: 600 }}>{cat}</span>
                          <span>LKR {Number(amt).toLocaleString()} ({pct}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '999px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Vouchers & Advances Tabs */}
            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Loading transaction history...
              </div>
            ) : projectDetails ? (
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Recent Transactions ({projectDetails.vouchers?.length || 0} Vouchers · {projectDetails.advances?.length || 0} Advances)
                </h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--surface-2)', borderRadius: '8px' }}>
                  <table className="table" style={{ margin: 0, width: '100%', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Type</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Reference</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Payee / Purpose</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Amount</th>
                        <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectDetails.vouchers?.map(v => (
                        <tr key={v.id}>
                          <td style={{ padding: '0.6rem 0.8rem', color: '#10b981', fontWeight: 600 }}>PCV Voucher</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{v.voucher_no}</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{v.paid_to || v.category}</td>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>LKR {Number(v.amount).toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{new Date(v.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {projectDetails.advances?.map(a => (
                        <tr key={a.id}>
                          <td style={{ padding: '0.6rem 0.8rem', color: '#3b82f6', fontWeight: 600 }}>Cash Advance</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{a.request_no}</td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>{a.purpose}</td>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>LKR {Number(a.amount_approved || a.amount_requested).toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedProject(null)}
                className="btn btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contract Value & Budget Modal */}
      {editingBudgetProject && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100
        }}>
          <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Set Contract Value & Budget
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Update contract revenue target and budget threshold for <strong>{editingBudgetProject.name}</strong>.
            </p>

            <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Total Contract Value (LKR) *
                </label>
                <input
                  type="number"
                  required
                  className="form-control"
                  value={budgetForm.contract_value}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, contract_value: e.target.value }))}
                  placeholder="e.g. 15000000"
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Total customer contract value used to calculate net profit and margin %.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Target Budget Outflow Limit (LKR)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={budgetForm.budget_limit}
                  onChange={(e) => setBudgetForm(prev => ({ ...prev, budget_limit: e.target.value }))}
                  placeholder="e.g. 11000000"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Maximum budgeted field expenditure before triggering cost variance alarms.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingBudgetProject(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
                >
                  {savingBudget ? 'Saving...' : 'Save Financial Values'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPnlReport;
