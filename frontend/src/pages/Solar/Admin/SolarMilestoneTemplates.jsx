import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import ConfirmDeleteModal from '../../../components/ui/ConfirmDeleteModal';
import useAuthStore from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';

const SolarMilestoneTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, templateId: null });

  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    category: 'PV Installation',
    unit: 'Tables',
    target_qty: 384,
    sort_order: 1,
    has_before_after: false,
    has_table_tracking: false,
    expected_images: 10,
    sub_sections: '',
    checklist_rules: [],
    notes: ''
  });
  const [newRuleText, setNewRuleText] = useState('');

  useEffect(() => {
    // Only super admins can access this page
    if (user && user.role !== 'super_admin' && !(user.roles && user.roles.includes('super_admin'))) {
      navigate('/solar/admin/dashboard');
      return;
    }
    fetchTemplates();
  }, [user, navigate]);

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/solar/templates');
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      const parsedRules = Array.isArray(template.checklist_rules) 
        ? template.checklist_rules 
        : (typeof template.checklist_rules === 'string' ? JSON.parse(template.checklist_rules || '[]') : []);

      setFormData({
        name: template.name,
        category: template.category || 'PV Installation',
        unit: template.unit || 'Tables',
        target_qty: template.target_qty !== null && template.target_qty !== undefined ? template.target_qty : 384,
        sort_order: template.sort_order,
        has_before_after: template.has_before_after,
        has_table_tracking: template.has_table_tracking,
        expected_images: template.expected_images,
        sub_sections: Array.isArray(template.sub_sections) ? template.sub_sections.join(', ') : (template.sub_sections || ''),
        checklist_rules: parsedRules,
        notes: template.notes || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        category: 'PV Installation',
        unit: 'Tables',
        target_qty: 384,
        sort_order: templates.length + 1,
        has_before_after: false,
        has_table_tracking: false,
        expected_images: 10,
        sub_sections: '',
        checklist_rules: [],
        notes: ''
      });
    }
    setNewRuleText('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setNewRuleText('');
  };

  const handleAddRule = () => {
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    if (formData.checklist_rules.includes(trimmed)) {
      toast.error('This rule already exists');
      return;
    }
    setFormData(prev => ({
      ...prev,
      checklist_rules: [...prev.checklist_rules, trimmed]
    }));
    setNewRuleText('');
  };

  const handleRemoveRule = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      checklist_rules: prev.checklist_rules.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleMoveRule = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= formData.checklist_rules.length) return;
    const updated = [...formData.checklist_rules];
    const item = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, item);
    setFormData(prev => ({ ...prev, checklist_rules: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Process sub_sections from comma-separated string to array
    const processedSubSections = formData.sub_sections
      ? formData.sub_sections.split(',').map(s => s.trim()).filter(s => s !== '')
      : null;

    const payload = {
      ...formData,
      sub_sections: processedSubSections
    };

    try {
      if (editingTemplate) {
        await api.put(`/solar/templates/${editingTemplate.id}`, payload);
        toast.success('Template updated successfully');
      } else {
        await api.post('/solar/templates', payload);
        toast.success('Template created successfully');
      }
      closeModal();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    }
  };

  // Deletion is handled directly by ConfirmDeleteModal

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        Loading milestone templates...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Settings size={28} color="var(--primary)" />
            Milestone Templates
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Manage the standard milestones auto-assigned to new Solar Projects.
          </p>
        </div>
        
        <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} /> Add Template
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search templates..." 
            className="form-control"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Order</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Milestone Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category & BOQ</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Checklist & Image Rules</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tracking Modes</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No templates found.
                  </td>
                </tr>
              ) : (
                filteredTemplates.map(template => {
                  const rules = Array.isArray(template.checklist_rules) 
                    ? template.checklist_rules 
                    : (typeof template.checklist_rules === 'string' ? JSON.parse(template.checklist_rules || '[]') : []);

                  return (
                    <tr key={template.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold' }}>{template.sort_order}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{template.name}</div>
                        {template.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{template.notes}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          display: 'inline-block',
                          background: 'rgba(2,132,199,0.1)', 
                          color: '#0284c7', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          marginBottom: '0.25rem'
                        }}>
                          {template.category || 'PV Installation'}
                        </span>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Target: <strong>{template.target_qty !== null && template.target_qty !== undefined ? Number(template.target_qty).toLocaleString() : '-'}</strong> {template.unit || ''}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {rules.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              background: 'rgba(16,185,129,0.12)', 
                              color: '#059669', 
                              padding: '0.25rem 0.6rem', 
                              borderRadius: '999px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700, 
                              width: 'fit-content' 
                            }}>
                              📸 {rules.length} Rule Placeholders
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {rules.slice(0, 2).join(', ')}{rules.length > 2 ? ` +${rules.length - 2} more` : ''}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                            General photos (~{template.expected_images || 10})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {template.has_before_after && <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>Before/After</span>}
                          {template.has_table_tracking && <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>Table Tracking</span>}
                          {!template.has_before_after && !template.has_table_tracking && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Standard</span>}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            onClick={() => openModal(template)} 
                            className="btn btn-ghost" 
                            style={{ padding: '0.5rem', color: '#3b82f6' }}
                            title="Edit Template"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => setDeleteModal({ isOpen: true, templateId: template.id })}
                            className="btn btn-ghost" 
                            style={{ padding: '0.5rem', color: '#ef4444' }}
                            title="Delete Template"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
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
            <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{editingTemplate ? 'Edit Template' : 'Add Template'}</h2>
              <button onClick={closeModal} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 3 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Milestone Name *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required 
                    placeholder="e.g. 01 Table Leg Marking"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Sort Order *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={formData.sort_order} 
                    onChange={e => setFormData({...formData, sort_order: e.target.value})}
                    required 
                    min="1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Category *</label>
                  <select 
                    className="form-control" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="PV Installation">☀️ PV Installation</option>
                    <option value="Inverter Installation">⚡ Inverter Installation</option>
                    <option value="Earthing & Lightning">🛡️ Earthing & Lightning</option>
                    <option value="AC Electrical Works">🔌 AC Electrical Works</option>
                    <option value="HT Installation">🏭 HT Installation</option>
                    <option value="Mobilisation & Acceptance">📋 Mobilisation & Acceptance</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Unit of Measure</label>
                  <select 
                    className="form-control" 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})}
                    style={{ width: '100%' }}
                  >
                    <option value="Tables">Tables</option>
                    <option value="Inverters">Inverters</option>
                    <option value="Meters (m)">Meters (m)</option>
                    <option value="Pits">Pits</option>
                    <option value="Poles">Poles</option>
                    <option value="Stations">Stations</option>
                    <option value="Rooms">Rooms</option>
                    <option value="Nos">Nos</option>
                    <option value="Sets">Sets</option>
                    <option value="Site">Site</option>
                    <option value="Lot">Lot</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Target Qty</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-control" 
                    value={formData.target_qty} 
                    onChange={e => setFormData({...formData, target_qty: e.target.value})}
                    placeholder="384"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Checklist & Image Rules Builder */}
              <div style={{ 
                background: 'var(--surface-2)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius)', 
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📸 Checklist & Image Verification Rules
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Field supervisors will be provided dedicated photo upload placeholders for each rule.
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    background: 'var(--primary)', 
                    color: 'white', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '999px' 
                  }}>
                    {formData.checklist_rules.length} Rules
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter inspection or photographic rule (e.g. Pile/leg location marking)..."
                    value={newRuleText}
                    onChange={e => setNewRuleText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRule();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddRule} 
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}
                  >
                    <Plus size={16} /> Add Rule
                  </button>
                </div>

                {formData.checklist_rules.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', marginTop: '0.5rem' }}>
                    {formData.checklist_rules.map((rule, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: 'var(--surface)', 
                          padding: '0.5rem 0.75rem', 
                          borderRadius: 'var(--radius)', 
                          border: '1px solid var(--border)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, marginRight: '0.5rem' }}>
                          <span style={{ 
                            background: 'rgba(59,130,246,0.1)', 
                            color: '#3b82f6', 
                            fontWeight: 700, 
                            fontSize: '0.75rem', 
                            padding: '0.15rem 0.4rem', 
                            borderRadius: '4px',
                            minWidth: '22px',
                            textAlign: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{rule}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button 
                            type="button" 
                            onClick={() => handleMoveRule(idx, idx - 1)} 
                            disabled={idx === 0}
                            className="btn btn-ghost" 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', opacity: idx === 0 ? 0.3 : 1 }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleMoveRule(idx, idx + 1)} 
                            disabled={idx === formData.checklist_rules.length - 1}
                            className="btn btn-ghost" 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', opacity: idx === formData.checklist_rules.length - 1 ? 0.3 : 1 }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveRule(idx)} 
                            className="btn btn-ghost" 
                            style={{ padding: '0.2rem 0.4rem', color: '#ef4444' }}
                            title="Delete Rule"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem', textAlign: 'center' }}>
                    No specific checklist rules added. Supervisors will submit general photos for this milestone.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Expected Images (Fallback) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={formData.expected_images} 
                    onChange={e => setFormData({...formData, expected_images: e.target.value})}
                    required 
                    min="1"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input 
                    type="checkbox" 
                    checked={formData.has_before_after}
                    onChange={e => setFormData({...formData, has_before_after: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Requires Before & After
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input 
                    type="checkbox" 
                    checked={formData.has_table_tracking}
                    onChange={e => setFormData({...formData, has_table_tracking: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  Requires Table Number
                </label>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Sub-sections (Comma separated)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.sub_sections} 
                  onChange={e => setFormData({...formData, sub_sections: e.target.value})}
                  placeholder="e.g. Civil Work, Cable Work, Accessories"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Leave empty if no sub-sections are needed.
                </span>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Notes / Instructions for Supervisors</label>
                <textarea 
                  className="form-control" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional instructions..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeModal} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, templateId: null })}
        onDeleted={() => {
          setDeleteModal({ isOpen: false, templateId: null });
          fetchTemplates();
        }}
        endpoint={`/solar/templates/${deleteModal.templateId}`}
        itemName="Milestone Template"
      />
    </div>
  );
};

export default SolarMilestoneTemplates;
