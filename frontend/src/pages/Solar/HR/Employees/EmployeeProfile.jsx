import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, Briefcase, User, Clock, FileText, Package, CalendarCheck, Download, Trash2 } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  active:     { bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  probation:  { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  on_leave:   { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  resigned:   { bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
  terminated: { bg: 'rgba(100,116,139,0.12)', color: '#475569' },
};

const ASSET_STATUS = {
  assigned: { label: 'Assigned', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  returned: { label: 'Returned', color: '#16a34a', bg: 'rgba(34,197,94,0.1)' },
  damaged:  { label: 'Damaged',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const ATTENDANCE_STATUS = {
  present: { label: 'Present', color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
  late:    { label: 'Late',    color: '#d97706', bg: 'rgba(245,158,11,0.12)' },
  absent:  { label: 'Absent',  color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  leave:   { label: 'Leave',   color: '#2563eb', bg: 'rgba(59,130,246,0.12)' },
  half_day:{ label: 'Half Day',color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  wfh:     { label: 'WFH',     color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid var(--surface-2)', alignItems: 'flex-start' }}>
    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, minWidth: '160px', paddingTop: '0.1rem' }}>{label}</span>
    <span style={{ fontSize: '0.875rem', color: 'var(--dark)', fontWeight: 500 }}>{value || '—'}</span>
  </div>
);

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [emp, setEmp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal');

  // Modal states
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ id: null, title: '', upload_date: new Date().toISOString().split('T')[0] });
  const [docFile, setDocFile] = useState(null);
  const [docSaving, setDocSaving] = useState(false);

  const [assetModal, setAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({ id: null, name: '', asset_id: '', assigned_date: new Date().toISOString().split('T')[0], status: 'assigned' });
  const [assetSaving, setAssetSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [empRes, docRes, assetRes, attRes, leaveRes] = await Promise.all([
        api.get(`/hr/employees/${id}`),
        api.get(`/hr/employees/${id}/documents`),
        api.get(`/hr/employees/${id}/assets`),
        api.get(`/hr/attendance/employee/${id}/history`),
        api.get(`/hr/leaves/employee/${id}/balances`),
      ]);
      setEmp(empRes.data);
      setDocuments(docRes.data);
      setAssets(assetRes.data);
      setAttendance(attRes.data);
      setLeaveBalances(leaveRes.data?.balances || []);
    } catch (err) {
      toast.error('Failed to load profile data');
      if (!emp) navigate('/solar/hr/admin/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // ── Document Handlers ──
  const openDocAdd = () => { setDocForm({ id: null, title: '', upload_date: new Date().toISOString().split('T')[0] }); setDocFile(null); setDocModal(true); };
  const openDocEdit = (doc) => { setDocForm({ id: doc.id, title: doc.title, upload_date: doc.upload_date ? doc.upload_date.split('T')[0] : '' }); setDocFile(null); setDocModal(true); };
  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.title) return toast.error('Title is required');
    if (!docForm.id && !docFile) return toast.error('File is required for new document');
    
    setDocSaving(true);
    try {
      if (docForm.id) {
        await api.put(`/hr/employees/${id}/documents/${docForm.id}`, docForm);
        toast.success('Document updated');
      } else {
        const fd = new FormData();
        fd.append('title', docForm.title);
        fd.append('upload_date', docForm.upload_date);
        fd.append('file', docFile);
        await api.post(`/hr/employees/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' }});
        toast.success('Document uploaded');
      }
      setDocModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save document');
    } finally {
      setDocSaving(false);
    }
  };
  const handleDocDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/hr/employees/${id}/documents/${docId}`);
      toast.success('Document deleted');
      fetchData();
    } catch (err) { toast.error('Delete failed'); }
  };

  // ── Asset Handlers ──
  const openAssetAdd = () => { setAssetForm({ id: null, name: '', asset_id: '', assigned_date: new Date().toISOString().split('T')[0], status: 'assigned' }); setAssetModal(true); };
  const openAssetEdit = (asset) => { setAssetForm({ id: asset.id, name: asset.name, asset_id: asset.asset_id || '', assigned_date: asset.assigned_date ? asset.assigned_date.split('T')[0] : '', status: asset.status }); setAssetModal(true); };
  const handleAssetSubmit = async (e) => {
    e.preventDefault();
    if (!assetForm.name) return toast.error('Asset name is required');
    setAssetSaving(true);
    try {
      if (assetForm.id) {
        await api.put(`/hr/employees/${id}/assets/${assetForm.id}`, assetForm);
        toast.success('Asset updated');
      } else {
        await api.post(`/hr/employees/${id}/assets`, assetForm);
        toast.success('Asset assigned');
      }
      setAssetModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save asset');
    } finally {
      setAssetSaving(false);
    }
  };
  const handleAssetDelete = async (assetId) => {
    if (!window.confirm('Delete this asset record?')) return;
    try {
      await api.delete(`/hr/employees/${id}/assets/${assetId}`);
      toast.success('Asset deleted');
      fetchData();
    } catch (err) { toast.error('Delete failed'); }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading employee profile...</div>;
  if (!emp) return null;

  const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.active;
  const avatarColor = '#3b82f6';
  const initials = (emp.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const tabs = [
    { key: 'personal',   label: 'Personal',   icon: User },
    { key: 'employment', label: 'Employment', icon: Briefcase },
    { key: 'attendance', label: 'Attendance', icon: Clock },
    { key: 'leave',      label: 'Leave',      icon: CalendarCheck },
    { key: 'documents',  label: 'Documents',  icon: FileText },
    { key: 'assets',     label: 'Assets',     icon: Package },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => navigate('/solar/hr/admin/employees')} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.75rem' }}>{emp.full_name}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{emp.employee_id} · {emp.designation?.title} · {emp.department?.name}</p>
        </div>
        <button onClick={() => navigate(`/solar/hr/admin/employees/${id}/edit`)} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Edit2 size={15} /> Edit Employee
        </button>
      </div>

      {/* Hero Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: emp.photo_url ? 'transparent' : avatarColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0, border: '3px solid rgba(59,130,246,0.2)', overflow: 'hidden' }}>
            {emp.photo_url ? <img src={emp.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{emp.full_name}</h2>
              <span style={{ padding: '0.2rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.color, textTransform: 'capitalize' }}>
                {(emp.status || '').replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { icon: Briefcase, val: `${emp.designation?.title || '—'} · ${emp.department?.name || '—'}` },
                { icon: Mail,      val: emp.company_email },
                { icon: Phone,     val: emp.phone },
                { icon: MapPin,    val: emp.work_location },
                { icon: Calendar,  val: emp.joined_date ? `Joined ${new Date(emp.joined_date).toLocaleDateString('en-GB')}` : null },
              ].filter(x => x.val).map(({ icon: Icon, val }, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Icon size={14} /> {val}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--surface-2)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '0.7rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)', fontWeight: activeTab === tab.key ? 600 : 500, fontSize: '0.875rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Personal ── */}
      {activeTab === 'personal' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Personal Details</h3>
            <InfoRow label="Full Name"      value={emp.full_name} />
            <InfoRow label="NIC / Passport" value={emp.nic} />
            <InfoRow label="Date of Birth"  value={emp.dob ? new Date(emp.dob).toLocaleDateString('en-GB') : null} />
            <InfoRow label="Gender"         value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null} />
            <InfoRow label="Phone"          value={emp.phone} />
            <InfoRow label="Personal Email" value={emp.personal_email} />
            <InfoRow label="Company Email"  value={emp.company_email} />
            <InfoRow label="Address"        value={emp.address} />
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Emergency Contact</h3>
            <InfoRow label="Contact Name"  value={emp.emergency_contact_name} />
            <InfoRow label="Contact Phone" value={emp.emergency_contact_phone} />
          </div>
        </div>
      )}

      {/* ── Employment ── */}
      {activeTab === 'employment' && (
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Employment Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 2rem' }}>
            <div>
              <InfoRow label="Employee ID"        value={emp.employee_id} />
              <InfoRow label="Department"         value={emp.department?.name} />
              <InfoRow label="Designation"        value={emp.designation?.title} />
              <InfoRow label="Reporting Manager"  value={emp.manager?.full_name} />
              <InfoRow label="Employment Type"    value={emp.employment_type?.replace('_', '-')} />
            </div>
            <div>
              <InfoRow label="Joining Date"       value={emp.joined_date ? new Date(emp.joined_date).toLocaleDateString('en-GB') : null} />
              <InfoRow label="Probation End"      value={emp.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString('en-GB') : null} />
              <InfoRow label="Work Location"      value={emp.work_location} />
              <InfoRow label="Status"             value={emp.status?.replace('_', ' ')} />
              <InfoRow label="Basic Salary"       value={emp.basic_salary ? `LKR ${parseFloat(emp.basic_salary).toLocaleString()}` : null} />
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {activeTab === 'attendance' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Recent Attendance</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found.</td></tr>
              ) : attendance.slice(0, 10).map((a, i) => { // show only last 10
                const st = ATTENDANCE_STATUS[a.status] || ATTENDANCE_STATUS.present;
                const clockIn = a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
                const clockOut = a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
                const hours = a.worked_hours ? `${parseFloat(a.worked_hours).toFixed(2)}h` : '—';
                
                return (
                  <tr key={a.id || i} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 500 }}>{new Date(a.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{clockIn}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{clockOut}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{hours}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}><span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Leave ── */}
      {activeTab === 'leave' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {leaveBalances.map((lb, i) => {
              const pct = lb.total > 0 ? Math.min(100, (lb.used / lb.total) * 100) : 0;
              const barColor = pct >= 100 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#3b82f6';

              return (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>{lb.type}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.75rem' }}>
                    <div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: barColor }}>{lb.remaining}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Remaining</div></div>
                    <div><div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6b7280' }}>{lb.used}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Used</div></div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === 'documents' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Employee Documents</h3>
            <button onClick={openDocAdd} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', fontSize: '0.82rem', padding: '0.4rem 0.875rem' }}>+ Upload</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                {['Title', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No documents uploaded.</td></tr>
              ) : documents.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={15} color="#3b82f6" /> {doc.title}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '0.875rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Download size={14} /></a>
                      <button onClick={() => openDocEdit(doc)} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={14} /></button>
                      <button onClick={() => handleDocDelete(doc.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Assets ── */}
      {activeTab === 'assets' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Assigned Assets</h3>
            <button onClick={openAssetAdd} className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', fontSize: '0.82rem', padding: '0.4rem 0.875rem' }}>+ Assign</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--surface-2)' }}>
                {['Name', 'Asset ID', 'Assigned', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No assets assigned.</td></tr>
              ) : assets.map(a => {
                const st = ASSET_STATUS[a.status] || ASSET_STATUS.assigned;
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={15} color="#3b82f6" /> {a.name}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.asset_id || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{a.assigned_date ? new Date(a.assigned_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}><span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openAssetEdit(a)} style={{ background: 'rgba(245,158,11,0.1)', border: 'none', cursor: 'pointer', color: '#d97706', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Edit2 size={14} /></button>
                        <button onClick={() => handleAssetDelete(a.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.35rem', borderRadius: 'var(--radius-md)', display: 'flex' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document Modal */}
      {docModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <form className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }} onSubmit={handleDocSubmit}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{docForm.id ? 'Edit Document' : 'Upload Document'}</h2>
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input className="form-control" value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-control" value={docForm.upload_date} onChange={e => setDocForm({...docForm, upload_date: e.target.value})} required />
            </div>
            {!docForm.id && (
              <div className="form-group">
                <label className="form-label">File *</label>
                <input type="file" className="form-control" onChange={e => setDocFile(e.target.files[0])} required />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDocModal(false)} disabled={docSaving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={docSaving}>{docSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Asset Modal */}
      {assetModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
          <form className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }} onSubmit={handleAssetSubmit}>
            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>{assetForm.id ? 'Edit Asset' : 'Assign Asset'}</h2>
            <div className="form-group">
              <label className="form-label">Asset Name *</label>
              <input className="form-control" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} required placeholder="e.g. Dell Latitude 7420" />
            </div>
            <div className="form-group">
              <label className="form-label">Asset ID</label>
              <input className="form-control" value={assetForm.asset_id} onChange={e => setAssetForm({...assetForm, asset_id: e.target.value})} placeholder="e.g. AST-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Date *</label>
              <input type="date" className="form-control" value={assetForm.assigned_date} onChange={e => setAssetForm({...assetForm, assigned_date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-control" value={assetForm.status} onChange={e => setAssetForm({...assetForm, status: e.target.value})} required>
                <option value="assigned">Assigned</option>
                <option value="returned">Returned</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAssetModal(false)} disabled={assetSaving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={assetSaving}>{assetSaving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
