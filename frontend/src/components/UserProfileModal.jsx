import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Camera,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Building2,
  Fingerprint,
  RefreshCw,
  Upload
} from 'lucide-react';
import { authApi } from '../api/authApi';
import './UserProfileModal.css';

// Danh sách các ảnh đại diện mẫu chất lượng cao
const PRESET_AVATARS = [
  {
    id: 'preset-1',
    label: 'Nam lịch lãm',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-2',
    label: 'Nữ năng động',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-3',
    label: 'Nữ trí thức',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-4',
    label: 'Nam hiện đại',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-5',
    label: 'Nữ quản lý',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'preset-6',
    label: 'Chuyên gia',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80'
  }
];

export default function UserProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  // Đổi mật khẩu
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Trạng thái xử lý form
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);

  // Khởi tạo thông tin người dùng khi mở modal
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.fullName || '');
      setErrorMsg('');
      setSuccessMsg('');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPresetPicker(false);

      // Lấy avatar tùy chỉnh đã lưu trong localStorage (theo userId hoặc email)
      const storageKey = `smartlib_avatar_${user.userID || user.email || 'default'}`;
      const savedAvatar = localStorage.getItem(storageKey);
      setAvatarUrl(savedAvatar || user.avatarUrl || PRESET_AVATARS[0].url);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Xử lý tải ảnh đại diện từ máy tính
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Dung lượng hình ảnh không được vượt quá 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result;
      if (base64Data) {
        setAvatarUrl(base64Data);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Chọn avatar từ thư viện mẫu
  const handleSelectPreset = (url) => {
    setAvatarUrl(url);
    setShowPresetPicker(false);
  };

  // Lưu thông tin cá nhân
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Họ và tên không được để trống.');
      return;
    }

    // Nếu người dùng chọn đổi mật khẩu, kiểm tra các trường mật khẩu
    if (isChangingPassword) {
      if (!currentPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu hiện tại để xác nhận quyền thay đổi.');
        return;
      }
      if (!newPassword) {
        setErrorMsg('Vui lòng nhập mật khẩu mới.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Gọi API cập nhật thông tin Backend
      const updateData = {
        fullName: fullName.trim()
      };
      if (isChangingPassword && currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const res = await authApi.updateProfile(updateData);

      // 2. Lưu avatar mới vào localStorage theo tài khoản
      const storageKey = `smartlib_avatar_${user.userID || user.email || 'default'}`;
      localStorage.setItem(storageKey, avatarUrl);

      // 3. Cập nhật đối tượng user trong localStorage
      const updatedUser = {
        ...user,
        fullName: res.data?.fullName || fullName.trim(),
        avatarUrl: avatarUrl
      };
      localStorage.setItem('smartlib_user', JSON.stringify(updatedUser));

      setSuccessMsg('Cập nhật thông tin cá nhân thành công!');

      // 4. Đồng bộ ngược lại cho component cha (DashboardPage / App)
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }

      // Xóa form mật khẩu sau khi đổi thành công
      if (isChangingPassword) {
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      // Tự động đóng modal sau 1.5 giây
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        err.message ||
        'Có lỗi xảy ra trong quá trình cập nhật thông tin.';
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  // Xác định nhãn vai trò hiển thị
  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { label: 'Quản trị viên hệ thống (Admin)', color: '#2563eb', bg: '#eff6ff', icon: '👑' };
      case 'staff':
      case 'librarian':
        return { label: 'Thủ thư nghiệp vụ (Staff)', color: '#059669', bg: '#ecfdf5', icon: '📚' };
      default:
        return { label: role || 'Người dùng', color: '#64748b', bg: '#f1f5f9', icon: '👤' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="user-profile-modal-backdrop" onClick={onClose}>
      <div
        className="user-profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          className="profile-modal-close-btn"
          onClick={onClose}
          title="Đóng cửa sổ (Esc)"
        >
          <X size={20} />
        </button>

        {/* Banner Cover phía trên */}
        <div className="profile-card-cover">
          <div className="cover-badge">
            <Sparkles size={14} /> SmartLib AI Account
          </div>
        </div>

        {/* Khối Avatar & Thông tin cơ bản */}
        <div className="profile-card-header">
          <div className="profile-avatar-wrapper">
            <img
              src={avatarUrl}
              alt={user?.fullName || 'Avatar'}
              className="profile-avatar-large"
              onError={(e) => {
                e.target.src = PRESET_AVATARS[0].url;
              }}
            />
            {/* Chấm tròn trạng thái Online */}
            <span className="profile-status-dot" title="Đang trực tuyến"></span>

            {/* Nút trigger thay đổi avatar */}
            <button
              type="button"
              className="profile-avatar-change-btn"
              onClick={() => setShowPresetPicker(!showPresetPicker)}
              title="Thay đổi ảnh đại diện"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="profile-identity">
            <h2 className="profile-display-name">
              {fullName || user?.fullName || 'Người dùng SmartLib'}
            </h2>
            <div className="profile-role-pill" style={{ color: roleInfo.color, backgroundColor: roleInfo.bg }}>
              <span className="role-icon">{roleInfo.icon}</span>
              <span className="role-text">{roleInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Khối chọn Preset Avatar nhanh hoặc Tải ảnh lên */}
        {showPresetPicker && (
          <div className="profile-avatar-picker-panel">
            <div className="picker-panel-header">
              <span className="picker-panel-title">Chọn ảnh đại diện</span>
              <button
                type="button"
                className="picker-upload-action"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} /> Tải ảnh từ máy
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            <div className="preset-avatars-grid">
              {PRESET_AVATARS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  className={`preset-avatar-item ${avatarUrl === preset.url ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset.url)}
                  title={preset.label}
                >
                  <img src={preset.url} alt={preset.label} />
                  {avatarUrl === preset.url && (
                    <span className="preset-check-icon">
                      <Check size={12} color="#ffffff" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thông báo kết quả / lỗi */}
        {errorMsg && (
          <div className="profile-alert profile-alert-danger">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="profile-alert profile-alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form chỉnh sửa thông tin */}
        <form onSubmit={handleSubmit} className="profile-form-body">
          {/* Nhóm trường: Thông tin cơ bản */}
          <div className="profile-section">
            <div className="section-title">
              <User size={16} /> Thông tin cá nhân & Công tác
            </div>

            <div className="profile-form-grid">
              {/* Họ và tên (Cho phép sửa) */}
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Họ và tên hiển thị <span className="text-danger">*</span>
                </label>
                <div className="profile-input-wrapper">
                  <User size={16} className="input-icon-left" />
                  <input
                    type="text"
                    className="profile-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    required
                  />
                </div>
              </div>

              {/* Tên đăng nhập (Read-only) */}
              <div className="profile-form-group">
                <label className="profile-form-label">Tên tài khoản (Username)</label>
                <div className="profile-input-wrapper is-readonly">
                  <Fingerprint size={16} className="input-icon-left text-muted" />
                  <input
                    type="text"
                    className="profile-input"
                    value={user?.username || ''}
                    readOnly
                    disabled
                  />
                  <Lock size={14} className="input-icon-right text-muted" title="Cố định" />
                </div>
              </div>

              {/* Email đăng nhập - KHÔNG ĐƯỢC PHÉP ĐỔI */}
              <div className="profile-form-group full-width">
                <div className="email-label-row">
                  <label className="profile-form-label">
                    Email tài khoản đăng nhập <span className="badge-immutable">Cố định</span>
                  </label>
                  <span className="email-explain-note">
                    (Email dùng để định danh đăng nhập nên không thể sửa đổi)
                  </span>
                </div>
                <div className="profile-input-wrapper is-readonly is-email-locked">
                  <Mail size={16} className="input-icon-left text-muted" />
                  <input
                    type="email"
                    className="profile-input"
                    value={user?.email || ''}
                    readOnly
                    disabled
                  />
                  <div className="locked-badge" title="Tài khoản đăng nhập được bảo mật">
                    <Lock size={14} /> Khóa
                  </div>
                </div>
              </div>

              {/* Phân hệ công tác & Mã thủ thư */}
              <div className="profile-form-group">
                <label className="profile-form-label">Bộ phận phụ trách</label>
                <div className="profile-input-wrapper is-readonly">
                  <Building2 size={16} className="input-icon-left text-muted" />
                  <input
                    type="text"
                    className="profile-input"
                    value={user?.role === 'Admin' ? 'Ban Quản Trị Hệ Thống Thư Viện' : 'Ban Vận Hành & Khai Thác Nghiệp Vụ'}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">Mã định danh hệ thống</label>
                <div className="profile-input-wrapper is-readonly">
                  <Shield size={16} className="input-icon-left text-muted" />
                  <input
                    type="text"
                    className="profile-input"
                    value={`#USR-${String(user?.userID || 1).padStart(4, '0')}`}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Nhóm trường: Đổi mật khẩu (Tùy chọn) */}
          <div className="profile-section">
            <div className="section-title-toggle">
              <div className="section-title">
                <KeyRound size={16} /> Bảo mật & Đổi mật khẩu
              </div>
              <button
                type="button"
                className={`pass-toggle-btn ${isChangingPassword ? 'active' : ''}`}
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                {isChangingPassword ? 'Hủy đổi mật khẩu' : 'Đổi mật khẩu mới'}
              </button>
            </div>

            {isChangingPassword && (
              <div className="password-change-container">
                {/* Mật khẩu hiện tại */}
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    Mật khẩu hiện tại <span className="text-danger">*</span>
                  </label>
                  <div className="profile-input-wrapper">
                    <KeyRound size={16} className="input-icon-left" />
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      className="profile-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu đang dùng"
                    />
                    <button
                      type="button"
                      className="pass-eye-btn"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="password-grid-row">
                  {/* Mật khẩu mới */}
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      Mật khẩu mới (Tối thiểu 6 ký tự) <span className="text-danger">*</span>
                    </label>
                    <div className="profile-input-wrapper">
                      <Lock size={16} className="input-icon-left" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        className="profile-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mật khẩu mới an toàn"
                      />
                      <button
                        type="button"
                        className="pass-eye-btn"
                        onClick={() => setShowNewPass(!showNewPass)}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div className="profile-form-group">
                    <label className="profile-form-label">
                      Xác nhận mật khẩu mới <span className="text-danger">*</span>
                    </label>
                    <div className="profile-input-wrapper">
                      <Lock size={16} className="input-icon-left" />
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        className="profile-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        className="pass-eye-btn"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action buttons */}
          <div className="profile-card-footer">
            <button
              type="button"
              className="btn-profile-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn-profile-save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-icon" /> Đang cập nhật...
                </>
              ) : (
                <>
                  <Check size={16} /> Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
