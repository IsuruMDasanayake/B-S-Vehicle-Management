import { useState, useEffect, useRef } from 'react';
import { Bell, User, Search, AlertTriangle, Shield, CheckCircle, FileText, Check, Menu } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Navbar = ({ toggleMobileOpen }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    
    const handleUpdateEvent = () => fetchNotifications();
    window.addEventListener('notifications_updated', handleUpdateEvent);

    if (window.Echo) {
      window.Echo.channel('system-alerts')
        .listen('.SystemAlertGenerated', (e) => {
          fetchNotifications();
          toast.success(e.alert?.message || 'New System Alert!', {
            icon: '🔔',
            position: 'top-right'
          });
        });
    }

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      window.removeEventListener('notifications_updated', handleUpdateEvent);
      if (window.Echo) {
        window.Echo.leaveChannel('system-alerts');
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'danger': return <AlertTriangle size={16} color="var(--danger)" />;
      case 'warning': return <Shield size={16} color="var(--warning)" />;
      case 'success': return <CheckCircle size={16} color="var(--success)" />;
      default: return <FileText size={16} color="var(--info)" />;
    }
  };

  return (
    <header className="header">
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
            placeholder="Search vehicles, drivers..." 
            style={{ 
              border: 'none', background: 'transparent', outline: 'none', 
              width: '100%', fontSize: '0.875rem'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              background: 'transparent', border: 'none', 
              color: 'var(--text-secondary)', cursor: 'pointer',
              position: 'relative', display: 'flex', alignItems: 'center'
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: 'var(--danger)', color: 'white',
                fontSize: '0.65rem', fontWeight: 'bold',
                width: '16px', height: '16px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{unreadCount}</span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showDropdown && (
            <div className="card" style={{
              position: 'absolute', top: '100%', right: isMobile ? '-3.5rem' : 0, marginTop: '1rem',
              width: isMobile ? '320px' : '350px', padding: 0, overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)', zIndex: 9999,
              animation: 'slideUp 0.2s ease forwards'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--surface-2)', background: 'var(--surface)' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--primary)' }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="no-scrollbar" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No notifications
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {notifications.map((notif) => (
                      <li key={notif.id} style={{ 
                        padding: '1rem', borderBottom: '1px solid var(--surface-2)',
                        background: notif.read_at ? 'transparent' : 'var(--primary-alpha)',
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                        transition: 'background 0.2s'
                      }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: `var(--${notif.data.type || 'info'}-light)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {getIcon(notif.data.type)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>{notif.data.title}</h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{notif.data.message}</p>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            {new Date(notif.created_at).toLocaleString()}
                          </div>
                        </div>
                        {!notif.read_at && (
                          <button onClick={() => markAsRead(notif.id)} className="icon-btn" title="Mark as read" style={{ color: 'var(--success)', padding: '0.2rem' }}>
                            <Check size={16} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Super Admin</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</div>
            </div>
          )}
          <div style={{
            width: '36px', height: '36px',
            background: 'var(--primary-alpha)',
            color: 'var(--primary)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
