import { useState, useEffect, useRef } from 'react';
import { Menu, Search, User, LogOut, Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

export const FinanceNavbar = ({ toggleMobileOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [now, setNow] = useState(new Date());
  const dropdownRef = useRef(null);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  // Live clock matching Image 2
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/solar/finance/login');
  };

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="header" style={{ transform: 'translateY(0)', transition: 'transform 0.3s ease' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isMobile && (
          <button onClick={toggleMobileOpen} className="icon-btn" style={{ color: 'var(--text-primary)' }}>
            <Menu size={24} />
          </button>
        )}

        {/* Search Input matching Image 2 */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--surface-2)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          width: isMobile ? '180px' : '280px',
          color: 'var(--text-muted)',
        }}>
          <Search size={16} style={{ marginRight: '0.5rem', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search transactions..."
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Right side: Live Date/Time + Notifications + User Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

        {/* Live Date & Time matching Image 2 */}
        {!isMobile && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '0.95rem', fontWeight: 700,
              color: 'var(--text-primary)', letterSpacing: '0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {timeStr}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dateStr}
            </div>
          </div>
        )}

        {/* Notification Bell with Badge */}
        <button
          onClick={() => navigate('/solar/finance/admin/requests')}
          style={{
            position: 'relative',
            background: 'var(--surface-2)',
            border: 'none',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
          title="Cash Requests & Approvals"
        >
          <Bell size={18} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 800,
            borderRadius: '999px',
            padding: '0.1rem 0.35rem',
            lineHeight: 1,
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)',
          }}>
            3
          </span>
        </button>

        {/* Divider */}
        {!isMobile && <div style={{ width: '1px', height: '32px', background: 'var(--surface-2)' }} />}

        {/* User Pill Dropdown matching Image 2 */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              cursor: 'pointer', padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-full)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#d1fae5', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.name || 'CircleGroup Admin'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {user?.role === 'super_admin' ? 'System Admin' : 'Finance Team'}
                </div>
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--white)', border: '1px solid var(--surface-2)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
              minWidth: '200px', zIndex: 1000, overflow: 'hidden',
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--dark)' }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email || 'admin@circlegroup.lk'}</div>
              </div>
              <button
                onClick={() => { setShowDropdown(false); navigate('/solar/portal'); }}
                style={{
                  width: '100%', padding: '0.65rem 1rem', background: 'transparent',
                  border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)',
                }}
              >
                <ExternalLink size={15} /> Switch Portal
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '0.65rem 1rem', background: 'transparent',
                  border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)',
                  borderTop: '1px solid var(--surface-2)',
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
