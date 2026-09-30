import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Eye, Trash2 } from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active:     { bg: 'rgba(34,197,94,0.12)',   color: '#16a34a' },
  probation:  { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  on_leave:   { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  resigned:   { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  terminated: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
};

const STATUS_LABELS = {
  active: 'Active', probation: 'Probation', on_leave: 'On Leave',
  resigned: 'Resigned', terminated: 'Terminated',
};

const EmployeesList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = useAuthStore(state => state.user);
  const isSuperAdmin = user?.role === 'super_admin' || user?.roles?.some(r => r.name === 'super_admin');

  useEffect(() => {
    Promise.all([
      api.get('/hr/employees'),
      api.get('/hr/departments'),
    ]).then(([empRes, deptRes]) => {
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
    }).catch(err => {
      toast.error('Failed to load employees');
      console.error(err);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e => {
    const matchSearch = !search ||
      e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      e.company_email?.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || e.department?.id === parseInt(deptFilter);
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const initials = (name) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const avatarColor = (id) => ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'][id % 7];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>
      Loading employees...
    </div>
  );

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await api.delete(`/hr/employees/${deleteConfirm.id}`);
      toast.success('Employee deleted successfully');
      setEmployees(employees.filter(e => e.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>Employees</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{filtered.length} of {employees.length} employees</p>
        </div>
        <button
          onClick={() => navigate('/solar/hr/admin/employees/new')}
          className="btn btn-primary"
          style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ color: 'var(--text-muted)', marginRight: '0.5rem', flexShrink: 0 }} />
            <input
              type="text" placeholder="Search name, ID, email..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
            />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '180px' }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-control" style={{ width: 'auto', minWidth: '140px' }}>
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-2)', background: 'var(--surface)' }}>
                {['Employee', 'Department', 'Designation', 'Type', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</td></tr>
              ) : filtered.map(emp => {
                const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.active;
                return (
                  <tr key={emp.id}
                    style={{ borderBottom: '1px solid var(--surface-2)', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => navigate(`/solar/hr/admin/employees/${emp.id}`)}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: emp.photo_url ? 'transparent' : avatarColor(emp.id), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                          {emp.photo_url ? <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(emp.full_name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark)' }}>{emp.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employee_id} · {emp.company_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{emp.department?.name || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{emp.designation?.title || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{emp.employment_type?.replace('_', '-')}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {emp.joined_date ? new Date(emp.joined_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>
                        {STATUS_LABELS[emp.status] || emp.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => navigate(`/solar/hr/admin/employees/${emp.id}`)} title="View" style={{ background: 'rgba(59,130,246,0.1)', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Eye size={15} /></button>
                        <button onClick={() => navigate(`/solar/hr/admin/employees/${emp.id}/edit`)} title="Edit" style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={15} /></button>
                        {isSuperAdmin && (
                          <button onClick={() => setDeleteConfirm(emp)} title="Delete" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.4rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Status summary footer */}
        <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--surface-2)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'var(--surface)' }}>
          {Object.entries(STATUS_LABELS).map(([key, label]) => {
            const count = employees.filter(e => e.status === key).length;
            if (!count) return null;
            const sc = STATUS_COLORS[key];
            return (
              <span key={key} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <strong style={{ color: sc.color }}>{count}</strong>
              </span>
            );
          })}
        </div>
      </div>

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Trash2 size={24} />
            </div>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Delete Employee?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>? This will permanently remove their profile and all associated data.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--surface-2)' }} onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#dc2626', borderColor: '#dc2626' }} onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesList;
