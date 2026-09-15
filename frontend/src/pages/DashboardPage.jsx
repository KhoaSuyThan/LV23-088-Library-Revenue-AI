import React from 'react';
import { BookOpen, LogOut, ShieldCheck, User, CheckCircle, Database } from 'lucide-react';
import { authApi } from '../api/authApi';

export default function DashboardPage({ user, onLogout }) {
  const handleLogout = () => {
    authApi.logout();
    if (onLogout) {
      onLogout();
    }
  };

  const roleColor = user?.role === 'Admin' ? '#6366f1' : '#10b981';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif"
    }}>
      {/* HEADER QUẢN TRỊ */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 32px',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6688f6, #5373ea)',
            color: '#fff',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#1e293b' }}>
              SmartLib AI
            </h2>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>Cổng Quản trị & Nghiệp vụ Thư viện</span>
          </div>
        </div>

        {/* THÔNG TIN NGƯỜI DÙNG & NÚT ĐĂNG XUẤT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#e0e7ff',
              color: '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px'
            }}>
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                {user?.fullName || user?.username}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#fff',
                backgroundColor: roleColor,
                padding: '2px 8px',
                borderRadius: '12px',
                textTransform: 'uppercase'
              }}>
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* NỘI DUNG DASHBOARD */}
      <main style={{ maxWidth: '1080px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          borderRadius: '20px',
          padding: '36px',
          color: '#ffffff',
          boxShadow: '0 12px 30px rgba(59, 130, 246, 0.25)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '14px' }}>
            <CheckCircle size={14} /> Xác thực thành công (RBAC Verified)
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: '28px', fontWeight: 800 }}>
            Xin chào, {user?.fullName}!
          </h1>
          <p style={{ margin: 0, fontSize: '15px', opacity: 0.9, maxWidth: '600px', lineHeight: 1.5 }}>
            Bạn đang truy cập với vai trò <strong>{user?.role}</strong> trên hệ thống SmartLib AI Backend .NET 10. Phiên làm việc bảo mật bằng chuẩn JSON Web Token (JWT).
          </p>
        </div>

        {/* THÔNG TIN KẾT NỐI HỆ THỐNG */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#3b82f6' }}>
              <ShieldCheck size={24} />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>Thông tin phiên</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 8px' }}>
              <strong>Tên tài khoản:</strong> {user?.username}
            </p>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 8px' }}>
              <strong>Họ và tên:</strong> {user?.fullName}
            </p>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              <strong>Mã định danh UserID:</strong> {user?.userID}
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#10b981' }}>
              <Database size={24} />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#1e293b' }}>Hạ tầng Backend</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 8px' }}>
              <strong>Nền tảng:</strong> ASP.NET Core Web API (.NET 10)
            </p>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 8px' }}>
              <strong>Cơ sở dữ liệu:</strong> SQL Server (12 bảng chuẩn hóa)
            </p>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              <strong>Kiến trúc:</strong> N-Tier (Core, Infrastructure, Web API)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
