import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Smartphone,
  Copy,
  Check,
  Edit2,
  DollarSign,
  AlertCircle,
  Users,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

const FINANCE_ROLES = [
  { key: 'accountant', label: 'Accountant', desc: 'Cashier & Reconciliations', color: '#10b981', tier: 2 },
  { key: 'site_supervisor', label: 'Site Supervisor', desc: 'Field Petty Cash Float', color: '#f59e0b', tier: 1 },
  { key: 'engineer', label: 'Site Engineer', desc: 'Technical Procurements', color: '#3b82f6', tier: 1 },
  { key: 'project_manager', label: 'Project Manager', desc: 'Tier 1 Approver (< 75K)', color: '#8b5cf6', tier: 1 },
  { key: 'project_director', label: 'Project Director', desc: 'Tier 2 Approver (< 150K)', color: '#ec4899', tier: 2 },
  { key: 'director', label: 'Director / MD', desc: 'Tier 3 Top Approver (All)', color: '#ef4444', tier: 3 },
  { key: 'finance_admin', label: 'Finance Admin', desc: 'Full System Control', color: '#059669', tier: 3 },
];

const FinanceRoles = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit Role Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    finance_role: 'site_supervisor',
    max_request_limit: 25000,
    approval_tier: 1,
    can_approve: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Mobile Link Generation State
  const [generatingTokenFor, setGeneratingTokenFor] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/solar/finance/roles/users');
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error('Failed to load finance roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.finance_role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({
      finance_role: user.finance_role || 'site_supervisor',
      max_request_limit: user.max_request_limit || 25000,
      approval_tier: user.approval_tier || 1,
      can_approve: user.can_approve || false,
      notes: user.notes || '',
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSaving(true);
      await api.post(`/solar/finance/roles/users/${editingUser.user_id}`, editForm);
      toast.success(`Finance role updated for ${editingUser.name}`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update finance role');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMobileToken = async (userId) => {
    try {
      setGeneratingTokenFor(userId);
      const res = await api.post(`/solar/finance/roles/generate-token/${userId}`);
      toast.success(res.data.message);
      
      // Update local state with new token
      setUsers(prev => prev.map(u => {
        if (u.user_id === userId) {
          return {
            ...u,
            active_token: res.data.token,
            mobile_link: res.data.mobile_url,
          };
        }
        return u;
      }));

      // Copy link directly
      if (res.data.mobile_url) {
        navigator.clipboard.writeText(res.data.mobile_url);
        setCopiedToken(res.data.token);
        setTimeout(() => setCopiedToken(null), 3000);
      }
    } catch (err) {
      toast.error('Failed to generate mobile link');
    } finally {
      setGeneratingTokenFor(null);
    }
  };

  const copyExistingLink = (url, token) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success('Mobile request link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div style={{ padding: '0rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Finance Role & Authority Matrix
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Configure internal finance authorities, single-request cash limits, and issue employee mobile access links.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--surface-2)' }}
        >
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {/* Role Summary Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem',
        marginBottom: '2rem'
      }}>
        {FINANCE_ROLES.map(role => (
          <div
            key={role.key}
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--surface-2)',
              borderRadius: '10px',
              borderLeft: `4px solid ${role.color}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{role.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{role.desc}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee name or email..."
            style={{ paddingLeft: '2.4rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 250px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Filter Role:</label>
          <select
            className="form-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="all">All Roles</option>
            {FINANCE_ROLES.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>Employee Name</th>
                <th style={{ padding: '1rem' }}>Finance Role</th>
                <th style={{ padding: '1rem' }}>Max Single Limit</th>
                <th style={{ padding: '1rem' }}>Approval Tier</th>
                <th style={{ padding: '1rem' }}>Mobile Cash Portal</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading user roles...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No employees found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const roleDef = FINANCE_ROLES.find(r => r.key === user.finance_role) || FINANCE_ROLES[1];
                  const hasToken = Boolean(user.active_token);
                  const isCopied = copiedToken === user.active_token;

                  return (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: `${roleDef.color}15`,
                          color: roleDef.color,
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: roleDef.color }} />
                          {roleDef.label}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          LKR {Number(user.max_request_limit).toLocaleString()}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: user.can_approve ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-2)',
                            color: user.can_approve ? '#10b981' : 'var(--text-muted)',
                          }}>
                            {user.can_approve ? `Tier ${user.approval_tier} Approver` : 'Requester'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        {hasToken ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => copyExistingLink(user.mobile_link, user.active_token)}
                              className="btn btn-ghost"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                border: '1px solid var(--surface-2)',
                                color: isCopied ? '#10b981' : 'var(--text-secondary)',
                              }}
                            >
                              {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                              {isCopied ? 'Copied' : 'Copy Link'}
                            </button>
                            <a
                              href={user.mobile_link}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Mobile Portal Preview"
                              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                            >
                              <ExternalLink size={15} />
                            </a>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateMobileToken(user.user_id)}
                            disabled={generatingTokenFor === user.user_id}
                            className="btn btn-ghost"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              border: '1px dashed #10b981',
                              color: '#10b981',
                            }}
                          >
                            <Smartphone size={14} />
                            {generatingTokenFor === user.user_id ? 'Generating...' : 'Issue Mobile Link'}
                          </button>
                        )}
                      </td>

                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button
                          onClick={() => openEditModal(user)}
                          className="btn btn-ghost"
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            border: '1px solid var(--surface-2)',
                          }}
                        >
                          <Edit2 size={13} /> Edit Role
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1100,
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Assign Finance Role & Authority
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Setting financial permissions for <strong>{editingUser.name}</strong> ({editingUser.email})
            </p>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Finance Role
                </label>
                <select
                  className="form-control"
                  value={editForm.finance_role}
                  onChange={(e) => {
                    const role = e.target.value;
                    const defaultLimit = role === 'director' ? 500000 : role === 'project_director' ? 150000 : role === 'project_manager' ? 75000 : 25000;
                    const canApprove = ['project_manager', 'project_director', 'director', 'finance_admin', 'accountant'].includes(role);
                    const tier = role === 'director' || role === 'finance_admin' ? 3 : role === 'project_director' || role === 'accountant' ? 2 : 1;
                    
                    setEditForm(prev => ({
                      ...prev,
                      finance_role: role,
                      max_request_limit: defaultLimit,
                      can_approve: canApprove,
                      approval_tier: tier,
                    }));
                  }}
                  style={{ width: '100%' }}
                >
                  {FINANCE_ROLES.map(r => (
                    <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Max Single Request Limit (LKR)
                </label>
                <input
                  type="number"
                  className="form-control"
                  value={editForm.max_request_limit}
                  onChange={(e) => setEditForm(prev => ({ ...prev, max_request_limit: Number(e.target.value) }))}
                  placeholder="25000"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Maximum amount this user can request in a single cash request.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={editForm.can_approve}
                    onChange={(e) => setEditForm(prev => ({ ...prev, can_approve: e.target.checked }))}
                  />
                  Has Approval Authority
                </label>

                {editForm.can_approve && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approval Tier:</label>
                    <select
                      className="form-control"
                      value={editForm.approval_tier}
                      onChange={(e) => setEditForm(prev => ({ ...prev, approval_tier: Number(e.target.value) }))}
                      style={{ width: '90px', padding: '0.35rem 0.5rem' }}
                    >
                      <option value="1">Tier 1</option>
                      <option value="2">Tier 2</option>
                      <option value="3">Tier 3</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Notes / Internal Reference
                </label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Authorized site petty cash custodian for Western Province"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceRoles;
