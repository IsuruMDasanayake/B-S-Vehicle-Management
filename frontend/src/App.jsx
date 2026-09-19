import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Vehicle/Dashboard/Dashboard';
import VehiclesList from './pages/Vehicle/Vehicles/VehiclesList';
import HiringDetailsList from './pages/Vehicle/Vehicles/HiringDetailsList';
import VehiclePaymentsList from './pages/Vehicle/Vehicles/VehiclePaymentsList';
import DriversList from './pages/Vehicle/Drivers/DriversList';
import AssignmentsList from './pages/Vehicle/Assignments/AssignmentsList';
import FuelList from './pages/Vehicle/Fuel/FuelList';
import MaintenanceList from './pages/Vehicle/Maintenance/MaintenanceList';
import BreakdownsList from './pages/Vehicle/Breakdowns/BreakdownsList';
import GpsTracking from './pages/Vehicle/Gps/GpsTracking';
import GpsHistory from './pages/Vehicle/Gps/GpsHistory';
import GpsGeofencing from './pages/Vehicle/Gps/GpsGeofencing';
import GpsSettings from './pages/Vehicle/Gps/GpsSettings';
import GpsLayout from './pages/Vehicle/Gps/GpsLayout';
import ReportsDashboard from './pages/Vehicle/Reports/ReportsDashboard';
import SettingsPage from './pages/Vehicle/Settings/SettingsPage';
import Login from './pages/Auth/Login';
import Portal from './pages/Portal/Portal';
import ComingSoon from './pages/Portal/ComingSoon';
import PerformanceDashboard from './pages/Vehicle/Performance/PerformanceDashboard';
import PerformanceLayout from './pages/Vehicle/Performance/PerformanceLayout';
import DriverAnalytics from './pages/Vehicle/Performance/DriverAnalytics';
import VehicleAnalytics from './pages/Vehicle/Performance/VehicleAnalytics';
import ManageLogs from './pages/Vehicle/Performance/ManageLogs';
import PerformanceIntelligence from './pages/Vehicle/Performance/PerformanceIntelligence';

// Phase 1 New Imports
import TripsList from './pages/Vehicle/Trips/TripsList';
import RoutesList from './pages/Vehicle/Routes/RoutesList';
import ExpensesList from './pages/Vehicle/Expenses/ExpensesList';
import VendorsList from './pages/Vehicle/Vendors/VendorsList';
import SparePartsList from './pages/Vehicle/SpareParts/SparePartsList';
import TiresList from './pages/Vehicle/Tires/TiresList';
import AccidentsList from './pages/Vehicle/Accidents/AccidentsList';
import InspectionsList from './pages/Vehicle/Inspections/InspectionsList';
import DepartmentsList from './pages/Vehicle/Departments/DepartmentsList';
import UsersList from './pages/Vehicle/Users/UsersList';
import VehicleRequestsList from './pages/Vehicle/VehicleRequests/VehicleRequestsList';
import AuditLogsList from './pages/Vehicle/AuditLogs/AuditLogsList';
import RideLogsList from './pages/Vehicle/RideLogs/RideLogsList';
import DepositReview from './pages/Vehicle/Deposits/DepositReview';
import Alerts from './pages/Vehicle/Alerts/Alerts';
import useAuthStore from './store/authStore';

// CircleGroup Divisions
import CircleGroupLanding from './pages/Home/CircleGroupLanding';
import SolarLogin from './pages/Solar/SolarLogin';
import SolarPortal from './pages/Solar/SolarPortal';

// Blank placeholder for circlegroup.lk root (future public website)
const BlankPlaceholder = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: 'sans-serif', flexDirection: 'column', gap: '1rem' }}>
    <span style={{ fontSize: '2rem' }}>⭕</span>
    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>circlegroup.lk</p>
  </div>
);

import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/vehicle/login" replace />;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/vehicle/login" replace />;
  
  const hasRole = allowedRoles.some(role => user?.roles?.includes(role) || user?.role === role);
  return hasRole ? children : <Navigate to="/vehicle/portal" replace />;
};

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const fetchUser = useAuthStore(state => state.fetchUser);

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  if (isAuthenticated && !user) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
  }

  return (
    <Routes>
      {/* ── CircleGroup Root — blank placeholder (public website comes later) ── */}
      <Route path="/" element={<BlankPlaceholder />} />

      {/* ── CircleGroup Division Portal ─────────────────────────────────────── */}
      <Route path="/portal" element={<CircleGroupLanding />} />

      {/* ── Vehicle Division ─────────────────────────────────────────── */}
      <Route path="/vehicle/login" element={<Login />} />
      <Route path="/vehicle/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />

      <Route path="/vehicle/admin" element={<RoleProtectedRoute allowedRoles={['super_admin']}><Layout /></RoleProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Fleet */}
        <Route path="vehicles" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><VehiclesList /></RoleProtectedRoute>} />
        <Route path="hiring-details" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><HiringDetailsList /></RoleProtectedRoute>} />
        <Route path="vehicle-payments" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><VehiclePaymentsList /></RoleProtectedRoute>} />
        <Route path="drivers" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><DriversList /></RoleProtectedRoute>} />
        <Route path="assignments" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'driver', 'dept_manager']}><AssignmentsList /></RoleProtectedRoute>} />
        <Route path="vehicle-requests" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'dept_manager']}><VehicleRequestsList /></RoleProtectedRoute>} />
        
        {/* Operations */}
        <Route path="trips" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><TripsList /></RoleProtectedRoute>} />
        <Route path="routes" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><RoutesList /></RoleProtectedRoute>} />
        <Route path="ride-logs" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><RideLogsList /></RoleProtectedRoute>} />
        <Route path="fuel" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'driver']}><FuelList /></RoleProtectedRoute>} />
        
        {/* Maintenance & Safety */}
        <Route path="maintenance" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'mechanic']}><MaintenanceList /></RoleProtectedRoute>} />
        <Route path="breakdowns" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'driver', 'mechanic']}><BreakdownsList /></RoleProtectedRoute>} />
        <Route path="accidents" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><AccidentsList /></RoleProtectedRoute>} />
        <Route path="inspections" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'mechanic']}><InspectionsList /></RoleProtectedRoute>} />
        <Route path="tires" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'mechanic']}><TiresList /></RoleProtectedRoute>} />
        <Route path="spare-parts" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'mechanic']}><SparePartsList /></RoleProtectedRoute>} />

        {/* Finances & Vendors */}
        <Route path="expenses" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><ExpensesList /></RoleProtectedRoute>} />
        <Route path="vendors" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><VendorsList /></RoleProtectedRoute>} />
        
        {/* Organization */}
        <Route path="departments" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><DepartmentsList /></RoleProtectedRoute>} />
        <Route path="users" element={<RoleProtectedRoute allowedRoles={['super_admin']}><UsersList /></RoleProtectedRoute>} />
        <Route path="audit-logs" element={<RoleProtectedRoute allowedRoles={['super_admin']}><AuditLogsList /></RoleProtectedRoute>} />
        <Route path="alerts" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><Alerts /></RoleProtectedRoute>} />
        
        {/* Reports & Settings */}
        <Route path="reports" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager', 'dept_manager']}><ReportsDashboard /></RoleProtectedRoute>} />
        <Route path="settings" element={<RoleProtectedRoute allowedRoles={['super_admin']}><SettingsPage /></RoleProtectedRoute>} />
      </Route>

      {/* Dedicated GPS Dashboard */}
      <Route path="/vehicle/admin/gps" element={<RoleProtectedRoute allowedRoles={['super_admin']}><GpsLayout /></RoleProtectedRoute>}>
        <Route index element={<GpsTracking />} />
        <Route path="history" element={<GpsHistory />} />
        <Route path="geofences" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><GpsGeofencing /></RoleProtectedRoute>} />
        <Route path="settings" element={<RoleProtectedRoute allowedRoles={['super_admin']}><GpsSettings /></RoleProtectedRoute>} />
      </Route>

      {/* Dedicated Performance Dashboard */}
      <Route path="/vehicle/admin/performance" element={<RoleProtectedRoute allowedRoles={['super_admin']}><PerformanceLayout /></RoleProtectedRoute>}>
        <Route index element={<PerformanceDashboard />} />
        <Route path="drivers" element={<DriverAnalytics />} />
        <Route path="vehicles" element={<VehicleAnalytics />} />
        <Route path="deposits" element={<DepositReview />} />
        <Route path="manage" element={<ManageLogs />} />
        <Route path="intelligence" element={<PerformanceIntelligence />} />
      </Route>

      {/* ── Solar Division (Skeleton) ─────────────────────────────────── */}
      <Route path="/solar/login" element={<SolarLogin />} />
      <Route path="/solar/portal" element={<ProtectedRoute><SolarPortal /></ProtectedRoute>} />

      {/* ── Legacy redirect — old /login path ────────────────────────── */}
      <Route path="/login" element={<Navigate to="/vehicle/login" replace />} />
      <Route path="/portal" element={<Navigate to="/vehicle/portal" replace />} />
      <Route path="/vehicle/admin/*" element={<Navigate to="/vehicle/admin" replace />} />
    </Routes>
  );
}

export default App;


