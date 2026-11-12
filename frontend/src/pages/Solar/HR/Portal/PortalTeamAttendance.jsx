import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Calendar, Clock, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Download, FileSpreadsheet, Eye, X, CheckCircle2, AlertCircle, AlertTriangle,
  Building2, MapPin, Loader2, ArrowUpRight, Check, FileText
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  present:     { label: 'Present',            code: 'P',   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  late:        { label: 'Late',               code: 'L',   color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  short_leave: { label: 'Short Leave',        code: 'SL',  color: '#0891b2', bg: '#cffafe', border: '#67e8f9' },
  half_day:    { label: 'Half Day',           code: 'H',   color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  leave:       { label: 'Leave',              code: 'LV',  color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  absent:      { label: 'Absent',             code: 'A',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  missing:     { label: 'Missing Clock-Out',  code: 'M',   color: '#e11d48', bg: '#ffe4e6', border: '#fda4af' },
};

const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return timeStr;
  }
};

const formatHours = (decimal) => {
  if (decimal === null || decimal === undefined || decimal === '') return '—';
  const num = parseFloat(decimal);
  if (isNaN(num)) return '—';
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  return `${h}h ${m > 0 ? `${m}m` : '00m'}`;
};

export const PortalTeamAttendance = () => {
  // Mode: 'daily' | 'monthly'
  const [viewMode, setViewMode] = useState('daily');

  // Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [departments, setDepartments] = useState([]);
  const [dailyEmployees, setDailyEmployees] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Employee History Modal
  const [historyModal, setHistoryModal] = useState({ open: false, employee: null, logs: [], loading: false, month: currentMonthStr });
  const [downloadingTimesheet, setDownloadingTimesheet] = useState(false);

  // Fetch departments
  useEffect(() => {
    api.get('/hr/departments')
      .then(res => setDepartments(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch Daily Attendance
  const fetchDailyData = useCallback(async () => {
    setDailyLoading(true);
    try {
      const params = { date: selectedDate };
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/hr/attendance', { params });
      setDailyEmployees(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load daily attendance');
    } finally {
      setDailyLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, deptFilter]);

  // Fetch Monthly Report
  const fetchMonthlyData = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const params = { month: selectedMonth };
      if (deptFilter) params.department_id = deptFilter;
      const res = await api.get('/hr/attendance/report', { params });
      setMonthlyReport(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load monthly attendance report');
    } finally {
      setMonthlyLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, deptFilter]);

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchDailyData();
    } else {
      fetchMonthlyData();
    }
  }, [viewMode, fetchDailyData, fetchMonthlyData]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (viewMode === 'daily') fetchDailyData();
    else fetchMonthlyData();
  };

  // Date steppers
  const stepDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const stepMonth = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newY = d.getFullYear();
    const newM = String(d.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${newY}-${newM}`);
  };

  // Daily Totals & Filtered List
  const dailyTotals = useMemo(() => {
    return dailyEmployees.reduce((acc, emp) => {
      const att = emp.attendances?.[0];
      const status = att?.status || 'absent';
      acc[status] = (acc[status] || 0) + 1;
      acc.total++;
      return acc;
    }, { total: 0, present: 0, late: 0, short_leave: 0, half_day: 0, leave: 0, absent: 0, missing: 0 });
  }, [dailyEmployees]);

  const filteredDailyEmployees = useMemo(() => {
    return dailyEmployees.filter(emp => {
      const att = emp.attendances?.[0];
      const status = att?.status || 'absent';

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (emp.full_name || '').toLowerCase();
        const epf = (emp.epf_no || emp.employee_id || '').toLowerCase();
        const desig = (emp.designation?.title || emp.designation?.name || '').toLowerCase();
        const dept = (emp.department?.name || '').toLowerCase();
        return name.includes(q) || epf.includes(q) || desig.includes(q) || dept.includes(q);
      }

      return true;
    });
  }, [dailyEmployees, statusFilter, searchQuery]);

  // Monthly Filtered List
  const filteredMonthlyReport = useMemo(() => {
    return monthlyReport.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.name || '').toLowerCase();
        const epf = (item.employee_id || '').toLowerCase();
        const dept = (item.department || '').toLowerCase();
        return name.includes(q) || epf.includes(q) || dept.includes(q);
      }
      return true;
    });
  }, [monthlyReport, searchQuery]);

  // Monthly Aggregate Totals
  const monthlyTotals = useMemo(() => {
    const totalEmps = monthlyReport.length;
    const workingDays = monthlyReport[0]?.working_days || 0;
    const totalPresent = monthlyReport.reduce((s, r) => s + (r.present || 0), 0);
    const totalLate = monthlyReport.reduce((s, r) => s + (r.late || 0), 0);
    const totalShortLeave = monthlyReport.reduce((s, r) => s + (r.short_leave || 0), 0);
    const totalLeaves = monthlyReport.reduce((s, r) => s + (r.leave || 0), 0);
    const totalAbsents = monthlyReport.reduce((s, r) => s + (r.absent || 0), 0);
    const avgRate = totalEmps > 0
      ? Math.round(monthlyReport.reduce((s, r) => s + (parseFloat(r.attendance_rate) || 0), 0) / totalEmps * 10) / 10
      : 0;

    return { totalEmps, workingDays, totalPresent, totalLate, totalShortLeave, totalLeaves, totalAbsents, avgRate };
  }, [monthlyReport]);

  // Open Employee History Modal
  const openEmployeeHistory = async (emp) => {
    setHistoryModal({ open: true, employee: emp, logs: [], loading: true, month: viewMode === 'monthly' ? selectedMonth : currentMonthStr });
    try {
      const res = await api.get(`/hr/attendance/employee/${emp.id}/history`, {
        params: { month: viewMode === 'monthly' ? selectedMonth : currentMonthStr }
      });
      setHistoryModal(prev => ({ ...prev, logs: res.data || [], loading: false }));
    } catch (err) {
      toast.error('Failed to load employee attendance records');
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const changeHistoryMonth = async (delta) => {
    const [y, m] = historyModal.month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setHistoryModal(prev => ({ ...prev, month: newMonth, loading: true }));
    try {
      const res = await api.get(`/hr/attendance/employee/${historyModal.employee.id}/history`, {
        params: { month: newMonth }
      });
      setHistoryModal(prev => ({ ...prev, logs: res.data || [], loading: false }));
    } catch {
      setHistoryModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDownloadTimesheet = async (format = 'pdf') => {
    if (!historyModal.employee) return;
    setDownloadingTimesheet(true);
    try {
      const res = await api.get('/hr/attendance/my-report/download', {
        params: { employee_id: historyModal.employee.id, month: historyModal.month, format },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const cleanName = (historyModal.employee.full_name || 'employee').replace(/\s+/g, '_');
      link.setAttribute('download', `timesheet_${cleanName}_${historyModal.month}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Timesheet downloaded (${format.toUpperCase()})`);
    } catch (err) {
      toast.error('Failed to download employee timesheet');
    } finally {
      setDownloadingTimesheet(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* ── Top Bar: Title & View Mode Switcher ─────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </span>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--dark, #0f172a)' }}>
              All Employees Attendance
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.82rem', margin: 0 }}>
            Live daily clock-in records, status tracking, and monthly attendance reports across all company employees.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {/* Mode Segmented Controls */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'daily' ? '#fff' : 'transparent',
                color: viewMode === 'daily' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'daily' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Calendar size={14} /> Daily Log
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'monthly' ? '#fff' : 'transparent',
                color: viewMode === 'monthly' ? '#0284c7' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <FileSpreadsheet size={14} /> Monthly Summary
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-sm"
            title="Refresh Attendance Data"
            style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '0.45rem', borderRadius: '8px', color: '#64748b', cursor: 'pointer', display: 'flex' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Date / Month Controls & Filters ─────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Date / Month Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {viewMode === 'daily' ? (
              <>
                <button
                  type="button"
                  onClick={() => stepDate(-1)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '0.35rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                />
                <button
                  type="button"
                  onClick={() => stepDate(1)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}
                >
                  <ChevronRight size={16} />
                </button>
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    style={{ background: '#e0f2fe', border: 'none', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Today
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => stepMonth(-1)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ padding: '0.35rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}
                />
                <button
                  type="button"
                  onClick={() => stepMonth(1)}
                  style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' }}
                >
                  <ChevronRight size={16} />
                </button>
                {selectedMonth !== currentMonthStr && (
                  <button
                    type="button"
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    style={{ background: '#e0f2fe', border: 'none', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.35rem 0.65rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Current Month
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right: Search & Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative', minWidth: '220px', maxWidth: '320px', flex: 1 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, EPF, designation..."
                style={{ width: '100%', padding: '0.4rem 0.65rem 0.4rem 2rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ padding: '0.4rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, background: '#fff', color: '#334155' }}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Pills for Daily View */}
        {viewMode === 'daily' && (
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.85rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
            {[
              { key: 'all',         label: `All (${dailyTotals.total})` },
              { key: 'present',     label: `Present (${dailyTotals.present})`, color: '#16a34a' },
              { key: 'late',        label: `Late (${dailyTotals.late})`, color: '#d97706' },
              { key: 'short_leave', label: `Short Leave (${dailyTotals.short_leave})`, color: '#0891b2' },
              { key: 'half_day',    label: `Half Day (${dailyTotals.half_day})`, color: '#7c3aed' },
              { key: 'leave',       label: `Leave (${dailyTotals.leave})`, color: '#2563eb' },
              { key: 'absent',      label: `Absent (${dailyTotals.absent})`, color: '#dc2626' },
              { key: 'missing',     label: `Missing Clock-Out (${dailyTotals.missing})`, color: '#e11d48' },
            ].map(f => {
              const active = statusFilter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setStatusFilter(f.key)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: active ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                    background: active ? '#e0f2fe' : '#f8fafc',
                    color: active ? '#0369a1' : (f.color || '#64748b'),
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── VIEW 1: DAILY ATTENDANCE TABLE ─────────────────────────────────── */}
      {viewMode === 'daily' && (
        <>
          {dailyLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '0.6rem', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" color="#0284c7" />
              <span>Loading employees attendance for {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}...</span>
            </div>
          ) : filteredDailyEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No Attendance Records Found</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.35rem 0 0' }}>
                No active employee matches the current department or status filters for this date.
              </p>
            </div>
          ) : (
            <div className="portal-table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, width: '28%' }}>Employee</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'left', fontWeight: 800, width: '18%' }}>Department</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '12%' }}>Clock In</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '12%' }}>Clock Out</th>
                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, width: '10%' }}>Working Hours</th>
                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, width: '12%' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', fontWeight: 800, width: '8%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDailyEmployees.map((emp, idx) => {
                    const att = emp.attendances?.[0];
                    const status = att?.status || 'absent';
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent;
                    const isClockedIn = Boolean(att?.clock_in_time);
                    const isClockedOut = Boolean(att?.clock_out_time);
                    const isToday = selectedDate === todayStr;

                    const photoUrl = emp.photo_url || emp.avatar || null;
                    const initial = (emp.full_name || 'U').charAt(0).toUpperCase();

                    return (
                      <tr
                        key={emp.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafafa',
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {/* 1. Employee Info */}
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={emp.full_name}
                                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #cbd5e1' }}
                              />
                            ) : (
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {initial}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                                {emp.full_name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                <span style={{ fontWeight: 600, color: '#0284c7' }}>{emp.epf_no || emp.employee_id}</span>
                                {emp.designation?.title ? ` · ${emp.designation.title}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Department */}
                        <td style={{ padding: '0.65rem 0.85rem', color: '#334155', fontWeight: 500, fontSize: '0.8rem' }}>
                          {emp.department?.name || '—'}
                        </td>

                        {/* 3. Clock In */}
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isClockedIn ? (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {formatTime(att.clock_in_time)}
                              </div>
                              {status === 'late' && (
                                <span style={{ display: 'inline-block', fontSize: '0.64rem', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '0.05rem 0.35rem', borderRadius: '4px', marginTop: '0.1rem' }}>
                                  Late
                                </span>
                              )}
                              {att.clock_in_location?.name && (
                                <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginTop: '0.1rem' }}>
                                  <MapPin size={9} /> {att.clock_in_location.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* 4. Clock Out */}
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          {isClockedOut ? (
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {formatTime(att.clock_out_time)}
                            </div>
                          ) : isClockedIn ? (
                            isToday ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7', animation: 'pulse 2s infinite' }} />
                                Active Now
                              </span>
                            ) : (
                              <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 700, color: '#e11d48', background: '#ffe4e6', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                                Not Clocked Out
                              </span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* 5. Working Hours */}
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', fontWeight: 700, color: att?.working_hours ? '#0f172a' : '#94a3b8' }}>
                          {formatHours(att?.working_hours)}
                        </td>

                        {/* 6. Status Badge */}
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: cfg.color,
                              background: cfg.bg,
                              border: `1px solid ${cfg.border}`,
                            }}
                          >
                            <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: cfg.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>
                              {cfg.code}
                            </span>
                            {cfg.label}
                          </span>
                        </td>

                        {/* 7. Action Button */}
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => openEmployeeHistory(emp)}
                            title="View Employee Monthly History"
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#0284c7',
                              padding: '0.25rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Eye size={13} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── VIEW 2: MONTHLY REPORT TABLE ──────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <>
          {/* Monthly KPI Stats Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Active Employees</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{monthlyTotals.totalEmps}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Working Days</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284c7' }}>{monthlyTotals.workingDays}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Avg Attendance Rate</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: monthlyTotals.avgRate >= 90 ? '#16a34a' : '#d97706' }}>
                {monthlyTotals.avgRate}%
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Late Events</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706' }}>{monthlyTotals.totalLate}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Short Leaves</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0891b2' }}>{monthlyTotals.totalShortLeave}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Full Leaves</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{monthlyTotals.totalLeaves}</div>
            </div>
          </div>

          {monthlyLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '0.6rem', color: '#64748b' }}>
              <Loader2 size={24} className="animate-spin" color="#0284c7" />
              <span>Loading monthly attendance report for {selectedMonth}...</span>
            </div>
          ) : filteredMonthlyReport.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No Monthly Data Available</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.35rem 0 0' }}>
                No active employee records for {selectedMonth}.
              </p>
            </div>
          ) : (
            <div className="portal-table-scroll" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <table style={{ width: '100%', minWidth: '920px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 800, width: '24%' }}>Employee</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', fontWeight: 800, width: '16%' }}>Department</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '7%' }}>Work Days</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#16a34a' }}>Present</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#d97706' }}>Late</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#0891b2' }}>Short Lv</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#7c3aed' }}>Half Day</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#2563eb' }}>Leave</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 800, width: '6%', color: '#dc2626' }}>Absent</th>
                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, width: '8%' }}>Total Hrs</th>
                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, width: '9%' }}>Rate %</th>
                    <th style={{ padding: '0.75rem 0.65rem', textAlign: 'center', fontWeight: 800, width: '6%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMonthlyReport.map((row, idx) => {
                    const rate = parseFloat(row.attendance_rate) || 0;
                    const rateColor = rate >= 90 ? '#16a34a' : rate >= 80 ? '#d97706' : '#dc2626';

                    return (
                      <tr
                        key={row.employee_id || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafafa',
                        }}
                      >
                        {/* Employee */}
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>{row.employee_id}</div>
                        </td>

                        {/* Department */}
                        <td style={{ padding: '0.65rem 0.75rem', color: '#334155', fontWeight: 500 }}>
                          {row.department || '—'}
                        </td>

                        {/* Working Days */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                          {row.working_days}
                        </td>

                        {/* Present */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
                          {row.present}
                        </td>

                        {/* Late */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: row.late > 0 ? '#d97706' : '#94a3b8' }}>
                          {row.late}
                        </td>

                        {/* Short Leave */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: row.short_leave > 0 ? '#0891b2' : '#94a3b8' }}>
                          {row.short_leave}
                        </td>

                        {/* Half Day */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: row.half_day > 0 ? '#7c3aed' : '#94a3b8' }}>
                          {row.half_day}
                        </td>

                        {/* Leave */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: row.leave > 0 ? '#2563eb' : '#94a3b8' }}>
                          {row.leave}
                        </td>

                        {/* Absent */}
                        <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 800, color: row.absent > 0 ? '#dc2626' : '#94a3b8' }}>
                          {row.absent}
                        </td>

                        {/* Total Hours */}
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                          {row.total_working_hours ? `${row.total_working_hours}h` : '0h'}
                        </td>

                        {/* Rate % */}
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, color: rateColor, fontSize: '0.84rem' }}>
                            {row.attendance_rate}%
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: '0.65rem 0.65rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              // Match employee id from list
                              const matchEmp = dailyEmployees.find(e => e.epf_no === row.employee_id || e.employee_id === row.employee_id);
                              if (matchEmp) {
                                openEmployeeHistory(matchEmp);
                              } else {
                                toast.error('Employee profile not found in active list');
                              }
                            }}
                            title="Inspect Log"
                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0284c7', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MODAL: EMPLOYEE MONTHLY ATTENDANCE HISTORY & TIMESHEET ────────── */}
      {historyModal.open && historyModal.employee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '820px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.25rem', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Clock size={20} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                    {historyModal.employee.full_name} · Monthly Attendance
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    {historyModal.employee.epf_no || historyModal.employee.employee_id} · {historyModal.employee.department?.name || 'Department'} · {historyModal.employee.designation?.title || ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadTimesheet('pdf')}
                  disabled={downloadingTimesheet}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0284c7', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTimesheet('csv')}
                  disabled={downloadingTimesheet}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#059669', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Download size={13} /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryModal({ open: false, employee: null, logs: [], loading: false, month: currentMonthStr })}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', padding: '0.35rem', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Month Navigator Subheader */}
            <div style={{ padding: '0.65rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => changeHistoryMonth(-1)}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                  {new Date(historyModal.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => changeHistoryMonth(1)}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '0.2rem 0.4rem', cursor: 'pointer' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Total Records: <strong>{historyModal.logs.length}</strong>
              </div>
            </div>

            {/* Modal Body / Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {historyModal.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '0.5rem', color: '#64748b' }}>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Loading history logs...</span>
                </div>
              ) : historyModal.logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                  <AlertCircle size={28} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No attendance records found for this month.</p>
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Date</th>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>Clock In</th>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>Clock Out</th>
                        <th style={{ padding: '0.55rem 0.65rem', textAlign: 'center', fontWeight: 800 }}>Hours</th>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'center', fontWeight: 800 }}>Status</th>
                        <th style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 800 }}>Notes / Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyModal.logs.map((log, idx) => {
                        const status = log.status || 'absent';
                        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.absent;
                        const dateFormatted = new Date(log.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

                        return (
                          <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>
                              {dateFormatted}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                              {formatTime(log.clock_in_time)}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>
                              {formatTime(log.clock_out_time)}
                            </td>
                            <td style={{ padding: '0.5rem 0.65rem', textAlign: 'center', fontWeight: 700 }}>
                              {formatHours(log.working_hours)}
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  color: cfg.color,
                                  background: cfg.bg,
                                  border: `1px solid ${cfg.border}`,
                                }}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.74rem', color: '#64748b' }}>
                              {log.notes || log.clock_in_location?.name || log.clock_out_location?.name || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setHistoryModal({ open: false, employee: null, logs: [], loading: false, month: currentMonthStr })}
                className="btn btn-sm"
                style={{ padding: '0.4rem 1.1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalTeamAttendance;

