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

  const [activeTab, setActiveTab] = useState('history');
  const [balances, setBalances] = useState([]);
  const [isBalancesLoading, setIsBalancesLoading] = useState(true);

  useEffect(() => {
    fetchDeposits();
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    setIsBalancesLoading(true);
    try {
      const res = await api.get('/driver-balances');
      setBalances(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch driver balances');
    } finally {
      setIsBalancesLoading(false);
    }
  };

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
          <h1 style={{ marginBottom: '0.25rem' }}>Deposit Review</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Review and verify driver cash deposits</p>
        </div>

        <div style={{ display: 'flex', background: 'var(--surface-2, #f3f4f6)', borderRadius: 'var(--radius-lg, 0.5rem)', padding: '0.25rem', width: '100%', maxWidth: '350px' }}>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ flex: 1, padding: '0.5rem 1rem', border: 'none', background: activeTab === 'history' ? 'var(--surface, #ffffff)' : 'transparent', color: activeTab === 'history' ? 'var(--success, #10b981)' : 'var(--text-secondary, #6b7280)', borderRadius: 'var(--radius-md, 0.375rem)', fontWeight: activeTab === 'history' ? 600 : 500, boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Deposit History
          </button>
          <button 
            onClick={() => setActiveTab('balances')}
            style={{ flex: 1, padding: '0.5rem 1rem', border: 'none', background: activeTab === 'balances' ? 'var(--surface, #ffffff)' : 'transparent', color: activeTab === 'balances' ? 'var(--success, #10b981)' : 'var(--text-secondary, #6b7280)', borderRadius: 'var(--radius-md, 0.375rem)', fontWeight: activeTab === 'balances' ? 600 : 500, boxShadow: activeTab === 'balances' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Driver Balances
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['pending', 'verified', 'rejected', 'all'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{ 
                  padding: '0.4rem 1.2rem', 
                  borderRadius: '2rem', 
                  border: `1px solid ${filter === f ? 'var(--success, #10b981)' : 'var(--border, #e5e7eb)'}`, 
                  background: filter === f ? 'var(--success-alpha, rgba(16,185,129,0.1))' : 'var(--surface, #ffffff)', 
                  color: filter === f ? 'var(--success, #10b981)' : 'var(--text-secondary, #6b7280)',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
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
      </>
      )}

      {activeTab === 'balances' && (
        <div className="card" style={{ padding: 0 }}>
          {isBalancesLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Loading balances...</div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Driver ID</th>
                    <th>Driver Name</th>
                    <th>Total Cash On Hand</th>
                    <th>Total Deposited</th>
                    <th>Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No drivers found</td>
                    </tr>
                  ) : (
                    balances.map(b => (
                      <tr key={b.driver_id}>
                        <td>#{b.driver_id}</td>
                        <td style={{ fontWeight: 600 }}>{b.driver_name}</td>
                        <td>Rs {b.total_cash_on_hand.toFixed(2)}</td>
                        <td>Rs {b.total_deposited.toFixed(2)}</td>
                        <td style={{ 
                          fontWeight: 'bold', 
                          color: b.outstanding_balance > 0 ? 'var(--danger-color)' : (b.outstanding_balance < 0 ? 'var(--success-color)' : 'var(--text-color)') 
                        }}>
                          Rs {b.outstanding_balance.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
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

export default DepositReview;
