import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
