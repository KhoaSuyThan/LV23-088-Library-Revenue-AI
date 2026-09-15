import axios from 'axios';

// Địa chỉ cổng API Backend .NET 10 (Kestrel HTTP)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5264';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn JWT Token vào header cho mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartlib_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API xác thực đăng nhập
export const authApi = {
  login: async (username, password) => {
    const response = await apiClient.post('/api/Auth/login', { username, password });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/api/Auth/profile');
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('smartlib_token');
    localStorage.removeItem('smartlib_user');
  }
};
