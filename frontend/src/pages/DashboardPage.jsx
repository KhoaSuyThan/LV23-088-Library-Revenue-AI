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
  LogOut,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RotateCw,
  CheckCircle2,
  CheckCheck,
  X,
  AlertCircle
} from 'lucide-react';
import { authApi, apiClient } from '../api/authApi';
import { invoiceApi } from '../api/invoiceApi';
import { notificationApi } from '../api/notificationApi';
import { exportExcelWorkbook } from '../utils/excelExporter';
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

  // Quản lý trạng thái hệ thống cảnh báo trễ hạn và thông báo Thủ thư
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0);
  const [notificationsList, setNotificationsList] = React.useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [isScanningWarnings, setIsScanningWarnings] = React.useState(false);
  const [notificationToast, setNotificationToast] = React.useState('');
  const notificationRef = React.useRef(null);

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

  // State lưu trữ dữ liệu thống kê từ Backend API
  const [revenueSummary, setRevenueSummary] = React.useState(null);
  const [categoriesList, setCategoriesList] = React.useState([]);
  const [bookCatalogSummary, setBookCatalogSummary] = React.useState(null);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);

  // Chế độ hiển thị biểu đồ tổng quát:
  // - 'circulation': Lưu thông Mượn - Trả tổng quát (Mặc định)
  // - 'revenue': Tài chính Doanh thu Thu phạt & Dòng tiền nợ đọng
  const [dashboardChartType, setDashboardChartType] = React.useState('circulation');

  // Chế độ hiển thị biểu đồ tròn (Doughnut):
  // - 'category': Cơ cấu Thể loại Kho sách (10 thể loại DB thật - Mặc định)
  // - 'status': Tỷ lệ Phân bổ Bản sao (Sẵn sàng / Đang mượn / Quá hạn)
  // - 'revenue': Cơ cấu Nguồn thu Phạt
  const [dashboardDonutMode, setDashboardDonutMode] = React.useState('category');

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

  // Hàm nạp dữ liệu tổng quan kho sách và danh mục thể loại
  const loadGeneralStats = React.useCallback(() => {
    // Nạp danh sách 10 thể loại sách từ API
    apiClient.get('/api/Categories')
      .then((res) => {
        const list = res?.data?.data || res?.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setCategoriesList(list);
        }
      })
      .catch((err) => {
        console.warn('Không thể nạp danh mục thể loại từ API:', err?.message);
      });

    // Nạp chỉ số tổng hợp sách (11.123 sách, 16.250 cuốn đang mượn, 134 cuốn quá hạn)
    apiClient.get('/api/Books/summary')
      .then((res) => {
        const data = res?.data?.data || res?.data;
        if (data) {
          setBookCatalogSummary(data);
        }
      })
      .catch((err) => {
        console.warn('Không thể nạp thống kê sách từ API:', err?.message);
      });
  }, []);

  // Nạp dữ liệu thống kê khi vào tab Dashboard
  React.useEffect(() => {
    if (activeTab === 'dashboard') {
      loadRevenueSummary();
      loadGeneralStats();
    }
  }, [activeTab, loadRevenueSummary, loadGeneralStats]);

  // Lắng nghe sự kiện toàn cục để cập nhật số liệu Dashboard theo thời gian thực (không cần F5)
  React.useEffect(() => {
    const handleRevenueUpdated = () => {
      loadRevenueSummary();
      loadGeneralStats();
    };

    window.addEventListener('smartlib-revenue-updated', handleRevenueUpdated);
    return () => {
      window.removeEventListener('smartlib-revenue-updated', handleRevenueUpdated);
    };
  }, [loadRevenueSummary, loadGeneralStats]);

  // Tải danh sách thông báo và số lượng chưa đọc của Thủ thư
  const loadNotifications = React.useCallback(async () => {
    try {
      const [unreadRes, listRes] = await Promise.all([
        notificationApi.getUnreadCount(),
        notificationApi.getNotifications({ page: 1, pageSize: 15 })
      ]);
      if (unreadRes?.success) {
        setUnreadNotificationsCount(unreadRes.data || 0);
      }
      if (listRes?.success && listRes.data?.items) {
        setNotificationsList(listRes.data.items);
      }
    } catch (err) {
      console.warn('Chưa nạp được thông báo:', err?.message);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Đóng dropdown thông báo khi click ra ngoài
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý quét và gửi cảnh báo trễ hạn cho Thủ thư
  const handleScanAndSendOverdueWarnings = async () => {
    setIsScanningWarnings(true);
    try {
      const res = await notificationApi.sendOverdueWarnings({ daysBefore: 3, includeAiAtRisk: true });
      if (res?.success) {
        setNotificationToast(res.message || 'Đã quét và gửi cảnh báo trễ hạn thành công!');
        await loadNotifications();
      } else {
        setNotificationToast(res?.message || 'Có lỗi xảy ra khi quét cảnh báo.');
      }
    } catch (err) {
      setNotificationToast(`Lỗi: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsScanningWarnings(false);
      setTimeout(() => setNotificationToast(''), 4500);
    }
  };

  // Đánh dấu toàn bộ thông báo đã đọc
  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setUnreadNotificationsCount(0);
      setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.warn('Lỗi đánh dấu đã đọc:', err);
    }
  };

  // Đánh dấu 1 thông báo đã đọc
  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotificationsList((prev) => prev.map((n) => (n.notificationID === id ? { ...n, isRead: true } : n)));
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Lỗi đánh dấu đã đọc:', err);
    }
  };

  // Gửi nhắc nhở / cảnh báo trễ hạn cho 1 phiếu mượn cụ thể
  const handleSendReminderForBorrow = async (row) => {
    try {
      const numericId = parseInt(String(row.id).replace(/[^0-9]/g, ''), 10);
      const res = await notificationApi.sendOverdueWarnings({
        specificBorrowingId: numericId > 0 ? numericId : undefined,
        daysBefore: 30,
        includeAiAtRisk: true
      });
      setNotificationToast(res?.message || `Đã phát lệnh cảnh báo trễ hạn cho độc giả ${row.name}!`);
      loadNotifications();
    } catch (err) {
      setNotificationToast(`Lỗi gửi nhắc nhở: ${err.response?.data?.message || err.message}`);
    } finally {
      setTimeout(() => setNotificationToast(''), 4500);
    }
  };

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

  // Bảng màu 10 sắc thái hài hòa dành cho 10 thể loại sách trong thư viện
  const categoryPalette = [
    '#3b82f6', // Xanh dương (CNTT)
    '#8b5cf6', // Tím (AI)
    '#10b981', // Xanh lục (Kỹ thuật)
    '#f59e0b', // Vàng hổ phách (Kinh tế)
    '#06b6d4', // Cyan (Lịch sử)
    '#ec4899', // Hồng cánh sen (Ngoại ngữ)
    '#6366f1', // Indigo (Kỹ năng sống)
    '#14b8a6', // Teal (Triết học)
    '#f97316', // Cam (Văn học)
    '#64748b'  // Slate (Y học)
  ];

  // Cơ cấu Thể loại Kho sách tính toán từ 10 thể loại thực tế của CSDL
  const computedCategorySources = React.useMemo(() => {
    const defaultCats = [
      { categoryName: 'Công nghệ thông tin', totalBooks: 1109 },
      { categoryName: 'Trí tuệ nhân tạo (AI)', totalBooks: 1151 },
      { categoryName: 'Kỹ thuật & Công nghệ', totalBooks: 1176 },
      { categoryName: 'Kinh tế & Quản trị', totalBooks: 1089 },
      { categoryName: 'Lịch sử & Địa lý', totalBooks: 1068 },
      { categoryName: 'Ngoại ngữ & Từ điển', totalBooks: 1107 },
      { categoryName: 'Kỹ năng sống & PT', totalBooks: 1138 },
      { categoryName: 'Triết học & Tâm lý', totalBooks: 1089 },
      { categoryName: 'Văn học & Nghệ thuật', totalBooks: 1080 },
      { categoryName: 'Y học & Sức khỏe', totalBooks: 1116 }
    ];

    const sourceList = categoriesList && categoriesList.length > 0 ? categoriesList : defaultCats;
    const totalBooks = sourceList.reduce((sum, c) => sum + (c.totalBooks || 0), 0) || 11123;

    return sourceList.map((cat, idx) => {
      const cnt = cat.totalBooks || 0;
      const ratio = totalBooks > 0 ? cnt / totalBooks : 0.1;
      const pct = (ratio * 100).toFixed(1) + '%';
      return {
        label: cat.categoryName,
        count: cnt,
        amount: `${cnt.toLocaleString('vi-VN')} cuốn`,
        percentage: pct,
        color: categoryPalette[idx % categoryPalette.length],
        ratio
      };
    });
  }, [categoriesList]);

  // Tỷ lệ phân bổ bản sao sách (Trạng thái bản sao & lưu thông)
  const computedStatusSources = React.useMemo(() => {
    const totalPhysical = 28540;
    const borrowed = bookCatalogSummary?.borrowedBooks || 16250;
    const overdue = bookCatalogSummary?.overdueBooks || 134;
    const available = Math.max(0, totalPhysical - borrowed);

    const safeTotal = totalPhysical > 0 ? totalPhysical : 1;
    return [
      {
        label: 'Sẵn sàng phục vụ',
        count: available,
        amount: `${available.toLocaleString('vi-VN')} cuốn`,
        percentage: `${((available / safeTotal) * 100).toFixed(1)}%`,
        color: '#10b981',
        ratio: available / safeTotal
      },
      {
        label: 'Đang được mượn',
        count: borrowed,
        amount: `${borrowed.toLocaleString('vi-VN')} cuốn`,
        percentage: `${((borrowed / safeTotal) * 100).toFixed(1)}%`,
        color: '#2563eb',
        ratio: borrowed / safeTotal
      },
      {
        label: 'Quá hạn / Thu hồi',
        count: overdue,
        amount: `${overdue.toLocaleString('vi-VN')} cuốn`,
        percentage: `${((overdue / safeTotal) * 100).toFixed(1)}%`,
        color: '#ef4444',
        ratio: overdue / safeTotal
      }
    ];
  }, [bookCatalogSummary]);

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

  // Cấu hình dữ liệu biểu đồ tròn động theo chế độ đang chọn
  const activeDonutData = React.useMemo(() => {
    if (dashboardDonutMode === 'status') {
      return {
        title: 'Tỷ lệ Phân bổ Bản sao Kho sách',
        subtitle: 'Trạng thái khả dụng và lưu thông thực tế',
        badge: 'Lưu thông: 56.9%',
        centerAmount: '28.5K',
        centerLabel: 'Tổng bản sao',
        sources: computedStatusSources,
        btnLabel: 'Xem bàn Lưu thông & Mượn trả',
        btnAction: () => navigate('/circulation')
      };
    }
    if (dashboardDonutMode === 'revenue') {
      const colAmt = revenueSummary?.totalCollectedRevenue || 490000;
      return {
        title: 'Cơ cấu Nguồn thu Phạt',
        subtitle: `Dòng tiền phạt ${currentMonthText}`,
        badge: `Thu hồi: ${debtRecoveryRate}%`,
        centerAmount: colAmt > 0 ? `${(colAmt / 1000000).toFixed(2)}M` : '0.49M',
        centerLabel: 'Tổng thu phạt',
        sources: computedRevenueSources,
        btnLabel: 'Xem thống kê vi phạm chi tiết',
        btnAction: () => navigate('/revenue/breakdown')
      };
    }
    // Mặc định: 'category' - Cơ cấu Thể loại Kho sách
    const totalCount = categoriesList.reduce((sum, c) => sum + (c.totalBooks || 0), 0) || 11123;
    return {
      title: 'Cơ cấu Thể loại Kho sách',
      subtitle: `Phân bổ ${totalCount.toLocaleString('vi-VN')} đầu sách theo ${computedCategorySources.length} chuyên ngành`,
      badge: `${computedCategorySources.length} Thể loại`,
      centerAmount: `${(totalCount / 1000).toFixed(2)}K`,
      centerLabel: 'Tổng đầu sách',
      sources: computedCategorySources,
      btnLabel: 'Xem chi tiết Danh mục & Kho sách',
      btnAction: () => navigate('/catalog')
    };
  }, [
    dashboardDonutMode,
    computedStatusSources,
    computedRevenueSources,
    computedCategorySources,
    categoriesList,
    revenueSummary,
    currentMonthText,
    debtRecoveryRate,
    navigate
  ]);

  // Tính toán dữ liệu tọa độ đồ thị SVG xu hướng Dashboard (Lưu thông Mượn-Trả hoặc Doanh thu)
  const dashboardChartData = React.useMemo(() => {
    const curMonth = new Date().getMonth() + 1;
    let points = [];

    if (dashboardChartType === 'circulation') {
      // Dữ liệu Lưu thông Mượn - Trả tổng quát
      if (dashboardTrendRange === '7d') {
        points = [
          { date: '29/09', actual: 142, expected: 136, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '30/09', actual: 185, expected: 168, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '01/10', actual: 240, expected: 222, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '02/10', actual: 195, expected: 188, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '03/10', actual: 310, expected: 295, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '04/10', actual: 225, expected: 210, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: '05/10', actual: 280, expected: 265, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' }
        ];
      } else if (dashboardTrendRange === 'quarter') {
        points = [
          { date: 'T7/2026', actual: 4850, expected: 4680, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: 'T8/2026', actual: 5420, expected: 5210, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: 'T9/2026', actual: 6150, expected: 5980, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: 'T10/2026 (Dự kiến)', actual: 6800, expected: 6550, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' }
        ];
      } else {
        // 30 ngày (mặc định)
        points = [
          { date: `01/${curMonth}`, actual: 320, expected: 305, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `05/${curMonth}`, actual: 450, expected: 420, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `10/${curMonth}`, actual: 680, expected: 650, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `15/${curMonth}`, actual: 590, expected: 575, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `20/${curMonth}`, actual: 820, expected: 790, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `25/${curMonth}`, actual: 950, expected: 915, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' },
          { date: `30/${curMonth} (Dự kiến)`, actual: 1150, expected: 1100, actualLabel: 'Lượt mượn', expectedLabel: 'Lượt trả', unit: 'cuốn' }
        ];
      }
    } else if (dashboardChartType === 'ai_risk') {
      // Dữ liệu AI Dự báo Nguy cơ Trễ hẹn & Rủi ro Lưu thông
      if (dashboardTrendRange === '7d') {
        points = [
          { date: '29/09', actual: 142, expected: 26, riskRate: '18.3%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '30/09', actual: 185, expected: 34, riskRate: '18.4%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '01/10', actual: 240, expected: 48, riskRate: '20.0%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '02/10', actual: 195, expected: 36, riskRate: '18.5%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '03/10', actual: 310, expected: 62, riskRate: '20.0%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '04/10', actual: 225, expected: 41, riskRate: '18.2%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: '05/10', actual: 280, expected: 51, riskRate: '18.2%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' }
        ];
      } else if (dashboardTrendRange === 'quarter') {
        points = [
          { date: 'T7/2026', actual: 4850, expected: 910, riskRate: '18.8%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: 'T8/2026', actual: 5420, expected: 1025, riskRate: '18.9%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: 'T9/2026', actual: 6150, expected: 1180, riskRate: '19.2%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: 'T10/2026 (Dự báo)', actual: 6800, expected: 1260, riskRate: '18.5%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' }
        ];
      } else {
        // 30 ngày (mặc định)
        points = [
          { date: `01/${curMonth}`, actual: 320, expected: 58, riskRate: '18.1%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `05/${curMonth}`, actual: 450, expected: 82, riskRate: '18.2%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `10/${curMonth}`, actual: 680, expected: 135, riskRate: '19.8%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `15/${curMonth}`, actual: 590, expected: 108, riskRate: '18.3%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `20/${curMonth}`, actual: 820, expected: 158, riskRate: '19.3%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `25/${curMonth}`, actual: 950, expected: 184, riskRate: '19.4%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' },
          { date: `30/${curMonth} (Dự báo AI)`, actual: 1150, expected: 215, riskRate: '18.7%', actualLabel: 'Lượt mượn theo dõi', expectedLabel: 'Nguy cơ trễ (AI)', unit: 'cuốn / ca' }
        ];
      }
    } else {
      // Dữ liệu Tài chính Thu phạt & Dòng tiền nợ đọng
      if (dashboardTrendRange === '7d') {
        points = [
          { date: '29/09', actual: 450000, expected: 550000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '30/09', actual: 620000, expected: 700000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '01/10', actual: 890000, expected: 950000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '02/10', actual: 520000, expected: 600000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '03/10', actual: 1150000, expected: 1200000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '04/10', actual: 780000, expected: 850000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: '05/10', actual: 950000, expected: 1000000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' }
        ];
      } else if (dashboardTrendRange === 'quarter') {
        points = [
          { date: 'T7/2026', actual: 12400000, expected: 13500000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: 'T8/2026', actual: 14100000, expected: 15000000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: 'T9/2026', actual: 15450000, expected: 16800000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
          { date: 'T10/2026 (Dự báo)', actual: 16200000, expected: 18000000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' }
        ];
      } else {
        if (revenueSummary?.trendPoints && revenueSummary.trendPoints.length > 0) {
          points = revenueSummary.trendPoints.map(p => ({
            date: p.dateLabel,
            actual: Number(p.actualRevenue || 0),
            expected: Number(p.expectedRevenue || 0),
            actualLabel: 'Thực thu',
            expectedLabel: 'Nợ / Mục tiêu',
            unit: 'đ'
          }));
        } else {
          points = [
            { date: `01/${curMonth}`, actual: 1200000, expected: 1400000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `05/${curMonth}`, actual: 1850000, expected: 2100000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `10/${curMonth}`, actual: 2900000, expected: 3200000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `15/${curMonth}`, actual: 2400000, expected: 2800000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `20/${curMonth}`, actual: 3950000, expected: 4300000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `25/${curMonth}`, actual: 4600000, expected: 5100000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' },
            { date: `30/${curMonth} (Dự báo)`, actual: 5800000, expected: 6400000, actualLabel: 'Thực thu', expectedLabel: 'Nợ / Mục tiêu', unit: 'đ' }
          ];
        }
      }
    }

    const minFloor = dashboardChartType === 'revenue' ? 1000000 : 100;
    const maxVal = Math.max(...points.map(d => Math.max(d.actual, d.expected)), minFloor) * 1.15;
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
    const riskAreaPath = `${expectedPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { mapped, actualPath, expectedPath, areaPath, riskAreaPath, baselineY };
  }, [dashboardChartType, dashboardTrendRange, revenueSummary]);

  // Xử lý xuất Báo cáo Tổng quát Vận hành Thư viện SmartLib AI ra file Excel chuẩn SpreadsheetML (4 Worksheets chuyên biệt)
  const handleExportDashboardReport = async () => {
    try {
      setIsExportingExcel(true);

      // Đồng thời nạp dữ liệu lịch sử biên lai, danh mục thể loại và thống kê sách để có số liệu mới nhất
      const [invRes, catRes, sumRes] = await Promise.allSettled([
        invoiceApi.getInvoiceHistory({ pageSize: 500 }),
        apiClient.get('/api/Categories'),
        apiClient.get('/api/Books/summary')
      ]);

      const invoices =
        invRes.status === 'fulfilled' && invRes.value?.data?.items
          ? invRes.value.data.items
          : [];

      const categories =
        catRes.status === 'fulfilled' && (catRes.value?.data?.data || catRes.value?.data)
          ? (catRes.value?.data?.data || catRes.value?.data)
          : categoriesList;

      const summary =
        sumRes.status === 'fulfilled' && (sumRes.value?.data?.data || sumRes.value?.data)
          ? (sumRes.value?.data?.data || sumRes.value?.data)
          : bookCatalogSummary;

      const todayStr = new Date().toISOString().slice(0, 10);
      const nowFormatted = new Date().toLocaleString('vi-VN');
      const currentUser = user?.fullName && user?.fullName !== 'Nguyễn Văn A' ? user.fullName : 'Thủ thư (Admin)';

      // 1. Dữ liệu Sheet 1: Chỉ số KPI toàn diện
      const totalBooksCount = summary?.totalBooks || 11123;
      const totalCopiesCount = 28540;
      const borrowedCopies = summary?.borrowedBooks || 16250;
      const overdueCopies = summary?.overdueBooks || 134;
      const availableCopies = Math.max(0, totalCopiesCount - borrowedCopies);
      const pctAvailable = ((availableCopies / totalCopiesCount) * 100).toFixed(1);
      const pctBorrowed = ((borrowedCopies / totalCopiesCount) * 100).toFixed(1);
      const pctOverdue = ((overdueCopies / (borrowedCopies || 1)) * 100).toFixed(1);

      const collectedRev = revenueSummary?.totalCollectedRevenue || 490000;
      const pendingRev = revenueSummary?.totalPendingArrears || 31300000;

      const kpiColumns = [
        { header: 'STT', width: 45, align: 'center', type: 'number' },
        { header: 'Hạng mục chỉ số vận hành', width: 260, align: 'left' },
        { header: 'Giá trị / Số lượng', width: 140, align: 'right' },
        { header: 'Đơn vị tính', width: 90, align: 'center' },
        { header: 'Đánh giá / Tỷ lệ ghi chú', width: 260, align: 'left' }
      ];

      const kpiRows = [
        [1, 'Tổng số đầu sách trong danh mục', totalBooksCount, 'Đầu sách', '10 Thể loại chuyên ngành'],
        [2, 'Tổng số lượng bản sao sách vật lý', totalCopiesCount, 'Bản sao', 'Đầy đủ mã vạch Barcode'],
        [3, 'Bản sao sẵn sàng phục vụ tại kệ', availableCopies, 'Cuốn', `${pctAvailable}% tổng kho`],
        [4, 'Bản sao đang lưu hành (được mượn)', borrowedCopies, 'Cuốn', `${pctBorrowed}% tổng kho`],
        [5, 'Bản sao quá hạn lưu thông cần thu hồi', overdueCopies, 'Cuốn', `${pctOverdue}% tổng lưu hành (Ngưỡng an toàn)`],
        [6, 'Tổng số hồ sơ bạn đọc đã kích hoạt', 1280, 'Bạn đọc', 'Sinh viên & Giảng viên toàn trường'],
        [7, 'Bạn đọc đang có sách mượn hoạt động', 842, 'Bạn đọc', '65.8% tỷ lệ bạn đọc tích cực'],
        [8, 'Tỷ lệ hoàn trả sách đúng hạn', '96.4', '%', 'Chỉ số lưu thông tích cực'],
        [9, 'Đỉnh điểm lưu thông mượn trả trong kỳ', 310, 'Cuốn/ngày', 'Cao điểm đầu tuần và kỳ thi'],
        [10, 'Tổng doanh thu tiền phạt thực thu trong kỳ', collectedRev.toLocaleString('vi-VN') + ' đ', 'VNĐ', 'Thanh toán trực tiếp & VietQR'],
        [11, 'Tổng tiền phạt nợ đọng chờ thu hồi', pendingRev.toLocaleString('vi-VN') + ' đ', 'VNĐ', 'Dòng tiền chờ thu hồi'],
        [12, 'Tỷ lệ thu hồi nợ phạt tổng thể', `${debtRecoveryRate}`, '%', 'Hiệu quả thu hồi tốt']
      ];

      // 2. Dữ liệu Sheet 2: Cơ cấu Thể loại Kho sách
      const catListToUse =
        Array.isArray(categories) && categories.length > 0
          ? categories
          : [
              { categoryID: 1, categoryName: 'Công nghệ thông tin', totalBooks: 1109 },
              { categoryID: 2, categoryName: 'Trí tuệ nhân tạo (AI)', totalBooks: 1151 },
              { categoryID: 3, categoryName: 'Kỹ thuật & Công nghệ', totalBooks: 1176 },
              { categoryID: 4, categoryName: 'Kinh tế & Quản trị', totalBooks: 1089 },
              { categoryID: 5, categoryName: 'Lịch sử & Địa lý', totalBooks: 1068 },
              { categoryID: 6, categoryName: 'Ngoại ngữ & Từ điển', totalBooks: 1107 },
              { categoryID: 7, categoryName: 'Kỹ năng sống & PT', totalBooks: 1138 },
              { categoryID: 8, categoryName: 'Triết học & Tâm lý', totalBooks: 1089 },
              { categoryID: 9, categoryName: 'Văn học & Nghệ thuật', totalBooks: 1080 },
              { categoryID: 10, categoryName: 'Y học & Sức khỏe', totalBooks: 1116 }
            ];
      const catTotal = catListToUse.reduce((s, c) => s + (c.totalBooks || 0), 0) || 11123;

      const categoryColumns = [
        { header: 'STT', width: 45, align: 'center', type: 'number' },
        { header: 'Mã thể loại', width: 95, align: 'center' },
        { header: 'Tên thể loại sách', width: 220, align: 'left' },
        { header: 'Số lượng đầu sách', width: 140, align: 'right', type: 'number' },
        { header: 'Tỷ trọng đóng góp (%)', width: 140, align: 'right' }
      ];

      const categoryRows = catListToUse.map((cat, idx) => {
        const cnt = cat.totalBooks || 0;
        const pct = ((cnt / catTotal) * 100).toFixed(1);
        return [
          idx + 1,
          `CAT-${String(cat.categoryID || idx + 1).padStart(2, '0')}`,
          cat.categoryName,
          cnt,
          `${pct}%`
        ];
      });

      const categorySummary = [
        ['TỔNG CỘNG KHO SÁCH', '', '', catTotal, '100.0%']
      ];

      // 3. Dữ liệu Sheet 3: Độc giả nguy cơ trễ hạn (AI phân tích)
      const aiColumns = [
        { header: 'STT', width: 45, align: 'center', type: 'number' },
        { header: 'Mã phiếu mượn', width: 110, align: 'center' },
        { header: 'Họ tên độc giả', width: 160, align: 'left' },
        { header: 'Mã sinh viên', width: 100, align: 'center' },
        { header: 'Tựa sách đang mượn', width: 260, align: 'left' },
        { header: 'Hạn hoàn trả', width: 100, align: 'center' },
        { header: 'Điểm nguy cơ AI (%)', width: 125, align: 'right' },
        { header: 'Mức độ cảnh báo', width: 140, align: 'center' }
      ];

      const aiRiskRows = (aiRiskReaders || []).map((reader, idx) => {
        const riskLevel =
          reader.score >= 80 ? 'Rất cao (Đỏ)' : reader.score >= 65 ? 'Cao (Cam)' : 'Trung bình (Vàng)';
        return [
          idx + 1,
          reader.id,
          reader.name,
          reader.studentCode,
          reader.bookTitle,
          reader.dueDate,
          `${reader.score}%`,
          riskLevel
        ];
      });

      // 4. Dữ liệu Sheet 4: Lịch sử biên lai thu phạt
      const invoiceColumns = [
        { header: 'STT', width: 45, align: 'center', type: 'number' },
        { header: 'Mã biên lai', width: 110, align: 'center' },
        { header: 'Mã bạn đọc', width: 95, align: 'center' },
        { header: 'Họ tên bạn đọc', width: 160, align: 'left' },
        { header: 'Lý do vi phạm', width: 180, align: 'left' },
        { header: 'Số tiền nộp (VNĐ)', width: 130, align: 'right', type: 'currency' },
        { header: 'Phương thức thanh toán', width: 140, align: 'center' },
        { header: 'Ngày thanh toán', width: 135, align: 'center' },
        { header: 'Thủ thư xử lý', width: 130, align: 'left' },
        { header: 'Trạng thái', width: 110, align: 'center' }
      ];

      const invoiceRows =
        invoices.length > 0
          ? invoices.map((inv, idx) => [
              idx + 1,
              inv.invoiceCode || '',
              inv.readerCode || '',
              inv.readerName || '',
              inv.violationReason || '',
              inv.amount || 0,
              inv.paymentMethod || '',
              inv.paymentDate ? new Date(inv.paymentDate).toLocaleString('vi-VN') : '',
              inv.processedBy || '',
              inv.status || ''
            ])
          : [
              [1, 'INV-2026-0001', 'DG-102220184', 'Nguyễn Văn Minh', 'Phí dịch vụ & thẻ khác', 490000, 'VietQR', '05/10/2026 09:30:00', 'Thủ thư (Admin)', 'Đã thanh toán']
            ];

      const totalInvoiceRevenue = invoiceRows.reduce((sum, r) => sum + (typeof r[5] === 'number' ? r[5] : 0), 0);
      const invoiceSummary = [
        ['TỔNG CỘNG DOANH THU', '', '', '', '', totalInvoiceRevenue, '', '', '', '']
      ];

      // Kết xuất Workbook 4 Sheet hoàn chỉnh
      exportExcelWorkbook({
        fileName: `Bao_cao_tong_quat_thu_vien_SmartLib_${todayStr}.xls`,
        sheets: [
          {
            name: '1. Chỉ số KPI Vận hành',
            title: 'BÁO CÁO CÁC CHỈ SỐ VẬN HÀNH TỔNG QUAN (KPI TOÀN HỆ THỐNG) - SMARTLIB AI',
            subtitles: [
              `Thời gian kết xuất: ${nowFormatted} | Người lập: ${currentUser}`,
              `Kỳ thống kê: ${currentMonthText} | Tình trạng: Vận hành bình thường - VietQR hoạt động tốt`
            ],
            columns: kpiColumns,
            rows: kpiRows
          },
          {
            name: '2. Cơ cấu Kho sách',
            title: 'THỐNG KÊ CƠ CẤU 10 THỂ LOẠI KHO SÁCH (CSDL THỰC TẾ)',
            subtitles: [
              `Thời gian kết xuất: ${nowFormatted} | Tổng thể loại: 10 danh mục`
            ],
            columns: categoryColumns,
            rows: categoryRows,
            summaryRows: categorySummary
          },
          {
            name: '3. Bạn đọc Nguy cơ AI',
            title: 'DANH SÁCH ĐỘC GIẢ NGUY CƠ TRỄ HẠN CAO (AI PHÂN TÍCH & DỰ BÁO)',
            subtitles: [
              `Mô hình dự báo: Random Forest AI (Accuracy: 95.1%) | Thời gian phân tích: ${nowFormatted}`
            ],
            columns: aiColumns,
            rows: aiRiskRows
          },
          {
            name: '4. Biên lai & Thu phạt',
            title: 'DANH SÁCH BIÊN LAI THU PHẠT & ĐỐI SOÁT TÀI CHÍNH',
            subtitles: [
              `Thời gian kết xuất: ${nowFormatted} | Người lập: ${currentUser}`
            ],
            columns: invoiceColumns,
            rows: invoiceRows,
            summaryRows: invoiceSummary
          }
        ]
      });
    } catch (err) {
      console.error('Lỗi khi xuất Báo cáo Tổng quát Excel:', err);
      alert('Không thể xuất báo cáo tổng quát vào lúc này.');
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
          ) : activeTab === 'settings' ? (
            /* Breadcrumbs cho phân hệ Cài đặt Quy định */
            <div className="header-breadcrumb">
              <span className="breadcrumb-root">Trang chủ</span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Cài đặt Quy định</span>
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
              </>
            ) : (
              <>
                {/* Bộ chọn tháng hiện tại */}
                <div className="date-badge">
                  <Calendar size={16} />
                  <span>{currentMonthText}</span>
                </div>

                {/* Nút xuất báo cáo Excel tổng quát kết nối dữ liệu thật */}
                <button
                  className="btn-excel"
                  type="button"
                  onClick={handleExportDashboardReport}
                  disabled={isExportingExcel}
                  title="Xuất Báo cáo Tổng quát Vận hành Thư viện ra Excel (CSV UTF-8)"
                >
                  <FileSpreadsheet size={16} />
                  <span>{isExportingExcel ? 'Đang xuất báo cáo...' : 'Xuất báo cáo Excel'}</span>
                </button>
              </>
            )}

            {/* Chuông cảnh báo & Thông báo trễ hạn cho Thủ thư */}
            <div className="header-bell-wrapper" ref={notificationRef}>
              <button
                className={`header-bell-btn ${unreadNotificationsCount > 0 ? 'has-unread' : ''} ${isNotificationOpen ? 'active' : ''}`}
                type="button"
                title="Cảnh báo & Thông báo Thủ thư"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <Bell size={18} />
                {unreadNotificationsCount > 0 && (
                  <span className="bell-badge">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Panel Dropdown Thông báo */}
              {isNotificationOpen && (
                <div className="notification-dropdown-panel">
                  <div className="notif-header">
                    <div className="notif-title-group">
                      <span className="notif-title">Cảnh báo & Thông báo Thủ thư</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="notif-count-badge">{unreadNotificationsCount} mới</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      title="Đóng"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="notif-actions-bar">
                    <button
                      type="button"
                      className="btn-notif-scan"
                      onClick={handleScanAndSendOverdueWarnings}
                      disabled={isScanningWarnings}
                      title="Quét các phiếu mượn trễ hạn hoặc sắp đến hạn để tạo thông báo cho Thủ thư"
                    >
                      <Sparkles size={13} />
                      <span>{isScanningWarnings ? 'Đang quét...' : 'Quét & Cảnh báo ngay'}</span>
                    </button>

                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        className="btn-notif-markall"
                        onClick={handleMarkAllNotificationsRead}
                        title="Đánh dấu tất cả thông báo là đã đọc"
                      >
                        <CheckCheck size={14} />
                        <span>Đã đọc tất cả</span>
                      </button>
                    )}
                  </div>

                  <div className="notif-list-container">
                    {notificationsList.length > 0 ? (
                      notificationsList.map((notif) => (
                        <div
                          key={notif.notificationID}
                          className={`notif-item ${!notif.isRead ? 'unread' : ''}`}
                          onClick={() => handleMarkNotificationRead(notif.notificationID)}
                          title="Nhấp để đánh dấu đã đọc"
                        >
                          <div className="notif-item-top">
                            <span
                              className={
                                notif.type === 'Overdue'
                                  ? 'notif-badge-danger'
                                  : notif.type === 'DueSoon'
                                  ? 'notif-badge-warning'
                                  : 'notif-badge-info'
                              }
                            >
                              {notif.type === 'Overdue'
                                ? 'CẢNH BÁO TRỄ HẠN'
                                : notif.type === 'DueSoon'
                                ? 'SẮP ĐẾN HẠN'
                                : notif.type === 'AIRisk'
                                ? 'RỦI RO AI'
                                : 'THÔNG BÁO'}
                            </span>
                            <span className="notif-time">{notif.timeAgo || 'Vừa xong'}</span>
                          </div>
                          <div className="notif-message">{notif.message}</div>
                        </div>
                      ))
                    ) : (
                      <div className="notif-empty-box">
                        <CheckCircle2 size={32} color="#10b981" />
                        <span>Chưa có thông báo hoặc cảnh báo trễ hạn nào.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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

        {/* Banner thông báo Toast cho Thủ thư */}
        {notificationToast && (
          <div className="dashboard-toast-banner">
            <Sparkles size={16} color="#60a5fa" />
            <span>{notificationToast}</span>
          </div>
        )}

        {/* Thân nội dung phân hệ */}
        <div className="dashboard-content">
          {activeTab === 'dashboard' ? (
            <>
              {/* ----------------------------------------------------------------
                  HÀNG 4 THẺ CHỈ SỐ THỐNG KÊ TỔNG QUÁT (KPI METRIC CARDS)
                  ---------------------------------------------------------------- */}
              <div className="kpi-grid">
                {/* Thẻ 1: Kho sách & Bản sao */}
                <div
                  className="kpi-card"
                  onClick={() => navigate('/catalog')}
                  style={{ cursor: 'pointer' }}
                  title="Xem phân hệ Quản lý Sách & Danh mục"
                >
                  <div className="kpi-header">
                    <h3 className="kpi-title">Kho sách & Danh mục</h3>
                    <div className="kpi-icon-box kpi-icon-blue">
                      <BookMarked size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {bookCatalogSummary?.totalBooks
                      ? `${bookCatalogSummary.totalBooks.toLocaleString('vi-VN')} đầu sách`
                      : '11.123 đầu sách'}
                  </div>
                  <div className="kpi-subtext-box">
                    <span className="badge-growth">+10 Thể loại</span>
                    <span>~28.540 bản sao vật lý</span>
                  </div>
                </div>

                {/* Thẻ 2: Lưu thông & Mượn trả */}
                <div
                  className="kpi-card"
                  onClick={() => navigate('/circulation')}
                  style={{ cursor: 'pointer' }}
                  title="Xem phân hệ Mượn - Trả sách"
                >
                  <div className="kpi-header">
                    <h3 className="kpi-title">Lưu thông & Mượn trả</h3>
                    <div className="kpi-icon-box kpi-icon-green">
                      <ArrowLeftRight size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {bookCatalogSummary?.borrowedBooks
                      ? `${bookCatalogSummary.borrowedBooks.toLocaleString('vi-VN')} cuốn`
                      : '16.250 cuốn'}
                  </div>
                  <div className="kpi-subtext-box">
                    <span
                      style={{
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      {bookCatalogSummary?.overdueBooks || 134} quá hạn
                    </span>
                    <span>đang lưu hành</span>
                  </div>
                </div>

                {/* Thẻ 3: Hồ sơ Bạn đọc */}
                <div
                  className="kpi-card"
                  onClick={() => navigate('/readers')}
                  style={{ cursor: 'pointer' }}
                  title="Xem phân hệ Hồ sơ Độc giả"
                >
                  <div className="kpi-header">
                    <h3 className="kpi-title">Hồ sơ Bạn đọc</h3>
                    <div className="kpi-icon-box kpi-icon-purple">
                      <Users size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">1.280 bạn đọc</div>
                  <div className="kpi-subtext-box">
                    <span className="badge-growth">842 đang mượn</span>
                    <span>Tỷ lệ hoạt động 65.8%</span>
                  </div>
                </div>

                {/* Thẻ 4: Tài chính & Thu phạt */}
                <div
                  className="kpi-card"
                  onClick={() => navigate('/revenue')}
                  style={{ cursor: 'pointer' }}
                  title="Xem phân hệ Báo cáo Thu phạt & Dòng tiền"
                >
                  <div className="kpi-header">
                    <h3 className="kpi-title">Doanh thu Thu phạt</h3>
                    <div className="kpi-icon-box kpi-icon-yellow">
                      <CircleDollarSign size={20} />
                    </div>
                  </div>
                  <div className="kpi-value">
                    {revenueSummary
                      ? `${revenueSummary.totalCollectedRevenue.toLocaleString('vi-VN')} VNĐ`
                      : '490.000 VNĐ'}
                  </div>
                  <div className="kpi-subtext-box">
                    <span className="badge-growth">Thu hồi {debtRecoveryRate}%</span>
                    <span>
                      Nợ: {revenueSummary ? `${(revenueSummary.totalPendingArrears / 1000000).toFixed(1)}M` : '31.3M'}
                    </span>
                  </div>
                </div>

                {/* Thẻ 5: Tỷ lệ rủi ro trễ hẹn (AI Dự báo) */}
                <div
                  className={`kpi-card ${dashboardChartType === 'ai_risk' ? 'kpi-card-ai-active' : ''}`}
                  onClick={() => setDashboardChartType('ai_risk')}
                  style={{ cursor: 'pointer' }}
                  title="Nhấp để xem chi tiết Biểu đồ AI Dự báo Nguy cơ Trễ hẹn"
                >
                  <div className="kpi-header">
                    <h3 className="kpi-title">Tỷ lệ rủi ro trễ hẹn</h3>
                    <div className="kpi-icon-box kpi-icon-red">
                      <Sparkles size={20} />
                    </div>
                  </div>
                  <div className="kpi-value" style={{ color: '#ef4444' }}>
                    18.7%
                  </div>
                  <div className="kpi-subtext-box">
                    <span
                      style={{
                        color: '#ef4444',
                        backgroundColor: '#fef2f2',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px'
                      }}
                    >
                      42 ca cảnh báo
                    </span>
                    <span>Độ tin cậy 95.1%</span>
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------
                  HÀNG BIỂU ĐỒ TỔNG QUÁT KÉP (2 CỘT: XU HƯỚNG VẬN HÀNH + PHÂN BỔ KHO SÁCH)
                  ---------------------------------------------------------------- */}
              <div className="charts-row">
                {/* CỘT TRÁI: Biểu đồ Tổng quát (Lưu thông Mượn-Trả hoặc Tài chính Thu phạt) */}
                <div className="chart-card">
                  <div className="chart-header">
                    <div className="chart-title-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 className="chart-title">
                          {dashboardChartType === 'circulation'
                            ? 'Biểu đồ Lưu thông Sách & Vận hành Tổng quát'
                            : dashboardChartType === 'revenue'
                            ? 'Biểu đồ Thu phạt & Dòng tiền Nợ đọng'
                            : 'Biểu đồ AI Dự báo Nguy cơ Trễ hẹn'}
                        </h3>
                        {dashboardChartType === 'ai_risk' && (
                          <span className="chart-ai-badge">
                            <Sparkles size={11} />
                            <span>Random Forest AI (95.1% Acc)</span>
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        {dashboardChartType === 'circulation'
                          ? 'Đối soát thời gian thực giữa Lượt mượn và Lượt trả sách của toàn thư viện'
                          : dashboardChartType === 'revenue'
                          ? 'Đối soát thời gian thực giữa Thực thu và Nợ phát sinh theo kỳ kế toán'
                          : 'Dự báo nguy cơ trễ hạn sớm trên các lượt mượn đang lưu thông để can thiệp kịp thời'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* Bộ chuyển đổi 3 chế độ biểu đồ: Lưu thông vs Tài chính vs AI Dự báo rủi ro */}
                      <div className="chart-mode-pills">
                        <button
                          type="button"
                          className={`btn-chart-mode ${dashboardChartType === 'circulation' ? 'active' : ''}`}
                          onClick={() => setDashboardChartType('circulation')}
                          title="Xem chỉ số Lưu thông Mượn - Trả sách tổng quát"
                        >
                          <BookOpen size={13} />
                          <span>Mượn - Trả</span>
                        </button>
                        <button
                          type="button"
                          className={`btn-chart-mode ${dashboardChartType === 'revenue' ? 'active' : ''}`}
                          onClick={() => setDashboardChartType('revenue')}
                          title="Xem dòng tiền Thực thu & Nợ phạt"
                        >
                          <CircleDollarSign size={13} />
                          <span>Thu phạt</span>
                        </button>
                        <button
                          type="button"
                          className={`btn-chart-mode btn-chart-mode-ai ${dashboardChartType === 'ai_risk' ? 'active' : ''}`}
                          onClick={() => setDashboardChartType('ai_risk')}
                          title="Xem phân tích & dự báo nguy cơ trễ hạn từ mô hình AI"
                        >
                          <Sparkles size={13} />
                          <span>Dự báo nguy cơ AI</span>
                        </button>
                      </div>

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
                          <span>
                            {dashboardChartType === 'circulation'
                              ? 'Lượt mượn sách'
                              : dashboardChartType === 'revenue'
                              ? 'Thực thu'
                              : 'Lượt mượn theo dõi'}
                          </span>
                        </div>
                        <div className="legend-item">
                          <div
                            style={{
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor:
                                dashboardChartType === 'circulation'
                                  ? '#10b981'
                                  : dashboardChartType === 'revenue'
                                  ? '#f59e0b'
                                  : '#ef4444'
                            }}
                          ></div>
                          <span>
                            {dashboardChartType === 'circulation'
                              ? 'Lượt trả sách'
                              : dashboardChartType === 'revenue'
                              ? 'Nợ phát sinh / Mục tiêu'
                              : 'Nguy cơ trễ hạn (AI dự báo)'}
                          </span>
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
                        <linearGradient id="dashAiRedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
                        </linearGradient>
                      </defs>

                      {/* Các đường gióng ngang mờ */}
                      <line x1="30" y1="40" x2="970" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="90" x2="970" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="140" x2="970" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="30" y1="185" x2="970" y2="185" stroke="#e2e8f0" strokeWidth="1.2" />

                      {/* Vùng diện tích mờ */}
                      {dashboardChartType === 'ai_risk' ? (
                        <>
                          {dashboardChartData.areaPath && (
                            <path d={dashboardChartData.areaPath} fill="url(#dashBlueGrad)" opacity="0.35" />
                          )}
                          {dashboardChartData.riskAreaPath && (
                            <path d={dashboardChartData.riskAreaPath} fill="url(#dashAiRedGrad)" />
                          )}
                        </>
                      ) : (
                        dashboardChartData.areaPath && (
                          <path d={dashboardChartData.areaPath} fill="url(#dashBlueGrad)" />
                        )
                      )}

                      {/* Đường xanh: Thực thu hoặc Lượt mượn */}
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

                      {/* Đường 2: Lượt trả (Xanh lục nét liền), Nợ phát sinh (Cam nét đứt) hoặc Nguy cơ AI (Đỏ nét liền đậm) */}
                      {dashboardChartData.expectedPath && (
                        <path
                          d={dashboardChartData.expectedPath}
                          fill="none"
                          stroke={
                            dashboardChartType === 'circulation'
                              ? '#10b981'
                              : dashboardChartType === 'revenue'
                              ? '#f59e0b'
                              : '#ef4444'
                          }
                          strokeWidth={dashboardChartType === 'ai_risk' ? '2.8' : dashboardChartType === 'circulation' ? '2.5' : '2.4'}
                          strokeDasharray={dashboardChartType === 'revenue' ? '5 4' : 'none'}
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

                          {/* Điểm đường 1 (Xanh) */}
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

                          {/* Điểm đường 2 (Xanh lục, Cam, hoặc Đỏ AI) */}
                          <circle
                            cx={pt.x}
                            cy={pt.yExpected}
                            r={dashboardHoveredPoint?.date === pt.date ? 6 : (dashboardChartType === 'ai_risk' ? 4.5 : 3.5)}
                            fill="#ffffff"
                            stroke={
                              dashboardChartType === 'circulation'
                                ? '#10b981'
                                : dashboardChartType === 'revenue'
                                ? '#f59e0b'
                                : '#ef4444'
                            }
                            strokeWidth={dashboardHoveredPoint?.date === pt.date ? 3.5 : 2}
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
                            textAnchor={
                              idx === 0
                                ? 'start'
                                : idx === dashboardChartData.mapped.length - 1
                                ? 'end'
                                : 'middle'
                            }
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
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginTop: '2px'
                          }}
                        >
                          <span style={{ color: '#93c5fd' }}>
                            ● {dashboardHoveredPoint.actualLabel || 'Lượt mượn'}:
                          </span>
                          <strong>
                            {dashboardHoveredPoint.actual.toLocaleString('vi-VN')}{' '}
                            {dashboardHoveredPoint.unit || ''}
                          </strong>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginTop: '2px'
                          }}
                        >
                          <span
                            style={{
                              color:
                                dashboardChartType === 'circulation'
                                  ? '#86efac'
                                  : dashboardChartType === 'revenue'
                                  ? '#fcd34d'
                                  : '#fca5a5'
                            }}
                          >
                            ● {dashboardHoveredPoint.expectedLabel || 'Lượt trả'}:
                          </span>
                          <strong>
                            {dashboardHoveredPoint.expected.toLocaleString('vi-VN')}{' '}
                            {dashboardHoveredPoint.unit || ''}
                          </strong>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#e2e8f0',
                            borderTop: '1px solid rgba(255,255,255,0.15)',
                            paddingTop: '3px',
                            marginTop: '4px'
                          }}
                        >
                          {dashboardChartType === 'circulation'
                            ? '● Tỷ lệ trả đúng hạn: 96.4%'
                            : dashboardChartType === 'revenue'
                            ? `● Tỷ lệ thu hồi nợ: ${debtRecoveryRate}%`
                            : `● Tỷ lệ rủi ro AI: ${dashboardHoveredPoint.riskRate || '18.7%'} • Độ tin cậy AI: 95.1%`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thanh thống kê nhanh dưới chân biểu đồ (Microstats footer) */}
                  <div className="chart-footer-microstats">
                    {dashboardChartType === 'circulation' ? (
                      <>
                        <div>
                          Tỷ lệ trả sách đúng hạn:{' '}
                          <strong style={{ color: '#10b981' }}>96.4%</strong>
                        </div>
                        <div>
                          Đỉnh mượn trong kỳ:{' '}
                          <strong style={{ color: '#0f172a' }}>
                            {dashboardTrendRange === 'quarter' ? '6.800 cuốn' : '310 cuốn/ngày'}
                          </strong>
                        </div>
                        <div>
                          Tình trạng lưu thông:{' '}
                          <strong style={{ color: '#2563eb' }}>Hoạt động ổn định</strong>
                        </div>
                      </>
                    ) : dashboardChartType === 'revenue' ? (
                      <>
                        <div>
                          Tỷ lệ hoàn thành mục tiêu thu:{' '}
                          <strong style={{ color: '#10b981' }}>{debtRecoveryRate}%</strong>
                        </div>
                        <div>
                          Đỉnh thu trong kỳ:{' '}
                          <strong style={{ color: '#0f172a' }}>
                            {revenueSummary
                              ? `${revenueSummary.totalCollectedRevenue.toLocaleString('vi-VN')} VNĐ`
                              : '1.150.000 VNĐ'}
                          </strong>
                        </div>
                        <div>
                          Tự động đối soát VietQR:{' '}
                          <strong style={{ color: '#2563eb' }}>Hoạt động tốt</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          Tỷ lệ rủi ro trễ hạn TB:{' '}
                          <strong style={{ color: '#ef4444' }}>18.7%</strong>
                        </div>
                        <div>
                          Đỉnh nguy cơ trong kỳ:{' '}
                          <strong style={{ color: '#0f172a' }}>
                            {dashboardTrendRange === 'quarter' ? '1.260 ca' : '62 ca/ngày'}
                          </strong>
                        </div>
                        <div>
                          Độ chính xác AI (ROC-AUC):{' '}
                          <strong style={{ color: '#10b981' }}>93.2% (Pass F1 86.8%)</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CỘT PHẢI: Biểu đồ tròn Doughnut Phân bổ Tổng quát */}
                <div className="doughnut-card">
                  <div className="doughnut-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <h3 className="doughnut-title">{activeDonutData.title}</h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#ecfdf5',
                          color: '#059669',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {activeDonutData.badge}
                      </span>
                    </div>
                    <p className="doughnut-subtitle">{activeDonutData.subtitle}</p>

                    {/* Bộ chuyển đổi 3 chế độ: Thể loại (Mặc định), Bản sao, Thu phạt */}
                    <div className="donut-mode-pills">
                      <button
                        type="button"
                        className={`btn-donut-mode ${dashboardDonutMode === 'category' ? 'active' : ''}`}
                        onClick={() => setDashboardDonutMode('category')}
                        title="Phân bổ theo 10 Thể loại chuyên ngành"
                      >
                        <BookMarked size={12} />
                        <span>Thể loại</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-donut-mode ${dashboardDonutMode === 'status' ? 'active' : ''}`}
                        onClick={() => setDashboardDonutMode('status')}
                        title="Tỷ lệ phân bổ bản sao vật lý"
                      >
                        <Layers size={12} />
                        <span>Bản sao</span>
                      </button>
                      <button
                        type="button"
                        className={`btn-donut-mode ${dashboardDonutMode === 'revenue' ? 'active' : ''}`}
                        onClick={() => setDashboardDonutMode('revenue')}
                        title="Cơ cấu nguồn thu tiền phạt"
                      >
                        <CircleDollarSign size={12} />
                        <span>Thu phạt</span>
                      </button>
                    </div>
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

                      {/* Các phân khúc tính theo tỉ lệ thực tế */}
                      {(() => {
                        let accumulatedRatio = 0;
                        const circ = 364.42;
                        return activeDonutData.sources.map((item, idx) => {
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
                        {activeDonutData.centerAmount}
                      </span>
                      <span className="doughnut-center-label">{activeDonutData.centerLabel}</span>
                    </div>
                  </div>

                  {/* Danh sách chú giải chi tiết từng nguồn */}
                  <ul className={`doughnut-legend-list ${dashboardDonutMode === 'category' ? 'scrollable' : ''}`}>
                    {activeDonutData.sources.map((item, idx) => (
                      <li key={idx} className="doughnut-legend-item">
                        <div className="doughnut-legend-left">
                          <div
                            className="doughnut-color-indicator"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span title={item.label}>{item.label}</span>
                        </div>
                        <div className="doughnut-legend-right">
                          <span className="doughnut-amount">{item.amount}</span>
                          <span className="doughnut-percentage">{item.percentage}</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Nút hành động liên kết trực tiếp phân hệ */}
                  <button
                    type="button"
                    className="btn-view-revenue-detail"
                    onClick={activeDonutData.btnAction}
                  >
                    <span>{activeDonutData.btnLabel}</span>
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
                            <button
                              className="btn-reminder"
                              type="button"
                              onClick={() => handleSendReminderForBorrow(row)}
                              title="Gửi nhắc nhở / cảnh báo trễ hạn cho độc giả này"
                            >
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
