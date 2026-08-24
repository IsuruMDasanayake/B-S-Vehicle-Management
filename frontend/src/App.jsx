import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import VehiclesList from './pages/Vehicles/VehiclesList';
import HiringDetailsList from './pages/Vehicles/HiringDetailsList';
import VehiclePaymentsList from './pages/Vehicles/VehiclePaymentsList';
import DriversList from './pages/Drivers/DriversList';
import AssignmentsList from './pages/Assignments/AssignmentsList';
import FuelList from './pages/Fuel/FuelList';
import MaintenanceList from './pages/Maintenance/MaintenanceList';
import BreakdownsList from './pages/Breakdowns/BreakdownsList';
import GpsTracking from './pages/Gps/GpsTracking';
import GpsHistory from './pages/Gps/GpsHistory';
import GpsGeofencing from './pages/Gps/GpsGeofencing';
import GpsSettings from './pages/Gps/GpsSettings';
import GpsLayout from './pages/Gps/GpsLayout';
import ReportsDashboard from './pages/Reports/ReportsDashboard';
import SettingsPage from './pages/Settings/SettingsPage';
import Login from './pages/Auth/Login';
import Portal from './pages/Portal/Portal';
import ComingSoon from './pages/Portal/ComingSoon';
import PerformanceDashboard from './pages/Performance/PerformanceDashboard';
import PerformanceLayout from './pages/Performance/PerformanceLayout';

// Phase 1 New Imports
import TripsList from './pages/Trips/TripsList';
import RoutesList from './pages/Routes/RoutesList';
import ExpensesList from './pages/Expenses/ExpensesList';
import VendorsList from './pages/Vendors/VendorsList';
import SparePartsList from './pages/SpareParts/SparePartsList';
import TiresList from './pages/Tires/TiresList';
import AccidentsList from './pages/Accidents/AccidentsList';
import InspectionsList from './pages/Inspections/InspectionsList';
import DepartmentsList from './pages/Departments/DepartmentsList';
import UsersList from './pages/Users/UsersList';
import VehicleRequestsList from './pages/VehicleRequests/VehicleRequestsList';
import AuditLogsList from './pages/AuditLogs/AuditLogsList';
import RideLogsList from './pages/RideLogs/RideLogsList';
import Alerts from './pages/Alerts/Alerts';
import useAuthStore from './store/authStore';

import { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/login" replace />;
  
  const hasRole = allowedRoles.some(role => user?.roles?.includes(role) || user?.role === role);
  return hasRole ? children : <Navigate to="/portal" replace />;
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
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ComingSoon />} />
      <Route path="/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />
      
      <Route path="/admin" element={<RoleProtectedRoute allowedRoles={['super_admin']}><Layout /></RoleProtectedRoute>}>
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
      <Route path="/admin/gps" element={<RoleProtectedRoute allowedRoles={['super_admin']}><GpsLayout /></RoleProtectedRoute>}>
        <Route index element={<GpsTracking />} />
        <Route path="history" element={<GpsHistory />} />
        <Route path="geofences" element={<RoleProtectedRoute allowedRoles={['super_admin', 'fleet_manager']}><GpsGeofencing /></RoleProtectedRoute>} />
        <Route path="settings" element={<RoleProtectedRoute allowedRoles={['super_admin']}><GpsSettings /></RoleProtectedRoute>} />
      </Route>

      {/* Dedicated Performance Dashboard */}
      <Route path="/admin/performance" element={<RoleProtectedRoute allowedRoles={['super_admin']}><PerformanceLayout /></RoleProtectedRoute>}>
        <Route index element={<PerformanceDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
