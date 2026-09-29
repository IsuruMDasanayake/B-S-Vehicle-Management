import { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, Info, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const PRIORITY_STYLE = {
  normal:    { icon: Info,          color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  label: 'Info' },
  important: { icon: Megaphone,     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  label: 'Important' },
  urgent:    { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   label: 'Urgent' },
};

const PortalAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hr/announcements')
      .then(r => setAnnouncements(r.data))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
    </div>
  );

  return (
    <div style={{ padding: '1.25rem', paddingTop: '2rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Announcements</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Company-wide updates from HR</p>

      {announcements.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Megaphone size={40} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No announcements yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>Check back later</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {announcements.map(ann => {
            const p = PRIORITY_STYLE[ann.priority] || PRIORITY_STYLE.normal;
            const Icon = p.icon;
            return (
              <div key={ann.id} className="card" style={{ padding: '1rem', borderLeft: `3px solid ${p.color}`, background: p.bg }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={p.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ann.title}</div>
                      <span style={{ padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.6rem', fontWeight: 700, background: p.color, color: '#fff', flexShrink: 0 }}>
                        {p.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{ann.body}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {ann.creator?.name && `Posted by ${ann.creator.name} · `}
                      {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
