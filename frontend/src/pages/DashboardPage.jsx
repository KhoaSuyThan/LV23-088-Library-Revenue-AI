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
import { invoiceApi } from '../api/invoiceApi';
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

  // Dữ liệu cơ cấu nguồn thu phạt mặc định (dự phòng)
  const revenueSources = [
    {
      label: 'Phạt trễ hạn theo ngày',
      amount: '10.042.500đ',
      percentage: '65%',
      color: '#3b82f6',
      ratio: 0.65
    },
    {
      label: 'Bồi hoàn sách hỏng/mất',
      amount: '3.862.500đ',
      percentage: '25%',
      color: '#f97316',
      ratio: 0.25
    },
    {
      label: 'Phí cấp lại thẻ bạn đọc',
      amount: '1.545.000đ',
      percentage: '10%',
      color: '#8b5cf6',
      ratio: 0.10
    }
  ];

  // State lưu trữ dữ liệu thống kê doanh thu thực tế từ Backend API
  const [revenueSummary, setRevenueSummary] = React.useState(null);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);

  // Hàm nạp dữ liệu thống kê doanh thu từ Backend
  const loadRevenueSummary = React.useCallback(() => {
    invoiceApi.getRevenueSummary()
      .then((res) => {
        if (res?.data) {
          setRevenueSummary(res.data);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi nạp dữ liệu thống kê doanh thu:', err);
      });
  }, []);

  // Nạp dữ liệu thống kê doanh thu khi vào tab Dashboard
  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      loadRevenueSummary();
    }
  }, [activeTab, loadRevenueSummary]);

  // Lắng nghe sự kiện toàn cục để cập nhật số liệu Dashboard theo thời gian thực (không cần F5)
  React.useEffect(() => {
    const handleRevenueUpdated = () => {
      loadRevenueSummary();
    };

    window.addEventListener('smartlib-revenue-updated', handleRevenueUpdated);
    return () => {
      window.removeEventListener('smartlib-revenue-updated', handleRevenueUpdated);
    };
  }, [loadRevenueSummary]);

  // Nhãn tháng hiện tại
  const currentMonthText = `Tháng ${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

  // Khoảng thời gian và điểm hover trên biểu đồ xu hướng Dashboard
  const [dashboardTrendRange, setDashboardTrendRange] = React.useState('30d');
  const [dashboardHoveredPoint, setDashboardHoveredPoint] = React.useState(null);

  // Tỷ lệ thu hồi nợ phạt tổng thể
  const debtRecoveryRate = React.useMemo(() => {
    const col = revenueSummary?.totalCollectedRevenue || 15450000;
    const pen = revenueSummary?.totalPendingArrears || 2350000;
    const sum = col + pen;
    return sum > 0 ? Math.round((col / sum) * 1000) / 10 : 86.8;
  }, [revenueSummary]);

  // Cơ cấu nguồn thu phạt tính toán động từ dữ liệu thật
  const computedRevenueSources = React.useMemo(() => {
    if (!revenueSummary?.breakdown || !Array.isArray(revenueSummary.breakdown) || revenueSummary.breakdown.length === 0) {
      return revenueSources;
    }

    let overdueAmt = 0;
    let damageAmt = 0;
    let lostAmt = 0;
    let otherAmt = 0;

    revenueSummary.breakdown.forEach((item) => {
      const name = (item.sourceName || '').toLowerCase();
      const amt = Number(item.amount || 0);
      if (name.includes('trễ') || name.includes('overdue') || name.includes('quá hạn')) {
        overdueAmt += amt;
      } else if (name.includes('hỏng') || name.includes('rách') || name.includes('damage')) {
        damageAmt += amt;
      } else if (name.includes('mất') || name.includes('lost')) {
        lostAmt += amt;
      } else {
        otherAmt += amt;
      }
    });

    const total = overdueAmt + damageAmt + lostAmt + otherAmt;
    const safeTotal = total > 0 ? total : 1;

    const pOverdue = Math.round((overdueAmt / safeTotal) * 100);
    const pDamage = Math.round((damageAmt / safeTotal) * 100);
    const pLost = Math.round((lostAmt / safeTotal) * 100);
    const pOther = Math.max(0, 100 - pOverdue - pDamage - pLost);

    const list = [
      {
        label: 'Phạt trễ hạn theo ngày',
        amount: overdueAmt.toLocaleString('vi-VN') + 'đ',
        percentage: `${pOverdue}%`,
        color: '#3b82f6',
        ratio: overdueAmt / safeTotal
      },
      {
        label: 'Bồi hoàn sách hư hỏng',
        amount: damageAmt.toLocaleString('vi-VN') + 'đ',
        percentage: `${pDamage}%`,
        color: '#f97316',
        ratio: damageAmt / safeTotal
      },
      {
        label: 'Bồi hoàn sách làm mất',
        amount: lostAmt.toLocaleString('vi-VN') + 'đ',
        percentage: `${pLost}%`,
        color: '#ef4444',
        ratio: lostAmt / safeTotal
      },
      {
        label: 'Phí dịch vụ & thẻ khác',
        amount: otherAmt.toLocaleString('vi-VN') + 'đ',
        percentage: `${pOther}%`,
        color: '#8b5cf6',
        ratio: otherAmt / safeTotal
      }
    ];

    return total === 0 ? revenueSources : list.filter(item => item.amount !== '0đ');
  }, [revenueSummary]);

  // Tính toán dữ liệu tọa độ đồ thị SVG xu hướng Dashboard
  const dashboardChartData = React.useMemo(() => {
    const curMonth = new Date().getMonth() + 1;
    let points = [];

    if (dashboardTrendRange === '7d') {
      points = [
        { date: '29/09', actual: 450000, expected: 550000 },
        { date: '30/09', actual: 620000, expected: 700000 },
        { date: '01/10', actual: 890000, expected: 950000 },
        { date: '02/10', actual: 520000, expected: 600000 },
        { date: '03/10', actual: 1150000, expected: 1200000 },
        { date: '04/10', actual: 780000, expected: 850000 },
        { date: '05/10', actual: 950000, expected: 1000000 }
      ];
    } else if (dashboardTrendRange === 'quarter') {
      points = [
        { date: 'T7/2026', actual: 12400000, expected: 13500000 },
        { date: 'T8/2026', actual: 14100000, expected: 15000000 },
        { date: 'T9/2026', actual: 15450000, expected: 16800000 },
        { date: 'T10/2026 (Dự báo)', actual: 16200000, expected: 18000000 }
      ];
    } else {
      if (revenueSummary?.trendPoints && revenueSummary.trendPoints.length > 0) {
        points = revenueSummary.trendPoints.map(p => ({
          date: p.dateLabel,
          actual: Number(p.actualRevenue || 0),
          expected: Number(p.expectedRevenue || 0)
        }));
      } else {
        points = [
          { date: `01/${curMonth}`, actual: 1200000, expected: 1400000 },
          { date: `05/${curMonth}`, actual: 1850000, expected: 2100000 },
          { date: `10/${curMonth}`, actual: 2900000, expected: 3200000 },
          { date: `15/${curMonth}`, actual: 2400000, expected: 2800000 },
          { date: `20/${curMonth}`, actual: 3950000, expected: 4300000 },
          { date: `25/${curMonth}`, actual: 4600000, expected: 5100000 },
          { date: `30/${curMonth} (Dự báo)`, actual: 5800000, expected: 6400000 }
        ];
      }
    }

    const maxVal = Math.max(...points.map(d => Math.max(d.actual, d.expected)), 1000000) * 1.15;
    const svgWidth = 1000;
    const baselineY = 185;
    const paddingX = 40;
    const availableWidth = svgWidth - paddingX * 2;
    const availableHeight = baselineY - 35;

    const mapped = points.map((p, idx) => {
      const x = paddingX + (idx / Math.max(1, points.length - 1)) * availableWidth;
      const yActual = baselineY - (p.actual / maxVal) * availableHeight;
      const yExpected = baselineY - (p.expected / maxVal) * availableHeight;
      return { ...p, x, yActual, yExpected };
    });

    const actualPath = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yActual.toFixed(1)}`).join(' ');
    const expectedPath = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yExpected.toFixed(1)}`).join(' ');
    const firstX = mapped[0].x.toFixed(1);
    const lastX = mapped[mapped.length - 1].x.toFixed(1);
    const areaPath = `${actualPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { mapped, actualPath, expectedPath, areaPath, baselineY };
  }, [dashboardTrendRange, revenueSummary]);

  // Xử lý xuất báo cáo tổng quan Dashboard dạng CSV chuẩn UTF-8 có dấu (hỗ trợ Excel)
  const handleExportDashboardReport = async () => {
    try {
      setIsExportingExcel(true);
      const res = await invoiceApi.getInvoiceHistory({ pageSize: 500 });
      const invoices = res?.data?.items || [];

      const headers = ['Mã biên lai', 'Mã bạn đọc', 'Họ tên bạn đọc', 'Lý do vi phạm', 'Số tiền (VNĐ)', 'Phương thức', 'Ngày thanh toán', 'Thủ thư xử lý', 'Trạng thái'];
      const rows = invoices.map(inv => [
        `"${inv.invoiceCode || ''}"`,
        `"${inv.readerCode || ''}"`,
        `"${inv.readerName || ''}"`,
        `"${inv.violationReason || ''}"`,
        inv.amount || 0,
        `"${inv.paymentMethod || ''}"`,
        `"${inv.paymentDate ? new Date(inv.paymentDate).toLocaleString('vi-VN') : ''}"`,
        `"${inv.processedBy || ''}"`,
        `"${inv.status || ''}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_cao_tong_quan_doanh_thu_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất file báo cáo Excel:', err);
      alert('Không thể xuất báo cáo Excel vào lúc này.');
    } finally {
      setIsExportingExcel(false);
    }
  };

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

  // Chặn Staff truy cập thủ công vào đường dẫn /settings
  if (activeTab === 'settings' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

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
                {/* Bộ chọn tháng hiện tại */}
                <div className="date-badge">
                  <Calendar size={16} />
                  <span>{currentMonthText}</span>
                </div>

                {/* Nút xuất báo cáo Excel kết nối dữ liệu thật */}
                <button
                  className="btn-excel"
                  type="button"
                  onClick={handleExportDashboardReport}
                  disabled={isExportingExcel}
                  title="Xuất danh sách biên lai và doanh thu ra Excel (CSV)"
                >
                  <FileSpreadsheet size={16} />
                  <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất báo cáo Excel'}</span>
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
                  <div className="kpi-value">
                    {revenueSummary
                      ? `${revenueSummary.totalCollectedRevenue.toLocaleString('vi-VN')} VNĐ`
                      : '15.450.000 VNĐ'}
                  </div>
                  <div className="kpi-subtext-box">
                    <span className="badge-growth">+12%</span>
                    <span>so với tháng trước</span>
                  </div>
                </div>

                {/* Thẻ 2: Tiền phạt trễ hạn dự kiến (nợ đọng) */}
                <div className="kpi-card">
                  <div className="kpi-header">
                    <h3 className="kpi-title">Tiền phạt trễ hạn dự kiến</h3>
                    <div className="kpi-icon-box kpi-icon-yellow">
                      <AlertTriangle size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {revenueSummary
                      ? `${revenueSummary.totalPendingArrears.toLocaleString('vi-VN')} VNĐ`
                      : '2.350.000 VNĐ'}
                  </div>
                  <div className="kpi-subtext-box">
                    <span>Dòng tiền chờ thu hồi</span>
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
                  HÀNG BIỂU ĐỒ KÉP (2 CỘT: XU HƯỚNG THEO THỜI GIAN + CƠ CẤU NGUỒN THU)
                  ---------------------------------------------------------------- */}
              <div className="charts-row">
                {/* CỘT TRÁI: Biểu đồ Thu phạt & Dòng tiền nợ đọng tương tác */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3 className="chart-title">Biểu đồ Thu phạt & Dòng tiền Nợ đọng</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      {/* Bộ chuyển khoảng thời gian */}
                      <div className="chart-range-pills">
                        <button
                          type="button"
                          className={`btn-chart-range ${dashboardTrendRange === '7d' ? 'active' : ''}`}
                          onClick={() => setDashboardTrendRange('7d')}
                        >
                          7 ngày
                        </button>
                        <button
                          type="button"
                          className={`btn-chart-range ${dashboardTrendRange === '30d' ? 'active' : ''}`}
                          onClick={() => setDashboardTrendRange('30d')}
                        >
                          30 ngày
                        </button>
                        <button
                          type="button"
                          className={`btn-chart-range ${dashboardTrendRange === 'quarter' ? 'active' : ''}`}
                          onClick={() => setDashboardTrendRange('quarter')}
                        >
                          Theo quý
                        </button>
                      </div>

                      {/* Chú giải 2 đường */}
                      <div className="chart-legend">
                        <div className="legend-item">
                          <div className="legend-dot-blue"></div>
                          <span>Thực thu</span>
                        </div>
                        <div className="legend-item">
                          <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                          <span>Nợ phát sinh / Mục tiêu</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Đồ thị SVG trực quan đa điểm kết nối dữ liệu thực tế */}
                  <div
                    className="chart-svg-wrapper"
                    style={{ position: 'relative' }}
                    onMouseLeave={() => setDashboardHoveredPoint(null)}
                  >
                    <svg viewBox="0 0 1000 220" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="dashBlueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Các đường gióng ngang mờ */}
                      <line x1="30" y1="40" x2="970" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="90" x2="970" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="140" x2="970" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="185" x2="970" y2="185" stroke="#e2e8f0" strokeWidth="1.2" />

                      {/* Vùng diện tích mờ Thực thu */}
                      {dashboardChartData.areaPath && (
                        <path d={dashboardChartData.areaPath} fill="url(#dashBlueGrad)" />
                      )}

                      {/* Đường xanh: Thực thu */}
                      {dashboardChartData.actualPath && (
                        <path
                          d={dashboardChartData.actualPath}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Đường cam nét đứt: Nợ phát sinh / Mục tiêu */}
                      {dashboardChartData.expectedPath && (
                        <path
                          d={dashboardChartData.expectedPath}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.4"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Các điểm neo tương tác trên biểu đồ */}
                      {dashboardChartData.mapped.map((pt, idx) => (
                        <g key={idx}>
                          {/* Đường gióng dọc khi hover */}
                          {dashboardHoveredPoint?.date === pt.date && (
                            <line
                              x1={pt.x}
                              y1={35}
                              x2={pt.x}
                              y2={dashboardChartData.baselineY}
                              stroke="#94a3b8"
                              strokeWidth="1.2"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* Điểm Thực thu (Xanh) */}
                          <circle
                            cx={pt.x}
                            cy={pt.yActual}
                            r={dashboardHoveredPoint?.date === pt.date ? 6 : 4}
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth={dashboardHoveredPoint?.date === pt.date ? 3.5 : 2.5}
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setDashboardHoveredPoint(pt)}
                          />

                          {/* Điểm Kỳ vọng / Nợ (Cam) */}
                          <circle
                            cx={pt.x}
                            cy={pt.yExpected}
                            r={dashboardHoveredPoint?.date === pt.date ? 5 : 3.5}
                            fill="#ffffff"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                            onMouseEnter={() => setDashboardHoveredPoint(pt)}
                          />

                          {/* Nhãn các mốc thời gian trục hoành */}
                          <text
                            x={pt.x}
                            y={208}
                            fill="#64748b"
                            fontSize="11.5"
                            fontWeight="500"
                            textAnchor={idx === 0 ? 'start' : idx === dashboardChartData.mapped.length - 1 ? 'end' : 'middle'}
                          >
                            {pt.date}
                          </text>
                        </g>
                      ))}
                    </svg>

                    {/* Tooltip nổi khi hover */}
                    {dashboardHoveredPoint && (
                      <div
                        className="chart-tooltip-dashboard"
                        style={{
                          left: `${(dashboardHoveredPoint.x / 1000) * 100}%`,
                          top: `${Math.min(dashboardHoveredPoint.yActual, dashboardHoveredPoint.yExpected)}px`
                        }}
                      >
                        <div className="chart-tooltip-dashboard-date">
                          Mốc: {dashboardHoveredPoint.date}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                          <span style={{ color: '#93c5fd' }}>● Thực thu:</span>
                          <strong>{dashboardHoveredPoint.actual.toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '2px' }}>
                          <span style={{ color: '#fcd34d' }}>● Nợ / Mục tiêu:</span>
                          <strong>{dashboardHoveredPoint.expected.toLocaleString('vi-VN')} đ</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CỘT PHẢI: Biểu đồ tròn Doughnut Cơ cấu Nguồn thu phạt */}
                <div className="doughnut-card">
                  <div className="doughnut-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 className="doughnut-title">Cơ cấu Nguồn thu Phạt</h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#ecfdf5',
                          color: '#059669'
                        }}
                        title="Tỷ lệ thu hồi nợ phạt trên toàn bộ khoản phạt phát sinh"
                      >
                        Thu hồi: {debtRecoveryRate}%
                      </span>
                    </div>
                    <p className="doughnut-subtitle">Dòng tiền phạt {currentMonthText}</p>
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

                      {/* Các phân khúc nguồn thu tính theo tỉ lệ thực tế */}
                      {(() => {
                        let accumulatedRatio = 0;
                        const circ = 364.42;
                        return computedRevenueSources.map((item, idx) => {
                          const ratio = item.ratio || 0;
                          const strokeLen = Math.max(0, ratio * circ);
                          const strokeOffset = -(accumulatedRatio * circ);
                          accumulatedRatio += ratio;

                          return (
                            <circle
                              key={idx}
                              cx="80"
                              cy="80"
                              r="58"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="16"
                              strokeDasharray={`${strokeLen.toFixed(1)} ${circ.toFixed(1)}`}
                              strokeDashoffset={strokeOffset.toFixed(1)}
                              transform="rotate(-90 80 80)"
                              strokeLinecap="round"
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* Thông tin trọng tâm ở giữa hình tròn */}
                    <div className="doughnut-center-info">
                      <span className="doughnut-center-amount">
                        {revenueSummary && revenueSummary.totalCollectedRevenue > 0
                          ? `${(revenueSummary.totalCollectedRevenue / 1000000).toFixed(2)}M`
                          : '15.45M'}
                      </span>
                      <span className="doughnut-center-label">Tổng thu phạt</span>
                    </div>
                  </div>

                  {/* Danh sách chú giải chi tiết từng nguồn thu */}
                  <ul className="doughnut-legend-list">
                    {computedRevenueSources.map((item, idx) => (
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

                  {/* Nút chuyển nhanh sang Dashboard Thống kê Vi phạm chi tiết */}
                  <button
                    type="button"
                    className="btn-view-revenue-detail"
                    onClick={() => navigate('/revenue/breakdown')}
                  >
                    <span>Xem biểu đồ & thống kê vi phạm chi tiết</span>
                    <ArrowLeftRight size={14} />
                  </button>
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
