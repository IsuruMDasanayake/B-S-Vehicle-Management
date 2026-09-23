import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Sun, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

export const SolarNavbar = ({ toggleMobileOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/solar/login');
  };

  return (
    <header className="header" style={{ transform: 'translateY(0)', transition: 'transform 0.3s ease, left 0.3s ease' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isMobile && (
          <button 
            onClick={toggleMobileOpen}
            className="icon-btn"
            style={{ color: 'var(--text-primary)' }}
          >
            <Menu size={24} />
          </button>
        )}
        
        <div style={{ 
          display: 'flex', alignItems: 'center', 
          background: 'var(--surface-2)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-full)',
          width: isMobile ? '200px' : '300px',
          color: 'var(--text-muted)'
        }}>
          <Search size={18} style={{ marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Search projects, sites..." 
            style={{ 
              border: 'none', background: 'transparent', outline: 'none', 
              width: '100%', fontSize: '0.875rem'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* <button onClick={() => navigate('/portal')} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
          Switch Division
        </button> */}

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              background: 'transparent', border: 'none', 
              color: 'var(--text-secondary)', cursor: 'pointer',
              position: 'relative', display: 'flex', alignItems: 'center'
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--primary-alpha)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(0,0,0,0.05)',
              marginRight: '0.5rem'
            }}>
              <User size={18} />
            </div>
            <div style={{ textAlign: 'left', display: isMobile ? 'none' : 'block' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solar Administrator</div>
            </div>
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              background: 'var(--white)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)', width: '200px',
              border: '1px solid var(--surface-2)', overflow: 'hidden', zIndex: 100
            }}>
              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  padding: '0.75rem 1rem', width: '100%', border: 'none', 
                  background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                  textAlign: 'left', fontSize: '0.875rem'
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
