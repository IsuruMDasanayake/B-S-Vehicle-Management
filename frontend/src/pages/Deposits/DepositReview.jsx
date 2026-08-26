import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, Search } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MediaViewerModal from '../../components/ui/MediaViewerModal';

const getStorageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}/storage/${path}`;
};

const DepositReview = () => {
  const [deposits, setDeposits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, verified, rejected, all
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '', type: '', name: '' });

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/driver-deposits');
      setDeposits(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch deposits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.patch(`/driver-deposits/${id}/status`, { status: newStatus });
      toast.success(`Deposit marked as ${newStatus}`);
      fetchDeposits();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredDeposits = deposits.filter(dep => filter === 'all' || dep.status === filter);

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Deposit Review</h1>
          <p style={{ color: 'var(--text-muted)' }}>Review and verify driver cash deposits</p>
        </div>
      </div>

      <div className="card mb-4" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginTop: '-2rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => setFilter('pending')}
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
        >
          Pending
        </button>
        <button 
          onClick={() => setFilter('verified')}
          className={`btn ${filter === 'verified' ? 'btn-primary' : 'btn-outline'}`}
        >
          Verified
        </button>
        <button 
          onClick={() => setFilter('rejected')}
          className={`btn ${filter === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
        >
          Rejected
        </button>
        <button 
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
        >
          All
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Date of Earning</th>
                  <th>Driver</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Uploaded At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No deposits found</td>
                  </tr>
                ) : (
                  filteredDeposits.map(dep => (
                    <tr key={dep.id}>
                      <td style={{ fontWeight: 600 }}>{dep.date?.split('T')[0]}</td>
                      <td>{dep.driver?.name || 'Unknown Driver'}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Rs {dep.amount}</td>
                      <td>{dep.notes || '-'}</td>
                      <td>{new Date(dep.created_at).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${dep.status === 'verified' ? 'badge-success' : dep.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {dep.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {dep.attachments && dep.attachments.length > 0 && (
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                              onClick={() => setViewerData({ isOpen: true, url: getStorageUrl(dep.attachments[0].file_path), type: dep.attachments[0].file_type, name: dep.attachments[0].file_name })}
                              title="View Receipt"
                            >
                              <FileText size={16} />
                            </button>
                          )}
                          {dep.status === 'pending' && (
                            <>
                              <button 
                                className="btn" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--success-color)', color: 'white', border: 'none' }}
                                onClick={() => handleStatusUpdate(dep.id, 'verified')}
                                title="Approve"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button 
                                className="btn" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--danger-color)', color: 'white', border: 'none' }}
                                onClick={() => handleStatusUpdate(dep.id, 'rejected')}
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default DepositReview;
