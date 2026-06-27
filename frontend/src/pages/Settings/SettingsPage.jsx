import { useState } from 'react';
import { Save, Bell, Shield, Database, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Settings saved successfully');
    }, 800);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1>System Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Manage your application preferences and configurations</p>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Settings Navigation */}
        <div className="card" style={{ padding: '0.5rem' }}>
          <ul className="settings-nav-list" style={{ listStyle: 'none' }}>
            {[
              { id: 'general', label: 'General', icon: Globe },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security & Access', icon: Shield },
              { id: 'database', label: 'Database & Backups', icon: Database },
            ].map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: activeTab === tab.id ? 'var(--primary-alpha)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <tab.icon size={18} />
                  <span className="hide-mobile">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Settings Content */}
        <div className="card">
          <form onSubmit={handleSave}>
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>General Settings</h3>
                
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-control" defaultValue="B&S Transport" />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-control" defaultValue="Asia/Colombo">
                      <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-control" defaultValue="LKR">
                      <option value="LKR">LKR (Sri Lankan Rupee)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">System Date Format</label>
                  <select className="form-control" defaultValue="YYYY-MM-DD">
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Notification Preferences</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { id: 'n1', label: 'Maintenance Alerts', desc: 'Get notified when a vehicle is due for maintenance.' },
                    { id: 'n2', label: 'License & Insurance Expiry', desc: 'Alerts 30 days before document expiration.' },
                    { id: 'n3', label: 'Emergency Breakdowns', desc: 'Immediate email notification when a breakdown is reported.' }
                  ].map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                      <input type="checkbox" id={item.id} defaultChecked style={{ marginTop: '0.25rem' }} />
                      <div>
                        <label htmlFor={item.id} style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', cursor: 'pointer' }}>{item.label}</label>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Security & Access</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Session Timeout (Minutes)</label>
                    <input type="number" className="form-control" defaultValue={30} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Minimum Password Length</label>
                    <input type="number" className="form-control" defaultValue={8} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <input type="checkbox" id="2fa" style={{ marginTop: '0.1rem' }} />
                    <div>
                      <label htmlFor="2fa" style={{ fontWeight: 600, display: 'block', cursor: 'pointer' }}>Require Two-Factor Authentication (2FA)</label>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Enforce 2FA for all administrative users.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <input type="checkbox" id="pwd_complex" defaultChecked style={{ marginTop: '0.1rem' }} />
                    <div>
                      <label htmlFor="pwd_complex" style={{ fontWeight: 600, display: 'block', cursor: 'pointer' }}>Enforce Password Complexity</label>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Require uppercase, numbers, and special characters.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--surface-2)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Database & Backups</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-2)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>Manual Backup</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Download a complete SQL dump of the current database.</p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={(e) => { e.preventDefault(); toast.success('Backup started. Download will begin shortly.'); }}>
                    <Database size={16} /> <span className="hide-mobile">Generate Backup</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" id="auto_backup" defaultChecked style={{ marginTop: '0.1rem' }} />
                  <div>
                    <label htmlFor="auto_backup" style={{ fontWeight: 600, display: 'block', cursor: 'pointer' }}>Enable Automatic Daily Backups</label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Backups are stored in the server's /storage/backups directory and kept for 7 days.</span>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem' }}>Recent Backups</h4>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>2026-06-09 02:00 AM</td>
                        <td>Automatic</td>
                        <td>12.4 MB</td>
                        <td><span className="badge badge-success">Completed</span></td>
                      </tr>
                      <tr>
                        <td>2026-06-08 02:00 AM</td>
                        <td>Automatic</td>
                        <td>12.3 MB</td>
                        <td><span className="badge badge-success">Completed</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Note: To access the database directly, use the <a href="http://localhost:8080" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>phpMyAdmin Console</a> (Port 8080).
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-2)' }}>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                <Save size={18} /> {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
