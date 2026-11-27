import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Banknote,
  Wallet,
  ShieldCheck,
  TrendingUp,
  BarChart2,
  LogOut,
  ExternalLink,
  Sun,
  QrCode,
  Activity
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import api from '../../../services/api';

const FINANCE_EMERALD = '#10b981';

export const FinanceSidebar = ({ isMobileOpen, closeMobileOpen }) => {
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCounts = useCallback(async () => {
    try {
      const res = await api.get('/solar/finance/dashboard/stats');
      if (res.data?.overview?.pending_approvals_count) {
        setPendingCount(res.data.overview.pending_approvals_count);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCounts]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/solar/finance/login';
  };

  const menuGroups = [
    {
      title: 'Main',
      items: [
        { name: 'Dashboard', path: '/solar/finance/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Operations',
      items: [
        { name: 'Cash Requests', path: '/solar/finance/admin/requests', icon: Banknote, badge: pendingCount },
        { name: 'Petty Cash & Floats', path: '/solar/finance/admin/petty-cash', icon: Wallet },
        { name: 'Petty Cash Analytics', path: '/solar/finance/admin/petty-cash-analytics', icon: BarChart2 },
      ],
    },
    {
      title: 'Governance & Roles',
      items: [
        { name: 'User Roles & Limits', path: '/solar/finance/admin/roles', icon: ShieldCheck },
        { name: 'Project P&L Analytics', path: '/solar/finance/admin/projects-pnl', icon: TrendingUp },
        { name: 'Voucher Verification', path: '/solar/finance/vouchers/verify', icon: QrCode },
        { name: 'Activity Logs', path: '/solar/finance/admin/activity-logs', icon: Activity },
      ],
    },
  ];

  return (
    <aside className={`sidebar no-scrollbar ${isMobileOpen ? 'mobile-open' : ''}`} style={{
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--dark-2)',
      height: '100%',
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.5rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        borderBottom: '1px solid var(--dark-2)',
        flexShrink: 0,
      }}>
        <div style={{
          background: FINANCE_EMERALD, color: 'white',
          padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex',
        }}>
          <Banknote size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--white)', marginBottom: 0 }}>Circle Engineering</h2>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Finance & Cash System</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="no-scrollbar" style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
        {menuGroups.map((group, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--text-muted)', padding: '0 1.5rem', marginBottom: '0.5rem',
            }}>
              {group.title}
            </h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {group.items.map(item => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <li key={item.path} style={{ padding: '0.15rem 1rem' }}>
                    <Link
                      to={item.path}
                      onClick={() => isMobileOpen && closeMobileOpen()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
                        color: isActive ? 'var(--white)' : 'var(--text-muted)',
                        backgroundColor: isActive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        borderLeft: isActive ? `3px solid ${FINANCE_EMERALD}` : '3px solid transparent',
                        textDecoration: 'none', transition: 'all 0.2s',
                        fontWeight: isActive ? 600 : 500, fontSize: '0.9rem',
                      }}
                    >
                      <Icon size={18} color={isActive ? FINANCE_EMERALD : 'currentColor'} />
                      <span style={{ flex: 1 }}>{item.name}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            minWidth: '18px',
                            textAlign: 'center',
                            lineHeight: 1.25,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
                          }}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Portal Switcher Link */}
        <div style={{ padding: '0 1.25rem', marginTop: '1rem' }}>
          <div style={{
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--dark-2)',
            fontSize: '0.8rem',
          }}>
            <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--white)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sun size={14} color="#f59e0b" /> Solar Portals
            </div>
            <Link
              to="/solar/portal"
              style={{ color: FINANCE_EMERALD, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}
            >
              Switch Sub-Division <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </nav>

      {/* User Info + Logout (Identical to Image 2) */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--dark-2)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          marginBottom: '0.75rem', padding: '0.5rem',
          background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: FINANCE_EMERALD, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'F'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'CircleGroup Admin'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.role === 'super_admin' ? 'System Admin' : 'Finance Team'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            width: '100%', padding: '0.65rem 1rem',
            background: 'transparent', border: 'none',
            color: 'var(--danger)', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500,
            borderRadius: 'var(--radius-md)', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--danger-alpha)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};
