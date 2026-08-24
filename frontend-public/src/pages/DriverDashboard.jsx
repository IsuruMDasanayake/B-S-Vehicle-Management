import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import imageCompression from 'browser-image-compression';

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
    notes: ''
  });
  
  const [files, setFiles] = useState({
    attachments: null
  });
  const [newAttachments, setNewAttachments] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);

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

    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
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

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_user');
    navigate('/driver/login');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
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
      setNewAttachments(prev => [...prev, ...compressedFiles]);
    } catch (error) {
      console.error('Image compression error:', error);
      toast.error('Error compressing some images');
    } finally {
      setIsCompressing(false);
      // Reset the input so the same file can be selected again if needed
      e.target.value = null;
    }
  };

  const removeNewAttachment = (index) => {
    setNewAttachments(prev => prev.filter((_, i) => i !== index));
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

      if (newAttachments.length > 0) {
        for (let i = 0; i < newAttachments.length; i++) {
          payload.append('attachments[]', newAttachments[i]);
        }
      }

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
        notes: ''
      }));
      setFiles({ attachments: null });
      setNewAttachments([]);
      
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
      notes: log.notes || ''
    });
    setEditingLogId(log.id);
    setShowForm(true);
    setFiles({ attachments: null });
    setNewAttachments([]);
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

              <div>
                <label className="block text-sm text-gray-600 mb-1">Hired KM (Driven with passengers)</label>
                <input type="number" step="0.1" name="hire_km" value={formData.hire_km} onChange={handleInputChange} required className="w-full p-2 border rounded-lg outline-none focus:border-blue-500" />
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
                    <label className="block text-xs text-gray-500 mb-1">Net Revenue (Auto-calculated)</label>
                    <input type="number" step="0.01" name="net_revenue" value={formData.net_revenue} readOnly className="w-full p-2 border rounded outline-none bg-gray-100 text-gray-600 font-semibold" />
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
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Upload Evidence (Odo Photos, Receipts, App Screenshots)</label>
                
                {/* Existing Attachments Display (Edit Mode) */}
                {editingLogId && existingAttachments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">Previously Uploaded Evidence:</p>
                    <div className="flex flex-wrap gap-3">
                      {existingAttachments.map(att => (
                        <div key={att.id} className="relative inline-block">
                          <img 
                            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost'}/storage/${att.file_path}`} 
                            alt="evidence" 
                            className="w-20 h-20 object-cover rounded border border-gray-200"
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
                {newAttachments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">New Evidence to Upload:</p>
                    <div className="flex flex-wrap gap-3">
                      {newAttachments.map((file, index) => {
                        const url = URL.createObjectURL(file);
                        return (
                          <div key={index} className="relative inline-block">
                            <img 
                              src={url} 
                              alt={`preview-${index}`} 
                              className="w-20 h-20 object-cover rounded border border-gray-200"
                              onLoad={() => URL.revokeObjectURL(url)}
                            />
                            <button
                              type="button"
                              onClick={() => removeNewAttachment(index)}
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

                <input type="file" multiple onChange={handleFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
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
                    <span className="ml-2 text-sm text-gray-500">{log.date}</span>
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
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {log.attachments.map(att => (
                        <a key={att.id} href={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost'}/storage/${att.file_path}`} target="_blank" rel="noreferrer" className="shrink-0">
                          <img 
                            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost'}/storage/${att.file_path}`} 
                            alt="evidence" 
                            className="w-16 h-16 object-cover rounded border border-gray-200"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </main>
    </div>
  );
};

export default DriverDashboard;
