import { useState, useEffect } from 'react';
import { Activity, TrendingUp, DollarSign, Fuel, Navigation, Calendar, Award } from 'lucide-react';
import api from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line
} from 'recharts';

const PerformanceDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'week', 'month', 'custom'
  const [customDates, setCustomDates] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      let params = {};
      const today = new Date();
      
      if (timeFilter === 'today') {
        params = {
          start_date: today.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        };
      } else if (timeFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        params = {
          start_date: yesterday.toISOString().split('T')[0],
          end_date: yesterday.toISOString().split('T')[0]
        };
      } else if (timeFilter === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        params = {
          start_date: lastWeek.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        };
      } else if (timeFilter === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        params = {
          start_date: lastMonth.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        };
      } else if (timeFilter === 'custom' && customDates.start && customDates.end) {
        params = {
          start_date: customDates.start,
          end_date: customDates.end
        };
      }

      const response = await api.get('/daily-ride-logs-analytics', { params });
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Performance View</h1>
          <p style={{ color: 'var(--text-muted)' }}>Analyze vehicle and driver performance metrics based on approved daily logs.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
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

      {isLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading metrics...</div>
      ) : analytics ? (
        <>
          {/* Key Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '1rem', borderRadius: '50%' }}>
                <TrendingUp size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Net Revenue</p>
                <h2 style={{ margin: 0 }}>Rs {analytics.total_net?.toLocaleString()}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gross: Rs {analytics.total_gross?.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '50%' }}>
                <DollarSign size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Commissions</p>
                <h2 style={{ margin: 0 }}>Rs {analytics.total_commission?.toLocaleString()}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uber/PickMe/HelaGo</p>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '1rem', borderRadius: '50%' }}>
                <Fuel size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Fuel Expenses</p>
                <h2 style={{ margin: 0 }}>Rs {analytics.total_fuel?.toLocaleString()}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cost/KM: Rs {analytics.hire_km > 0 ? (analytics.total_gross / analytics.total_km).toFixed(2) : 0}</p>
              </div>
            </div>
            
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '1rem', borderRadius: '50%' }}>
                <Navigation size={32} />
              </div>
              <div>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Distance</p>
                <h2 style={{ margin: 0 }}>{analytics.total_km} km</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Hire: {analytics.hire_km} km | Empty: {analytics.empty_km} km
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trend Line Chart */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Daily Net Revenue & Fuel Trend</h3>
            <div style={{ width: '100%', height: 350 }}>
              {analytics.daily_trend?.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={analytics.daily_trend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value) => `Rs ${value?.toLocaleString() || 0}`} />
                    <Legend />
                    {analytics.platforms?.map((platform, idx) => (
                      <Line 
                        key={platform.platform} 
                        type="monotone" 
                        dataKey={`${platform.platform}_net`} 
                        name={`${platform.platform} Net`} 
                        stroke={COLORS[idx % COLORS.length]} 
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                      />
                    ))}
                    <Line type="monotone" dataKey="fuel_cost" name="Fuel Expenses" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No trend data available for the selected period</div>
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Revenue vs Commission by Platform</h3>
              <div style={{ width: '100%', height: 300, overflowX: 'auto' }}>
                <div style={{ minWidth: 400, height: '100%' }}>
                  {analytics.platforms?.length > 0 ? (
                    <ResponsiveContainer>
                    <BarChart data={analytics.platforms} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="net_revenue" name="Net Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="commission" name="Commission" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No platform data available</div>
                )}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Gross Revenue Distribution</h3>
              <div style={{ width: '100%', height: 300 }}>
                {analytics.platforms?.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analytics.platforms}
                        dataKey="gross_revenue"
                        nameKey="platform"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.platforms.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `Rs ${value.toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No platform data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ overflowX: 'auto' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={20} color="#f59e0b" /> Top Drivers by Net Revenue
              </h3>
              <table className="table" style={{ width: '100%', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Driver</th>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Net Revenue</th>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Fuel Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_drivers?.length > 0 ? (
                    analytics.top_drivers.map((driver, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>{driver.driver_name}</td>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: '#10b981' }}>Rs {driver.net_revenue?.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>Rs {driver.fuel_cost?.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No driver data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={20} color="#3b82f6" /> Top Vehicles by Net Revenue
              </h3>
              <table className="table" style={{ width: '100%', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Vehicle</th>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Net Revenue</th>
                    <th style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>Fuel Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.top_vehicles?.length > 0 ? (
                    analytics.top_vehicles.map((vehicle, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>{vehicle.vehicle_number}</td>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: '#10b981' }}>Rs {vehicle.net_revenue?.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>Rs {vehicle.fuel_cost?.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicle data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Activity size={64} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <h2>Performance Dashboard</h2>
          <p>No analytics data available yet.</p>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
