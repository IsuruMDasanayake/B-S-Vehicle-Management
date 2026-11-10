import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, BellRing, BellOff, Megaphone, CheckCircle2, Clock,
  AlertTriangle, Award, CalendarDays, Video, Check, CheckCheck,
  ExternalLink, Search, RefreshCw, Send, Loader2, Sparkles,
  Info, X, ChevronRight, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';
import {
  isPushNotificationSupported,
  getPushNotificationStatus,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
} from '../../../../utils/pushNotifications';

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
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const resolvePortalLink = (link, user) => {
  if (!link) return null;
  const isHrAdmin = user?.role === 'solar_hr_admin' || user?.role === 'super_admin';
  if (isHrAdmin) return link;

  // Map backend admin URLs to employee portal counterparts
  if (link.includes('/admin/leave')) return '/solar/hr/portal/leaves';
  if (link.includes('/admin/attendance')) return '/solar/hr/portal/attendance';
  if (link.includes('/admin/appraisals')) return '/solar/hr/portal/appraisals';
  if (link.includes('/admin/trainings') || link.includes('/admin/training')) return '/solar/hr/portal/training';
  if (link.includes('/admin/announcements')) return '/solar/hr/portal/announcements';
  if (link.includes('/admin/dashboard')) return '/solar/hr/portal/home';
  return link;
};

const CATEGORY_CONFIG = {
  leave: {
    label: 'Leave',
    icon: CalendarDays,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    border: 'rgba(2, 132, 199, 0.25)',
  },
  attendance: {
    label: 'Attendance',
    icon: Clock,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  appraisal: {
    label: 'Performance',
    icon: Award,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.25)',
  },
  training: {
    label: 'Training',
    icon: Video,
    color: '#0d9488',
    bg: 'rgba(13, 148, 136, 0.1)',
    border: 'rgba(13, 148, 136, 0.25)',
  },
  compliance: {
    label: 'Compliance',
    icon: AlertTriangle,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.25)',
  },
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.25)',
  },
  general: {
    label: 'HR Alert',
    icon: Bell,
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
    border: 'rgba(2, 132, 199, 0.25)',
  },
};

const SEVERITY_CONFIG = {
  success: { label: 'Approved', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' },
  danger:  { label: 'Attention', color: '#dc2626', bg: 'rgba(220, 38, 38, 0.1)' },
  warning: { label: 'Pending',   color: '#d97706', bg: 'rgba(217, 119, 6, 0.1)' },
  info:    { label: 'Info',      color: '#0284c7', bg: 'rgba(2, 132, 199, 0.1)' },
};

const PortalAnnouncements = () => {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'leave' | 'attendance' | 'appraisal' | 'announcements'
  const [searchQuery, setSearchQuery] = useState('');

  // Web Push status state
  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    isSubscribed: false,
  });
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState(null);

  const checkPush = useCallback(async () => {
    try {
      const status = await getPushNotificationStatus();
      setPushStatus(status);
    } catch (e) {
      console.warn('Failed to query push status:', e);
    }
  }, []);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [notifRes, annRes] = await Promise.all([
        api.get('/notifications', { params: { division: 'hr' } }),
        api.get('/hr/announcements'),
      ]);

      if (notifRes.data) {
        setNotifications(notifRes.data.notifications || []);
        setUnreadCount(notifRes.data.unread_count || 0);
      }
      if (annRes.data) {
        setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
      }
    } catch {
      if (!isSilent) toast.error('Failed to load HR notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    checkPush();

    const interval = setInterval(() => fetchData(true), 30000);

    const handleUpdate = () => fetchData(true);
    window.addEventListener('hr-leaves-updated', handleUpdate);
    window.addEventListener('hr-attendance-updated', handleUpdate);
    window.addEventListener('hr-notifications-updated', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hr-leaves-updated', handleUpdate);
      window.removeEventListener('hr-attendance-updated', handleUpdate);
      window.removeEventListener('hr-notifications-updated', handleUpdate);
    };
  }, [fetchData, checkPush]);

  // Push subscription actions
  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      await subscribeToPushNotifications();
      await checkPush();
      setPushFeedback({
        type: 'success',
        text: 'Desktop pop-up notifications enabled! You will receive pop-up alerts on your screen even when this tab is closed.',
      });
      toast.success('Desktop pop-ups active!');
      setTimeout(() => setPushFeedback(null), 6000);
    } catch (err) {
      setPushFeedback({
        type: 'error',
        text: err.message || 'Failed to enable push notifications.',
      });
      toast.error(err.message || 'Could not enable pop-ups');
      await checkPush();
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      await unsubscribeFromPushNotifications();
      await checkPush();
      setPushFeedback({
        type: 'info',
        text: 'Pop-up notifications turned off for this browser.',
      });
      toast.success('Pop-ups turned off');
      setTimeout(() => setPushFeedback(null), 4000);
    } catch (err) {
      setPushFeedback({
        type: 'error',
        text: err.message || 'Failed to disable push notifications.',
      });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      await sendTestPushNotification();
      setPushFeedback({
        type: 'success',
        text: 'Test pop-up sent! Check the notification banner on your desktop or mobile screen.',
      });
      toast.success('Test pop-up sent! Look for the screen alert.');
      setTimeout(() => setPushFeedback(null), 6000);
    } catch (err) {
      setPushFeedback({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Test push alert failed.',
      });
      toast.error('Test notification failed');
    } finally {
      setPushLoading(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/notifications/${id}/mark-read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(c => Math.max(0, c - 1));
      window.dispatchEvent(new CustomEvent('hr-notifications-updated'));
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.post('/notifications/mark-all-read', {}, { params: { division: 'hr' } });
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('hr-notifications-updated'));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const handleNotificationClick = (item) => {
    if (item.kind === 'notification' && !item.read_at) {
      handleMarkAsRead(item.id);
    }
    const resolvedLink = resolvePortalLink(item.link, user);
    if (resolvedLink) {
      navigate(resolvedLink);
    }
  };

  // Normalise announcements into unified feed items
  const unifiedItems = useMemo(() => {
    const notifItems = notifications.map(n => {
      const data = n.data || {};
      return {
        id: `notif-${n.id}`,
        rawId: n.id,
        kind: 'notification',
        category: data.category || 'general',
        severity: data.severity || 'info',
        title: data.title || 'HR Notification',
        message: data.message || '',
        link: data.link || null,
        created_at: n.created_at,
        read_at: n.read_at,
        source_id: data.source_id,
        isPushPopup: true,
      };
    });

    const annItems = announcements.map(a => ({
      id: `ann-${a.id}`,
      rawId: a.id,
      kind: 'announcement',
      category: 'announcement',
      severity: a.priority === 'urgent' ? 'danger' : a.priority === 'important' ? 'warning' : 'info',
      title: a.title,
      message: a.body,
      link: null,
      created_at: a.created_at,
      read_at: new Date().toISOString(), // announcements don't have read tracking
      creator: a.creator?.name || 'HR Admin',
      priority: a.priority || 'normal',
      isPushPopup: false,
    }));

    const combined = [...notifItems, ...annItems];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined;
  }, [notifications, announcements]);

  // Tab & search filtering
  const filteredItems = useMemo(() => {
    return unifiedItems.filter(item => {
      // Tab filter
      if (activeTab === 'unread') {
        if (item.kind === 'notification' && item.read_at) return false;
        if (item.kind === 'announcement') return false;
      } else if (activeTab === 'leave') {
        if (item.category !== 'leave') return false;
      } else if (activeTab === 'attendance') {
        if (item.category !== 'attendance') return false;
      } else if (activeTab === 'appraisal') {
        if (item.category !== 'appraisal') return false;
      } else if (activeTab === 'announcements') {
        if (item.kind !== 'announcement') return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchMsg = item.message?.toLowerCase().includes(q);
        const matchCat = item.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchMsg && !matchCat) return false;
      }

      return true;
    });
  }, [unifiedItems, activeTab, searchQuery]);

  // Category counts
  const counts = useMemo(() => {
    return {
      all: unifiedItems.length,
      unread: unreadCount,
      leave: unifiedItems.filter(i => i.category === 'leave').length,
      attendance: unifiedItems.filter(i => i.category === 'attendance').length,
      appraisal: unifiedItems.filter(i => i.category === 'appraisal').length,
      announcements: announcements.length,
    };
  }, [unifiedItems, unreadCount, announcements]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#0284c7' }} />
        <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 500 }}>
          Loading HR notifications &amp; updates...
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* ── Top Header ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)',
            }}>
              <BellRing size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Notifications &amp; HR Updates
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '0.2rem 0 0' }}>
                Real-time HR alerts, pop-up notifications, leave approvals, and company updates
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="btn"
            style={{
              background: unreadCount > 0 ? '#f1f5f9' : '#f8fafc',
              color: unreadCount > 0 ? '#334155' : '#94a3b8',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
            title="Mark all notifications as read"
          >
            <CheckCheck size={16} color={unreadCount > 0 ? '#0284c7' : '#94a3b8'} />
            <span>Mark All as Read</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            className="btn"
            style={{
              background: '#fff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
            title="Refresh notifications"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden-xs">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Native Web Push Pop-Up Notifications Panel ── */}
      <div style={{
        background: pushStatus.isSubscribed
          ? 'linear-gradient(to right, #f0fdf4, #ffffff)'
          : pushStatus.permission === 'denied'
          ? 'linear-gradient(to right, #fef2f2, #ffffff)'
          : 'linear-gradient(to right, #f0f9ff, #ffffff)',
        border: '1px solid',
        borderColor: pushStatus.isSubscribed
          ? '#bbf7d0'
          : pushStatus.permission === 'denied'
          ? '#fecaca'
          : '#bae6fd',
        borderRadius: '12px',
        padding: '1.1rem 1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: '260px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: pushStatus.isSubscribed ? '#dcfce7' : pushStatus.permission === 'denied' ? '#fee2e2' : '#e0f2fe',
              color: pushStatus.isSubscribed ? '#16a34a' : pushStatus.permission === 'denied' ? '#dc2626' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {pushStatus.isSubscribed ? (
                <BellRing size={20} />
              ) : pushStatus.permission === 'denied' ? (
                <BellOff size={20} />
              ) : (
                <Bell size={20} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  {pushStatus.isSubscribed
                    ? 'Screen Pop-Up Notifications are Active'
                    : pushStatus.permission === 'denied'
                    ? 'Pop-Up Alerts are Blocked in Browser'
                    : 'Enable Real-Time Pop-Up Alerts (Desktop & Mobile)'}
                </span>

                {pushStatus.isSubscribed && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    background: '#16a34a',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    letterSpacing: '0.02em',
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                    POP-UPS ON
                  </span>
                )}
              </div>

              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
                {pushStatus.isSubscribed
                  ? 'You receive instant system pop-ups for leave approvals, missing clock-out reminders, and official notices even when this tab is minimized or closed.'
                  : pushStatus.permission === 'denied'
                  ? 'Browser permission is blocked. Click the lock/info icon beside the address bar to switch Notifications to "Allow".'
                  : 'Turn on native desktop & mobile pop-ups to get notified immediately when your leaves are reviewed or HR posts urgent notices.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {pushStatus.isSubscribed ? (
              <>
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={pushLoading}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  title="Send a sample pop-up to this screen right now"
                >
                  {pushLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Test Pop-Up</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  style={{
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Turn Off
                </button>
              </>
            ) : pushStatus.permission === 'denied' ? (
              <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 600, background: '#fee2e2', padding: '0.3rem 0.65rem', borderRadius: '6px' }}>
                Permissions Denied
              </span>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={pushLoading}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                {pushLoading ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
                <span>Enable Pop-Up Alerts</span>
              </button>
            )}
          </div>
        </div>

        {pushFeedback && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.76rem',
            fontWeight: 600,
            background: pushFeedback.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: pushFeedback.type === 'error' ? '#b91c1c' : '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            {pushFeedback.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            <span>{pushFeedback.text}</span>
          </div>
        )}
      </div>

      {/* ── Search & Filter Navigation Bar ── */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, keywords, reason, or date..."
            style={{
              width: '100%',
              padding: '0.55rem 2.2rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.84rem',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0.2rem',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}>
          {[
            { key: 'all',           label: 'All Updates',       count: counts.all,           icon: Bell },
            { key: 'unread',        label: 'Unread',            count: counts.unread,        icon: AlertTriangle, isAlert: counts.unread > 0 },
            { key: 'leave',         label: 'Leaves',            count: counts.leave,         icon: CalendarDays },
            { key: 'attendance',    label: 'Attendance',        count: counts.attendance,    icon: Clock },
            { key: 'appraisal',     label: 'Performance',       count: counts.appraisal,     icon: Award },
            { key: 'announcements', label: 'Company Broadcast', count: counts.announcements, icon: Megaphone },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.38rem 0.75rem',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isActive ? '#0284c7' : '#e2e8f0',
                  background: isActive ? '#e0f2fe' : '#f8fafc',
                  color: isActive ? '#0284c7' : '#475569',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} color={isActive ? '#0284c7' : tab.isAlert ? '#ef4444' : '#64748b'} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '0.05rem 0.4rem',
                  borderRadius: '999px',
                  background: tab.isAlert ? '#ef4444' : isActive ? '#0284c7' : '#e2e8f0',
                  color: tab.isAlert || isActive ? '#fff' : '#64748b',
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feed List ── */}
      {filteredItems.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '3.5rem 1.5rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#f1f5f9',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Bell size={28} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.35rem' }}>
            No updates found
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0, maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
            {searchQuery
              ? `No notifications or announcements matched "${searchQuery}". Try a different keyword.`
              : activeTab === 'unread'
              ? 'You are all caught up! There are no unread notifications right now.'
              : 'There are no items in this category at the moment. As HR updates your records, they will appear here.'}
          </p>
          {(searchQuery || activeTab !== 'all') && (
            <button
              type="button"
              onClick={() => { setActiveTab('all'); setSearchQuery(''); }}
              style={{
                marginTop: '1rem',
                background: '#e0f2fe',
                color: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const isUnread = item.kind === 'notification' && !item.read_at;
            const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
            const sev = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
            const Icon = cat.icon;
            const targetLink = resolvePortalLink(item.link, user);

            return (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  background: isUnread ? '#f0f9ff' : '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: isUnread ? '#bae6fd' : '#e2e8f0',
                  borderLeft: `4px solid ${isUnread ? '#0284c7' : cat.color}`,
                  padding: '1.1rem 1.25rem',
                  boxShadow: isUnread ? '0 3px 10px rgba(2, 132, 199, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                  cursor: targetLink ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                }}
              >
                {/* Category Icon Capsule */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: cat.bg,
                  color: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '0.1rem',
                }}>
                  <Icon size={20} />
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Top line: title, badges, time */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '0.35rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.94rem',
                        fontWeight: isUnread ? 800 : 700,
                        color: '#0f172a',
                      }}>
                        {item.title}
                      </span>

                      {/* Category Badge */}
                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: cat.bg,
                        color: cat.color,
                        border: `1px solid ${cat.border}`,
                      }}>
                        {cat.label}
                      </span>

                      {/* Severity / Status Badge */}
                      {item.severity && item.severity !== 'info' && (
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: sev.bg,
                          color: sev.color,
                        }}>
                          {sev.label}
                        </span>
                      )}

                      {/* Unread indicator */}
                      {isUnread && (
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          background: '#0284c7',
                          color: '#fff',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          letterSpacing: '0.04em',
                        }}>
                          NEW
                        </span>
                      )}

                      {/* Pop-up alert badge */}
                      {item.isPushPopup && (
                        <span
                          title="Delivered as a live screen pop-up notification"
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <BellRing size={10} color="#0284c7" />
                          <span>Pop-Up</span>
                        </span>
                      )}
                    </div>

                    <span
                      title={formatFullDate(item.created_at)}
                      style={{ fontSize: '0.74rem', color: '#64748b', whiteSpace: 'nowrap' }}
                    >
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>

                  {/* Body / Message */}
                  <div style={{
                    fontSize: '0.84rem',
                    color: '#334155',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}>
                    {item.message}
                  </div>

                  {/* Metadata (announcement author) */}
                  {item.creator && (
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.45rem' }}>
                      Official company announcement posted by <strong>{item.creator}</strong>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '0.8rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid',
                    borderColor: isUnread ? 'rgba(2, 132, 199, 0.15)' : '#f1f5f9',
                  }}>
                    {targetLink ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#0284c7',
                      }}>
                        <span>Open related record</span>
                        <ChevronRight size={14} />
                      </span>
                    ) : (
                      <div />
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.kind === 'notification' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isUnread) {
                              handleMarkAsRead(item.rawId, e);
                            }
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isUnread ? '#0284c7' : '#94a3b8',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>{isUnread ? 'Mark as read' : 'Read'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalAnnouncements;
