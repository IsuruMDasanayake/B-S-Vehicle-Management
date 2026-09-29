import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Bell, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

export const HRNavbar = ({ toggleMobileOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [now, setNow] = useState(new Date());
  const dropdownRef = useRef(null);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  // Live clock
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
    navigate('/solar/hr/login');
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

        {/* Search */}
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
            placeholder="Search employees..."
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {/* Right side: date/time + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>

        {/* Live Date & Time */}
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

        {/* Divider */}
        {!isMobile && <div style={{ width: '1px', height: '32px', background: 'var(--surface-2)' }} />}

        {/* User dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem',
              border: '2px solid rgba(59,130,246,0.3)',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            {!isMobile && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {user?.role === 'super_admin' ? 'System Admin' : 'HR Admin'}
                </div>
              </div>
            )}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              background: 'var(--white)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)', width: '200px',
              border: '1px solid var(--surface-2)', overflow: 'hidden', zIndex: 100,
            }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--surface-2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', width: '100%', border: 'none',
                  background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.875rem',
                }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
