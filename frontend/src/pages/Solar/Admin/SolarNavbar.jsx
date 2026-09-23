import { useState, useEffect, useRef } from 'react';
import { Menu, Search, Sun, User, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';
import api from '../../../services/api';

export const SolarNavbar = ({ toggleMobileOpen }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const [showNotif, setShowNotif] = useState(false);
  const notifDropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?division=solar');
      setNotifications(res.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setShowNotif(false);
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
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifDropdownRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="icon-btn"
            style={{ position: 'relative', color: 'var(--text-secondary)' }}
          >
            <Bell size={20} />
            {notifications.filter(n => !n.read_at).length > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--danger)', color: 'white',
                fontSize: '0.65rem', padding: '0.1rem 0.3rem',
                borderRadius: '10px', fontWeight: 'bold'
              }}>
                {notifications.filter(n => !n.read_at).length}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: '-50px',
              background: 'var(--white)', borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)', width: '320px',
              border: '1px solid var(--surface-2)', overflow: 'hidden', zIndex: 100
            }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Notifications</h4>
                {notifications.some(n => !n.read_at) && (
                  <button onClick={markAllAsRead} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Mark all read</button>
                )}
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => !n.read_at && markAsRead(n.id)}
                      style={{ 
                        padding: '1rem', borderBottom: '1px solid var(--surface-2)',
                        background: n.read_at ? 'transparent' : 'var(--primary-alpha)',
                        cursor: n.read_at ? 'default' : 'pointer', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: n.read_at ? 500 : 600, color: 'var(--text-primary)' }}>{n.data.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{n.data.message}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
