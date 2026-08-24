import axios from 'axios';

// Base URL — Vite proxy forwards /api → http://localhost:5000
const api = axios.create({
  baseURL: '/api',
  // Do NOT set Content-Type globally — FormData requests need multipart/form-data
  // with a boundary, which axios sets automatically when given a FormData body.
});

// Attach JWT token from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Base URL for static assets (uploaded images etc.)
export const UPLOADS_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/uploads`
  : 'http://localhost:5000/uploads';

export default api;
