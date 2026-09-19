import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

/**
 * Component xử lý định tuyến phân hệ và trạng thái xác thực
 */
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('');

  // Khởi tạo currentUser đồng bộ từ localStorage để không bị giật trang khi F5 Refresh
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = localStorage.getItem('smartlib_token');
      const userJson = localStorage.getItem('smartlib_user');
      if (token && userJson) {
        return JSON.parse(userJson);
      }
    } catch (e) {
      localStorage.removeItem('smartlib_token');
      localStorage.removeItem('smartlib_user');
    }
    return null;
  });

  useEffect(() => {
    // Lắng nghe sự kiện 401 Unauthorized từ Axios Interceptor để tự động chuyển về Login
    const handleAuthExpired = () => {
      setCurrentUser(null);
      setSessionExpiredMsg('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      navigate('/login');
    };

    window.addEventListener('smartlib:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('smartlib:auth_expired', handleAuthExpired);
    };
  }, [navigate]);

  // Xử lý khi đăng nhập thành công
  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setSessionExpiredMsg('');
    navigate('/dashboard');
  };

  // Xử lý đăng xuất chủ động
  const handleLogout = () => {
    setCurrentUser(null);
    setSessionExpiredMsg('');
    navigate('/login');
  };

  // Layout được bảo vệ dành cho người dùng đã xác thực
  const ProtectedLayout = () => {
    if (!currentUser) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return <DashboardPage user={currentUser} onLogout={handleLogout} />;
  };

  return (
    <Routes>
      {/* Màn hình Đăng nhập */}
      <Route
        path="/login"
        element={
          currentUser ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              sessionExpiredMessage={sessionExpiredMsg}
            />
          )
        }
      />

      {/* Các Route Phân hệ được bảo vệ bằng tài khoản đăng nhập */}
      <Route path="/dashboard" element={<ProtectedLayout />} />
      <Route path="/catalog" element={<ProtectedLayout />} />
      <Route path="/circulation" element={<ProtectedLayout />} />
      <Route path="/revenue" element={<ProtectedLayout />} />
      <Route path="/readers" element={<ProtectedLayout />} />
      <Route path="/settings" element={<ProtectedLayout />} />
      <Route path="/settings/*" element={<ProtectedLayout />} />

      {/* Điều hướng mặc định */}
      <Route
        path="/"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="*"
        element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
