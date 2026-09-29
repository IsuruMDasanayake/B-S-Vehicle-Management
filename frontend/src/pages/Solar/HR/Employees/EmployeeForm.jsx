import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, User } from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const fileRef = useRef(null);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    full_name: '', nic: '', dob: '', gender: '', phone: '',
    personal_email: '', company_email: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    department_id: '', designation_id: '', manager_id: '',
    employment_type: 'full_time', joined_date: '', probation_end_date: '',
    work_location: 'Office', status: 'active', basic_salary: '',
    create_user_account: true, user_password: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          api.get('/hr/departments'),
          api.get('/hr/employees'),
        ]);
        setDepartments(deptRes.data);
        setManagers(empRes.data.filter(e => e.id !== parseInt(id)));

        if (isEdit) {
          const { data } = await api.get(`/hr/employees/${id}`);
          setForm({
            full_name: data.full_name || '',
            nic: data.nic || '',
            dob: data.dob ? data.dob.split('T')[0] : '',
            gender: data.gender || '',
            phone: data.phone || '',
            personal_email: data.personal_email || '',
            company_email: data.company_email || '',
            address: data.address || '',
            emergency_contact_name: data.emergency_contact_name || '',
            emergency_contact_phone: data.emergency_contact_phone || '',
            department_id: data.department_id || '',
            designation_id: data.designation_id || '',
            manager_id: data.manager_id || '',
            employment_type: data.employment_type || 'full_time',
            joined_date: data.joined_date ? data.joined_date.split('T')[0] : '',
            probation_end_date: data.probation_end_date ? data.probation_end_date.split('T')[0] : '',
            work_location: data.work_location || 'Office',
            status: data.status || 'active',
            basic_salary: data.basic_salary || '',
            create_user_account: false,
            user_password: '',
          });
          if (data.photo_url) setPhotoPreview(data.photo_url);
        }
      } catch (err) {
        toast.error('Failed to load form data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  // Load designations when department changes
  useEffect(() => {
    if (form.department_id) {
      api.get(`/hr/designations?department_id=${form.department_id}`)
        .then(({ data }) => setDesignations(data))
        .catch(() => setDesignations([]));
    } else {
      setDesignations([]);
    }
  }, [form.department_id]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.department_id || !form.designation_id || !form.joined_date) {
      toast.error('Please fill required fields: Name, Department, Designation, Joining Date');
      return;
    }
    if (!isEdit && form.create_user_account && !form.user_password) {
      toast.error('Please set an initial password for the employee account');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { 
        if (v !== '' && v !== null) {
          fd.append(k, typeof v === 'boolean' ? (v ? 1 : 0) : v); 
        }
      });
      if (fileRef.current?.files[0]) fd.append('photo', fileRef.current.files[0]);

      if (isEdit) {
        fd.append('_method', 'PUT');
        await api.post(`/hr/employees/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Employee updated successfully');
      } else {
        await api.post('/hr/employees', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Employee created successfully');
      }
      navigate('/solar/hr/admin/employees');
    } catch (err) {
      const msg = err.response?.data?.message || Object.values(err.response?.data?.errors || {})[0]?.[0] || 'Failed to save employee';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: 'var(--text-muted)' }}>Loading...</div>
  );

  const tabs = [
    { key: 'personal',   label: 'Personal' },
    { key: 'employment', label: 'Employment' },
    { key: 'account',    label: 'User Account' },
  ];

  const inputStyle = { width: '100%' };
  const gridStyle  = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate('/solar/hr/admin/employees')} style={{ background: 'var(--surface-2)', border: 'none', padding: '0.5rem', borderRadius: 'var(--radius-full)', cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem' }}>{isEdit ? 'Edit Employee' : 'Add New Employee'}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>{isEdit ? 'Update employee profile' : 'Create a new employee profile'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Photo */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div onClick={() => fileRef.current?.click()} style={{ width: '120px', height: '120px', borderRadius: '50%', background: photoPreview ? 'transparent' : 'rgba(59,130,246,0.1)', border: '2px dashed #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', cursor: 'pointer', overflow: 'hidden' }}>
              {photoPreview ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={40} color="#3b82f6" />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)', fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}>
              <Upload size={14} /> Upload Photo
            </button>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>JPG, PNG up to 2MB</p>
          </div>

          {/* Tabbed form */}
          <div className="card" style={{ flex: '1 1 300px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--surface-2)', marginBottom: '1.5rem', overflowX: 'auto' }}>
              {tabs.map(tab => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ padding: '0.6rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)', fontWeight: activeTab === tab.key ? 600 : 500, fontSize: '0.875rem', transition: 'all 0.2s' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Personal */}
            {activeTab === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={gridStyle}>
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-control" style={inputStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} required /></div>
                  <div className="form-group"><label className="form-label">NIC / Passport</label><input className="form-control" style={inputStyle} value={form.nic} onChange={e => set('nic', e.target.value)} placeholder="e.g. 901234567V" /></div>
                  <div className="form-group"><label className="form-label">Date of Birth</label><input type="date" className="form-control" style={inputStyle} value={form.dob} onChange={e => set('dob', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Gender</label>
                    <select className="form-control" style={inputStyle} value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-control" style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07XXXXXXXX" /></div>
                  <div className="form-group"><label className="form-label">Personal Email</label><input type="email" className="form-control" style={inputStyle} value={form.personal_email} onChange={e => set('personal_email', e.target.value)} /></div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Address</label><textarea className="form-control" style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={form.address} onChange={e => set('address', e.target.value)} rows={2} /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--surface-2)', paddingTop: '1.25rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--dark)' }}>Emergency Contact</p>
                  <div style={gridStyle}>
                    <div className="form-group"><label className="form-label">Contact Name</label><input className="form-control" style={inputStyle} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Contact Phone</label><input className="form-control" style={inputStyle} value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)} /></div>
                  </div>
                </div>
              </div>
            )}

            {/* Employment */}
            {activeTab === 'employment' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">Company Email</label><input type="email" className="form-control" style={inputStyle} value={form.company_email} onChange={e => set('company_email', e.target.value)} placeholder="name@circlegroup.lk" /></div>
                <div className="form-group"><label className="form-label">Department *</label>
                  <select className="form-control" style={inputStyle} value={form.department_id} onChange={e => { set('department_id', e.target.value); set('designation_id', ''); }} required>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Designation *</label>
                  <select className="form-control" style={inputStyle} value={form.designation_id} onChange={e => set('designation_id', e.target.value)} required disabled={!form.department_id}>
                    <option value="">{form.department_id ? "Select Designation" : "Select Department First"}</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Reporting Manager</label>
                  <select className="form-control" style={inputStyle} value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                    <option value="">None</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Employment Type</label>
                  <select className="form-control" style={inputStyle} value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                    <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="intern">Intern</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Joining Date *</label><input type="date" className="form-control" style={inputStyle} value={form.joined_date} onChange={e => set('joined_date', e.target.value)} required /></div>
                <div className="form-group"><label className="form-label">Probation End Date</label><input type="date" className="form-control" style={inputStyle} value={form.probation_end_date} onChange={e => set('probation_end_date', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Work Location</label>
                  <select className="form-control" style={inputStyle} value={form.work_location} onChange={e => set('work_location', e.target.value)}>
                    <option value="Office">Office</option><option value="Site">Site</option><option value="Remote">Remote</option><option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-control" style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="active">Active</option><option value="probation">Probation</option><option value="on_leave">On Leave</option><option value="resigned">Resigned</option><option value="terminated">Terminated</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Basic Salary (LKR)</label><input type="number" className="form-control" style={inputStyle} value={form.basic_salary} onChange={e => set('basic_salary', e.target.value)} placeholder="e.g. 85000" /></div>
              </div>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#1d4ed8', marginBottom: 0 }}>
                    <strong>Employee Portal Account</strong><br />
                    Creates a login for the Employee Self-Service Portal (clock-in, leave requests, profile view).
                  </p>
                </div>
                {!isEdit && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={form.create_user_account} onChange={e => set('create_user_account', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }} />
                    Create Employee Portal account
                  </label>
                )}
                {(form.create_user_account || isEdit) && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Login Email</label>
                      <input type="email" className="form-control" value={form.company_email || form.personal_email} readOnly style={{ background: 'var(--surface-2)' }} placeholder="Set company email in Employment tab" />
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Uses company email as login</small>
                    </div>
                    {!isEdit && (
                      <div className="form-group">
                        <label className="form-label">Initial Password *</label>
                        <input type="password" className="form-control" value={form.user_password} onChange={e => set('user_password', e.target.value)} placeholder="Min. 8 characters" />
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Employee should change this on first login</small>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" style={{ border: '1px solid var(--surface-2)' }} onClick={() => navigate('/solar/hr/admin/employees')}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }} disabled={saving}>
            <Save size={16} />{saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
