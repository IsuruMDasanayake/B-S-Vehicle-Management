import { useState } from 'react';
import axios from 'axios';
import { Car, CalendarDays, User, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://localhost/api', // Pointing to Nginx reverse proxy
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    requester_name: '',
    requester_email: '',
    requester_contact: '',
    requested_vehicle_type: 'Car',
    request_date: '',
    return_date: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await api.post('/public/vehicle-requests', formData);
      setIsSuccess(true);
      toast.success('Your vehicle request has been submitted successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 mb-8">
            Thank you, {formData.requester_name}. We have received your vehicle request and will get back to you shortly at {formData.requester_email}.
          </p>
          <button 
            onClick={() => {
              setIsSuccess(false);
              setFormData({...formData, request_date: '', return_date: ''});
            }}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-right" />
      
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Car className="w-8 h-8 text-blue-600" />
          </div> */}
          <h1 className="text-3xl -mt-2 font-extrabold text-slate-900 sm:text-4xl">
            Vehicle Request Portal
          </h1>
          <p className="mt-4 text-lg text-slate-500 -py-5">
            Submit a request to book a vehicle from B&S Transport.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="requester_name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="requester_name"
                    id="requester_name"
                    required
                    value={formData.requester_name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="requester_email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    name="requester_email"
                    id="requester_email"
                    required
                    value={formData.requester_email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="requester_contact" className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Number
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    name="requester_contact"
                    id="requester_contact"
                    required
                    value={formData.requester_contact}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="requested_vehicle_type" className="block text-sm font-medium text-slate-700 mb-1">
                  Requested Vehicle Type
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Car className="h-5 w-5 text-slate-400" />
                  </div>
                  <select
                    name="requested_vehicle_type"
                    id="requested_vehicle_type"
                    required
                    value={formData.requested_vehicle_type}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                  >
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="SUV">SUV</option>
                    <option value="SUV">Hybrid</option>
                    <option value="Pickup Truck">Pickup Truck</option>
                    <option value="Box Truck">Box Truck</option>
                    <option value="Bus">Bus</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="request_date" className="block text-sm font-medium text-slate-700 mb-1">
                  Pickup Date
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    name="request_date"
                    id="request_date"
                    required
                    value={formData.request_date}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="return_date" className="block text-sm font-medium text-slate-700 mb-1">
                  Return Date
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    name="return_date"
                    id="return_date"
                    required
                    value={formData.return_date}
                    onChange={handleChange}
                    min={formData.request_date}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >   
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting Request...
                  </span>
                ) : 'Submit Vehicle Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
