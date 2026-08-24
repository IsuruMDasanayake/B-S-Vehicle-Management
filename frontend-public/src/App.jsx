import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VehicleRequestForm from './VehicleRequestForm';
import DriverLogin from './pages/DriverLogin';
import DriverDashboard from './pages/DriverDashboard';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router basename="/request">
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<VehicleRequestForm />} />
        
        {/* Driver Portal Routes */}
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/driver/dashboard" element={<DriverDashboard />} />
        
        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
