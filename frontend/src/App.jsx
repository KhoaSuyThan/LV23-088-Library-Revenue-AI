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

  const protectedElement = (
    <ProtectedLayout
      currentUser={currentUser}
      location={location}
      onUserUpdated={setCurrentUser}
      onLogout={handleLogout}
    />
  );

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
      <Route path="/dashboard" element={protectedElement} />
      <Route path="/catalog" element={protectedElement} />
      <Route path="/circulation" element={protectedElement} />
      <Route path="/revenue" element={protectedElement} />
      <Route path="/revenue/*" element={protectedElement} />
      <Route path="/readers" element={protectedElement} />
      <Route path="/settings" element={protectedElement} />
      <Route path="/settings/*" element={protectedElement} />

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

/**
 * Layout được bảo vệ dành riêng cho Thủ thư (Admin & Staff).
 * Định nghĩa bên ngoài AppContent để tránh nested component re-declaration anti-pattern.
 */
function ProtectedLayout({ currentUser, location, onUserUpdated, onLogout }) {
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // Chặn dứt điểm tài khoản Bạn đọc (Reader) truy cập Cổng quản trị
  if (currentUser.role === 'Reader') {
    localStorage.removeItem('smartlib_token');
    localStorage.removeItem('smartlib_user');
    return (
      <Navigate
        to="/login"
        replace
        state={{ error: 'Tài khoản Bạn đọc không có quyền truy cập Cổng Quản trị Thư viện.' }}
      />
    );
  }
  return (
    <DashboardPage
      user={currentUser}
      onUserUpdated={onUserUpdated}
      onLogout={onLogout}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
