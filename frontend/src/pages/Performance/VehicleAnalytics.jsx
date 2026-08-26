import { useState, useEffect } from 'react';
import { CarFront, Search, Calendar } from 'lucide-react';
import api from '../../services/api';

const VehicleAnalytics = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      let params = { limit: 'all', group_by_date: true };
      const today = new Date();
      
      if (timeFilter === 'today') {
        params.start_date = today.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (timeFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        params.start_date = yesterday.toISOString().split('T')[0];
        params.end_date = yesterday.toISOString().split('T')[0];
      } else if (timeFilter === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        params.start_date = lastWeek.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (timeFilter === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        params.start_date = lastMonth.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (timeFilter === 'custom' && customDates.start && customDates.end) {
        params.start_date = customDates.start;
        params.end_date = customDates.end;
      }

      const response = await api.get('/daily-ride-logs-analytics', { params });
      setVehicles(response.data.data.top_vehicles || []);
    } catch (error) {
      console.error('Failed to fetch vehicle analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Vehicle Analytics</h1>
          <p style={{ color: 'var(--text-muted)' }}>Detailed performance metrics for all vehicles.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search vehicle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={18} style={{ color: 'var(--text-muted)' }} />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 500 }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>
          
          {timeFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <input 
                type="date" 
                value={customDates.start} 
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })} 
                style={{ border: 'none', outline: 'none', fontSize: '0.9rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input 
                type="date" 
                value={customDates.end} 
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })} 
                style={{ border: 'none', outline: 'none', fontSize: '0.9rem' }}
              />
              <button 
                onClick={fetchAnalytics}
                className="btn btn-primary"
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                disabled={!customDates.start || !customDates.end}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Date</th>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Vehicle No</th>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Net Revenue</th>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Fuel Expenses</th>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Total Distance</th>
              <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Profit / KM</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : filteredVehicles.length > 0 ? (
              filteredVehicles.map((vehicle, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    {new Date(vehicle.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CarFront size={16} color="var(--text-muted)" />
                    {vehicle.vehicle_number}
                  </td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: '#10b981' }}>
                    Rs {vehicle.net_revenue?.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', color: '#ef4444' }}>
                    Rs {vehicle.fuel_cost?.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
                    {vehicle.total_km} km
                  </td>
                  <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', fontWeight: '500' }}>
                    Rs {vehicle.total_km > 0 ? (vehicle.net_revenue / vehicle.total_km).toFixed(2) : 0}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleAnalytics;
