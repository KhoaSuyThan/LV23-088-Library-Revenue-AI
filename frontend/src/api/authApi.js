import axios from 'axios';

// Địa chỉ cổng API Backend .NET 10 (Sử dụng 127.0.0.1 để tránh lỗi nghẽn socket IPv6 ::1 trên Windows Chrome)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5264';

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

// Tự động bắt lỗi 401 Unauthorized khi Token hết hạn hoặc không hợp lệ
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Xóa phiên làm việc trong localStorage
      localStorage.removeItem('smartlib_token');
      localStorage.removeItem('smartlib_user');
      // Phát sự kiện toàn cục để App.jsx tự động chuyển về trang đăng nhập
      window.dispatchEvent(new CustomEvent('smartlib:auth_expired'));
    }
    return Promise.reject(error);
  }
);

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
