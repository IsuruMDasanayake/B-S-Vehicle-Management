import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../../services/api';
import { format } from 'date-fns';
import { Shield, FileText, Wind, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import ImageViewerModal from './ImageViewerModal';

const ComplianceHistoryModal = ({ isOpen, onClose, vehicle, type, onEdit }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewerImage, setViewerImage] = useState(null);

  useEffect(() => {
    if (isOpen && vehicle && type) {
      fetchData();
    }
  }, [isOpen, vehicle, type]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      if (type === 'insurance') endpoint = '/insurance-policies';
      if (type === 'license') endpoint = '/revenue-licenses';
      if (type === 'emission') endpoint = '/emission-tests';

      const res = await api.get(endpoint);
      const allRecords = res.data.data || res.data || [];
      // Filter records belonging to this specific vehicle
      setData(allRecords.filter(r => r.vehicle_id === vehicle.id));
    } catch (err) {
      console.error(`Failed to fetch ${type} history`, err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !vehicle) return null;

  const renderContent = () => {
    if (isLoading) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading history…</div>;
    }

    if (data.length === 0) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No historical records found for this vehicle.</div>;
    }

    if (type === 'insurance') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>Policy No.</th>
              <th>Company</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th>Amount (LKR)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Doc</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(p => {
              const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost';
              const docUrl = p.attachments?.length > 0 ? `${baseUrl}/storage/${p.attachments[0].file_path}` : null;
              return (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.policy_number}</td>
                <td>{p.insurance_company}</td>
                <td>{p.start_date ? format(new Date(p.start_date), 'MMM dd, yyyy') : '-'}</td>
                <td>{p.expiry_date ? format(new Date(p.expiry_date), 'MMM dd, yyyy') : '-'}</td>
                <td>{p.premium_amount ? parseFloat(p.premium_amount).toLocaleString() : '-'}</td>
                <td><span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{p.status}</span></td>
                <td style={{ textAlign: 'center' }}>
                  {docUrl && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setViewerImage(docUrl)} 
                      title="View Document"
                      style={{ padding: 0, width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--surface-2)', margin: '0 auto', display: 'block' }}
                    >
                      <img src={docUrl} alt="doc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                    <button className="icon-btn edit" onClick={() => onEdit(p.id)} title="Edit"><Edit size={16} /></button>
                    <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: p.id, name: `Policy ${p.policy_number}` })} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (type === 'license') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>License No.</th>
              <th>Issued Date</th>
              <th>Expiry Date</th>
              <th>Amount (LKR)</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Doc</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(l => {
              const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost';
              const docUrl = l.attachments?.length > 0 ? `${baseUrl}/storage/${l.attachments[0].file_path}` : null;
              return (
              <tr key={l.id}>
                <td style={{ fontWeight: 600 }}>{l.license_number}</td>
                <td>{l.issue_date ? format(new Date(l.issue_date), 'MMM dd, yyyy') : '-'}</td>
                <td>{l.expiry_date ? format(new Date(l.expiry_date), 'MMM dd, yyyy') : '-'}</td>
                <td>{l.fee ? parseFloat(l.fee).toLocaleString() : '-'}</td>
                <td><span className={`badge ${l.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{l.status}</span></td>
                <td style={{ textAlign: 'center' }}>
                  {docUrl && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setViewerImage(docUrl)} 
                      title="View Document"
                      style={{ padding: 0, width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--surface-2)', margin: '0 auto', display: 'block' }}
                    >
                      <img src={docUrl} alt="doc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                    <button className="icon-btn edit" onClick={() => onEdit(l.id)} title="Edit"><Edit size={16} /></button>
                    <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: l.id, name: `License ${l.license_number}` })} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      );
    }

    if (type === 'emission') {
      return (
        <table className="table">
          <thead>
            <tr>
              <th>Test Center</th>
              <th>Test Date</th>
              <th>Expiry Date</th>
              <th>Result</th>
              <th>Cost (LKR)</th>
              <th style={{ textAlign: 'center' }}>Doc</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(e => {
              const baseUrl = api.defaults.baseURL?.replace('/api', '') || 'http://localhost';
              const docUrl = e.attachments?.length > 0 ? `${baseUrl}/storage/${e.attachments[0].file_path}` : null;
              return (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.test_center}</td>
                <td>{e.test_date ? format(new Date(e.test_date), 'MMM dd, yyyy') : '-'}</td>
                <td>{e.expiry_date ? format(new Date(e.expiry_date), 'MMM dd, yyyy') : '-'}</td>
                <td><span className={`badge ${e.result === 'pass' ? 'badge-success' : 'badge-danger'}`}>{e.result}</span></td>
                <td>{e.cost ? parseFloat(e.cost).toLocaleString() : '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  {docUrl && (
                    <button 
                      className="icon-btn" 
                      onClick={() => setViewerImage(docUrl)} 
                      title="View Document"
                      style={{ padding: 0, width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--surface-2)', margin: '0 auto', display: 'block' }}
                    >
                      <img src={docUrl} alt="doc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                    <button className="icon-btn edit" onClick={() => onEdit(e.id)} title="Edit"><Edit size={16} /></button>
                    <button className="icon-btn delete" onClick={() => setDeleteTarget({ id: e.id, name: `Emission Test` })} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
  };

  const getTitleInfo = () => {
    switch(type) {
      case 'insurance': return { title: 'Insurance History', icon: <Shield size={20} color="var(--primary)" /> };
      case 'license': return { title: 'Revenue License History', icon: <FileText size={20} color="var(--info)" /> };
      case 'emission': return { title: 'Emission Test History', icon: <Wind size={20} color="var(--success)" /> };
      default: return { title: 'History', icon: null };
    }
  };

  const info = getTitleInfo();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {info.icon}
          <span>{info.title} - {vehicle.vehicle_number}</span>
        </div>
      } size="xl">
        <div className="card table-container" style={{ padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
          {renderContent()}
        </div>
        {/* <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-2)' }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div> */}

        <ConfirmDeleteModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); fetchData(); }}
          endpoint={deleteTarget ? `/${type === 'insurance' ? 'insurance-policies' : type === 'license' ? 'revenue-licenses' : 'emission-tests'}/${deleteTarget.id}` : ''}
          itemName={deleteTarget?.name}
        />
      </Modal>

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal 
        isOpen={!!viewerImage} 
        onClose={() => setViewerImage(null)} 
        imageUrl={viewerImage} 
       
      />
    </>
  );
};

export default ComplianceHistoryModal;
