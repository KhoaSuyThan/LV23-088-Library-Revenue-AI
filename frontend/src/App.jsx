import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Kiểm tra xem đã có phiên đăng nhập lưu trong localStorage chưa
    const token = localStorage.getItem('smartlib_token');
    const userJson = localStorage.getItem('smartlib_user');
    if (token && userJson) {
      try {
        setCurrentUser(JSON.parse(userJson));
      } catch (e) {
        localStorage.removeItem('smartlib_token');
        localStorage.removeItem('smartlib_user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <>
      {currentUser ? (
        <DashboardPage user={currentUser} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </>
  );
}
