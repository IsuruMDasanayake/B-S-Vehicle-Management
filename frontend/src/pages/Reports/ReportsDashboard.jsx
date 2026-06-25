import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { DollarSign, Droplet, Wrench, Calendar, Download } from 'lucide-react';
import { format, subMonths } from 'date-fns';

const ReportsDashboard = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/reports/summary?from=${dateRange.from}&to=${dateRange.to}`);
      setReportData(data);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{
        background: `var(--${color}-alpha)`,
        color: `var(--${color})`,
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        display: 'flex'
      }}>
        <Icon size={28} />
      </div>
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
          {title}
        </p>
        <h3 style={{ fontSize: '1.75rem', marginBottom: 0 }}>{value}</h3>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Reports & Analytics</h1>
          <p style={{ color: 'var(--text-muted)' }}>Overview of fleet expenses and operations</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
            <Calendar size={18} color="var(--text-muted)" />
            <input 
              type="date" 
              value={dateRange.from} 
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input 
              type="date" 
              value={dateRange.to} 
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none' }}
            />
          </div>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {isLoading || !reportData ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Analyzing data...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <StatCard 
              title="Total Fuel Cost" 
              value={`LKR ${parseFloat(reportData.total_fuel_cost).toLocaleString()}`} 
              icon={Droplet} color="primary" 
            />
            <StatCard 
              title="Maintenance Cost" 
              value={`LKR ${parseFloat(reportData.total_maintenance_cost).toLocaleString()}`} 
              icon={Wrench} color="warning" 
            />
            <StatCard 
              title="Other Expenses" 
              value={`LKR ${parseFloat(reportData.total_expenses).toLocaleString()}`} 
              icon={DollarSign} color="danger" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Fuel Consumption by Vehicle</h3>
              {reportData.fuel_by_vehicle.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No fuel data for this period.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reportData.fuel_by_vehicle.map((item, idx) => {
                    const maxLitres = Math.max(...reportData.fuel_by_vehicle.map(i => parseFloat(i.total_litres)));
                    const percentage = (parseFloat(item.total_litres) / maxLitres) * 100;
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{item.vehicle?.vehicle_number || 'Unknown'}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{parseFloat(item.total_litres).toFixed(1)} L (LKR {parseFloat(item.total_cost).toLocaleString()})</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Expenses by Category</h3>
              {reportData.expense_by_type.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No expense data for this period.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reportData.expense_by_type.map((item, idx) => {
                    const maxTotal = Math.max(...reportData.expense_by_type.map(i => parseFloat(i.total)));
                    const percentage = (parseFloat(item.total) / maxTotal) * 100;
                    return (
                      <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.expense_type.replace('_', ' ')}</span>
                          <span style={{ color: 'var(--text-muted)' }}>LKR {parseFloat(item.total).toLocaleString()}</span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--danger)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsDashboard;
