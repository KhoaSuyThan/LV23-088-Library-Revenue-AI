import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BookOpen,
  LayoutGrid,
  BookMarked,
  ArrowLeftRight,
  CircleDollarSign,
  DollarSign,
  Users,
  Settings,
  Search,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  GraduationCap,
  ReceiptText,
  Bell,
  LogOut
} from 'lucide-react';
import { authApi } from '../api/authApi';
import LibrarySettings from './LibrarySettings';
import ReaderProfiles from './ReaderProfiles';
import BookCatalog from './BookCatalog';
import CirculationDesk from './CirculationDesk';
import FineRevenue from './FineRevenue';
import './DashboardPage.css';

/**
 * Trang Dashboard Tổng quan SmartLib AI
 * - Quản lý điều hướng phân hệ đồng bộ qua URL (ví dụ: /dashboard, /catalog, /circulation,...).
 * - Phân quyền Role: Ẩn menu Settings nếu là Staff, chặn Staff truy cập trực tiếp /settings.
 * - Tab Dashboard hiển thị đầy đủ, các tab khác hiển thị khung trống cho thành viên nhóm làm.
 */
export default function DashboardPage({
  user,
  activeTab: propActiveTab,
  onTabChange,
  onLogout
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định activeTab chuẩn xác từ đường dẫn URL (ví dụ: /settings/general -> activeTab là 'settings')
  const pathParts = location.pathname.replace(/^\//, '').split('/');
  const activeTab = pathParts[0] || propActiveTab || 'dashboard';
  const subTab = pathParts[1] || '';

  // Quản lý từ khóa tìm kiếm cho phân hệ Quản lý Sách, Hồ sơ Độc giả & Báo cáo Thu phạt (đồng bộ thanh Header)
  const [catalogSearch, setCatalogSearch] = React.useState('');
  const [readerSearch, setReaderSearch] = React.useState('');
  const [circulationSearch, setCirculationSearch] = React.useState('');
  const [revenueSearch, setRevenueSearch] = React.useState('');

  // Kiểm tra vai trò Admin để hiển thị mục Cài đặt quy định
  const isAdmin = user?.role === 'Admin';

  // Chặn Staff truy cập thủ công vào đường dẫn /settings
  if (activeTab === 'settings' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Xử lý đăng xuất tài khoản
  const handleLogout = () => {
    authApi.logout();
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  // Chuyển tab Sidebar và đồng bộ URL trên trình duyệt
  const handleTabClick = (tabKey) => {
    navigate(`/${tabKey}`);
    if (onTabChange) {
      onTabChange(tabKey);
    }
  };

  // Dữ liệu mẫu danh sách độc giả có nguy cơ trễ hạn cao (AI phân tích) theo Figma
  const aiRiskReaders = [
    {
      id: 'PM-9920',
      name: 'Nguyễn Văn Minh',
      studentCode: '102220184',
      bookTitle: 'Nhập môn Machine Learning',
      dueDate: '25/09/2026',
      score: 92,
      scoreColor: '#ef4444' // Đỏ (Nguy cơ rất cao)
    },
    {
      id: 'PM-9842',
      name: 'Trần Thị Hồng Hạnh',
      studentCode: '102210103',
      bookTitle: 'Giáo trình Cấu trúc dữ liệu',
      dueDate: '26/09/2026',
      score: 78,
      scoreColor: '#f97316' // Cam (Nguy cơ cao)
    },
    {
      id: 'PM-9811',
      name: 'Lê Hoàng Nam',
      studentCode: '102220455',
      bookTitle: 'Database Systems 10th Ed',
      dueDate: '28/09/2026',
      score: 55,
      scoreColor: '#eab308' // Vàng cam (Nguy cơ trung bình)
    }
  ];

  // Dữ liệu cơ cấu nguồn thu phạt (khớp với thẻ KPI 15.450.000 VNĐ)
  const revenueSources = [
    {
      label: 'Phạt trễ hạn theo ngày',
      amount: '10.042.500đ',
      percentage: '65%',
      color: '#3b82f6'
    },
    {
      label: 'Bồi hoàn sách hỏng/mất',
      amount: '3.862.500đ',
      percentage: '25%',
      color: '#f97316'
    },
    {
      label: 'Phí cấp lại thẻ bạn đọc',
      amount: '1.545.000đ',
      percentage: '10%',
      color: '#8b5cf6'
    }
  ];

  // Thông tin metadata cho các tab đang chờ thành viên khác phát triển
  const tabMetadata = {
    catalog: {
      title: 'Quản lý Sách',
      desc: 'Phân hệ quản lý danh mục đầu sách, tra cứu ISBN, lọc thể loại và nghiệp vụ xóa mềm (US-04).',
      icon: <BookMarked size={32} />
    },
    circulation: {
      title: 'Mượn - Trả sách',
      desc: 'Phân hệ nghiệp vụ lập phiếu mượn, quét mã vạch Barcode và ghi nhận hoàn trả sách thư viện.',
      icon: <ArrowLeftRight size={32} />
    },
    revenue: {
      title: 'Báo cáo Thu phạt',
      desc: 'Phân hệ quản lý biên lai tài chính, dòng tiền thu phạt và báo cáo xuất file Excel.',
      icon: <CircleDollarSign size={32} />
    },
    readers: {
      title: 'Hồ sơ Độc giả',
      desc: 'Phân hệ quản lý thông tin bạn đọc, cấp thẻ thư viện và theo dõi điểm tín nhiệm (US-02).',
      icon: <Users size={32} />
    },
    settings: {
      title: 'Cài đặt',
      desc: 'Phân hệ thiết lập hạn mức mượn, mức phạt trễ hạn và chính sách giảm trừ rèn luyện dành riêng cho Admin (US-03).',
      icon: <Settings size={32} />
    }
  };

  return (
    <div className="dashboard-container">
      {/* ====================================================================
          1. THANH SIDEBAR (DARK NAVY #0F172A)
          ==================================================================== */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-top">
          {/* Logo Brand SmartLib AI */}
          <div className="sidebar-brand">
            <div className="brand-icon-box">
              <BookOpen size={22} strokeWidth={2.4} />
            </div>
            <span className="brand-name">SmartLib AI</span>
          </div>

          {/* Menu Navigation Items (Chuyển tab mượt mà) */}
          <ul className="sidebar-menu">
            <li
              className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleTabClick('dashboard')}
            >
              <div className="menu-icon">
                <LayoutGrid size={18} />
              </div>
              <span>Tổng quan (Dashboard)</span>
            </li>

            <li
              className={`menu-item ${activeTab === 'circulation' ? 'active' : ''}`}
              onClick={() => handleTabClick('circulation')}
            >
              <div className="menu-icon">
                <ArrowLeftRight size={18} />
              </div>
              <span>Mượn - Trả sách (Circulation)</span>
            </li>

            <li
              className={`menu-item ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => handleTabClick('catalog')}
            >
              <div className="menu-icon">
                <BookOpen size={18} />
              </div>
              <span>Quản lý Sách (Book Catalog)</span>
            </li>

            <li
              className={`menu-item ${activeTab === 'revenue' ? 'active' : ''}`}
              onClick={() => handleTabClick('revenue')}
            >
              <div className="menu-icon">
                <DollarSign size={18} strokeWidth={2.4} />
              </div>
              <span>Báo cáo Thu phạt (Fine Revenue)</span>
            </li>

            <li
              className={`menu-item ${activeTab === 'readers' ? 'active' : ''}`}
              onClick={() => handleTabClick('readers')}
            >
              <div className="menu-icon">
                <Users size={18} />
              </div>
              <span>Hồ sơ Độc giả (Readers)</span>
            </li>

            {/* Phân quyền: Cài đặt chỉ hiển thị cho Admin */}
            {isAdmin && (
              <li
                className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabClick('settings')}
              >
                <div className="menu-icon">
                  <Settings size={18} />
                </div>
                <span>Cài đặt quy định (Settings)</span>
              </li>
            )}
          </ul>
        </div>

        {/* Chân Sidebar: Trạng thái hệ thống & Nút đăng xuất */}
        <div className="sidebar-footer">
          <div className="system-status">
            <div className="status-dot"></div>
            <span>Hệ thống vận hành ổn định</span>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Đăng xuất khỏi hệ thống">
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ====================================================================
          2. NỘI DUNG CHÍNH (MAIN CONTENT)
          ==================================================================== */}
      <main className="dashboard-main">
        {/* Thanh Header Topbar (Ghim cố định Sticky) */}
        <header className="dashboard-header">
          {activeTab === 'circulation' ? (
            /* Breadcrumbs cho phân hệ Mượn - Trả sách */
            <div className="header-breadcrumb">
              <span className="breadcrumb-root">Trang chủ</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Mượn - Trả sách</span>
            </div>
          ) : activeTab === 'revenue' ? (
            /* Breadcrumbs cho phân hệ Báo cáo Thu phạt khớp 100% ảnh Mockup */
            <div className="header-breadcrumb">
              <span className="breadcrumb-root">Trang chủ</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Báo cáo Thu phạt</span>
            </div>
          ) : activeTab === 'readers' ? (
            /* Breadcrumbs cho phân hệ Hồ sơ Độc giả khớp 100% ảnh Figma */
            <div className="header-breadcrumb">
              <span className="breadcrumb-root">Trang chủ</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Hồ sơ Độc giả</span>
            </div>
          ) : activeTab === 'catalog' ? (
            /* Breadcrumbs cho phân hệ Quản lý Sách khớp 100% ảnh thiết kế */
            <div className="header-breadcrumb">
              <span className="breadcrumb-root">Trang chủ</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Quản lý Sách</span>
            </div>
          ) : (
            /* Ô tìm kiếm thông minh cho Dashboard */
            <div className="header-search-box">
              <Search size={18} />
              <input
                type="text"
                className="header-search-input"
                placeholder="Tìm kiếm sách, độc giả, phiếu mượn hoặc quét Barcode..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && catalogSearch.trim()) {
                    navigate('/catalog');
                  }
                }}
              />
            </div>
          )}

          {/* Cụm hành động bên phải */}
          <div className="header-right">
            {activeTab === 'circulation' ? (
              <div className="header-search-circulation">
                <Search size={16} />
                <input
                  type="text"
                  className="header-search-input"
                  placeholder="Tìm kiếm..."
                  value={circulationSearch}
                  onChange={(e) => setCirculationSearch(e.target.value)}
                />
              </div>
            ) : activeTab === 'readers' || activeTab === 'catalog' || activeTab === 'revenue' ? (
              <>
                <div className="header-search-readers">
                  <Search size={16} />
                  <input
                    type="text"
                    className="header-search-input"
                    placeholder={
                      activeTab === 'readers'
                        ? 'Tìm kiếm độc giả (Tên, MSSV, Email)...'
                        : activeTab === 'catalog'
                        ? 'Tìm kiếm sách, ISBN hoặc quét Barcode...'
                        : 'Tìm kiếm...'
                    }
                    value={
                      activeTab === 'catalog'
                        ? catalogSearch
                        : activeTab === 'readers'
                        ? readerSearch
                        : revenueSearch
                    }
                    onChange={(e) => {
                      if (activeTab === 'catalog') {
                        setCatalogSearch(e.target.value);
                      } else if (activeTab === 'readers') {
                        setReaderSearch(e.target.value);
                      } else if (activeTab === 'revenue') {
                        setRevenueSearch(e.target.value);
                      }
                    }}
                  />
                </div>

                <button className="header-bell-btn" type="button" title="Thông báo">
                  <Bell size={18} />
                </button>
              </>
            ) : (
              <>
                {/* Bộ chọn tháng */}
                <div className="date-badge">
                  <Calendar size={16} />
                  <span>Tháng 09/2026</span>
                </div>

                {/* Nút xuất báo cáo Excel (Giao diện hiển thị) */}
                <button className="btn-excel" type="button">
                  <FileSpreadsheet size={16} />
                  <span>Xuất báo cáo Excel</span>
                </button>
              </>
            )}

            {/* Thông tin người dùng đăng nhập */}
            <div className="user-profile">
              <div className="user-text">
                <span className="user-name-title">
                  {user?.fullName && user?.fullName !== 'Nguyễn Văn A' ? user.fullName : 'Thủ thư (Admin)'}
                </span>
                <span className="user-dept">
                  {activeTab === 'circulation' ? 'Ban Vận Hành Thư Viện' : 'Ban Quản Lý Thư Viện'}
                </span>
              </div>
              <div className="user-avatar" title={user?.role || 'Admin'}>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80"
                  alt="Admin"
                  className="user-avatar-img"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Thân nội dung phân hệ */}
        <div className="dashboard-content">
          {activeTab === 'dashboard' ? (
            <>
              {/* ----------------------------------------------------------------
                  HÀNG 3 THẺ CHỈ SỐ THỐNG KÊ (KPI METRIC CARDS)
                  ---------------------------------------------------------------- */}
              <div className="kpi-grid">
                {/* Thẻ 1: Tổng doanh thu phạt tháng */}
                <div className="kpi-card">
                  <div className="kpi-header">
                    <h3 className="kpi-title">Tổng doanh thu phạt tháng</h3>
                    <div className="kpi-icon-box kpi-icon-blue">
                      <ReceiptText size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">15.450.000 VNĐ</div>
                  <div className="kpi-subtext-box">
                    <span className="badge-growth">+12%</span>
                    <span>so với tháng trước</span>
                  </div>
                </div>

                {/* Thẻ 2: Tiền phạt trễ hạn dự kiến */}
                <div className="kpi-card">
                  <div className="kpi-header">
                    <h3 className="kpi-title">Tiền phạt trễ hạn dự kiến</h3>
                    <div className="kpi-icon-box kpi-icon-yellow">
                      <AlertTriangle size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">2.350.000 VNĐ</div>
                  <div className="kpi-subtext-box">
                    <span>47 lượt mượn quá hạn</span>
                  </div>
                </div>

                {/* Thẻ 3: Chỉ số nguy cơ trễ hạn (AI) */}
                <div className="kpi-card">
                  <div className="kpi-header">
                    <h3 className="kpi-title">Chỉ số nguy cơ trễ hạn (AI)</h3>
                    <div className="kpi-icon-box kpi-icon-red">
                      <GraduationCap size={20} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: '#0f172a' }}>Trung bình cao</div>
                  <div className="kpi-subtext-box">
                    <span>Độ chính xác mô hình: <strong>88%</strong></span>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------
                  HÀNG BIỂU ĐỒ KÉP (2 CỘT: XU HƯỚNG 30 NGÀY + CƠ CẤU NGUỒN THU)
                  ---------------------------------------------------------------- */}
              <div className="charts-row">
                {/* CỘT TRÁI: Biểu đồ Thu phạt & Xu hướng Trễ hạn 30 ngày */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Biểu đồ Thu phạt & Xu hướng Trễ hạn 30 ngày tới</h3>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-dot-blue"></div>
                        <span>Doanh thu kỳ vọng</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-dot-red"></div>
                        <span>AI dự báo</span>
                      </div>
                    </div>
                  </div>

                  {/* Đồ thị SVG trực quan 2 đường cong */}
                  <div className="chart-svg-wrapper">
                    <svg viewBox="0 0 1000 220" preserveAspectRatio="none">
                      {/* Các đường gióng ngang mờ */}
                      <line x1="30" y1="40" x2="970" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="90" x2="970" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="140" x2="970" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="180" x2="970" y2="180" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Đường xanh: Doanh thu kỳ vọng */}
                      <path
                        d="M 30 180 
                           L 180 150 
                           L 330 170 
                           L 480 135 
                           L 630 145 
                           L 780 120 
                           L 860 145 
                           L 970 115"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Đường đỏ: AI dự báo */}
                      <path
                        d="M 30 180 
                           L 160 140 
                           L 280 115 
                           L 400 145 
                           L 520 110 
                           L 640 140 
                           L 760 125 
                           L 880 90 
                           L 970 120"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Nhãn các mốc thời gian trục hoành */}
                      <text x="30" y="206" fill="#94a3b8" fontSize="12" textAnchor="start">01/09</text>
                      <text x="180" y="206" fill="#94a3b8" fontSize="12" textAnchor="middle">05/09</text>
                      <text x="340" y="206" fill="#94a3b8" fontSize="12" textAnchor="middle">10/09</text>
                      <text x="500" y="206" fill="#94a3b8" fontSize="12" textAnchor="middle">15/09</text>
                      <text x="660" y="206" fill="#94a3b8" fontSize="12" textAnchor="middle">20/09</text>
                      <text x="810" y="206" fill="#94a3b8" fontSize="12" textAnchor="middle">25/09</text>
                      <text x="970" y="206" fill="#94a3b8" fontSize="12" textAnchor="end">30/09 (Dự báo)</text>
                    </svg>
                  </div>
                </div>

                {/* CỘT PHẢI: Biểu đồ tròn Doughnut Cơ cấu Nguồn thu phạt */}
                <div className="doughnut-card">
                  <div className="doughnut-header">
                    <h3 className="doughnut-title">Cơ cấu Nguồn thu Phạt</h3>
                    <p className="doughnut-subtitle">Dòng tiền phạt tháng 09/2026</p>
                  </div>

                  {/* Vòng tròn SVG Doughnut Chart */}
                  <div className="doughnut-chart-wrapper">
                    <svg viewBox="0 0 160 160">
                      {/* Vòng nền mờ */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="16"
                      />

                      {/* Phân khúc 1: Phạt trễ hạn theo ngày (65%) */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="16"
                        strokeDasharray="236.9 364.4"
                        strokeDashoffset="0"
                        transform="rotate(-90 80 80)"
                        strokeLinecap="round"
                      />

                      {/* Phân khúc 2: Bồi hoàn hỏng/mất sách (25%) */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="16"
                        strokeDasharray="91.1 364.4"
                        strokeDashoffset="-236.9"
                        transform="rotate(-90 80 80)"
                        strokeLinecap="round"
                      />

                      {/* Phân khúc 3: Phí cấp lại thẻ bạn đọc (10%) */}
                      <circle
                        cx="80"
                        cy="80"
                        r="58"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="16"
                        strokeDasharray="36.4 364.4"
                        strokeDashoffset="-328"
                        transform="rotate(-90 80 80)"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Thông tin trọng tâm ở giữa hình tròn */}
                    <div className="doughnut-center-info">
                      <span className="doughnut-center-amount">15.45M</span>
                      <span className="doughnut-center-label">Tổng thu phạt</span>
                    </div>
                  </div>

                  {/* Danh sách chú giải chi tiết từng nguồn thu */}
                  <ul className="doughnut-legend-list">
                    {revenueSources.map((item, idx) => (
                      <li key={idx} className="doughnut-legend-item">
                        <div className="doughnut-legend-left">
                          <div
                            className="doughnut-color-indicator"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span>{item.label}</span>
                        </div>
                        <div className="doughnut-legend-right">
                          <span className="doughnut-amount">{item.amount}</span>
                          <span className="doughnut-percentage">{item.percentage}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ----------------------------------------------------------------
                  BẢNG DANH SÁCH ĐỘC GIẢ CÓ NGUY CƠ TRỄ HẠN CAO (AI PHÂN TÍCH)
                  ---------------------------------------------------------------- */}
              <div className="table-card">
                <div className="table-header">
                  <h3 className="table-title">Danh sách độc giả có nguy cơ trễ hạn cao (AI phân tích)</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mã phiếu mượn</th>
                        <th>Họ tên độc giả (MSSV)</th>
                        <th>Tên sách đang mượn</th>
                        <th>Hạn trả sách</th>
                        <th>Xác suất trễ (AI Score)</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiRiskReaders.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <span className="borrowing-code-link">{row.id}</span>
                          </td>
                          <td>
                            <span className="reader-name">{row.name}</span>{' '}
                            <span style={{ color: '#64748b', fontSize: '13px' }}>({row.studentCode})</span>
                          </td>
                          <td>{row.bookTitle}</td>
                          <td>{row.dueDate}</td>
                          <td>
                            <div className="score-cell">
                              <div className="score-bar-bg">
                                <div
                                  className="score-bar-fill"
                                  style={{
                                    width: `${row.score}%`,
                                    backgroundColor: row.scoreColor
                                  }}
                                ></div>
                              </div>
                              <span className="score-text" style={{ color: row.scoreColor }}>
                                {row.score}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn-reminder" type="button">
                              <Bell size={13} />
                              <span>Gửi nhắc nhở</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'circulation' ? (
            /* ----------------------------------------------------------------
                PHÂN HỆ MƯỢN - TRẢ SÁCH (CIRCULATION DESK) KHỚP 100% ẢNH THIẾT KẾ
                ---------------------------------------------------------------- */
            <CirculationDesk user={user} externalSearch={circulationSearch} />
          ) : activeTab === 'revenue' ? (
            /* ----------------------------------------------------------------
                PHÂN HỆ BÁO CÁO THU PHẠT (FINE REVENUE) KHỚP 100% ẢNH MOCKUP FIGMA
                ---------------------------------------------------------------- */
            <FineRevenue user={user} externalSearch={revenueSearch} subTab={subTab} />
          ) : activeTab === 'settings' ? (
            /* ----------------------------------------------------------------
                PHÂN HỆ CÀI ĐẶT QUY ĐỊNH THƯ VIỆN (US-03 - LOLRA-11)
                ---------------------------------------------------------------- */
            <LibrarySettings user={user} subTab={subTab} />
          ) : activeTab === 'readers' ? (
            /* ----------------------------------------------------------------
                PHÂN HỆ HỒ SƠ ĐỘC GIẢ (READERS) KHỚP 100% ẢNH FIGMA
                ---------------------------------------------------------------- */
            <ReaderProfiles user={user} externalSearch={readerSearch} />
          ) : activeTab === 'catalog' ? (
            /* ----------------------------------------------------------------
                PHÂN HỆ QUẢN LÝ SÁCH (BOOK CATALOG) KHỚP 100% ẢNH THIẾT KẾ
                ---------------------------------------------------------------- */
            <BookCatalog user={user} externalSearch={catalogSearch} />
          ) : (
            /* ----------------------------------------------------------------
                KHUNG MÀN HÌNH TRỐNG SẴN SÀNG CHO THÀNH VIÊN KHÁC LÀM GIAO DIỆN
                ---------------------------------------------------------------- */
            <div className="empty-tab-container">
              <div className="empty-tab-icon">
                {tabMetadata[activeTab]?.icon || <LayoutGrid size={32} />}
              </div>
              <h2 className="empty-tab-title">
                {tabMetadata[activeTab]?.title || 'Phân hệ chức năng'}
              </h2>
              <p className="empty-tab-desc">
                {tabMetadata[activeTab]?.desc || 'Giao diện phân hệ này đang sẵn sàng để thành viên nhóm tích hợp.'}
              </p>
              <div className="empty-tab-badge">
                <span>⚡ Khung màn hình trống sẵn sàng cho thành viên nhóm phát triển</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
