import { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  FileText,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  User,
  Building,
  Printer,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import VoucherModal from '../Vouchers/VoucherModal';

const CATEGORIES = [
  'Transport & Fuel',
  'Hardware & Small Materials',
  'Site Labor & Helpers',
  'Meals & Refreshments',
  'Courier & Postal',
  'Safety Gear / Consumables',
  'Emergency Site Expense',
  'General / Office'
];

const PettyCashList = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Users & Projects list for dropdowns
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Modals
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Voucher Form
  const [voucherForm, setVoucherForm] = useState({
    account_id: '',
    type: 'expense',
    amount: '',
    paid_to: '',
    category: CATEGORIES[0],
    solar_project_id: '',
    notes: '',
  });
  const [voucherFile, setVoucherFile] = useState(null);
  const [submittingVoucher, setSubmittingVoucher] = useState(false);

  // Float Account Form
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    custodian_id: '',
    solar_project_id: '',
    initial_float: '',
    min_threshold: 5000,
  });
  const [submittingAccount, setSubmittingAccount] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, txRes, usersRes] = await Promise.all([
        api.get('/solar/finance/petty-cash/accounts'),
        api.get('/solar/finance/petty-cash/transactions'),
        api.get('/solar/finance/roles/users'),
      ]);
      setAccounts(accRes.data || []);
      setTransactions(txRes.data.data || []);
      setUsers(usersRes.data.users || []);

      if (accRes.data?.length > 0 && !voucherForm.account_id) {
        setVoucherForm(prev => ({ ...prev, account_id: accRes.data[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load petty cash data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      setSubmittingVoucher(true);
      const data = new FormData();
      data.append('account_id', voucherForm.account_id);
      data.append('type', voucherForm.type);
      data.append('amount', voucherForm.amount);
      data.append('paid_to', voucherForm.paid_to);
      data.append('category', voucherForm.category);
      data.append('solar_project_id', voucherForm.solar_project_id || '');
      data.append('notes', voucherForm.notes);
      if (voucherFile) {
        data.append('receipt', voucherFile);
      }

      await api.post('/solar/finance/petty-cash/transactions', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Petty Cash Voucher created successfully!');
      setShowVoucherModal(false);
      setVoucherForm(prev => ({ ...prev, amount: '', paid_to: '', notes: '' }));
      setVoucherFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create voucher');
    } finally {
      setSubmittingVoucher(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setSubmittingAccount(true);
      await api.post('/solar/finance/petty-cash/accounts', accountForm);
      toast.success('Petty cash float created successfully!');
      setShowAccountModal(false);
      setAccountForm({ account_name: '', custodian_id: '', solar_project_id: '', initial_float: '', min_threshold: 5000 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create float account');
    } finally {
      setSubmittingAccount(false);
    }
  };

  return (
    <div style={{ padding: '0rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Wallet size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
              Petty Cash & Voucher Control
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Manage custodian float balances, track daily petty cash vouchers (PCV), and float replenishment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowAccountModal(true)}
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--surface-2)' }}
          >
            <Plus size={16} /> New Float Account
          </button>
          <button
            onClick={() => setShowVoucherModal(true)}
            className="btn"
            style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Record PCV Voucher
          </button>
        </div>
      </div>

      {/* Float Accounts Grid */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.85rem' }}>Active Float Accounts</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem',
      }}>
        {accounts.map(acc => {
          const isLow = acc.current_balance <= acc.min_threshold;

          return (
            <div
              key={acc.id}
              className="card"
              style={{
                padding: '1.25rem',
                border: `1px solid ${isLow ? '#f59e0b' : 'var(--surface-2)'}`,
                borderLeft: `4px solid ${isLow ? '#f59e0b' : '#10b981'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{acc.account_name}</span>
                {isLow && (
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}>
                    <AlertTriangle size={12} /> Low Balance
                  </span>
                )}
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isLow ? '#f59e0b' : '#10b981', marginBottom: '0.4rem' }}>
                LKR {Number(acc.current_balance).toLocaleString()}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span>Custodian: <strong>{acc.custodian?.name || 'Assigned User'}</strong></span>
                <span>Site: {acc.project?.name || 'General Custody'}</span>
                <span>Initial Float: LKR {Number(acc.initial_float).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions / PCV Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-2)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Recent Petty Cash Vouchers (PCVs)</h2>
        </div>

        <div className="table-container">
          <table className="table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>Voucher No</th>
                <th style={{ padding: '1rem' }}>Float Account</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Amount</th>
                <th style={{ padding: '1rem' }}>Payee / Category</th>
                <th style={{ padding: '1rem' }}>Recorded By</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map(tx => {
                  const isExpense = tx.type === 'expense';

                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 700 }}>{tx.voucher_no}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {tx.account?.account_name}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isExpense ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: isExpense ? '#ef4444' : '#10b981',
                        }}>
                          {isExpense ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 700, color: isExpense ? 'var(--text-primary)' : '#10b981' }}>
                          LKR {Number(tx.amount).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600 }}>{tx.paid_to || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.category}</div>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                        {tx.recorder?.name || 'Staff'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedVoucherForPrint(tx);
                              setShowPrintModal(true);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a'
                            }}
                            title="Print Official PCV"
                          >
                            <Printer size={13} color="#10b981" /> Print PCV
                          </button>

                          {tx.receipt_url && (
                            <a
                              href={tx.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--surface-2)' }}
                              title="View Attached Receipt"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
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

      {/* New PCV Voucher Modal */}
      {showVoucherModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100
        }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Record Petty Cash Voucher (PCV)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Issue a disbursement or float replenishment into a petty cash account.
            </p>

            <form onSubmit={handleCreateVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Select Float Account *
                </label>
                <select
                  required
                  className="form-control"
                  value={voucherForm.account_id}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, account_id: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} (Bal: LKR {Number(acc.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Type
                  </label>
                  <select
                    className="form-control"
                    value={voucherForm.type}
                    onChange={(e) => setVoucherForm(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="expense">Expense (Disburse)</option>
                    <option value="replenishment">Float Replenishment</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Paid To / Payee Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={voucherForm.paid_to}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, paid_to: e.target.value }))}
                  placeholder="e.g. Hardware Lanka, Site Helper Kasun"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Category
                </label>
                <select
                  className="form-control"
                  value={voucherForm.category}
                  onChange={(e) => setVoucherForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Attach Receipt Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setVoucherFile(e.target.files[0])}
                  className="form-control"
                  style={{ width: '100%', padding: '0.4rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVoucher}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
                >
                  {submittingVoucher ? 'Recording...' : 'Record PCV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Setup Float Account Modal */}
      {showAccountModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1100
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Create Petty Cash Float Account
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Setup an independent cash float for a site supervisor, warehouse, or head office.
            </p>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Float Account Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="e.g. Katunayake Site Supervisor Float"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Float Custodian (Responsible User) *
                </label>
                <select
                  required
                  className="form-control"
                  value={accountForm.custodian_id}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, custodian_id: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">Select an employee...</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.name} ({u.finance_role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Initial Float Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    required
                    className="form-control"
                    value={accountForm.initial_float}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, initial_float: e.target.value }))}
                    placeholder="25000"
                    style={{ width: '100%' }}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Low Balance Alert (LKR)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={accountForm.min_threshold}
                    onChange={(e) => setAccountForm(prev => ({ ...prev, min_threshold: e.target.value }))}
                    placeholder="5000"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAccount}
                  className="btn btn-primary"
                  style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#10b981' }}
                >
                  {submittingAccount ? 'Creating...' : 'Create Float'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Official Voucher Modal */}
      <VoucherModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        voucher={selectedVoucherForPrint}
        type="PCV"
      />
    </div>
  );
};

export default PettyCashList;
