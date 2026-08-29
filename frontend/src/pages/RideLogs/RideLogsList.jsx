import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaViewerModal from '../../components/ui/MediaViewerModal';

const RideLogsList = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewLog, setViewLog] = useState(null);
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '', type: '', name: '' });

  const getStorageUrl = (path) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/storage/${path}`;
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/daily-ride-logs');
      setLogs(response.data.data);
    } catch (error) {
      toast.error('Failed to load ride logs');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/daily-ride-logs/${id}/status`, { status });
      toast.success(`Log ${status} successfully`);
      fetchLogs();
      if (viewLog && viewLog.id === id) {
        setViewLog(null);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem' }}>
        <div>
          <h1>Daily Ride Logs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and approve daily ride-hailing logs submitted by drivers.</p>
        </div>
        <button onClick={fetchLogs} className="btn btn-secondary">
          <RefreshCw size={16} style={{ marginRight: '0.5rem' }} /> Refresh
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Platform</th>
                <th>Total KM</th>
                <th>Net Revenue</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No ride logs found.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr 
                    key={log.id} 
                    onClick={() => setViewLog(log)}
                    style={{ cursor: 'pointer' }}
                    className="hover-row"
                  >
                    <td style={{ padding: '1rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{log.driver?.name}</td>
                    <td style={{ padding: '1rem' }}>{log.vehicle?.vehicle_number}</td>
                    <td style={{ padding: '1rem' }}><span className="badge badge-secondary">{log.platform}</span></td>
                    <td style={{ padding: '1rem' }}>{log.total_km} km</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>Rs {log.net_revenue}</td>
                    <td style={{ padding: '1rem' }}>
                      {log.status === 'pending' && <span className="badge badge-warning">Pending</span>}
                      {log.status === 'approved' && <span className="badge badge-success">Approved</span>}
                      {log.status === 'rejected' && <span className="badge badge-danger">Rejected</span>}
                    </td>
                    <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setViewLog(log)} className="icon-btn" title="Review Log">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Review Log: {viewLog.driver?.name} on {viewLog.date?.split('T')[0]}</h2>
              <button onClick={() => setViewLog(null)} className="icon-btn">✕</button>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Odometer Metrics</h4>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                  <tbody>
                    <tr><td>Morning</td><td>{viewLog.morning_odo}</td></tr>
                    <tr><td>Night</td><td>{viewLog.night_odo}</td></tr>
                    <tr><td>Total Run</td><td>{viewLog.total_km} km</td></tr>
                    <tr><td>Hire Run</td><td>{viewLog.hire_km} km</td></tr>
                    <tr><td>Empty Run</td><td>{viewLog.empty_km} km</td></tr>
                  </tbody>
                </table>
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Financials</h4>
                <table className="table" style={{ fontSize: '0.9rem' }}>
                  <tbody>
                    <tr><td>Gross Revenue</td><td>Rs {viewLog.gross_revenue}</td></tr>
                    <tr><td>Commission</td><td>Rs {viewLog.commission}</td></tr>
                    <tr><td>Net Revenue</td><td>Rs {viewLog.net_revenue}</td></tr>
                    <tr><td>Fuel Expenses</td><td>Rs {viewLog.fuel_cost}</td></tr>
                    <tr><td>Other Expenses</td><td>Rs {viewLog.other_expenses || 0}</td></tr>
                    <tr><td>Extra Earnings</td><td>Rs {viewLog.extra_earnings || 0}</td></tr>
                    <tr><td>Wallet Balance</td><td>Rs {viewLog.wallet_balance}</td></tr>
                    <tr style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      <td>Cash on Hand</td>
                      <td>Rs {viewLog.cash_on_hand || 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Evidence / Attachments</h4>
              {viewLog.attachments && viewLog.attachments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  {['odo_photo', 'receipt', 'app_screenshot', 'uncategorized'].map(cat => {
                    const catAtts = viewLog.attachments.filter(a => (a.category || 'uncategorized') === cat);
                    if (catAtts.length === 0) return null;
                    const label = { odo_photo: 'Odometer Photos', receipt: 'Receipts', app_screenshot: 'App Screenshots', uncategorized: 'Other Evidence' }[cat];
                    return (
                      <div key={cat}>
                        <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', margin: 0 }}>{label}</h5>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {catAtts.map(att => (
                            <button 
                              key={att.id} 
                              onClick={() => setViewerData({ isOpen: true, url: getStorageUrl(att.file_path), type: att.file_type, name: att.file_name })}
                              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
                            >
                              <img 
                                src={getStorageUrl(att.file_path)} 
                                alt={label} 
                                style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'opacity 0.2s' }} 
                                onMouseOver={e => e.currentTarget.style.opacity = 0.8}
                                onMouseOut={e => e.currentTarget.style.opacity = 1}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p>No attachments uploaded.</p>
              )}
            </div>

            {viewLog.status === 'pending' && (
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button onClick={() => updateStatus(viewLog.id, 'approved')} className="btn btn-success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={18} /> Approve
                </button>
                <button onClick={() => updateStatus(viewLog.id, 'rejected')} className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <MediaViewerModal 
        isOpen={viewerData.isOpen}
        fileUrl={viewerData.url}
        fileType={viewerData.type}
        fileName={viewerData.name}
        onClose={() => setViewerData({ ...viewerData, isOpen: false })}
      />
    </div>
  );
};

export default RideLogsList;
