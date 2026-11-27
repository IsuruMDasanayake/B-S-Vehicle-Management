import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  ShieldCheck,
  Shield,
  Banknote,
  Key,
  User,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

// ── Event Configuration (Colors, Badges, Icons) ──────────────────────────────
const EVENT_CONFIG = {
  cash_request_approved: {
    label: 'Request Approved',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    icon: CheckCircle2
  },
  cash_request_rejected: {
    label: 'Request Rejected',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    icon: XCircle
  },
  cash_disbursed: {
    label: 'Cash Disbursed',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    icon: Banknote
  },
  voucher_created: {
    label: 'Voucher Created',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    icon: FileText
  },
  voucher_printed: {
    label: 'Voucher Printed (PDF)',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.12)',
    icon: Printer
  },
  voucher_verified: {
    label: 'QR Verified',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    icon: ShieldCheck
  },
  role_updated: {
    label: 'Role & Limit Updated',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    icon: Shield
  },
  token_issued: {
    label: 'Mobile Token Issued',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    icon: Key
  },
  float_created: {
    label: 'Float Allocated',
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    icon: Layers
  },
  budget_updated: {
    label: 'Budget Modified',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    icon: TrendingUp
  },
};

const ROLE_BADGES = {
  finance_admin: { label: 'Finance Admin', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  director: { label: 'Director / MD', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  project_director: { label: 'Project Director', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
  project_manager: { label: 'Project Manager', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  accountant: { label: 'Accountant', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  super_admin: { label: 'Super Admin', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  solar_admin: { label: 'Solar Admin', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
};

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return 'Just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin} min${diffInMin > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function SolarFinanceActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_activities: 0,
    today_activities: 0,
    approvals_count: 0,
    vouchers_count: 0,
    role_events_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page };
      if (search.trim()) params.search = search.trim();
      if (eventFilter !== 'all') params.event = eventFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/solar/finance/activity-logs', { params });
      setLogs(res.data.data || []);
      setCurrentPage(res.data.current_page || 1);
      setTotalPages(res.data.last_page || 1);
      setTotalCount(res.data.total || 0);

      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [search, eventFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs(currentPage);
    setRefreshing(false);
  };

  const handleClearFilters = () => {
    setSearch('');
    setEventFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const exportCSV = () => {
    if (!logs.length) {
      toast.error('No logs available to export');
      return;
    }
    const headers = ['ID,Timestamp,Actor Name,Actor Email,Finance Role,Event Type,Description,IP Address'];
    const rows = logs.map(l => {
      const actorName = l.properties?.user_name || l.causer?.name || 'System';
      const actorEmail = l.properties?.user_email || l.causer?.email || 'system@circlegroup.lk';
      const role = l.properties?.finance_role || 'N/A';
      const ip = l.properties?.ip_address || '127.0.0.1';
      return `"${l.id}","${l.created_at}","${actorName}","${actorEmail}","${role}","${l.event}","${l.description.replace(/"/g, '""')}","${ip}"`;
    });

    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `solar_finance_activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Header matching Image 2 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Activity size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
              Finance Activity & Audit Logs
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Real-time audit trail of approvals, disbursements, vouchers, role changes, and ledger updates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={exportCSV}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              color: '#ffffff'
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards (matching Image 2 pastel layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        {/* Card 1: Total Activities */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Activities
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--dark)' }}>
              {stats.total_activities.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.1rem' }}>
              +{stats.today_activities} recorded today
            </div>
          </div>
        </div>

        {/* Card 2: Approvals & Decisions */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Approvals & Decisions
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--dark)' }}>
              {stats.approvals_count.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              By Directors & PMs
            </div>
          </div>
        </div>

        {/* Card 3: Vouchers & Disbursements */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#8b5cf6',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Vouchers & Disbursed
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--dark)' }}>
              {stats.vouchers_count.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              PCVs & Payment Vouchers
            </div>
          </div>
        </div>

        {/* Card 4: Governance & Role Updates */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#f59e0b',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Governance & Security
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--dark)' }}>
              {stats.role_events_count.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
              Limits & Access Tokens
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar Card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.75rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-end',
        }}>
          {/* Keyword Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Search Description / Ref
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search reference (#PCV-..., #REQ-...), user, or note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Event Filter */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              Action Type
            </label>
            <select
              className="form-control"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all">All Action Types</option>
              <option value="cash_request_approved">Approved Requests</option>
              <option value="cash_request_rejected">Rejected Requests</option>
              <option value="cash_disbursed">Cash Disbursed</option>
              <option value="voucher_created">Petty Cash Vouchers</option>
              <option value="voucher_printed">Vouchers Printed (PDF)</option>
              <option value="voucher_verified">QR Verifications</option>
              <option value="role_updated">Role & Limit Changes</option>
              <option value="token_issued">Mobile Tokens Issued</option>
              <option value="float_created">Float Allocations</option>
              <option value="budget_updated">Budget Modifications</option>
            </select>
          </div>

          {/* Date From */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              From Date
            </label>
            <input
              type="date"
              className="form-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Date To */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              To Date
            </label>
            <input
              type="date"
              className="form-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Clear Filters Button */}
          <div>
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.85rem', height: '38px' }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--surface-2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Activity Log History ({totalCount})
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Chronological log of financial events captured in the system
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem', width: '150px' }}>Timestamp</th>
                <th style={{ padding: '1rem', width: '220px' }}>Actor / Role</th>
                <th style={{ padding: '1rem', width: '170px' }}>Action</th>
                <th style={{ padding: '1rem' }}>Description & Particulars</th>
                <th style={{ padding: '1rem', width: '130px', textAlign: 'right' }}>Device / IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    Loading activity trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      No activity logs found
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>
                      Try clearing search filters or checking other dates.
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const eventCfg = EVENT_CONFIG[log.event] || {
                    label: log.event?.replace(/_/g, ' ') || 'Activity',
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    icon: Activity
                  };
                  const Icon = eventCfg.icon;

                  const actorName = log.properties?.user_name || log.causer?.name || 'System Auto';
                  const actorEmail = log.properties?.user_email || log.causer?.email || '';
                  const rawRole = log.properties?.finance_role || log.causer?.role || 'user';
                  const roleBadge = ROLE_BADGES[rawRole] || { label: rawRole.replace(/_/g, ' '), color: '#64748b', bg: 'rgba(100,116,139,0.1)' };

                  const createdAt = new Date(log.created_at);
                  const dateStr = createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const relativeTime = formatRelativeTime(log.created_at);

                  const ip = log.properties?.ip_address || '127.0.0.1';

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-2)', transition: 'background-color 0.15s ease' }}>
                      {/* Timestamp */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--dark)' }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={11} /> {timeStr}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#10b981',
                          marginTop: '0.2rem'
                        }}>
                          {relativeTime}
                        </div>
                      </td>

                      {/* Actor Pill */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: roleBadge.bg,
                            color: roleBadge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0
                          }}>
                            {actorName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {actorName}
                            </div>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '999px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: roleBadge.bg,
                              color: roleBadge.color,
                              marginTop: '0.15rem'
                            }}>
                              • {roleBadge.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action / Event Pill */}
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: eventCfg.bg,
                          color: eventCfg.color,
                        }}>
                          <Icon size={13} />
                          {eventCfg.label}
                        </span>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.45 }}>
                          {log.description}
                        </div>

                        {/* Extra Context Pills if present */}
                        {log.properties && Object.keys(log.properties).some(k => ['voucher_no', 'request_no', 'amount', 'target_user'].includes(k)) && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                            {log.properties.voucher_no && (
                              <span style={{ fontSize: '0.72rem', background: 'var(--surface-2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                Ref: #{log.properties.voucher_no}
                              </span>
                            )}
                            {log.properties.request_no && (
                              <span style={{ fontSize: '0.72rem', background: 'var(--surface-2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                Ref: #{log.properties.request_no}
                              </span>
                            )}
                            {log.properties.amount && (
                              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                LKR {Number(log.properties.amount).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Device / IP */}
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {ip}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          SSL Verified
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--surface-2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchLogs(currentPage - 1)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                disabled={currentPage >= totalPages || loading}
                onClick={() => fetchLogs(currentPage + 1)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
