import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../../store/authStore';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';
import { ChevronDown, ChevronUp, MinusCircle } from 'lucide-react';

const SolarProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // { image, images, currentIndex }
  
  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.includes('super_admin');
  
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, batchId: null });
  const [editModal, setEditModal] = useState({ isOpen: false, batch: null });
  const [editFormData, setEditFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMore, setUploadingMore] = useState(false);
  
  const [expandedSections, setExpandedSections] = useState({});
  const [templates, setTemplates] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [dailyUpdateFilter, setDailyUpdateFilter] = useState('');
  const [editDailyUpdateModal, setEditDailyUpdateModal] = useState({ isOpen: false, update: null });
  const [editDailyUpdateData, setEditDailyUpdateData] = useState({});
  const [deleteDailyUpdateModal, setDeleteDailyUpdateModal] = useState({ isOpen: false, updateId: null });
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'daily_updates'
  const [addMilestoneModal, setAddMilestoneModal] = useState({ isOpen: false, templateId: '', insertAfterOrder: 0 });
  const [deleteMilestoneModal, setDeleteMilestoneModal] = useState({ isOpen: false, sectionId: null });
  const [flagReasonModal, setFlagReasonModal] = useState({ isOpen: false, imageId: null, reason: '' });
  const [expandedDailyUpdates, setExpandedDailyUpdates] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleDailyUpdate = (updateId) => {
    setExpandedDailyUpdates(prev => ({
      ...prev,
      [updateId]: !prev[updateId]
    }));
  };

  const handleNextImage = () => {
    if (selectedImage && selectedImage.currentIndex < selectedImage.images.length - 1) {
      setSelectedImage(prev => ({
        ...prev,
        image: prev.images[prev.currentIndex + 1],
        currentIndex: prev.currentIndex + 1
      }));
    }
  };

  const handlePrevImage = () => {
    if (selectedImage && selectedImage.currentIndex > 0) {
      setSelectedImage(prev => ({
        ...prev,
        image: prev.images[prev.currentIndex - 1],
        currentIndex: prev.currentIndex - 1
      }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImage) return;
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage]);

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/solar/projects/${id}/milestones`, {
        section_template_id: addMilestoneModal.templateId,
        insert_after_order: addMilestoneModal.insertAfterOrder
      });
      toast.success('Milestone added successfully');
      setAddMilestoneModal({ isOpen: false, templateId: '', insertAfterOrder: 0 });
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/solar/projects/${id}`);
      setProject(data);
    } catch (error) {
      toast.error('Failed to load project details');
      navigate('/solar/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!isSuperAdmin) return;
    try {
      const { data } = await api.get('/solar/templates');
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates');
    }
  };
  const fetchDailyUpdates = async () => {
    try {
      const { data } = await api.get(`/solar/projects/${id}/daily-updates`);
      setDailyUpdates(data.data || []);
    } catch (error) {
      console.error('Failed to fetch daily updates', error);
    }
  };

  useEffect(() => {
    fetchProject();
    fetchTemplates();
    fetchDailyUpdates();
  }, [id]);

  const openEditModal = (batch) => {
    setEditModal({ isOpen: true, batch });
    setEditFormData({
      work_date: batch.work_date ? batch.work_date.split('T')[0] : '',
      work_time: batch.work_time ? batch.work_time.substring(0, 5) : '',
      participants: batch.participants || '',
      uploaded_by: batch.uploaded_by || '',
      programme: batch.programme || '',
      weather: batch.weather || '',
      has_issue: batch.has_issue || false,
      issue_description: batch.issue_description || '',
      sub_section: batch.sub_section || '',
      phase: batch.phase || 'general',
      table_number: batch.table_number || '',
    });
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/solar/upload-batches/${editModal.batch.id}`, editFormData);
      toast.success('Batch updated');
      setEditModal({ isOpen: false, batch: null });
      fetchProject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDailyUpdateModal = (update) => {
    setEditDailyUpdateModal({ isOpen: true, update });
    setEditDailyUpdateData({
      report_date: update.report_date ? update.report_date.split('T')[0] : '',
      start_time: update.start_time ? update.start_time.substring(0, 5) : '',
      manpower: update.manpower || '',
      machines: update.machines || '',
      weather: update.weather || '',
      planned_tasks: update.planned_tasks || '',
      notes: update.notes || '',
    });
  };

  const handleUpdateDailyUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/solar/daily-updates/${editDailyUpdateModal.update.id}`, editDailyUpdateData);
      toast.success('Daily update modified');
      setEditDailyUpdateModal({ isOpen: false, update: null });
      fetchDailyUpdates();
    } catch (error) {
      toast.error('Failed to update daily update');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlagImage = async (imageId, currentFlagStatus) => {
    if (!currentFlagStatus) {
      // Open modal to get reason
      setFlagReasonModal({ isOpen: true, imageId, reason: '' });
    } else {
      // Unflag immediately
      try {
        await api.patch(`/solar/images/${imageId}/flag`, { is_flagged: false, flag_reason: null });
        toast.success('Flag removed');
        toast.success('Flag removed');
        fetchProject();
        if (selectedImage && selectedImage.image.id === imageId) {
          setSelectedImage(prev => ({ ...prev, image: { ...prev.image, is_flagged: false, flag_reason: null } }));
        }
      } catch (error) {
        toast.error('Failed to update flag status');
      }
    }
  };

  const submitFlagReason = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/solar/images/${flagReasonModal.imageId}/flag`, { 
        is_flagged: true, 
        flag_reason: flagReasonModal.reason || null 
      });
      toast.success('Image flagged');
      fetchProject();
      toast.success('Image flagged');
      fetchProject();
      
      if (selectedImage && selectedImage.image.id === flagReasonModal.imageId) {
        setSelectedImage(prev => ({ ...prev, image: { ...prev.image, is_flagged: true, flag_reason: flagReasonModal.reason || null } }));
      }
      setFlagReasonModal({ isOpen: false, imageId: null, reason: '' });
    } catch (error) {
      toast.error('Failed to flag image');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/solar/images/${imageId}`);
      toast.success('Image deleted');
      // Update UI
      setEditModal(prev => ({
        ...prev,
        batch: {
          ...prev.batch,
          images: prev.batch.images.filter(img => img.id !== imageId)
        }
      }));
      fetchProject();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleAddMoreImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if ((editModal.batch.images?.length || 0) + files.length > 30) {
      toast.error('Maximum 30 images allowed per batch.');
      return;
    }

    setUploadingMore(true);
    const fd = new FormData();
    files.forEach(file => fd.append('images[]', file));

    try {
      const { data } = await api.post(`/solar/upload-batches/${editModal.batch.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Images added successfully');
      
      // Update UI with new images
      setEditModal(prev => ({
        ...prev,
        batch: {
          ...prev.batch,
          images: [...(prev.batch.images || []), ...data.images]
        }
      }));
      // Reset input
      e.target.value = null;
      fetchProject();
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploadingMore(false);
    }
  };

  if (loading) return <div>Loading project details...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/solar/admin/projects')} className="btn btn-ghost" style={{ marginBottom: '1rem', padding: 0 }}>
        ← Back to Projects
      </button>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{project.name}</h2>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                borderRadius: '999px', 
                fontSize: '0.85rem', 
                fontWeight: 600,
                background: project.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                color: project.status === 'active' ? '#22c55e' : '#f59e0b'
              }}>
                {(project.status || 'active').toUpperCase()}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Site: <strong style={{ color: 'var(--text)' }}>{project.site?.name}</strong> • 
              Client: <strong style={{ color: 'var(--text)' }}>{project.client_name || 'N/A'}</strong>
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('milestones')}
          style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'milestones' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: activeTab === 'milestones' ? 600 : 500, color: activeTab === 'milestones' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
        >
          Engineering Milestones
        </button>
        <button 
          onClick={() => setActiveTab('daily_updates')}
          style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'daily_updates' ? '3px solid var(--primary)' : '3px solid transparent', fontWeight: activeTab === 'daily_updates' ? 600 : 500, color: activeTab === 'daily_updates' ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
        >
          Daily Updates
        </button>
      </div>

      {activeTab === 'milestones' && (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>Project Milestones</h3>
          {isSuperAdmin && (
          <button 
            onClick={() => setAddMilestoneModal({ isOpen: true, templateId: '', insertAfterOrder: 0 })}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            + Add Milestone
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {project.sections?.map(section => {
          const totalImages = section.upload_batches?.reduce((acc, batch) => acc + (batch.images?.length || 0), 0) || 0;
          const isExpanded = expandedSections[section.id];
          
          return (
            <div key={section.id} className="card" style={{ padding: '1.5rem' }}>
              <div 
                onClick={() => toggleSection(section.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isExpanded ? '1rem' : '0', borderBottom: isExpanded ? '1px solid var(--border)' : 'none', paddingBottom: isExpanded ? '1rem' : '0', cursor: 'pointer' }}
              >
                <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  {section.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'var(--surface-2)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
                    {totalImages} / {section.expected_images} Images
                  </div>
                  {isSuperAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteMilestoneModal({ isOpen: true, sectionId: section.id });
                      }}
                      className="btn btn-ghost" 
                      style={{ padding: '0.25rem', color: '#ef4444' }}
                      title="Remove Milestone"
                    >
                      <MinusCircle size={20} />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <>
                  {section.upload_batches?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {section.upload_batches.map(batch => (
                        <div key={batch.id} style={{ background: 'var(--surface-2)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                {new Date(batch.work_date).toLocaleDateString()} {batch.work_time && `at ${batch.work_time}`}
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {batch.participants && <span>👷 {batch.participants}</span>}
                                {batch.uploaded_by && <span>👤 Uploaded By: {batch.uploaded_by}</span>}
                                {batch.weather && <span>🌤️ {batch.weather}</span>}
                                {batch.phase !== 'general' && <span>⏱️ Phase: {batch.phase}</span>}
                                {batch.table_number && <span>🏗️ Table: {batch.table_number}</span>}
                                {batch.sub_section && <span>📂 {batch.sub_section}</span>}
                              </div>
                              {batch.programme && (
                                <div style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>
                                  <strong>Programme:</strong> {batch.programme}
                                </div>
                              )}
                              {batch.has_issue && (
                                <div style={{ marginTop: '0.75rem', background: '#fef2f2', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                  <strong>⚠️ Issue Reported:</strong> {batch.issue_description}
                                </div>
                              )}
                            </div>
                            {isSuperAdmin && (
                              <div style={{ display: 'flex', gap: '0.5rem', height: 'fit-content' }}>
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(batch); }} className="btn btn-ghost" style={{ color: '#3b82f6', padding: '0.5rem' }}>
                                  Edit Batch
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, batchId: batch.id }); }} className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.5rem' }}>
                                  Delete Batch
                                </button>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                            {batch.images?.map(img => (
                              <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: img.is_flagged ? '3px solid #ef4444' : '1px solid var(--border)' }}>
                                <img 
                                  src={img.image_url} 
                                  alt="Upload" 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                                  onClick={(e) => { e.stopPropagation(); setSelectedImage({ image: img, images: batch.images, currentIndex: batch.images.findIndex(i => i.id === img.id) }); }}
                                />
                                {img.is_flagged && (
                                  <div 
                                    title={img.flag_reason || 'Flagged by Admin'}
                                    style={{ position: 'absolute', top: '8px', left: '8px', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'help' }}
                                  >
                                    FLAGGED
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No field reports uploaded for this milestone yet.
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}

      {activeTab === 'daily_updates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Filter by Date:</label>
              <input 
                type="date" 
                className="form-control" 
                value={dailyUpdateFilter} 
                onChange={e => setDailyUpdateFilter(e.target.value)} 
                style={{ width: '150px' }}
              />
              {dailyUpdateFilter && (
                <button onClick={() => setDailyUpdateFilter('')} className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem' }}>Clear</button>
              )}
            </div>
          </div>
          {dailyUpdates.length > 0 ? (
            dailyUpdates.filter(u => !dailyUpdateFilter || u.report_date.startsWith(dailyUpdateFilter)).map(update => (
              <div key={update.id} className="card" style={{ padding: '1.5rem' }}>
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: expandedDailyUpdates[update.id] ? '1px solid var(--border)' : 'none', paddingBottom: expandedDailyUpdates[update.id] ? '1rem' : 0, marginBottom: expandedDailyUpdates[update.id] ? '1rem' : 0, cursor: 'pointer' }}
                  onClick={() => toggleDailyUpdate(update.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                      {expandedDailyUpdates[update.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: 'var(--primary)' }}>{new Date(update.report_date).toLocaleDateString()}</h4>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Start Time: {update.start_time ? update.start_time.substring(0, 5) : 'N/A'}</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); openEditDailyUpdateModal(update); }} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteDailyUpdateModal({ isOpen: true, updateId: update.id }); }} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ef4444' }}>Delete</button>
                    </div>
                  )}
                </div>

                {expandedDailyUpdates[update.id] && (
                  <div style={{ animation: 'slideDown 0.2s ease-out' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>👷 Man Power</h5>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{update.manpower || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>🚜 Machines / Vehicles</h5>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{update.machines || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>🌤️ Weather</h5>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>{update.weather || 'N/A'}</p>
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>📋 Planned Task</h5>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{update.planned_tasks || 'N/A'}</p>
                      </div>
                    </div>

                    {update.notes && (
                      <div style={{ marginBottom: '1.5rem', background: 'var(--surface-2)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)' }}>📝 Notes</h5>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{update.notes}</p>
                      </div>
                    )}

                    {update.images && update.images.length > 0 && (
                      <div>
                        <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text)' }}>📸 Photos</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                          {update.images.map((img, idx) => (
                            <div key={img.id} style={{ aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                              <img 
                                src={img.image_url} 
                                alt="Daily Update" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedImage({ image: img, images: update.images, currentIndex: idx }); }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
              No daily updates found for this project.
            </div>
          )}
        </div>
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
          {selectedImage.currentIndex > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} 
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ←
            </button>
          )}

          {selectedImage.currentIndex < selectedImage.images.length - 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextImage(); }} 
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              →
            </button>
          )}

          <img 
            src={selectedImage.image.image_url} 
            alt="Fullscreen" 
            style={{ maxHeight: '85vh', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} 
            onClick={e => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
          {selectedImage.image.is_flagged && selectedImage.image.flag_reason && (
            <div style={{ marginTop: '1rem', color: '#ef4444', fontWeight: 'bold', background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              FLAGGED: {selectedImage.image.flag_reason}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: 'white', display: 'flex', alignItems: 'center', marginRight: '1rem' }}>
              {selectedImage.currentIndex + 1} / {selectedImage.images.length}
            </div>
            <a 
              href={selectedImage.image.image_url} 
              download 
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Download
            </a>
            <button 
              onClick={() => handleFlagImage(selectedImage.image.id, selectedImage.image.is_flagged)} 
              className="btn" 
              style={{ background: selectedImage.image.is_flagged ? 'var(--surface)' : '#ef4444', color: selectedImage.image.is_flagged ? 'var(--text)' : 'white' }}
            >
              {selectedImage.image.is_flagged ? 'Unflag Image' : 'Flag Issue'}
            </button>
            <button onClick={() => setSelectedImage(null)} className="btn btn-ghost" style={{ color: 'white' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {editModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{  borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Edit Upload Batch</h2>
              <button onClick={() => setEditModal({ isOpen: false, batch: null })} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleUpdateBatch} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Images Section */}
              <div>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>Manage Images</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  {editModal.batch.images?.map(img => (
                    <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={img.image_url} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Date *</label>
                  <input type="date" className="form-control" value={editFormData.work_date} onChange={e => setEditFormData({...editFormData, work_date: e.target.value})} required style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Time</label>
                  <input type="time" className="form-control" value={editFormData.work_time} onChange={e => setEditFormData({...editFormData, work_time: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Uploaded By</label>
                  <input type="text" className="form-control" value={editFormData.uploaded_by} onChange={e => setEditFormData({...editFormData, uploaded_by: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Participants</label>
                  <input type="text" className="form-control" value={editFormData.participants} onChange={e => setEditFormData({...editFormData, participants: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Phase</label>
                  <select className="form-control" value={editFormData.phase} onChange={e => setEditFormData({...editFormData, phase: e.target.value})} style={{ width: '100%' }}>
                    <option value="general">General</option>
                    <option value="before">Before</option>
                    <option value="after">After</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Table Number</label>
                  <input type="number" className="form-control" value={editFormData.table_number} onChange={e => setEditFormData({...editFormData, table_number: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Sub Section</label>
                <input type="text" className="form-control" value={editFormData.sub_section} onChange={e => setEditFormData({...editFormData, sub_section: e.target.value})} style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditModal({ isOpen: false, batch: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, batchId: null })}
        onDeleted={() => {
          setDeleteModal({ isOpen: false, batchId: null });
          fetchProject();
        }}
        endpoint={deleteModal.batchId ? `/solar/upload-batches/${deleteModal.batchId}` : null}
        itemName="Upload Batch"
      />
      
      <ConfirmDeleteModal 
        isOpen={deleteMilestoneModal.isOpen}
        onClose={() => setDeleteMilestoneModal({ isOpen: false, sectionId: null })}
        onDeleted={() => {
          setDeleteMilestoneModal({ isOpen: false, sectionId: null });
          fetchProject();
        }}
        endpoint={deleteMilestoneModal.sectionId ? `/solar/milestones/${deleteMilestoneModal.sectionId}` : null}
        itemName="Project Milestone"
      />

      <ConfirmDeleteModal 
        isOpen={deleteDailyUpdateModal.isOpen}
        onClose={() => setDeleteDailyUpdateModal({ isOpen: false, updateId: null })}
        onDeleted={() => {
          setDeleteDailyUpdateModal({ isOpen: false, updateId: null });
          fetchDailyUpdates();
        }}
        endpoint={deleteDailyUpdateModal.updateId ? `/solar/daily-updates/${deleteDailyUpdateModal.updateId}` : null}
        itemName="Daily Update"
      />

      {/* Edit Daily Update Modal */}
      {editDailyUpdateModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Daily Update</h3>
              <button onClick={() => setEditDailyUpdateModal({ isOpen: false, update: null })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateDailyUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                <button type="button" onClick={() => setEditDailyUpdateModal({ isOpen: false, update: null })} className="btn btn-ghost">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {addMilestoneModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Missing Milestone</h2>
              <button onClick={() => setAddMilestoneModal({ isOpen: false, templateId: '', insertAfterOrder: 0 })} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleAddMilestone} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select Milestone Template *</label>
                <select 
                  className="form-control" 
                  value={addMilestoneModal.templateId}
                  onChange={e => setAddMilestoneModal(prev => ({ ...prev, templateId: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Insert Position *</label>
                <select 
                  className="form-control" 
                  value={addMilestoneModal.insertAfterOrder}
                  onChange={e => setAddMilestoneModal(prev => ({ ...prev, insertAfterOrder: Number(e.target.value) }))}
                  required
                  style={{ width: '100%' }}
                >
                  <option value={0}>At the Beginning</option>
                  {project.sections?.map(s => (
                    <option key={s.id} value={s.sort_order}>After: {s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setAddMilestoneModal({ isOpen: false, templateId: '', insertAfterOrder: 0 })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag Reason Modal */}
      {flagReasonModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Flag Image</h2>
              <button onClick={() => setFlagReasonModal({ isOpen: false, imageId: null, reason: '' })} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>
            
            <form onSubmit={submitFlagReason} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Reason for flagging (optional)</label>
                <textarea 
                  className="form-control" 
                  placeholder="e.g. Blurry image, wrong angle..."
                  value={flagReasonModal.reason}
                  onChange={e => setFlagReasonModal(prev => ({ ...prev, reason: e.target.value }))}
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setFlagReasonModal({ isOpen: false, imageId: null, reason: '' })} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#ef4444', color: 'white' }} disabled={submitting}>
                  {submitting ? 'Flagging...' : 'Flag Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SolarProjectDetail;
