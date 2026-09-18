import React, { useState } from 'react';
import { User, Eye, EyeOff, BookOpen, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { authApi } from '../api/authApi';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess, sessionExpiredMessage }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(sessionExpiredMessage || '');

  // Lắng nghe khi có thông báo hết hạn phiên từ App
  React.useEffect(() => {
    if (sessionExpiredMessage) {
      setErrorMessage(sessionExpiredMessage);
    }
  }, [sessionExpiredMessage]);

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
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage('Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại dịch vụ API.');
      }
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
              <BookOpen size={36} color="#ffffff" strokeWidth={2.2} />
            </div>
            <h1 className="hero-title">Xin chào!</h1>
            <p className="hero-subtitle">
              Chào mừng bạn đến với <strong>SmartLib AI</strong> – Hệ thống Quản trị & Nghiệp vụ Thư viện Thông minh (LV23-088).
            </p>

            {/* Hộp gợi ý tài khoản đăng nhập nhanh */}
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
                onClick={() => fillQuickAccount('duchuy3d2005@gmail.com', '25022005H')}
                title="Bấm để kiểm thử chặn quyền Bạn đọc"
              >
                <span>👤 <strong>Trần Đức Huy</strong></span>
                <span className="quick-badge" style={{ backgroundColor: '#64748b' }}>READER</span>
              </div>
            </div>
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
