import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const AuditLogsList = () => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = async () => { setIsLoading(true); try { const r = await api.get('/activity-logs'); setItems((r.data.data || r.data || [])); } catch { toast.error('Failed to load logs'); } finally { setIsLoading(false); } };
  useEffect(() => { fetchItems(); }, []);

  const eventColors = { created: 'badge-success', updated: 'badge-primary', deleted: 'badge-danger' };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Audit Logs</h1><p style={{ color: 'var(--text-muted)' }}>System activity and changes tracker</p></div>
      </div>
      <div className="card table-container" style={{ padding: 0 }}>
        {isLoading ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>Timestamp</th><th>User</th><th>Event</th><th>Description</th><th>Subject Type</th><th>Subject ID</th></tr></thead>
            <tbody>
              {items.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No audit logs found.</td></tr>
                : items.map(item => {
                  const subjectName = item.subject_type ? item.subject_type.split('\\').pop() : '-';
                  return (
                    <tr key={item.id}>
                      <td>{format(new Date(item.created_at), 'MMM dd, yyyy HH:mm:ss')}</td>
                      <td style={{ fontWeight: 700 }}>{item.causer ? item.causer.name : 'System'}</td>
                      <td><span className={`badge ${eventColors[item.event] || 'badge-primary'}`}>{item.event}</span></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</td>
                      <td style={{ fontFamily: 'monospace' }}>{subjectName}</td>
                      <td>{item.subject_id || '-'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default AuditLogsList;
