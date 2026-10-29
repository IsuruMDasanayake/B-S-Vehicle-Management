import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video, Play, Pause, CheckCircle2, Clock, Lock, Award, AlertCircle,
  Volume2, VolumeX, RotateCcw, ShieldCheck, Loader2, X, Calendar, Eye
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

export const PortalTraining = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_assigned: 0, pending_count: 0, completed_count: 0 });
  const [lessons, setLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed' | 'all'

  // Active Lesson Player Modal state
  const [activeLesson, setActiveLesson] = useState(null);

  const fetchMyLessons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/portal/training');
      setSummary(res.data.summary || { total_assigned: 0, pending_count: 0, completed_count: 0 });
      setLessons(res.data.lessons || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load training lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLessons();
  }, [fetchMyLessons]);

  const filteredLessons = lessons.filter(l => {
    if (activeTab === 'pending') return l.progress?.status !== 'completed';
    if (activeTab === 'completed') return l.progress?.status === 'completed';
    return true;
  });

  const handleLessonUpdated = (lessonId, newProgress) => {
    setLessons(prev =>
      prev.map(l => (l.id === lessonId ? { ...l, progress: { ...l.progress, ...newProgress } } : l))
    );
    setActiveLesson(prev =>
      prev && prev.id === lessonId ? { ...prev, progress: { ...prev.progress, ...newProgress } } : prev
    );
  };

  return (
    <div className="portal-page">
      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '1.35rem 1.5rem',
          color: '#0f172a',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Video size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                Training & Video Lessons
              </h1>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Watch assigned company lessons and confirm completion.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.5rem 0.9rem', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#d97706' }}>{summary.pending_count}</div>
              <div style={{ fontSize: '0.68rem', color: '#92400e', textTransform: 'uppercase', fontWeight: 700 }}>Pending</div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.5rem 0.9rem', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#16a34a' }}>{summary.completed_count}</div>
              <div style={{ fontSize: '0.68rem', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'pending', label: `Assigned / Pending (${summary.pending_count})` },
          { key: 'completed', label: `Completed (${summary.completed_count})` },
          { key: 'all', label: `All Lessons (${summary.total_assigned})` },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === tab.key ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
              background: activeTab === tab.key ? '#e0f2fe' : '#fff',
              color: activeTab === tab.key ? '#0369a1' : '#475569',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Lessons Grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#0284c7' }} />
          <div>Loading your training lessons...</div>
        </div>
      ) : filteredLessons.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem 1.5rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 0.65rem auto' }} />
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {activeTab === 'pending' ? 'You are all caught up!' : 'No lessons in this view'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
            {activeTab === 'pending'
              ? 'You have completed all assigned training lessons.'
              : 'Switch tabs to view your other training modules.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
          {filteredLessons.map(lesson => {
            const prog = lesson.progress || {};
            const isCompleted = prog.status === 'completed';
            const isInProgress = prog.status === 'in_progress';
            const pct = Math.min(100, Math.round(prog.watch_percentage || 0));

            return (
              <div
                key={lesson.id}
                style={{
                  background: '#e8e8e8ff',
                  borderRadius: '16px',
                  border: isCompleted ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  {/* Category & Status Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                      {lesson.category}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isCompleted ? '#dcfce7' : isInProgress ? '#e0f2fe' : '#fef3c7',
                        color: isCompleted ? '#15803d' : isInProgress ? '#0369a1' : '#b45309',
                      }}
                    >
                      {isCompleted ? '✓ Watched & Confirmed' : isInProgress ? `In Progress (${pct}%)` : 'Pending Watch'}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {lesson.title}
                  </h3>
                  {lesson.description && (
                    <p style={{ margin: '0 0 0.85rem', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
                      {lesson.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.75rem', color: '#475569', marginBottom: '0.9rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={13} color="#0284c7" /> Duration: <strong>{lesson.formatted_duration}</strong>
                    </span>
                    {lesson.due_date && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#b45309', fontWeight: 600 }}>
                        <Calendar size={13} /> Due: {new Date(lesson.due_date).toLocaleDateString('en-GB')}
                      </span>
                    )}
                  </div>

                  {/* Watch Progress Bar */}
                  <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                      <span style={{ color: '#475569' }}>
                        Watched: {prog.formatted_watch_time || '0m 00s'}
                      </span>
                      <span style={{ color: isCompleted ? '#16a34a' : '#0284c7' }}>
                        {pct}% (Target: {lesson.min_watch_percentage}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isCompleted ? '#10b981' : '#0284c7',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveLesson(lesson)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: isCompleted
                      ? '#f1f5f9'
                      : 'linear-gradient(135deg, #0284c7, #2563eb)',
                    color: isCompleted ? '#334155' : '#fff',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isCompleted ? 'none' : '0 4px 12px rgba(2, 132, 199, 0.25)',
                  }}
                >
                  <Play size={15} />
                  {isCompleted ? 'Re-watch Lesson' : isInProgress ? 'Resume Lesson' : 'Start Watching'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ANTI-CHEAT LESSON VIDEO PLAYER MODAL ───────────────────────────── */}
      {activeLesson && (
        <AntiCheatLessonPlayerModal
          lesson={activeLesson}
          onClose={() => {
            setActiveLesson(null);
            fetchMyLessons();
          }}
          onProgressUpdated={(newProg) => handleLessonUpdated(activeLesson.id, newProg)}
        />
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  Dedicated Anti-Cheat Video Player Component
// ═════════════════════════════════════════════════════════════════════════════
const AntiCheatLessonPlayerModal = ({ lesson, onClose, onProgressUpdated }) => {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);

  const initProg = lesson.progress || {};
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(initProg.last_position_seconds || 0);
  const [duration, setDuration] = useState(lesson.duration_seconds || 0);
  const [maxAllowedTime, setMaxAllowedTime] = useState(initProg.max_position_seconds || 0);
  const [secondsWatched, setSecondsWatched] = useState(initProg.seconds_watched || 0);
  const [watchPercentage, setWatchPercentage] = useState(initProg.watch_percentage || 0);
  const [isCompleted, setIsCompleted] = useState(initProg.status === 'completed');
  const [tabPausedNotice, setTabPausedNotice] = useState(false);

  // Confirmation form state
  const [acknowledged, setAcknowledged] = useState(initProg.status === 'completed');
  const [employeeNotes, setEmployeeNotes] = useState(initProg.employee_notes || '');
  const [submitting, setSubmitting] = useState(false);

  // Refs for accurate tracking inside intervals & event listeners
  const maxAllowedRef = useRef(initProg.max_position_seconds || 0);
  const secondsWatchedRef = useRef(initProg.seconds_watched || 0);
  const durationRef = useRef(lesson.duration_seconds || 0);
  const lastTimeUpdateRef = useRef(initProg.last_position_seconds || 0);
  const unsavedIncrementRef = useRef(0);
  const lastSkipToastRef = useRef(0);
  const isCompletedRef = useRef(initProg.status === 'completed');
  const onProgressUpdatedRef = useRef(onProgressUpdated);

  useEffect(() => {
    onProgressUpdatedRef.current = onProgressUpdated;
  }, [onProgressUpdated]);

  const requiredPct = lesson.min_watch_percentage || 90;
  const canComplete = isCompleted || watchPercentage >= Math.max(50, requiredPct - 2);

  const syncProgressToServer = useCallback(async (forceIncrement = null, overrideTime = null, overrideDuration = null) => {
    const vid = videoRef.current;
    const cur = overrideTime !== null ? overrideTime : (vid ? vid.currentTime : lastTimeUpdateRef.current);
    const dur = overrideDuration !== null
      ? overrideDuration
      : (vid && vid.duration && isFinite(vid.duration) ? vid.duration : durationRef.current);
    const inc = forceIncrement !== null ? forceIncrement : Math.round(unsavedIncrementRef.current);

    if (inc <= 0 && cur <= 0) return;
    unsavedIncrementRef.current = 0;

    try {
      const res = await api.post(`/hr/portal/training/${lesson.id}/progress`, {
        current_time: cur,
        duration: dur,
        seconds_increment: Math.max(0, inc),
      });
      if (res.data?.progress) {
        const p = res.data.progress;
        const nextWatched = Math.max(secondsWatchedRef.current, p.seconds_watched || 0);
        secondsWatchedRef.current = nextWatched;
        setSecondsWatched(Math.round(nextWatched));

        setWatchPercentage(prevPct => Math.max(prevPct, p.watch_percentage || 0));

        if (p.max_position_seconds > maxAllowedRef.current) {
          maxAllowedRef.current = p.max_position_seconds;
          setMaxAllowedTime(p.max_position_seconds);
        }
        if (onProgressUpdatedRef.current) {
          onProgressUpdatedRef.current(p);
        }
      }
    } catch {
      // restore unsaved increment for next retry
      unsavedIncrementRef.current += inc;
    }
  }, [lesson.id]);

  // 1. Tab Visibility & Window Blur Anti-Cheat Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
        setTabPausedNotice(true);
        syncProgressToServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncProgressToServer]);

  // 2. Active Playback 1-Second Heartbeat Timer (stable dependencies so interval never resets on timeupdate)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      if (document.hidden || !videoRef.current || videoRef.current.paused) return;

      if (unsavedIncrementRef.current >= 5) {
        syncProgressToServer();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, syncProgressToServer]);

  // 3. Video Metadata Loaded: Resume from last saved position
  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.duration && isFinite(vid.duration)) {
      const roundedDur = Math.round(vid.duration);
      durationRef.current = roundedDur;
      setDuration(roundedDur);
    }
    if (initProg.last_position_seconds > 0 && initProg.last_position_seconds < vid.duration - 2) {
      vid.currentTime = initProg.last_position_seconds;
      lastTimeUpdateRef.current = initProg.last_position_seconds;
      setCurrentTime(initProg.last_position_seconds);
    }
  };

  // 4. Strict Anti-Skip / Forward-Scrubbing Guard + Continuous Watch Time Tracking
  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;

    const now = vid.currentTime;
    const dur = vid.duration && isFinite(vid.duration) ? vid.duration : durationRef.current;
    if (dur > 0 && durationRef.current !== Math.round(dur)) {
      durationRef.current = Math.round(dur);
      setDuration(Math.round(dur));
    }

    // If not already completed, prevent jumping ahead of maxAllowedRef + 1.8s
    if (!isCompletedRef.current && now > maxAllowedRef.current + 1.8) {
      vid.currentTime = maxAllowedRef.current;
      lastTimeUpdateRef.current = maxAllowedRef.current;
      setCurrentTime(maxAllowedRef.current);

      const nowMs = Date.now();
      if (nowMs - lastSkipToastRef.current > 3500) {
        lastSkipToastRef.current = nowMs;
        toast.error('Fast-forwarding is disabled. Please watch the lesson in sequence.');
      }
      return;
    }

    // Measure continuous playback delta
    const delta = now - lastTimeUpdateRef.current;
    lastTimeUpdateRef.current = now;

    if (now > maxAllowedRef.current) {
      maxAllowedRef.current = now;
      setMaxAllowedTime(now);
    }

    if (delta > 0 && delta <= 2.5) {
      unsavedIncrementRef.current += delta;
      const nextWatched = Math.min(
        dur || 99999,
        Math.max(secondsWatchedRef.current + delta, maxAllowedRef.current)
      );
      secondsWatchedRef.current = nextWatched;
      setSecondsWatched(Math.round(nextWatched));

      if (dur > 0) {
        const pct = Math.min(100, Math.round((nextWatched / dur) * 1000) / 10);
        setWatchPercentage(prev => Math.max(prev, pct));
      }

      if (unsavedIncrementRef.current >= 5) {
        syncProgressToServer();
      }
    }

    setCurrentTime(now);
  };

  const handleSeeking = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (!isCompletedRef.current && vid.currentTime > maxAllowedRef.current + 1.8) {
      vid.currentTime = maxAllowedRef.current;
      setCurrentTime(maxAllowedRef.current);
    }
  };

  // 5. Enforce Max Playback Speed (1.25x max)
  const handleRateChange = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.playbackRate > 1.25) {
      vid.playbackRate = 1.25;
      setPlaybackSpeed(1.25);
      toast.error('Maximum allowed playback speed is 1.25x.');
    }
  };

  const changeSpeed = (speed) => {
    const clamped = Math.min(1.25, Math.max(0.75, speed));
    setPlaybackSpeed(clamped);
    if (videoRef.current) {
      videoRef.current.playbackRate = clamped;
    }
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setTabPausedNotice(false);
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
      syncProgressToServer();
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleRewind10s = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const target = Math.max(0, vid.currentTime - 10);
    vid.currentTime = target;
    lastTimeUpdateRef.current = target;
    setCurrentTime(target);
  };

  // Custom timeline click (only allows seeking up to maxAllowedRef)
  const handleTimelineClick = (e) => {
    const bar = progressBarRef.current;
    const vid = videoRef.current;
    if (!bar || !vid || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = clickRatio * duration;

    if (!isCompletedRef.current && targetTime > maxAllowedRef.current) {
      toast.error('You can only seek within the portion of the video you have already watched.');
      vid.currentTime = maxAllowedRef.current;
      lastTimeUpdateRef.current = maxAllowedRef.current;
      setCurrentTime(maxAllowedRef.current);
    } else {
      vid.currentTime = targetTime;
      lastTimeUpdateRef.current = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    const vid = videoRef.current;
    const dur = (vid && vid.duration && isFinite(vid.duration)) ? Math.round(vid.duration) : durationRef.current;
    if (dur > 0) {
      maxAllowedRef.current = dur;
      setMaxAllowedTime(dur);
      secondsWatchedRef.current = Math.max(secondsWatchedRef.current, dur);
      setSecondsWatched(dur);
      setWatchPercentage(100);
      const pendingInc = Math.max(1, Math.round(unsavedIncrementRef.current), dur);
      unsavedIncrementRef.current = 0;
      syncProgressToServer(pendingInc, dur, dur);
    } else {
      syncProgressToServer();
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!acknowledged) {
      toast.error('Please check "I have watched and understood this lesson" to confirm.');
      return;
    }

    setSubmitting(true);
    try {
      await syncProgressToServer();
      const res = await api.post(`/hr/portal/training/${lesson.id}/complete`, {
        acknowledged: true,
        employee_notes: employeeNotes.trim() || null,
      });

      toast.success(res.data?.message || 'Lesson confirmed as watched!');
      setIsCompleted(true);
      isCompletedRef.current = true;
      setWatchPercentage(100);
      if (res.data?.progress) {
        onProgressUpdated(res.data.progress);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  const formatClock = (secs) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const currentPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const maxAllowedPct = duration > 0 ? Math.min(100, (maxAllowedTime / duration) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '880px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.45)' }}>
        {/* ── Modal Header ── */}
        <div style={{ padding: '1rem 1.35rem', background: '#fff', borderBottom: '1px solid #e2e8f0', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                {lesson.category}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                • Pass Threshold: {requiredPct}% Watch Time
              </span>
            </div>
            <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {lesson.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              syncProgressToServer();
              onClose();
            }}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.45rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>
          {/* Tab Pause Warning */}
          {tabPausedNotice && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '0.65rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              Playback automatically paused because you switched tabs or left the window. Click Play to continue watching.
            </div>
          )}

          {/* ── Video Player Container ── */}
          <div style={{ background: '#000', borderRadius: '14px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #1e293b' }}>
            <div style={{ position: 'relative' }}>
              <video
                ref={videoRef}
                src={lesson.video_url}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onSeeking={handleSeeking}
                onRateChange={handleRateChange}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleVideoEnded}
                onClick={togglePlay}
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                onContextMenu={(e) => e.preventDefault()}
                style={{ width: '100%', maxHeight: '440px', display: 'block', cursor: 'pointer' }}
              />
            </div>

            {/* ── Custom Anti-Skip Player Controls ── */}
            <div style={{ background: '#0f172a', padding: '0.75rem 1rem', color: '#fff' }}>
              {/* Restricted Timeline Scrub Bar */}
              <div
                ref={progressBarRef}
                onClick={handleTimelineClick}
                title="Fast-forwarding ahead of watched progress is disabled"
                style={{ position: 'relative', height: '9px', background: '#334155', borderRadius: '999px', cursor: 'pointer', marginBottom: '0.75rem', overflow: 'hidden' }}
              >
                {/* Max Watched Buffer Zone */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${maxAllowedPct}%`,
                    background: 'rgba(56, 189, 248, 0.35)',
                  }}
                />
                {/* Current Playback Position */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${currentPct}%`,
                    background: isCompleted ? '#10b981' : '#38bdf8',
                  }}
                />
              </div>

              {/* Control Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={togglePlay}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#2563eb', color: '#fff', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>

                  <button
                    type="button"
                    onClick={handleRewind10s}
                    title="Rewind 10 seconds"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '0.4rem 0.65rem', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <RotateCcw size={14} /> -10s
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', marginLeft: '0.25rem' }}>
                    {formatClock(currentTime)} / {formatClock(duration)}
                  </span>
                </div>

                {/* Speed Cap Selector (1.0x and 1.25x max) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Speed (Max 1.25x):</span>
                  {[1.0, 1.25].map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => changeSpeed(spd)}
                      style={{
                        padding: '0.25rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: playbackSpeed === spd ? '1px solid #38bdf8' : '1px solid #334155',
                        background: playbackSpeed === spd ? 'rgba(56,189,248,0.2)' : '#1e293b',
                        color: playbackSpeed === spd ? '#38bdf8' : '#94a3b8',
                      }}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Live Watch-Time Verification Bar ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.15rem' }}>
            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Verified Watch Time</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginTop: '0.15rem' }}>
                {formatClock(secondsWatched)} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>/ {formatClock(duration)}</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Completion Progress</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, watchPercentage)}%`, height: '100%', background: canComplete ? '#10b981' : '#0284c7' }} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: canComplete ? '#16a34a' : '#0284c7' }}>
                  {Math.round(watchPercentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* ── Employee Completion & Acknowledgment Gate ── */}
          {!canComplete ? (
            <div style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '14px', padding: '1.25rem', textAlign: 'center', color: '#475569' }}>
              <Lock size={24} color="#64748b" style={{ margin: '0 auto 0.4rem auto' }} />
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                Completion Confirmation Locked
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Watch at least <strong>{requiredPct}%</strong> of this lesson ({Math.max(0, Math.round(requiredPct - watchPercentage))}% remaining) to unlock the confirmation sign-off. Fast-forwarding is disabled.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleCompleteSubmit}
              style={{
                background: isCompleted ? '#f0fdf4' : '#eff6ff',
                border: isCompleted ? '1.5px solid #86efac' : '1.5px solid #93c5fd',
                borderRadius: '14px',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} color={isCompleted ? '#16a34a' : '#2563eb'} />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {isCompleted ? 'Lesson Completed & Acknowledged' : 'Confirm Lesson Completion'}
                </h4>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: '#fff',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  cursor: isCompleted ? 'default' : 'pointer',
                  marginBottom: '0.85rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={acknowledged}
                  disabled={isCompleted}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                />
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                  I have watched and understood this lesson.
                </span>
              </label>

              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Key Takeaways / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={employeeNotes}
                  disabled={isCompleted}
                  onChange={(e) => setEmployeeNotes(e.target.value)}
                  placeholder="Add any feedback, questions, or notes for HR..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', background: '#fff' }}
                />
              </div>

              {!isCompleted ? (
                <button
                  type="submit"
                  disabled={submitting || !acknowledged}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: acknowledged ? '#16a34a' : '#94a3b8',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: acknowledged ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? 'Submitting...' : 'Submit Confirmation'}
                </button>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, textAlign: 'center' }}>
                  ✓ Your watch time and confirmation have been recorded in HR records.
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalTraining;

