import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Clock, FileText, CheckCircle, XCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import imageCompression from 'browser-image-compression';
import MediaViewerModal from '../components/ui/MediaViewerModal';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [existingAttachments, setExistingAttachments] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    platform: 'PickMe',
    morning_odo: '',
    night_odo: '',
    hire_km: '',
    gross_revenue: '',
    commission: '',
    net_revenue: '',
    wallet_balance: '',
    extra_earnings: '0',
    fuel_cost: '0',
    other_expenses: '0',
    cash_on_hand: '0',
    notes: ''
  });
  
  const [files, setFiles] = useState({
    attachments: null
  });
  const [newAttachments, setNewAttachments] = useState({ odo_photo: [], receipt: [], app_screenshot: [] });
  const [isCompressing, setIsCompressing] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '', type: '', name: '' });
  
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'deposits'
  const [depositTab, setDepositTab] = useState('summary'); // 'summary' or 'history'
  const [dailySummaries, setDailySummaries] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositData, setDepositData] = useState({ date: '', amount: '', notes: '', receipt: null });

  const getStorageUrl = (path) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}/storage/${path}`;
  };

  // Auto-calculate Net Revenue
  useEffect(() => {
    if (showForm) {
      const gross = parseFloat(formData.gross_revenue) || 0;
      const comm = parseFloat(formData.commission) || 0;
      setFormData(prev => ({
        ...prev,
        net_revenue: (gross - comm).toFixed(2)
      }));
    }
  }, [formData.gross_revenue, formData.commission, showForm]);

  // Auto-calculate Cash on Hand
  useEffect(() => {
    if (showForm) {
      const net = parseFloat(formData.net_revenue) || 0;
      const fuel = parseFloat(formData.fuel_cost) || 0;
      const other = parseFloat(formData.other_expenses) || 0;
      const extra = parseFloat(formData.extra_earnings) || 0;
      setFormData(prev => ({
        ...prev,
        cash_on_hand: (net - fuel - other + extra).toFixed(2)
      }));
    }
  }, [formData.net_revenue, formData.fuel_cost, formData.other_expenses, formData.extra_earnings, showForm]);

  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const userData = localStorage.getItem('driver_user');
    
    if (!token || !userData) {
      navigate('/driver/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchData(parsedUser.id);
  }, [navigate]);

  const fetchData = async (userId) => {
    try {
      // Fetch the specific driver record using the ID from the token
      const driverRes = await api.get(`/drivers/${userId}`);
      const myDriver = driverRes.data;
      
      if (!myDriver) {
        toast.error('Driver profile not found!');
        return;
      }
      
      setDriver(myDriver);

      // Fetch active assignments to get vehicles
      const assignmentsRes = await api.get(`/assignments?driver_id=${myDriver.id}&status=active`);
      let vehicleList = assignmentsRes.data.data.map(a => a.vehicle);
      
      // Fallback: If no assigned vehicles, fetch all available vehicles
      if (vehicleList.length === 0) {
        const vehiclesRes = await api.get('/vehicles?status=Available');
        vehicleList = vehiclesRes.data.data || [];
      }

      setVehicles(vehicleList);
      
      if (vehicleList.length > 0) {
        setFormData(prev => ({ ...prev, vehicle_id: vehicleList.length === 1 ? vehicleList[0].id : '' }));
      }

      // Fetch logs
      fetchLogs(myDriver.id);
      fetchDepositsAndSummary(myDriver.id);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositData.receipt) {
      toast.error('Please upload a bank transfer receipt');
      return;
    }
    setIsLoading(true);
    try {
      const payload = new FormData();
      payload.append('driver_id', driver.id);
      payload.append('date', depositData.date);
      payload.append('amount', depositData.amount);
      payload.append('notes', depositData.notes);
      payload.append('receipt', depositData.receipt);

      await api.post('/driver-deposits', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Deposit submitted successfully!');
      setShowDepositModal(false);
      setDepositData({ date: '', amount: '', notes: '', receipt: null });
      fetchDepositsAndSummary(driver.id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async (driverId) => {
    try {
      const logsRes = await api.get(`/daily-ride-logs?driver_id=${driverId}`);
      setLogs(logsRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchDepositsAndSummary = async (driverId) => {
    try {
      const summaryRes = await api.get(`/driver-deposits/summary?driver_id=${driverId}`);
      setDailySummaries(summaryRes.data.data);

      const depositsRes = await api.get(`/driver-deposits?driver_id=${driverId}`);
      setDeposits(depositsRes.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    navigate('/driver/login');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e, category) => {
    const selectedFiles = Array.from(e.target.files);
    setIsCompressing(true);
    
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          if (file.type.startsWith('image/')) {
            return await imageCompression(file, options);
          }
          return file; // If it's a PDF or something else, return original
        })
      );
      setNewAttachments(prev => ({
        ...prev,
        [category]: [...prev[category], ...compressedFiles]
      }));
    } catch (error) {
      console.error('Image compression error:', error);
      toast.error('Error compressing some images');
    } finally {
      setIsCompressing(false);
      // Reset the input so the same file can be selected again if needed
      e.target.value = null;
    }
  };

  const removeNewAttachment = (category, index) => {
    setNewAttachments(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = new FormData();
      payload.append('driver_id', driver.id);
      
      Object.keys(formData).forEach(key => {
        payload.append(key, formData[key]);
      });

      ['odo_photo', 'receipt', 'app_screenshot'].forEach(category => {
        if (newAttachments[category].length > 0) {
          for (let i = 0; i < newAttachments[category].length; i++) {
            payload.append(`${category}s[]`, newAttachments[category][i]);
          }
        }
      });

      if (editingLogId) {
        payload.append('_method', 'PUT');
        await api.post(`/daily-ride-logs/${editingLogId}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Daily ride log updated successfully!');
      } else {
        await api.post('/daily-ride-logs', payload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Daily ride log submitted successfully!');
      }

      setShowForm(false);
      setEditingLogId(null);
      fetchLogs(driver.id);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicles.length === 1 ? vehicles[0].id : '',
        morning_odo: '',
        night_odo: '',
        hire_km: '',
        gross_revenue: '',
        commission: '',
        net_revenue: '',
        wallet_balance: '',
        extra_earnings: '0',
        fuel_cost: '0',
        other_expenses: '0',
        cash_on_hand: '0',
        notes: ''
      }));
      setFiles({ attachments: null });
      setNewAttachments({ odo_photo: [], receipt: [], app_screenshot: [] });
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit log');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      vehicle_id: log.vehicle_id,
      date: log.date ? log.date.split('T')[0] : new Date().toISOString().split('T')[0],
      platform: log.platform,
      morning_odo: log.morning_odo,
      night_odo: log.night_odo,
      hire_km: log.hire_km,
      gross_revenue: log.gross_revenue,
      commission: log.commission,
      net_revenue: log.net_revenue,
      wallet_balance: log.wallet_balance || '',
      extra_earnings: log.extra_earnings || '0',
      fuel_cost: log.fuel_cost || '0',
      other_expenses: log.other_expenses || '0',
      cash_on_hand: log.cash_on_hand || '0',
      notes: log.notes || ''
    });
    setEditingLogId(log.id);
    setShowForm(true);
    setFiles({ attachments: null });
    setNewAttachments({ odo_photo: [], receipt: [], app_screenshot: [] });
    setExistingAttachments(log.attachments || []);
    // scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditingLogId(null);
    setExistingAttachments([]);
    setFormData({
      vehicle_id: vehicles.length === 1 ? vehicles[0].id : '',
      date: new Date().toISOString().split('T')[0],
      platform: 'PickMe',
      morning_odo: '',
      night_odo: '',
      hire_km: '',
      gross_revenue: '',
      commission: '',
      net_revenue: '',
      wallet_balance: '',
      extra_earnings: '0',
      fuel_cost: '0',
      notes: ''
    });
    setFiles({ attachments: null });
    setNewAttachments([]);
    setExistingAttachments([]);
  };

  const removeExistingAttachment = async (attachmentId) => {
    if (!window.confirm("Are you sure you want to remove this evidence?")) return;
    
    try {
      await api.delete(`/attachments/${attachmentId}`);
      toast.success('Evidence removed successfully');
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
      fetchLogs(driver.id); // Refresh logs in the background to keep history in sync
    } catch (error) {
      toast.error('Failed to remove evidence');
    }
  };

  if (isLoading && !driver) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const grandTotalBalance = dailySummaries.reduce((sum, s) => sum + s.balance, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">My Portal</h1>
          <p className="text-blue-200 text-sm">{user?.name}</p>
        </div>
        <button onClick={handleLogout} className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition">
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4">
        
        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm mb-6 p-1 border border-gray-100">
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Daily Logs
          </button>
          <button 
            onClick={() => setActiveTab('deposits')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'deposits' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Cash & Deposits
          </button>
        </div>

        {activeTab === 'logs' && (
          <>
            {/* Toggle Form Button */}
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                className="w-full bg-blue-600 text-white font-medium p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 mb-6"
              >
                <Plus size={20} />
                Submit New Daily Log
              </button>
            )}

        {/* Submit Form */}
        {showForm && (
          <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">{editingLogId ? 'Edit Daily Log' : 'New Daily Log'}</h2>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Vehicle</label>
                <select name="vehicle_id" value={formData.vehicle_id} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500">
                  {vehicles.length !== 1 && <option value="">Select Vehicle</option>}
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} {v.make ? `- ${v.make} ${v.model || ''}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Platform</label>
                <select name="platform" value={formData.platform} onChange={handleInputChange} className="w-full p-2 border rounded-lg outline-none focus:border-blue-500">
                  <option value="PickMe">PickMe</option>
                  <option value="Uber">Uber</option>
                  <option value="HelaGo">HelaGo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Morning Odo</label>
                  <input type="number" step="0.1" name="morning_odo" value={formData.morning_odo} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Night Odo</label>
                  <input type="number" step="0.1" name="night_odo" value={formData.night_odo} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Hired KM (w/ passengers)</label>
                  <input type="number" step="0.1" name="hire_km" value={formData.hire_km} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Non-Hired KM (Auto-calc)</label>
                  <input 
                    type="number" 
                    value={
                      Math.max(0, parseFloat(formData.night_odo || 0) - parseFloat(formData.morning_odo || 0) - parseFloat(formData.hire_km || 0)).toFixed(1)
                    } 
                    readOnly 
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none bg-gray-50 text-gray-500 font-medium" 
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-100">
                <h3 className="font-semibold text-sm text-gray-700">Financials (Rs)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gross Revenue</label>
                    <input type="number" step="0.01" name="gross_revenue" value={formData.gross_revenue} onChange={handleInputChange} required className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Commission</label>
                    <input type="number" step="0.01" name="commission" value={formData.commission} onChange={handleInputChange} required className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fuel Expenses</label>
                    <input type="number" step="0.01" name="fuel_cost" value={formData.fuel_cost} onChange={handleInputChange} className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Wallet Balance</label>
                    <input type="number" step="0.01" name="wallet_balance" value={formData.wallet_balance} onChange={handleInputChange} className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Extra Earnings</label>
                    <input type="number" step="0.01" name="extra_earnings" value={formData.extra_earnings} onChange={handleInputChange} className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Other Expenses</label>
                    <input type="number" step="0.01" name="other_expenses" value={formData.other_expenses} onChange={handleInputChange} className="w-full p-2 border rounded outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-green-600 font-semibold mb-1">Net Revenue (Auto-calculated)</label>
                    <input type="number" step="0.01" name="net_revenue" value={formData.net_revenue} readOnly className="w-full p-2 border border-green-200 rounded outline-none bg-green-50 text-green-700 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs text-green-600 font-semibold mb-1">Cash on Hand (Auto-calc)</label>
                    <input type="number" step="0.01" name="cash_on_hand" value={formData.cash_on_hand} readOnly className="w-full p-2 border border-green-200 rounded outline-none bg-green-50 text-green-700 font-bold" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Upload Evidence</label>
                <div className="space-y-4">
                  {[
                    { key: 'odo_photo', label: 'Odometer Photos' },
                    { key: 'receipt', label: 'Receipts' },
                    { key: 'app_screenshot', label: 'App Screenshots' }
                  ].map(cat => {
                    const existAtt = existingAttachments.filter(a => a.category === cat.key);
                    const newAtt = newAttachments[cat.key] || [];
                    return (
                      <div key={cat.key} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{cat.label}</p>
                        
                        {/* Existing Attachments Display (Edit Mode) */}
                        {editingLogId && existAtt.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Previously Uploaded:</p>
                            <div className="flex flex-wrap gap-2">
                              {existAtt.map(att => (
                                <div key={att.id} className="relative inline-block cursor-pointer">
                                  <img 
                                    src={getStorageUrl(att.file_path)} 
                                    alt={cat.label} 
                                    className="w-16 h-16 object-cover rounded border border-gray-200"
                                    onClick={() => setViewerData({ isOpen: true, url: getStorageUrl(att.file_path), type: att.file_type, name: att.file_name })}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeExistingAttachment(att.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                    title="Remove Evidence"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* New Attachments Preview */}
                        {newAtt.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">New Evidence:</p>
                            <div className="flex flex-wrap gap-2">
                              {newAtt.map((file, index) => {
                                const url = URL.createObjectURL(file);
                                return (
                                  <div key={index} className="relative inline-block">
                                    <img 
                                      src={url} 
                                      alt={`preview-${index}`} 
                                      className="w-16 h-16 object-cover rounded border border-gray-200"
                                      onLoad={() => URL.revokeObjectURL(url)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeNewAttachment(cat.key, index)}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
                                      title="Remove File"
                                    >
                                      <XCircle size={14} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <input type="file" multiple onChange={(e) => handleFileChange(e, cat.key)} className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button type="submit" disabled={isLoading || isCompressing} className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg mt-4 disabled:opacity-50">
                {isCompressing ? 'Compressing Images...' : isLoading ? 'Saving...' : (editingLogId ? 'Update Log' : 'Submit Log')}
              </button>
            </form>
          </div>
        )}

        {/* History List */}
        <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-gray-500" />
          My Recent Logs
        </h2>

        <div className="space-y-4">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No logs submitted yet.</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-700">{log.platform}</span>
                    <span className="ml-2 text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full"><Clock size={12}/> Pending</span>
                      <button onClick={() => handleEdit(log)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100">Edit</button>
                    </div>
                  )}
                  {log.status === 'approved' && <span className="text-xs flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle size={12}/> Approved</span>}
                  {log.status === 'rejected' && <span className="text-xs flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle size={12}/> Rejected</span>}
                </div>
                
                <div className="grid grid-cols-2 text-sm mt-2">
                  <div><span className="text-gray-500">Total KM:</span> {log.total_km}</div>
                  <div><span className="text-gray-500">Gross:</span> Rs {log.gross_revenue}</div>
                  <div><span className="text-gray-500">Fuel:</span> Rs {log.fuel_cost}</div>
                  <div><span className="text-gray-500">Net:</span> Rs {log.net_revenue}</div>
                </div>

                {log.attachments && log.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-500 mb-2">Evidence Uploaded ({log.attachments.length})</p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {['odo_photo', 'receipt', 'app_screenshot', 'uncategorized'].map(cat => {
                        const catAtts = log.attachments.filter(a => (a.category || 'uncategorized') === cat);
                        if (catAtts.length === 0) return null;
                        const label = { odo_photo: 'Odometer', receipt: 'Receipts', app_screenshot: 'Screenshots', uncategorized: 'Other' }[cat];
                        return (
                          <div key={cat} className="flex flex-col gap-1 shrink-0">
                            <span className="text-[10px] uppercase text-gray-400 font-semibold">{label}</span>
                            <div className="flex gap-1">
                              {catAtts.map(att => (
                                <button 
                                  key={att.id} 
                                  onClick={() => setViewerData({ isOpen: true, url: getStorageUrl(att.file_path), type: att.file_type, name: att.file_name })}
                                  className="shrink-0 outline-none"
                                >
                                  <img 
                                    src={getStorageUrl(att.file_path)} 
                                    alt="evidence" 
                                    className="w-12 h-12 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

          </>
        )}

        {activeTab === 'deposits' && (
          <div className="space-y-6">
            
            {/* Grand Total & Action */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <p className="text-sm text-gray-500 font-semibold mb-1">Total Outstanding Balance</p>
              <h1 className={`text-3xl font-bold ${grandTotalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                Rs {grandTotalBalance.toFixed(2)}
              </h1>
              <p className="text-xs text-gray-400 mt-2 mb-4">The total cash you currently owe to the company.</p>
              
              <button 
                onClick={() => { setDepositData({ date: new Date().toISOString().split('T')[0], amount: grandTotalBalance > 0 ? grandTotalBalance : '', notes: '', receipt: null }); setShowDepositModal(true); }}
                className="w-full bg-blue-600 text-white font-medium p-3 rounded-lg shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition"
              >
                <Upload size={18} />
                Upload New Bank Deposit
              </button>
            </div>

            <div className="flex bg-white rounded-xl shadow-sm mb-6 p-1 border border-gray-100">
              <button 
                onClick={() => setDepositTab('summary')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${depositTab === 'summary' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Daily Cash Summary
              </button>
              <button 
                onClick={() => setDepositTab('history')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition ${depositTab === 'history' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Deposit History
              </button>
            </div>

            {depositTab === 'summary' && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Daily Cash Summary</h2>
              {dailySummaries.length === 0 ? (
                <p className="text-gray-500 text-sm bg-white p-4 rounded-xl border border-gray-100">No data available.</p>
              ) : (
                <div className="space-y-3">
                  {dailySummaries.map((summary, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-700">{summary.date ? summary.date.split('T')[0] : summary.date}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${summary.balance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {summary.balance > 0 ? 'Due' : 'Settled'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-500 mb-1">Total Cash</p>
                          <p className="font-semibold">Rs {summary.total_cash_on_hand}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-500 mb-1">Deposited</p>
                          <p className="font-semibold text-blue-600">Rs {summary.total_deposited}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-500 mb-1">Balance</p>
                          <p className={`font-semibold ${summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs {summary.balance}</p>
                        </div>
                      </div>
                      
                      {summary.balance > 0 && (
                        <button 
                          onClick={() => { setDepositData({ ...depositData, date: summary.date, amount: summary.balance }); setShowDepositModal(true); }}
                          className="mt-3 w-full py-2 bg-blue-50 text-blue-700 rounded text-sm font-semibold hover:bg-blue-100 transition"
                        >
                          Upload Deposit
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            )}

            {depositTab === 'history' && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4">Deposit History</h2>
              {deposits.length === 0 ? (
                <p className="text-gray-500 text-sm bg-white p-4 rounded-xl border border-gray-100">No deposits made yet.</p>
              ) : (
                <div className="space-y-3">
                  {deposits.map(dep => (
                    <div key={dep.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Rs {dep.amount} <span className="text-xs font-normal text-gray-500 ml-1">for {dep.date ? dep.date.split('T')[0] : dep.date}</span></p>
                        <p className="text-xs text-gray-400">{new Date(dep.created_at).toLocaleString()}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block ${dep.status === 'verified' ? 'bg-green-100 text-green-700' : dep.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {dep.status}
                        </span>
                      </div>
                      {dep.attachments && dep.attachments.length > 0 && (
                        <button 
                          onClick={() => setViewerData({ isOpen: true, url: getStorageUrl(dep.attachments[0].file_path), type: dep.attachments[0].file_type, name: dep.attachments[0].file_name })}
                          className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded text-sm"
                        >
                          View Receipt
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Submit Deposit</h3>
                <button onClick={() => setShowDepositModal(false)} className="text-gray-400"><XCircle /></button>
              </div>
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date of Earning</label>
                  <input type="date" value={depositData.date} onChange={e => setDepositData({...depositData, date: e.target.value})} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount (Rs)</label>
                  <input type="number" step="0.01" value={depositData.amount} onChange={e => setDepositData({...depositData, amount: e.target.value})} required className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bank Receipt / Slip</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => setDepositData({...depositData, receipt: e.target.files[0]})} required className="w-full text-sm text-gray-500" />
                  {depositData.receipt && depositData.receipt.type.startsWith('image/') && (
                    <div className="mt-3">
                      <img 
                        src={URL.createObjectURL(depositData.receipt)} 
                        alt="Receipt Preview" 
                        className="w-full h-40 object-cover rounded border border-gray-200"
                        onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                      />
                    </div>
                  )}
                  {depositData.receipt && depositData.receipt.type === 'application/pdf' && (
                    <div className="mt-3 p-3 bg-gray-100 rounded text-sm text-gray-600 border border-gray-200">
                      PDF Document Selected
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notes (Optional)</label>
                  <input type="text" value={depositData.notes} onChange={e => setDepositData({...depositData, notes: e.target.value})} className="w-full p-2 border rounded" />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-semibold p-3 rounded-lg hover:bg-blue-700 transition">
                  {isLoading ? 'Submitting...' : 'Confirm Deposit'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

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

export default DriverDashboard;
