import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';

import { Bell } from 'lucide-react';

const SupervisorUpload = () => {
  const { token } = useParams();
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'daily_update' | 'history'
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editingDailyUpdate, setEditingDailyUpdate] = useState(null);
  const [editDailyUpdateData, setEditDailyUpdateData] = useState({});
  const [uploadingMore, setUploadingMore] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [formData, setFormData] = useState({
    solar_project_id: '',
    solar_section_id: '',
    sub_section: '',
    phase: 'general',
    table_number: '',
    work_date: new Date().toISOString().split('T')[0], // today
    work_time: '',
    participants: '',
    uploaded_by: '',
    programme: '',
    weather: '',
    has_issue: false,
    issue_description: '',
  });

  const [dailyUpdateData, setDailyUpdateData] = useState({
    solar_project_id: '',
    report_date: new Date().toISOString().split('T')[0],
    start_time: '',
    manpower: '',
    machines: '',
    weather: '',
    planned_tasks: '',
    notes: '',
  });

  const [selectedDailyFiles, setSelectedDailyFiles] = useState([]);
  const [dailyPreviewUrls, setDailyPreviewUrls] = useState([]);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    const fetchSiteData = async () => {
      try {
        const { data } = await api.get(`/upload/${token}`);
        setSiteData(data);
      } catch (error) {
        toast.error('Invalid or expired upload link.');
      } finally {
        setLoading(false);
      }
    };
    fetchSiteData();
    fetchNotifications();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [token, activeTab]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get(`/upload/${token}/notifications`);
      setNotifications(data.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await api.patch(`/upload/${token}/notifications/${notificationId}/read`);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get(`/upload/${token}/history`);
      const combined = [
        ...(data.batches || []).map(b => ({ ...b, type: 'batch' })),
        ...(data.daily_updates || []).map(d => ({ ...d, type: 'daily' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setHistory(combined);
    } catch (error) {
      toast.error('Failed to load history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Derived state based on selections
  const selectedProject = siteData?.projects?.find(p => p.id === parseInt(formData.solar_project_id));
  const selectedSection = selectedProject?.sections?.find(s => s.id === parseInt(formData.solar_section_id));
  const tableConfig = selectedProject?.project_tables || [];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedFiles.length + files.length > 30) {
      toast.error('Maximum 30 images allowed per upload.');
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Create previews
    const urls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const removeFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newUrls = [...previewUrls];
    URL.revokeObjectURL(newUrls[index]); // Free memory
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.solar_section_id) return toast.error('Please select a milestone section.');
    if (selectedFiles.length === 0) return toast.error('Please select at least one image.');
    
    if (selectedSection?.has_table_tracking && !formData.table_number) {
      return toast.error('Table number is required for this milestone.');
    }
    if (selectedSection?.sub_sections && !formData.sub_section) {
      return toast.error('Please select a sub-section.');
    }

    setSubmitting(true);
    setUploadProgress(0);

    const fd = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== '') {
        // Only send has_issue as 1 or 0
        if (key === 'has_issue') {
          fd.append(key, formData[key] ? '1' : '0');
        } else {
          fd.append(key, formData[key]);
        }
      }
    });

    selectedFiles.forEach(file => {
      fd.append('images[]', file);
    });

    try {
      await api.post(`/upload/${token}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      toast.success('Upload completed successfully!');
      
      // Reset form but keep project/section context
      setFormData(prev => ({
        ...prev,
        table_number: '',
        participants: '',
        programme: '',
        has_issue: false,
        issue_description: '',
      }));
      setSelectedFiles([]);
      setPreviewUrls([]);
      
      // Navigate to history to see the upload
      setActiveTab('history');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleDailyFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedDailyFiles.length + files.length > 20) {
      toast.error('Maximum 20 images allowed per update.');
      return;
    }

    const newFiles = [...selectedDailyFiles, ...files];
    setSelectedDailyFiles(newFiles);

    const urls = newFiles.map(file => URL.createObjectURL(file));
    setDailyPreviewUrls(urls);
  };

  const removeDailyFile = (index) => {
    const newFiles = [...selectedDailyFiles];
    newFiles.splice(index, 1);
    setSelectedDailyFiles(newFiles);
    
    const newUrls = [...dailyPreviewUrls];
    URL.revokeObjectURL(newUrls[index]);
    newUrls.splice(index, 1);
    setDailyPreviewUrls(newUrls);
  };

  const handleDailySubmit = async (e) => {
    e.preventDefault();
    if (!dailyUpdateData.solar_project_id) return toast.error('Please select a project.');
    
    setSubmitting(true);
    setUploadProgress(0);

    const fd = new FormData();
    Object.keys(dailyUpdateData).forEach(key => {
      if (dailyUpdateData[key] !== null && dailyUpdateData[key] !== '') {
        fd.append(key, dailyUpdateData[key]);
      }
    });

    selectedDailyFiles.forEach(file => {
      fd.append('images[]', file);
    });

    try {
      await api.post(`/upload/${token}/daily-updates`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      toast.success('Daily update submitted successfully!');
      
      setDailyUpdateData(prev => ({
        ...prev,
        manpower: '',
        machines: '',
        planned_tasks: '',
        notes: '',
      }));
      setSelectedDailyFiles([]);
      setDailyPreviewUrls([]);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchHistory();
      setActiveTab('history');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/upload/${token}/batches/${editingBatch.id}`, formData);
      toast.success('Batch updated successfully');
      setEditingBatch(null);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDailyUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/upload/${token}/daily-updates/${editingDailyUpdate.id}`, editDailyUpdateData);
      toast.success('Daily update modified successfully');
      setEditingDailyUpdate(null);
      fetchHistory();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update daily update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDailyImage = async (imageId) => {
    try {
      await api.delete(`/upload/${token}/daily-update-images/${imageId}`);
      toast.success('Image deleted');
      setEditingDailyUpdate(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageId),
        images_count: prev.images_count - 1
      }));
      fetchHistory();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleAddMoreDailyImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if ((editingDailyUpdate.images?.length || 0) + files.length > 30) {
      toast.error('Maximum 30 images allowed per daily update.');
      return;
    }

    setUploadingMore(true);
    const fd = new FormData();
    files.forEach(file => fd.append('images[]', file));

    try {
      const { data } = await api.post(`/upload/${token}/daily-updates/${editingDailyUpdate.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Images added successfully');
      
      setEditingDailyUpdate(prev => ({
        ...prev,
        images: [...(prev.images || []), ...data.images],
        images_count: prev.images_count + data.images.length
      }));
      e.target.value = null;
      fetchHistory();
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingMore(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/upload/${token}/images/${imageId}`);
      toast.success('Image deleted');
      // Remove from UI
      setEditingBatch(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageId),
        images_count: prev.images_count - 1
      }));
      // Also update history list in background
      fetchHistory();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleAddMoreImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if ((editingBatch.images?.length || 0) + files.length > 30) {
      toast.error('Maximum 30 images allowed per batch.');
      return;
    }

    setUploadingMore(true);
    const fd = new FormData();
    files.forEach(file => fd.append('images[]', file));

    try {
      const { data } = await api.post(`/upload/${token}/batches/${editingBatch.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Images added successfully');
      
      // Update UI with new images
      setEditingBatch(prev => ({
        ...prev,
        images: [...(prev.images || []), ...data.images],
        images_count: prev.images_count + data.images.length
      }));
      // Reset input
      e.target.value = null;
      fetchHistory();
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingMore(false);
    }
  };

  const handleEditClick = (batch) => {
    setEditingBatch(batch);
    setEditingDailyUpdate(null);
    setFormData({
      solar_project_id: batch.section?.project?.id || '',
      solar_section_id: batch.solar_section_id || '',
      sub_section: batch.sub_section || '',
      phase: batch.phase || 'general',
      table_number: batch.table_number || '',
      work_date: batch.work_date ? batch.work_date.split('T')[0] : '',
      work_time: batch.work_time ? batch.work_time.substring(0, 5) : '',
      participants: batch.participants || '',
      uploaded_by: batch.uploaded_by || '',
      programme: batch.programme || '',
      weather: batch.weather || '',
      has_issue: batch.has_issue || false,
      issue_description: batch.issue_description || '',
    });
  };

  const handleEditDailyClick = (update) => {
    setEditingDailyUpdate(update);
    setEditingBatch(null);
    setEditDailyUpdateData({
      report_date: update.report_date ? update.report_date.split('T')[0] : '',
      start_time: update.start_time ? update.start_time.substring(0, 5) : '',
      manpower: update.manpower || '',
      machines: update.machines || '',
      weather: update.weather || '',
      planned_tasks: update.planned_tasks || '',
      notes: update.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingBatch(null);
    setEditingDailyUpdate(null);
    setFormData({
      solar_project_id: '',
      solar_section_id: '',
      sub_section: '',
      phase: 'general',
      table_number: '',
      work_date: new Date().toISOString().split('T')[0],
      work_time: '',
      participants: '',
      uploaded_by: '',
      programme: '',
      weather: '',
      has_issue: false,
      issue_description: '',
    });
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!siteData) return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
      <h2>Link Invalid or Expired</h2>
      <p style={{ color: 'var(--text-muted)' }}>Please contact the administrator for a new upload link.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Mobile-first Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '1.5rem' }}>📍</div>
              <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{siteData.site.name}</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Field Update Portal</p>
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn btn-ghost" 
              style={{ padding: '0.5rem', position: 'relative' }}
            >
              <Bell size={24} />
              {notifications.filter(n => !n.read_at).length > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {notifications.filter(n => !n.read_at).length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div style={{ position: 'absolute', top: '100%', right: 0, width: '300px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', zIndex: 50, maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                  Notifications
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No new notifications
                  </div>
                ) : (
                  <div>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: n.read_at ? 'var(--surface)' : 'var(--surface-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.9rem', color: n.read_at ? 'var(--text-muted)' : 'var(--text)' }}>{n.data.title}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', margin: n.read_at ? '0' : '0 0 0.75rem 0', color: 'var(--text-muted)' }}>
                          {n.data.message}
                        </p>
                        {!n.read_at && (
                          <button 
                            onClick={() => markNotificationAsRead(n.id)}
                            className="btn btn-outline"
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: '100%' }}
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <button 
            onClick={() => { setActiveTab('upload'); setEditingBatch(null); }}
            style={{ flex: 1, padding: '1rem', background: activeTab === 'upload' ? 'transparent' : 'var(--surface-2)', border: 'none', borderBottom: activeTab === 'upload' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: activeTab === 'upload' ? 600 : 500, color: activeTab === 'upload' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Milestone Upload
          </button>
          <button 
            onClick={() => { setActiveTab('daily_update'); setEditingBatch(null); }}
            style={{ flex: 1, padding: '1rem', background: activeTab === 'daily_update' ? 'transparent' : 'var(--surface-2)', border: 'none', borderBottom: activeTab === 'daily_update' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: activeTab === 'daily_update' ? 600 : 500, color: activeTab === 'daily_update' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            Daily Update
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setEditingBatch(null); }}
            style={{ flex: 1, padding: '1rem', background: activeTab === 'history' ? 'transparent' : 'var(--surface-2)', border: 'none', borderBottom: activeTab === 'history' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: activeTab === 'history' ? 600 : 500, color: activeTab === 'history' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer' }}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === 'upload' && !editingBatch && !editingDailyUpdate && (
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Project & Milestone Selection */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>1. Select Task</h3>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Project</label>
            <select 
              className="form-control" 
              value={formData.solar_project_id} 
              onChange={e => setFormData({...formData, solar_project_id: e.target.value, solar_section_id: '', table_number: '', sub_section: ''})}
              required
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Project --</option>
              {siteData.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedProject && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Milestone / Section</label>
              <select 
                className="form-control" 
                value={formData.solar_section_id} 
                onChange={e => setFormData({...formData, solar_section_id: e.target.value, table_number: '', sub_section: ''})}
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Milestone --</option>
                {selectedProject.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Conditional Sub-fields based on Milestone type */}
          {selectedSection?.has_table_tracking && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Table Number</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="e.g. 1"
                value={formData.table_number} 
                onChange={e => setFormData({...formData, table_number: e.target.value})}
                required
                min="1"
                style={{ width: '100%' }}
              />
            </div>
          )}

          {selectedSection?.sub_sections && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Sub-Section</label>
              <select 
                className="form-control" 
                value={formData.sub_section} 
                onChange={e => setFormData({...formData, sub_section: e.target.value})}
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Select Sub-Section --</option>
                {(typeof selectedSection.sub_sections === 'string' ? JSON.parse(selectedSection.sub_sections) : selectedSection.sub_sections).map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
            </div>
          )}

          {selectedSection?.has_before_after && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Phase</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setFormData({...formData, phase: 'before'})} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', border: formData.phase === 'before' ? '2px solid #3b82f6' : '1px solid var(--border)', background: formData.phase === 'before' ? 'rgba(59,130,246,0.1)' : 'var(--surface)', fontWeight: 600 }}>Before</button>
                <button type="button" onClick={() => setFormData({...formData, phase: 'after'})} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius)', border: formData.phase === 'after' ? '2px solid #22c55e' : '1px solid var(--border)', background: formData.phase === 'after' ? 'rgba(34,197,94,0.1)' : 'var(--surface)', fontWeight: 600 }}>After</button>
              </div>
            </div>
          )}
        </div>

        {/* Field Report */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>2. Field Report</h3>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>📅 Date *</label>
              <input type="date" className="form-control" value={formData.work_date} onChange={e => setFormData({...formData, work_date: e.target.value})} required style={{ width: '100%' }} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🕐 Time</label>
              <input type="time" className="form-control" value={formData.work_time} onChange={e => setFormData({...formData, work_time: e.target.value})} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Update Person Name</label>
              <input type="text" className="form-control" placeholder="Your name" value={formData.uploaded_by} onChange={e => setFormData({...formData, uploaded_by: e.target.value})} style={{ width: '100%' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Workers / Participants</label>
            <input type="text" className="form-control" placeholder="Participants names" value={formData.participants} onChange={e => setFormData({...formData, participants: e.target.value})} style={{ width: '100%' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>📋 Programme</label>
            <textarea className="form-control" placeholder="Description of work" value={formData.programme} onChange={e => setFormData({...formData, programme: e.target.value})} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🌤️ Weather</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['Sunny', 'Cloudy', 'Rainy', 'Windy'].map(w => (
                <button 
                  key={w} 
                  type="button" 
                  onClick={() => setFormData({...formData, weather: formData.weather === w ? '' : w})}
                  style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: formData.weather === w ? '2px solid #3b82f6' : '1px solid var(--border)', background: formData.weather === w ? 'rgba(59,130,246,0.1)' : 'var(--surface)', fontSize: '0.9rem' }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem', background: formData.has_issue ? 'rgba(239,68,68,0.05)' : 'transparent', padding: formData.has_issue ? '1rem' : 0, borderRadius: 'var(--radius)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', color: formData.has_issue ? '#ef4444' : 'inherit' }}>
              <input type="checkbox" checked={formData.has_issue} onChange={e => setFormData({...formData, has_issue: e.target.checked})} style={{ width: '1.2rem', height: '1.2rem' }} />
              ⚠️ Report an Issue?
            </label>
            {formData.has_issue && (
              <textarea 
                className="form-control" 
                placeholder="Describe the issue..." 
                value={formData.issue_description} 
                onChange={e => setFormData({...formData, issue_description: e.target.value})} 
                required 
                style={{ width: '100%', minHeight: '80px', marginTop: '0.5rem', borderColor: '#fca5a5', resize: 'vertical' }} 
              />
            )}
          </div>
        </div>

        {/* Image Upload */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>3. Images *</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
            {previewUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <img src={url} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => removeFile(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            ))}
            
            <label style={{ aspectRatio: '1', borderRadius: 'var(--radius)', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📸</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Add Photo</span>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>
          
          {selectedSection?.expected_images && (
             <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
               Expected for this task: ~{selectedSection.expected_images} images
             </div>
          )}
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={submitting}
          className="btn btn-primary" 
          style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          {submitting ? (
            <>
              <span className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
              Uploading... {uploadProgress}%
            </>
          ) : 'Submit Report'}
        </button>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
      )}

      {activeTab === 'daily_update' && !editingBatch && !editingDailyUpdate && (
        <form onSubmit={handleDailySubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Project Details</h3>
            
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Project</label>
              <select 
                className="form-control" 
                value={dailyUpdateData.solar_project_id} 
                onChange={e => setDailyUpdateData({...dailyUpdateData, solar_project_id: e.target.value})}
                required
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Project --</option>
                {siteData?.projects?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Date *</label>
                <input type="date" className="form-control" value={dailyUpdateData.report_date} onChange={e => setDailyUpdateData({...dailyUpdateData, report_date: e.target.value})} required style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Site Start Time</label>
                <input type="time" className="form-control" value={dailyUpdateData.start_time} onChange={e => setDailyUpdateData({...dailyUpdateData, start_time: e.target.value})} style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Daily Progress</h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>👷 Man Power</label>
              <input type="text" className="form-control" placeholder="e.g. Operator - 1 / Labour - 3 / Supervisor - 1" value={dailyUpdateData.manpower} onChange={e => setDailyUpdateData({...dailyUpdateData, manpower: e.target.value})} style={{ width: '100%' }} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🚜 Machines / Vehicle Details</label>
              <input type="text" className="form-control" placeholder="e.g. Excavator - 1" value={dailyUpdateData.machines} onChange={e => setDailyUpdateData({...dailyUpdateData, machines: e.target.value})} style={{ width: '100%' }} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>🌤️ Weather</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['Sunny', 'Cloudy', 'Light Rain', 'Heavy Rain', 'Windy'].map(w => (
                  <button 
                    key={w} 
                    type="button" 
                    onClick={() => setDailyUpdateData({...dailyUpdateData, weather: dailyUpdateData.weather === w ? '' : w})}
                    style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: dailyUpdateData.weather === w ? '2px solid #3b82f6' : '1px solid var(--border)', background: dailyUpdateData.weather === w ? 'rgba(59,130,246,0.1)' : 'var(--surface)', fontSize: '0.9rem' }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>📋 Planned Task</label>
              <textarea className="form-control" placeholder="Description of planned work..." value={dailyUpdateData.planned_tasks} onChange={e => setDailyUpdateData({...dailyUpdateData, planned_tasks: e.target.value})} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>📝 Note</label>
              <textarea className="form-control" placeholder="Any issues, delays, or additional notes..." value={dailyUpdateData.notes} onChange={e => setDailyUpdateData({...dailyUpdateData, notes: e.target.value})} style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} />
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Photos</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {dailyPreviewUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={url} alt={`Preview ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removeDailyFile(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                </div>
              ))}
              
              <label style={{ aspectRatio: '1', borderRadius: 'var(--radius)', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📸</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Add Photo</span>
                <input type="file" multiple accept="image/*" onChange={handleDailyFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                Submitting... {uploadProgress}%
              </>
            ) : 'Submit Daily Update'}
          </button>
        </form>
      )}

      {/* History Tab */}
      {activeTab === 'history' && !editingBatch && !editingDailyUpdate && (
        <div style={{ padding: '1.5rem' }}>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No recent uploads found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {history.map((item, index) => {
                if (item.type === 'batch') {
                  return (
                    <div key={`batch-${item.id}`} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: 'var(--primary)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem', display: 'inline-block' }}>Milestone Upload</span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{item.section?.name}</h3>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Project: {item.section?.project?.name}
                          </div>
                        </div>
                        {index === 0 && (
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Edit Last Update
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>🖼️ {item.images_count} Images</span>
                        {item.uploaded_by && <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>👤 By: {item.uploaded_by}</span>}
                        {item.table_number && <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Table {item.table_number}</span>}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={`daily-${item.id}`} className="card" style={{ padding: '1.5rem',  }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', background: '#3b82f6', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', marginBottom: '0.5rem', display: 'inline-block' }}>Daily Update</span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                          <h3 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{item.project?.name}</h3>
                        </div>
                        {index === 0 && (
                          <button 
                            onClick={() => handleEditDailyClick(item)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Edit Last Update
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>🖼️ {item.images ? item.images.length : 0} Images</span>
                        {item.weather && <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>🌤️ {item.weather}</span>}
                        <span style={{ background: 'var(--surface-2)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>👷 {item.manpower || 'N/A'}</span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Mode - Milestone */}
      {editingBatch && (
        <form onSubmit={handleUpdateBatch} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Images Section */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Manage Images</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {editingBatch.images?.map(img => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: img.is_flagged ? '3px solid #ef4444' : '1px solid var(--border)' }}>
                  <img 
                    src={img.image_url} 
                    alt="Upload" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                    onClick={() => setSelectedImage(img)}
                  />
                  {img.is_flagged && (
                    <div 
                      title={img.flag_reason || 'Flagged by Admin'}
                      style={{ position: 'absolute', top: '8px', left: '8px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'help' }}
                    >
                      FLAGGED
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="form-group">
              <label className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', opacity: uploadingMore ? 0.7 : 1 }}>
                {uploadingMore ? 'Uploading...' : '📸 Add More Images'}
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/png,image/heic" 
                  style={{ display: 'none' }}
                  onChange={handleAddMoreImages}
                  disabled={uploadingMore}
                />
              </label>
            </div>
          </div>

          {/* <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Editing Batch Metadata</h3>
          </div> */}

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Field Report</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>📅 Date *</label>
                <input type="date" className="form-control" value={formData.work_date} onChange={e => setFormData({...formData, work_date: e.target.value})} required style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>⏰ Time</label>
                <input type="time" className="form-control" value={formData.work_time} onChange={e => setFormData({...formData, work_time: e.target.value})} style={{ width: '100%' }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Update Person Name</label>
                <input type="text" className="form-control" placeholder="Your name" value={formData.uploaded_by} onChange={e => setFormData({...formData, uploaded_by: e.target.value})} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Workers / Participants</label>
                <input type="text" className="form-control" placeholder="e.g. 5 laborers" value={formData.participants} onChange={e => setFormData({...formData, participants: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Weather</label>
                <select className="form-control" value={formData.weather} onChange={e => setFormData({...formData, weather: e.target.value})} style={{ width: '100%' }}>
                  <option value="">-- Select --</option>
                  <option value="Sunny">Sunny</option>
                  <option value="Cloudy">Cloudy</option>
                  <option value="Rainy">Rainy</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', position: 'sticky', bottom: 0, background: '#f8fafc', padding: '1rem 0', marginTop: 'auto', borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={cancelEdit} className="btn btn-ghost" style={{ flex: 1, padding: '1rem', fontSize: '1rem' }}>Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2, padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Edit Mode - Daily Update */}
      {editingDailyUpdate && (
        <form onSubmit={handleUpdateDailyUpdate} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Daily Update</h3>
              <button type="button" onClick={cancelEdit} className="btn btn-ghost">Cancel</button>
            </div>

            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Manage Images</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {editingDailyUpdate.images?.map(img => (
                <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img 
                    src={img.image_url} 
                    alt="Daily Update" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                    onClick={() => setSelectedImage(img)}
                  />
                  <button 
                    type="button"
                    onClick={() => handleDeleteDailyImage(img.id)}
                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="btn btn-outline" style={{ display: 'flex', justifyContent: 'center', cursor: 'pointer', opacity: uploadingMore ? 0.7 : 1 }}>
                {uploadingMore ? 'Uploading...' : '📸 Add More Images'}
                <input 
                  type="file" 
                  multiple 
                  accept="image/jpeg,image/png,image/heic" 
                  style={{ display: 'none' }}
                  onChange={handleAddMoreDailyImages}
                  disabled={uploadingMore}
                />
              </label>
            </div>

            <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Daily Progress</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Date *</label>
                  <input type="date" className="form-control" value={editDailyUpdateData.report_date} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, report_date: e.target.value})} required style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Start Time</label>
                  <input type="time" className="form-control" value={editDailyUpdateData.start_time} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, start_time: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Man Power</label>
                <input type="text" className="form-control" value={editDailyUpdateData.manpower} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, manpower: e.target.value})} style={{ width: '100%' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Machines / Vehicles</label>
                <input type="text" className="form-control" value={editDailyUpdateData.machines} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, machines: e.target.value})} style={{ width: '100%' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Weather</label>
                <input type="text" className="form-control" value={editDailyUpdateData.weather} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, weather: e.target.value})} style={{ width: '100%' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Planned Task</label>
                <textarea className="form-control" value={editDailyUpdateData.planned_tasks} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, planned_tasks: e.target.value})} style={{ width: '100%', minHeight: '60px' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Notes</label>
                <textarea className="form-control" value={editDailyUpdateData.notes} onChange={e => setEditDailyUpdateData({...editDailyUpdateData, notes: e.target.value})} style={{ width: '100%', minHeight: '60px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '2rem'
          }}
        >
          <img 
            src={selectedImage.image_url} 
            alt="Fullscreen" 
            style={{ maxHeight: '85vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} 
            onClick={e => e.stopPropagation()} 
          />
          {selectedImage.is_flagged && selectedImage.flag_reason && (
            <div style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 'bold', background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              FLAGGED: {selectedImage.flag_reason}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }} onClick={e => e.stopPropagation()}>
            <a 
              href={selectedImage.image_url} 
              download 
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Download
            </a>
            <button onClick={() => setSelectedImage(null)} className="btn btn-ghost" style={{ color: 'white' }}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupervisorUpload;
