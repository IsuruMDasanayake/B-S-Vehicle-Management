import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import api from '../../../../services/api';
import useAuthStore from '../../../../store/authStore';
import toast from 'react-hot-toast';

const PortalLogin = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    toast.loading('Signing in...', { id: 'login' });
    
    try {
      const response = await api.post('/auth/login', form);
      const { user, token } = response.data;
      
      const roles = user?.roles || [];
      const isEmployee = roles.includes('solar_employee');
      
      if (!isEmployee) {
        throw new Error('Access denied. Employee account required.');
      }

      setAuth(user, token);
      
      if (user.force_password_change) {
        toast.dismiss('login');
        setNeedsPasswordChange(true);
        setPwdForm(prev => ({ ...prev, current_password: form.password }));
      } else {
        toast.success('Login successful!', { id: 'login' });
        navigate('/solar/hr/portal/home');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed', { id: 'login' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.new_password_confirmation) {
      toast.error('New passwords do not match');
      return;
    }
    
    setLoading(true);
    toast.loading('Updating password...', { id: 'pwd' });
    
    try {
      await api.post('/auth/change-password', pwdForm);
      
      // Update local user state
      const { user, token } = useAuthStore.getState();
      setAuth({ ...user, force_password_change: false }, token);
      
      toast.success('Password updated successfully!', { id: 'pwd' });
      navigate('/solar/hr/portal/home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password', { id: 'pwd' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--surface-2)',
      padding: '1.5rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '64px', height: '64px', borderRadius: 'var(--radius-xl)', 
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 1rem', color: '#fff'
          }}>
            <Lock size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Employee Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Sign in with your company email
          </p>
        </div>

        {!needsPasswordChange ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Company Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="employee@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  className="form-control" 
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem', background: '#3b82f6', borderColor: '#3b82f6' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #f59e0b', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#b45309', margin: 0, fontWeight: 500 }}>
                For security reasons, please change your initial password before continuing.
              </p>
            </div>
            
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Min. 8 characters"
                value={pwdForm.new_password}
                onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Re-type new password"
                value={pwdForm.new_password_confirmation}
                onChange={e => setPwdForm({ ...pwdForm, new_password_confirmation: e.target.value })}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem', background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : (
                <>Update Password & Continue <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PortalLogin;
