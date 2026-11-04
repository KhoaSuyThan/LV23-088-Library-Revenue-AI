import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Eye, EyeOff, BookOpen, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { authApi } from '../api/authApi';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess, sessionExpiredMessage }) {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(
    location.state?.error || sessionExpiredMessage || ''
  );

  // Lắng nghe khi có thông báo hết hạn phiên hoặc bị chặn quyền từ Router
  useEffect(() => {
    if (sessionExpiredMessage) {
      setErrorMessage(sessionExpiredMessage);
    } else if (location.state?.error) {
      setErrorMessage(location.state.error);
    }
  }, [sessionExpiredMessage, location.state]);

  // Hàm xử lý gửi form đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await authApi.login(username.trim(), password);
      if (res && res.success && res.data) {
        // Lưu token và thông tin người dùng vào localStorage
        localStorage.setItem('smartlib_token', res.data.token);
        localStorage.setItem('smartlib_user', JSON.stringify(res.data));
        
        if (onLoginSuccess) {
          onLoginSuccess(res.data);
        }
      } else {
        setErrorMessage(res.message || 'Đăng nhập không thành công.');
      }
    } catch (err) {
      // 1. Nếu máy chủ Backend phản hồi lỗi nghiệp vụ (403 Forbidden, 401 Unauthorized, 400 BadRequest)
      if (err.response) {
        const serverMsg =
          err.response.data?.message ||
          (err.response.status === 403
            ? 'Tài khoản bạn đọc không có quyền truy cập Cổng quản trị thư viện.'
            : 'Đăng nhập không thành công. Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.');
        setErrorMessage(serverMsg);
        return;
      }

      // 2. Khi ngắt kết nối mạng hoặc máy chủ Backend đang khởi động lại (Cold Start)
      console.error('Không thể kết nối tới máy chủ SmartLib AI Backend:', err);
      setErrorMessage(
        'Không thể kết nối đến máy chủ SmartLib AI (Máy chủ đang khởi động lại hoặc kiểm tra kết nối mạng). Vui lòng thử lại sau vài giây.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Điền nhanh tài khoản kiểm thử
  const fillQuickAccount = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* KHỐI PANEL CONG MÀU XANH BÊN TRÁI (CHUẨN SMARTCV AI) */}
        <div className="hero-panel">
          <div className="hero-content">
            <div className="hero-logo-box">
              <img src="/smartlib_logo.png" alt="SmartLib AI Logo" className="hero-logo-img" />
            </div>
            <h1 className="hero-title">Xin chào!</h1>
            <p className="hero-subtitle">
              Chào mừng bạn đến với <strong>SmartLib AI</strong> – Hệ thống Quản trị & Nghiệp vụ Thư viện Thông minh (LV23-088).
            </p>

            {/* Hộp gợi ý tài khoản đăng nhập nhanh: Chỉ hiển thị trên môi trường phát triển (Local/DEV) */}
            {import.meta.env.DEV && (
              <div className="quick-test-box">
                <div className="quick-test-title">
                  <KeyRound size={14} /> Tài khoản kiểm thử nhanh:
                </div>
                <div
                  className="quick-test-item"
                  onClick={() => fillQuickAccount('khoanv249@gmail.com', '24092005k')}
                  title="Bấm để tự điền thông tin"
                >
                  <span>👤 <strong>Nguyễn Võ Lê Khoa</strong></span>
                  <span className="quick-badge">ADMIN</span>
                </div>
                <div
                  className="quick-test-item"
                  onClick={() => fillQuickAccount('nguyennhatnam213654@gmail.com', '14022005N')}
                  title="Bấm để tự điền thông tin Nhân viên"
                >
                  <span>👤 <strong>Nguyễn Thành Nhất Nam</strong></span>
                  <span className="quick-badge">STAFF</span>
                </div>
                <div
                  className="quick-test-item"
                  onClick={() => fillQuickAccount('demo', 'Demo@123')}
                  title="Bấm để trải nghiệm tài khoản Demo (Chỉ đọc)"
                >
                  <span>🛡️ <strong>Khách Demo</strong></span>
                  <span className="quick-badge" style={{ backgroundColor: '#10b981' }}>DEMO</span>
                </div>
                <div
                  className="quick-test-item"
                  onClick={() => fillQuickAccount('duchuy3d2005@gmail.com', '25022005H')}
                  title="Bấm để kiểm thử chặn quyền Bạn đọc"
                >
                  <span>👤 <strong>Trần Đức Huy</strong></span>
                  <span className="quick-badge" style={{ backgroundColor: '#64748b' }}>READER</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KHỐI FORM ĐĂNG NHẬP BÊN PHẢI */}
        <div className="form-panel">
          <div className="form-container">
            <div className="form-header">
              <h2 className="form-title">Đăng nhập</h2>
              <p className="form-desc">Cổng thông tin nội bộ dành riêng cho Cán bộ & Nhân viên</p>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMessage && (
              <div className="alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Ô nhập Email / Username */}
              <div className="input-group">
                <input
                  type="text"
                  className="input-box"
                  placeholder="Tên đăng nhập hoặc Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <div className="input-icon-static">
                  <User size={19} />
                </div>
              </div>

              {/* Ô nhập Password */}
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-box"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              {/* Tùy chọn Ghi nhớ & Quên mật khẩu */}
              <div className="form-options">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Ghi nhớ đăng nhập
                </label>
                <a
                  href="#forgot"
                  className="forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Vui lòng liên hệ Quản trị viên hệ thống (admin: khoanv249@gmail.com) để được cấp lại mật khẩu.');
                  }}
                >
                  Bạn quên mật khẩu?
                </a>
              </div>

              {/* Nút Đăng nhập */}
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <span>Đăng nhập</span>
                )}
              </button>

              {/* Phân cách và Nút Trải nghiệm nhanh với tài khoản Demo */}
              <div className="demo-login-divider">
                <span>hoặc trải nghiệm ngay</span>
              </div>
              <button
                type="button"
                className="demo-quick-btn"
                onClick={() => {
                  setUsername('demo');
                  setPassword('Demo@123');
                  setErrorMessage('');
                }}
                title="Bấm để tự điền tài khoản Demo và trải nghiệm hệ thống"
              >
                <span className="demo-btn-icon">🛡️</span>
                <span>Trải nghiệm nhanh với <strong>Tài khoản Demo</strong></span>
              </button>
              <p className="demo-note-text">
                Tài khoản trải nghiệm chỉ đọc (Read-only), bảo toàn 100% dữ liệu gốc.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
