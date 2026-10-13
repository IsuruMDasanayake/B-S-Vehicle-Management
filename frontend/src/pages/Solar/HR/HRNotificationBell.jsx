import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Calendar, Clock, AlertTriangle, CheckCircle,
  XCircle, ExternalLink, Trash2, CheckCheck
} from 'lucide-react';
import api from '../../../services/api';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
};

export const HRNotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'leave' | 'attendance'
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { params: { division: 'hr' } });
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const handleUpdate = () => fetchNotifications();
    window.addEventListener('hr-leaves-updated', handleUpdate);
    window.addEventListener('hr-notifications-updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hr-leaves-updated', handleUpdate);
      window.removeEventListener('hr-notifications-updated', handleUpdate);
    };
  }, [fetchNotifications]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(c => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent('hr-notifications-updated'));
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read', {}, { params: { division: 'hr' } });
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('hr-notifications-updated'));
    } catch {
      // silent
    }
  };

  const handleItemClick = async (notif) => {
    if (!notif.read_at) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    const link = notif.data?.link || '/solar/hr/admin/leave';
    navigate(link);
  };

  const getCategoryIcon = (category, severity) => {
    if (category === 'attendance') {
      return <Clock size={16} color="#f97316" />;
    }
    if (category === 'compliance') {
      return <AlertTriangle size={16} color="#ef4444" />;
    }
    if (severity === 'success') {
      return <CheckCircle size={16} color="#22c55e" />;
    }
    if (severity === 'danger') {
      return <XCircle size={16} color="#ef4444" />;
    }
    return <Calendar size={16} color="#3b82f6" />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read_at;
    if (activeTab === 'leave') return n.data?.category === 'leave';
    if (activeTab === 'attendance') return n.data?.category === 'attendance';
    return true;
  });

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="HR Notifications"
        style={{
          position: 'relative',
          background: isOpen ? 'rgba(59,130,246,0.12)' : 'var(--surface-2)',
          border: '1px solid',
          borderColor: isOpen ? '#3b82f6' : 'transparent',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isOpen ? '#3b82f6' : 'var(--text-primary)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)';
        }}
        onMouseLeave={e => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--surface-2)';
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.1rem 0.35rem',
              borderRadius: '999px',
              minWidth: '17px',
              height: '17px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.45)',
              border: '2px solid var(--white)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.6rem)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            background: 'var(--white)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--surface-2)',
            zIndex: 1100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-1, transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--dark)' }}>
                HR Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                }}
                title="Mark all as read"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid var(--surface-2)',
              background: 'var(--surface-2)',
            }}
          >
            {[
              { key: 'all', label: 'All' },
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'leave', label: 'Leaves' },
              { key: 'attendance', label: 'Attendance' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: activeTab === tab.key ? 'var(--white)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div
            className="no-scrollbar"
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              divideY: '1px solid var(--surface-2)',
            }}
          >
            {filteredNotifications.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.08)',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <Bell size={20} />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dark)' }}>
                  No notifications
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  {activeTab === 'unread' ? 'All caught up!' : 'No HR alerts found for this filter.'}
                </div>
              </div>
            ) : (
              filteredNotifications.map(n => {
                const isUnread = !n.read_at;
                const data = n.data || {};
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      gap: '0.75rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--surface-2)',
                      background: isUnread ? 'rgba(59,130,246,0.04)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(59,130,246,0.04)' : 'transparent'}
                  >
                    {/* Category Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '0.1rem',
                      }}
                    >
                      {getCategoryIcon(data.category, data.severity)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontWeight: isUnread ? 700 : 600,
                            fontSize: '0.82rem',
                            color: 'var(--dark)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {data.title || 'HR Notification'}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          marginTop: '0.2rem',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {data.message || ''}
                      </div>
                    </div>

                    {/* Unread dot / Mark read icon */}
                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          color: '#3b82f6',
                          flexShrink: 0,
                          alignSelf: 'center',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#3b82f6',
                          }}
                        />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '0.6rem 1rem',
              borderTop: '1px solid var(--surface-2)',
              background: 'var(--surface-1, transparent)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.72rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Circle HR System</span>
            <button
              onClick={() => { setIsOpen(false); navigate('/solar/hr/admin/leave'); }}
              style={{
                background: 'none',
                border: 'none',
                color: '#3b82f6',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.72rem',
              }}
            >
              Open Leaves <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRNotificationBell;
