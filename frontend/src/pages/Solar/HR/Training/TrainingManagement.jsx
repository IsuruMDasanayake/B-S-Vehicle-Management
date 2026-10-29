import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video, Upload, Users, CheckCircle2, Clock, AlertCircle, Search,
  Trash2, Bell, Eye, Play, X, FileVideo, ShieldCheck, Filter,
  BarChart3, Loader2, Calendar, Award, MessageSquare, RefreshCw
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'General',
  'Safety & Compliance',
  'Company Policy',
  'Technical & Operations',
  'Onboarding',
  'Quality & Standards',
];

const CATEGORY_COLORS = {
  'Safety & Compliance':    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  'Company Policy':         { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'Technical & Operations': { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Onboarding':             { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' },
  'Quality & Standards':    { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  'General':                { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
};

export const TrainingManagement = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Reference data for target assignment
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Upload Modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Safety & Compliance',
    min_watch_percentage: 90,
    is_mandatory: true,
    due_date: '',
    target_type: 'all',
    department_ids: [],
    designation_ids: [],
    employee_ids: [],
  });
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [detectedDuration, setDetectedDuration] = useState(0);
  const [empSearch, setEmpSearch] = useState('');
  const fileInputRef = useRef(null);

  // Roster / Analytics Drawer state
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterFilter, setRosterFilter] = useState('all');
  const [rosterSearch, setRosterSearch] = useState('');
  const [remindingId, setRemindingId] = useState(null);

  // Video Preview Modal
  const [previewLesson, setPreviewLesson] = useState(null);

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/training/lessons');
      setSummary(res.data.summary);
      setLessons(res.data.lessons || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load training lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [deptRes, desigRes, empRes] = await Promise.allSettled([
        api.get('/hr/departments'),
        api.get('/hr/designations'),
        api.get('/hr/employees', { params: { status: 'active', per_page: 500 } }),
      ]);
      if (deptRes.status === 'fulfilled') {
        setDepartments(Array.isArray(deptRes.value.data) ? deptRes.value.data : deptRes.value.data?.data || []);
      }
      if (desigRes.status === 'fulfilled') {
        setDesignations(Array.isArray(desigRes.value.data) ? desigRes.value.data : desigRes.value.data?.data || []);
      }
      if (empRes.status === 'fulfilled') {
        const list = Array.isArray(empRes.value.data) ? empRes.value.data : empRes.value.data?.data || [];
        setEmployees(list);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchLessons();
    fetchReferenceData();
  }, [fetchLessons, fetchReferenceData]);

  // Open Roster Modal
  const openRoster = async (lessonId) => {
    setSelectedLessonId(lessonId);
    setRosterLoading(true);
    setRosterFilter('all');
    setRosterSearch('');
    try {
      const res = await api.get(`/hr/training/lessons/${lessonId}`);
      setRosterData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load lesson tracking details');
      setSelectedLessonId(null);
    } finally {
      setRosterLoading(false);
    }
  };

  // Handle video file selection & auto-detect duration
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoPreviewUrl(objUrl);
    setDetectedDuration(0);

    // Extract video duration using offscreen video element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objUrl;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && isFinite(tempVideo.duration)) {
        setDetectedDuration(Math.round(tempVideo.duration));
      }
    };
  };

  const resetUploadModal = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setDetectedDuration(0);
    setUploadProgress(0);
    setForm({
      title: '',
      description: '',
      category: 'Safety & Compliance',
      min_watch_percentage: 90,
      is_mandatory: true,
      due_date: '',
      target_type: 'all',
      department_ids: [],
      designation_ids: [],
      employee_ids: [],
    });
    setUploadOpen(false);
  };

  const toggleSelection = (field, id) => {
    setForm(prev => {
      const exists = prev[field].includes(id);
      return {
        ...prev,
        [field]: exists ? prev[field].filter(x => x !== id) : [...prev[field], id],
      };
    });
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a lesson title.');
      return;
    }
    if (!videoFile) {
      toast.error('Please select an MP4 video file to upload.');
      return;
    }
    if (form.target_type === 'department' && form.department_ids.length === 0) {
      toast.error('Select at least one department.');
      return;
    }
    if (form.target_type === 'designation' && form.designation_ids.length === 0) {
      toast.error('Select at least one designation.');
      return;
    }
    if (form.target_type === 'custom' && form.employee_ids.length === 0) {
      toast.error('Select at least one employee.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description.trim());
      fd.append('category', form.category);
      fd.append('video', videoFile);
      fd.append('duration_seconds', detectedDuration);
      fd.append('min_watch_percentage', form.min_watch_percentage);
      fd.append('is_mandatory', form.is_mandatory ? '1' : '0');
      if (form.due_date) fd.append('due_date', form.due_date);
      fd.append('target_type', form.target_type);

      if (form.target_type === 'department') {
        form.department_ids.forEach(id => fd.append('department_ids[]', id));
      } else if (form.target_type === 'designation') {
        form.designation_ids.forEach(id => fd.append('designation_ids[]', id));
      } else if (form.target_type === 'custom') {
        form.employee_ids.forEach(id => fd.append('employee_ids[]', id));
      }

      const res = await api.post('/hr/training/lessons', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });

      toast.success(res.data?.message || 'Lesson video uploaded and employees notified!');
      resetUploadModal();
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload lesson video');
    } finally {
      setUploading(false);
    }
  };

  const handleSendReminder = async (lessonId, title) => {
    setRemindingId(lessonId);
    try {
      const res = await api.post(`/hr/training/lessons/${lessonId}/remind`);
      toast.success(res.data?.message || `Reminders sent for "${title}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setRemindingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/hr/training/lessons/${deleteTarget.id}`);
      toast.success('Training lesson removed.');
      setDeleteTarget(null);
      if (selectedLessonId === deleteTarget.id) {
        setSelectedLessonId(null);
        setRosterData(null);
      }
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete lesson');
    } finally {
      setDeleting(false);
    }
  };

  const formatSecs = (secs) => {
    if (!secs || secs <= 0) return '0m 00s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  // Filtered lessons
  const filteredLessons = lessons.filter(l => {
    const matchesCat = categoryFilter === 'All' || l.category === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Filtered roster inside drawer
  const filteredRoster = (rosterData?.roster || []).filter(item => {
    const matchesStatus = rosterFilter === 'all' || item.progress.status === rosterFilter;
    const q = rosterSearch.toLowerCase();
    const emp = item.employee;
    const matchesSearch = !q ||
      emp.full_name?.toLowerCase().includes(q) ||
      emp.epf_no?.toLowerCase().includes(q) ||
      emp.employee_id?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ padding: '0.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, color: '#0f172a' }}>
                Employee Training & Video Lessons
              </h1>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Upload MP4 training lessons, enforce real watch-time verification, and audit employee acknowledgments.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={fetchLessons}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.9rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.84rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.15rem', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
          >
            <Upload size={16} /> Upload Video Lesson
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Video Lessons</span>
            <FileVideo size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
            {summary?.total_lessons ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Active published modules
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Completion Rate</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#10b981' }}>
            {summary?.overall_rate ?? 0}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            {summary?.total_completions ?? 0} verified completions
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Currently Watching</span>
            <Clock size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0284c7' }}>
            {summary?.in_progress_learners ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Employees in progress
          </div>
        </div>

        <div style={{ background: '#fff', padding: '1.15rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Watch</span>
            <AlertCircle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f59e0b' }}>
            {summary?.pending_learners ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Awaiting employee view
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', padding: '0.9rem 1.15rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES].map(cat => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#f8fafc',
                  color: active ? '#1d4ed8' : '#475569',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '250px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons..."
            style={{ width: '100%', padding: '0.45rem 0.75rem 0.45rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* ── Lessons Grid / List ────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '3rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
          <div>Loading training lessons...</div>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '3.5rem 1.5rem', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
          <Video size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            No Training Lessons Found
          </h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748b' }}>
            Upload your first MP4 training lesson to assign to employees and track their watching progress.
          </p>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            style={{ padding: '0.55rem 1.1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
          >
            + Upload First Lesson
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.15rem' }}>
          {filteredLessons.map(lesson => {
            const catMeta = CATEGORY_COLORS[lesson.category] || CATEGORY_COLORS['General'];
            const st = lesson.stats || {};

            return (
              <div
                key={lesson.id}
                style={{
                  background: '#fff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  {/* Top Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, background: catMeta.bg, color: catMeta.color, border: `1px solid ${catMeta.border}` }}>
                      {lesson.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {lesson.is_mandatory && (
                        <span style={{ padding: '0.18rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 800, background: '#fef2f2', color: '#dc2626', textTransform: 'uppercase' }}>
                          Mandatory
                        </span>
                      )}
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                        {lesson.formatted_duration}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.02rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {lesson.title}
                  </h3>
                  {lesson.description && (
                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {lesson.description}
                    </p>
                  )}

                  {/* Meta Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.74rem', color: '#475569', marginBottom: '1rem', background: '#f8fafc', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <span><strong>Pass Rule:</strong> ≥{lesson.min_watch_percentage}% watch</span>
                    <span>•</span>
                    <span><strong>Size:</strong> {lesson.formatted_size}</span>
                    {lesson.due_date && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#b45309', fontWeight: 600 }}>
                          Due: {new Date(lesson.due_date).toLocaleDateString('en-GB')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Completion Progress Bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                      <span style={{ color: '#334155' }}>
                        Employee Completion ({st.completed_count}/{st.total_assigned})
                      </span>
                      <span style={{ color: st.completion_rate >= 80 ? '#16a34a' : '#0284c7' }}>
                        {st.completion_rate}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, st.completion_rate || 0)}%`,
                          height: '100%',
                          background: st.completion_rate >= 80 ? '#10b981' : '#2563eb',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>
                      <span>✓ {st.completed_count} Watched</span>
                      <span>▶ {st.in_progress_count} Watching</span>
                      <span>⏳ {st.not_started_count} Pending</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => openRoster(lesson.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.48rem 0.75rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <BarChart3 size={15} /> Tracking & Roster
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewLesson(lesson)}
                    title="Preview video"
                    style={{ padding: '0.48rem 0.65rem', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Play size={15} />
                  </button>

                  {st.completed_count < st.total_assigned && (
                    <button
                      type="button"
                      onClick={() => handleSendReminder(lesson.id, lesson.title)}
                      disabled={remindingId === lesson.id}
                      title="Send reminder notification to pending employees"
                      style={{ padding: '0.48rem 0.65rem', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {remindingId === lesson.id ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(lesson)}
                    title="Delete lesson"
                    style={{ padding: '0.48rem 0.65rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: UPLOAD VIDEO LESSON
         ═══════════════════════════════════════════════════════════════════════ */}
      {uploadOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(3px)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
            {/* Header */}
            <div style={{ padding: '1.1rem 1.5rem', background: '#fff', borderBottom: '1px solid #e2e8f0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Upload size={19} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>Upload Training Video Lesson</h3>
              </div>
              <button
                type="button"
                onClick={resetUploadModal}
                disabled={uploading}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleUploadSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Solar Site Electrical Safety & PPE Protocol"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
                    Completion Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    style={{ width: '100%', padding: '0.52rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.3rem' }}>
                    Description / Key Learning Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide context or key points employees should pay attention to..."
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>
              </div>

              {/* Video File Picker */}
              <div style={{ marginBottom: '1.15rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                  MP4 Video File * (Direct Upload)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoSelect}
                  style={{ display: 'none' }}
                />
                {!videoFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #93c5fd', background: '#f8fafc', borderRadius: '12px', padding: '1.75rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                  >
                    <FileVideo size={32} color="#2563eb" style={{ margin: '0 auto 0.4rem auto' }} />
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1e3a8a' }}>
                      Click to select MP4 training video
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Supports MP4, WebM, MOV (Max 500MB). Duration is detected automatically.
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.75rem', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                        {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                        {detectedDuration > 0 && (
                          <span style={{ marginLeft: '0.5rem', color: '#0284c7' }}>
                            • Duration: {formatSecs(detectedDuration)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: '0.75rem', color: '#2563eb', background: 'transparent', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Change File
                      </button>
                    </div>
                    {videoPreviewUrl && (
                      <video
                        src={videoPreviewUrl}
                        controls
                        style={{ width: '100%', maxHeight: '180px', borderRadius: '8px', background: '#000' }}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Anti-Cheat & Watch Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f0f9ff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #bae6fd', marginBottom: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#0369a1', marginBottom: '0.25rem' }}>
                    Required Watch Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={form.min_watch_percentage}
                    onChange={(e) => setForm({ ...form, min_watch_percentage: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #7dd3fc', fontSize: '0.84rem', fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#0284c7' }}>
                    Forward-skipping disabled; max speed 1.25x enforced.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.is_mandatory}
                      onChange={(e) => setForm({ ...form, is_mandatory: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Mandatory Lesson for Assigned Staff
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#475569', marginTop: '0.25rem' }}>
                    Sends immediate alert notification upon upload.
                  </span>
                </div>
              </div>

              {/* Target Audience Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  Assign To Employees
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {[
                    { key: 'all', label: 'All Staff' },
                    { key: 'department', label: 'By Department' },
                    { key: 'designation', label: 'By Designation' },
                    { key: 'custom', label: 'Specific Staff' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm({ ...form, target_type: opt.key })}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: form.target_type === opt.key ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: form.target_type === opt.key ? '#eff6ff' : '#fff',
                        color: form.target_type === opt.key ? '#1d4ed8' : '#475569',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.target_type === 'department' && (
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {departments.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.department_ids.includes(d.id)}
                          onChange={() => toggleSelection('department_ids', d.id)}
                        />
                        {d.name}
                      </label>
                    ))}
                  </div>
                )}

                {form.target_type === 'designation' && (
                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    {designations.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.designation_ids.includes(d.id)}
                          onChange={() => toggleSelection('designation_ids', d.id)}
                        />
                        {d.title}
                      </label>
                    ))}
                  </div>
                )}

                {form.target_type === 'custom' && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.6rem' }}>
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      placeholder="Filter employees by name or EPF..."
                      style={{ width: '100%', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', marginBottom: '0.5rem' }}
                    />
                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                      {employees
                        .filter(e => !empSearch || e.full_name?.toLowerCase().includes(empSearch.toLowerCase()) || e.epf_no?.toLowerCase().includes(empSearch.toLowerCase()))
                        .map(e => (
                          <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={form.employee_ids.includes(e.id)}
                              onChange={() => toggleSelection('employee_ids', e.id)}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {e.full_name} {e.epf_no ? `(${e.epf_no})` : ''}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Indicator */}
              {uploading && (
                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem', color: '#1d4ed8' }}>
                    <span>Uploading video & notifying employees...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s' }} />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={resetUploadModal}
                  disabled={uploading}
                  style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Uploading...' : 'Publish & Notify Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: LESSON ANALYTICS & EMPLOYEE WATCH ROSTER
         ═══════════════════════════════════════════════════════════════════════ */}
      {selectedLessonId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(3px)', zIndex: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '1040px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            {/* Top Bar */}
            <div style={{ padding: '1.1rem 1.5rem', background: '#fff', borderBottom: '1px solid #e2e8f0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>
                  Real Watch-Time Verification Roster
                </div>
                <h3 style={{ margin: '0.15rem 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {rosterData?.lesson?.title || 'Loading Lesson...'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {rosterData && rosterData.stats?.completed_count < rosterData.stats?.total_assigned && (
                  <button
                    type="button"
                    onClick={() => handleSendReminder(rosterData.lesson.id, rosterData.lesson.title)}
                    disabled={remindingId === rosterData.lesson.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {remindingId === rosterData.lesson.id ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                    Remind Pending ({rosterData.stats.total_assigned - rosterData.stats.completed_count})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLessonId(null);
                    setRosterData(null);
                  }}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {rosterLoading || !rosterData ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#2563eb' }} />
                <div>Loading employee watch logs...</div>
              </div>
            ) : (
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                {/* Summary Strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Assigned Staff</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{rosterData.stats.total_assigned}</div>
                  </div>
                  <div style={{ background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 700 }}>Watched & Confirmed</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a' }}>
                      {rosterData.stats.completed_count} ({rosterData.stats.completion_rate}%)
                    </div>
                  </div>
                  <div style={{ background: '#f0f9ff', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 700 }}>In Progress</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>{rosterData.stats.in_progress_count}</div>
                  </div>
                  <div style={{ background: '#fffbeb', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                    <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Not Started</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#d97706' }}>{rosterData.stats.not_started_count}</div>
                  </div>
                </div>

                {/* Filter Tabs & Search */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {[
                      { key: 'all', label: 'All Staff' },
                      { key: 'completed', label: 'Completed' },
                      { key: 'in_progress', label: 'In Progress' },
                      { key: 'not_started', label: 'Not Started' },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setRosterFilter(t.key)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: rosterFilter === t.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                          background: rosterFilter === t.key ? '#eff6ff' : '#fff',
                          color: rosterFilter === t.key ? '#1d4ed8' : '#475569',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search employee or EPF..."
                    style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', minWidth: '220px' }}
                  />
                </div>

                {/* Roster Table */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#0f172a' }}>Employee</th>
                        <th style={{ padding: '0.65rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Status</th>
                        <th style={{ padding: '0.65rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>Watching Time</th>
                        <th style={{ padding: '0.65rem 0.75rem', fontWeight: 800, color: '#0f172a', width: '160px' }}>Watch Progress</th>
                        <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#0f172a' }}>Employee Reply & Confirmation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                            No matching employee records.
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map(row => {
                          const emp = row.employee;
                          const p = row.progress;
                          const isDone = p.status === 'completed';
                          const isWatching = p.status === 'in_progress';

                          return (
                            <tr key={emp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{emp.full_name}</div>
                                <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                                  {emp.epf_no || emp.employee_id || '—'} · {emp.designation || 'Staff'} {emp.department ? `(${emp.department})` : ''}
                                </div>
                              </td>

                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                <span
                                  style={{
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: isDone ? '#dcfce7' : isWatching ? '#e0f2fe' : '#f1f5f9',
                                    color: isDone ? '#15803d' : isWatching ? '#0369a1' : '#64748b',
                                  }}
                                >
                                  {isDone ? '✓ Completed' : isWatching ? '▶ Watching' : 'Not Started'}
                                </span>
                              </td>

                              <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#334155' }}>
                                {p.formatted_watch_time}
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                                  {' / '}{rosterData.lesson.formatted_duration}
                                </span>
                              </td>

                              <td style={{ padding: '0.65rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div
                                      style={{
                                        width: `${Math.min(100, p.watch_percentage)}%`,
                                        height: '100%',
                                        background: isDone ? '#10b981' : '#0284c7',
                                      }}
                                    />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '36px' }}>
                                    {p.watch_percentage}%
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                {isDone ? (
                                  <div>
                                    <div style={{ color: '#15803d', fontWeight: 700, fontSize: '0.78rem' }}>
                                      ✓ "{p.employee_reply || 'I have watched and understood this lesson.'}"
                                    </div>
                                    {p.employee_notes && (
                                      <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '0.15rem', background: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '4px', borderLeft: '2px solid #0284c7' }}>
                                        Note: {p.employee_notes}
                                      </div>
                                    )}
                                    {p.acknowledged_at && (
                                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                                        Confirmed on {new Date(p.acknowledged_at).toLocaleString('en-GB')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.76rem' }}>
                                    Awaiting completion...
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: QUICK VIDEO PREVIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {previewLesson && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', zIndex: 1450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#0f172a', borderRadius: '14px', width: '100%', maxWidth: '760px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff', borderBottom: '1px solid #1e293b' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{previewLesson.title}</span>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <video
                src={previewLesson.video_url}
                controls
                autoPlay
                style={{ width: '100%', maxHeight: '70vh', borderRadius: '8px', background: '#000' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: DELETE CONFIRMATION
         ═══════════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Delete Training Lesson?
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>"{deleteTarget.title}"</strong> and its MP4 video file? All employee watch records for this lesson will also be removed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ padding: '0.5rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {deleting ? 'Deleting...' : 'Delete Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingManagement;

