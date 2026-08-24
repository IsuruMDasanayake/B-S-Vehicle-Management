import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarFront } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const DriverLogin = () => {
  const [contactNumber, setContactNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await api.post('/auth/driver/login', { contact_number: contactNumber });
      const { token, user } = response.data;
      
      // Ensure this user has the driver role
      if (user.role !== 'driver') {
        toast.error('Access denied: Driver portal only.');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('driver_token', token);
      localStorage.setItem('driver_user', JSON.stringify(user));
      
      toast.success('Login successful!');
      navigate('/driver/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
            <CarFront size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Portal</h1>
          <p className="text-gray-500 mt-2">Sign in to manage your daily ride logs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input 
              type="tel" 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="e.g. 0771234567"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DriverLogin;
