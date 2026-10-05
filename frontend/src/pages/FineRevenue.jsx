import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ReceiptText,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Download,
  Bell,
  Send,
  CheckCircle2,
  ChevronRight,
  X,
  BookOpen,
  Clock,
  ShieldAlert,
  Award
} from 'lucide-react';
import { invoiceApi } from '../api/invoiceApi';
import ReceiptModal from '../components/ReceiptModal';
import RevenueAiForecastTab from '../components/revenue/RevenueAiForecastTab';
import RevenueArrearsTab from '../components/revenue/RevenueArrearsTab';
import RevenueReceiptsTab from '../components/revenue/RevenueReceiptsTab';
import RevenueBreakdownTab from '../components/revenue/RevenueBreakdownTab';
import './FineRevenue.css';

/**
 * Dữ liệu giả lập 6 độc giả có nguy cơ trễ hạn cao (Khớp 100% Mockup Figma)
 */
const INITIAL_AI_READERS = [
  {
    id: 'PM-9920',
    name: 'Nguyễn Văn Minh',
    studentCode: '102220184',
    department: 'Khoa Công Nghệ Thông Tin',
    bookTitle: 'Harry Potter and the Half-Blood Prince (Harry Potter #6)',
    bookCode: 'BC000001-B',
    dueDate: '20/09/2026',
    score: 94,
    scoreColor: '#ef4444',
    riskLevel: 'very_high',
    riskLabel: 'Nguy cơ rất cao',
    factors: [
      { label: 'Lịch sử trả sách trễ hạn 3/4 lần trước', weight: '+40%' },
      { label: 'Trùng lịch thi học phần cuối kỳ', weight: '+27%' },
      { label: 'Đang mượn cùng lúc 3 cuốn sách', weight: '+25%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9842',
    name: 'Trần Thị Hồng Hạnh',
    studentCode: '102210103',
    department: 'Khoa Điện Tử Viễn Thông',
    bookTitle: 'Giáo trình Cấu trúc dữ liệu',
    bookCode: 'BC000002-A',
    dueDate: '26/09/2026',
    score: 78,
    scoreColor: '#f97316',
    riskLevel: 'high',
    riskLabel: 'Nguy cơ cao',
    factors: [
      { label: 'Có 1 lần trễ hạn kỳ trước', weight: '+35%' },
      { label: 'Khoảng cách địa lý sinh viên xa trường', weight: '+23%' },
      { label: 'Thời gian mượn đã kéo dài 20 ngày', weight: '+20%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9811',
    name: 'Lê Hoàng Nam',
    studentCode: '102220455',
    department: 'Khoa Quản Trị Kinh Doanh',
    bookTitle: 'Database Systems 10th Ed',
    bookCode: 'BC000003-A',
    dueDate: '28/09/2026',
    score: 55,
    scoreColor: '#f59e0b',
    riskLevel: 'medium',
    riskLabel: 'Nguy cơ trung bình',
    factors: [
      { label: 'Chưa từng trễ hạn nhưng mượn sách chuyên khảo dày', weight: '+30%' },
      { label: 'Tần suất đến thư viện giảm 40%', weight: '+25%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9799',
    name: 'Phạm Minh Đức',
    studentCode: '102200234',
    department: 'Khoa Luật & Hành Chính',
    bookTitle: 'Lịch sử Triết học Tây Phương',
    bookCode: 'BC000004-A',
    dueDate: '29/09/2026',
    score: 34,
    scoreColor: '#3b82f6',
    riskLevel: 'low',
    riskLabel: 'Nguy cơ thấp',
    factors: [
      { label: 'Lịch sử trả sách uy tín đúng hạn 100%', weight: '-40%' },
      { label: 'Điểm tín nhiệm bạn đọc xuất sắc (98/100)', weight: '-26%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9780',
    name: 'Vũ Thị Mai',
    studentCode: '102210889',
    department: 'Khoa Ngôn Ngữ Anh',
    bookTitle: 'Oxford Advanced Learner Dictionary',
    bookCode: 'BC000005-A',
    dueDate: '29/09/2026',
    score: 28,
    scoreColor: '#3b82f6',
    riskLevel: 'low',
    riskLabel: 'Nguy cơ thấp',
    factors: [
      { label: 'Thường xuyên gia hạn trực tuyến chủ động', weight: '-35%' },
      { label: 'Chỉ còn 1 ngày đến hạn nhưng chưa có cảnh báo', weight: '-20%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9745',
    name: 'Đặng Tuấn Anh',
    studentCode: '102210443',
    department: 'Khoa Xây Dựng',
    bookTitle: 'Cơ học Kết cấu Công trình',
    bookCode: 'BC000006-A',
    dueDate: '25/09/2026',
    score: 82,
    scoreColor: '#ef4444',
    riskLevel: 'very_high',
    riskLabel: 'Nguy cơ rất cao',
    factors: [
      { label: 'Quá hạn 4 ngày chưa liên hệ thư viện', weight: '+55%' },
      { label: 'Số điện thoại liên lạc tạm khóa', weight: '+30%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  }
];

/**
 * Dữ liệu mẫu danh sách biên lai thu phạt gần đây
 */
const INITIAL_RECENT_RECEIPTS = [
  {
    code: 'BL-2026-0892',
    date: '28/09/2026 14:25',
    reader: 'Nguyễn Văn Minh (102220184)',
    type: 'Phạt trễ hạn 5 ngày (Harry Potter #6)',
    amount: '25.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0891',
    date: '28/09/2026 11:10',
    reader: 'Lê Thùy Dung (102220912)',
    type: 'Bồi hoàn rách gáy sách Giáo trình Xác suất',
    amount: '35.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0890',
    date: '27/09/2026 17:05',
    reader: 'Hoàng Minh Quân (102230556)',
    type: 'Phạt trễ hạn 4 ngày',
    amount: '20.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0889',
    date: '27/09/2026 16:40',
    reader: 'Phan Hoàng Long (102220412)',
    type: 'Cấp lại thẻ thư viện bị mất',
    amount: '50.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0888',
    date: '27/09/2026 09:30',
    reader: 'Trần Văn Tùng (102210882)',
    type: 'Đền bù làm mất sách Deep Learning',
    amount: '240.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0887',
    date: '26/09/2026 15:50',
    reader: 'Đặng Thu Trang (102230114)',
    type: 'Phạt trễ hạn 6 ngày (Nhập môn Trí tuệ nhân tạo)',
    amount: '30.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0886',
    date: '26/09/2026 10:20',
    reader: 'Vũ Đức Thắng (102210543)',
    type: 'Bồi hoàn mất sách Clean Code',
    amount: '185.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0885',
    date: '25/09/2026 16:15',
    reader: 'Phạm Minh Anh (102220789)',
    type: 'Phạt trễ hạn 2 ngày',
    amount: '10.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0884',
    date: '25/09/2026 11:45',
    reader: 'Đỗ Gia Bảo (102230890)',
    type: 'Cấp lại thẻ thư viện SV khóa 2023',
    amount: '50.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0883',
    date: '24/09/2026 14:00',
    reader: 'Nguyễn Hải Đăng (102210234)',
    type: 'Đền bìa sách rách Machine Learning căn bản',
    amount: '45.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0882',
    date: '24/09/2026 08:30',
    reader: 'Lê Ngọc Ánh (102220678)',
    type: 'Phạt trễ hạn 10 ngày (Database System Concepts)',
    amount: '50.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0881',
    date: '23/09/2026 16:30',
    reader: 'Trịnh Quốc Bảo (102230432)',
    type: 'Phạt trễ hạn 3 ngày',
    amount: '15.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0880',
    date: '23/09/2026 10:15',
    reader: 'Mai Phương Thảo (102220551)',
    type: 'Bồi hoàn sách Designing Data-Intensive Apps',
    amount: '320.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0879',
    date: '22/09/2026 15:10',
    reader: 'Hồ Văn Cường (102210876)',
    type: 'Phạt trễ hạn 8 ngày',
    amount: '40.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0878',
    date: '22/09/2026 09:20',
    reader: 'Đinh Bảo Trâm (102230221)',
    type: 'Cấp lại mã thẻ từ sinh viên',
    amount: '50.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  }
];

export default function FineRevenue({ user, externalSearch = '', subTab: propSubTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định subTab chuẩn xác từ đường dẫn URL (ví dụ: /revenue/arrears -> 'arrears')
  // Mặc định là 'ai-forecast' khi truy cập /revenue hoặc /revenue/
  const pathParts = location.pathname.replace(/^\//, '').split('/');
  const rawSubTab = propSubTab || pathParts[1] || '';

  const currentSubTab =
    rawSubTab === 'arrears' || rawSubTab === 'receipts' || rawSubTab === 'breakdown'
      ? rawSubTab
      : 'ai-forecast';

  // Điều hướng chuyển tab đồng bộ trực tiếp với URL
  const handleTabChange = (targetTab) => {
    if (targetTab === 'ai-forecast') {
      navigate('/revenue/ai-forecast');
    } else {
      navigate(`/revenue/${targetTab}`);
    }
  };

  // Dữ liệu danh sách độc giả nguy cơ
  const [readers, setReaders] = useState(INITIAL_AI_READERS);

  // Bộ lọc mức độ nguy cơ
  const [filterRisk, setFilterRisk] = useState('all');

  // Hover trên đồ thị SVG
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Hiển thị/ẩn đường trên biểu đồ
  const [showExpected, setShowExpected] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);

  // Modal Chi tiết phân tích AI
  const [selectedReader, setSelectedReader] = useState(null);

  // Modal Gửi nhắc nhở
  const [remindReader, setRemindReader] = useState(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Thông báo Toast thành công
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // State quản lý Hóa đơn & Thu tiền phạt kế toán (Story LOLRA-19 & LOLRA-17)
  const [backendPendingFines, setBackendPendingFines] = useState([]);
  const [isLoadingFines, setIsLoadingFines] = useState(false);
  const [activeReceiptData, setActiveReceiptData] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptsList, setReceiptsList] = useState(INITIAL_RECENT_RECEIPTS);

  // State tổng hợp Doanh thu & Thống kê từ Backend SQL Server
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Tải danh sách khoản phạt Pending từ Backend
  const fetchPendingFines = async () => {
    setIsLoadingFines(true);
    try {
      const res = await invoiceApi.getPendingFines();
      if (res.success && Array.isArray(res.data)) {
        setBackendPendingFines(res.data);
      }
    } catch (err) {
      console.warn('Chưa tải được danh sách nợ phạt từ Backend:', err.message);
    } finally {
      setIsLoadingFines(false);
    }
  };

  // Tải tổng hợp doanh thu tài chính từ Backend
  const fetchRevenueSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await invoiceApi.getRevenueSummary();
      if (res.success && res.data) {
        setRevenueSummary(res.data);
      }
    } catch (err) {
      console.warn('Chưa nạp được tóm tắt doanh thu từ Backend:', err.message);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Tải lịch sử biên lai thực tế từ Backend
  const fetchReceiptHistory = async () => {
    try {
      const res = await invoiceApi.getInvoiceHistory({ pageSize: 50 });
      if (res.success && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
        const mapped = res.data.items.map((i) => ({
          code: i.invoiceCode,
          date: new Date(i.paymentDate).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          reader: `${i.readerName} (${i.studentCode})`,
          type: i.fineReasonLabel || i.fineReason,
          amount: `${Number(i.amountPaid || 0).toLocaleString('vi-VN')} đ`,
          method: i.paymentMethod === 'Transfer' ? 'QR VietQR' : 'Tiền mặt',
          isQr: i.paymentMethod === 'Transfer',
          cashier: i.cashierName
        }));
        setReceiptsList(mapped);
      }
    } catch (err) {
      console.warn('Chưa nạp được lịch sử biên lai từ Backend:', err.message);
    }
  };

  useEffect(() => {
    fetchPendingFines();
    fetchRevenueSummary();
    fetchReceiptHistory();
  }, []);

  // Mở ReceiptModal ở chế độ xem trước (Preview) trước khi xác nhận thu tiền (LOLRA-19)
  const handleOpenPayModal = (fine) => {
    setActiveReceiptData({
      receiptId: fine.receiptId,
      isPending: true,
      readerName: fine.readerName,
      readerCode: fine.readerCode,
      department: fine.department || 'Độc giả HUTECH',
      borrowCode: fine.borrowCode,
      bookTitle: fine.bookTitle,
      reason: fine.reason || `Phạt quá hạn ${fine.daysOverdue || 0} ngày`,
      totalAmount: fine.totalAmount || fine.finalAmount,
      discountAmount: fine.discountAmount || 0,
      amountPaid: fine.finalAmount,
      paymentMethod: 'Cash',
      cashierName: user?.fullName || 'Thủ thư tiếp nhận'
    });
    setIsReceiptModalOpen(true);
  };

  // Xác nhận thu tiền trực tiếp từ trong ReceiptModal sau khi xem trước biên lai
  const handleConfirmPaymentFromModal = async (method) => {
    if (!activeReceiptData || !activeReceiptData.receiptId) return;
    try {
      const payload = {
        receiptId: activeReceiptData.receiptId,
        paymentMethod: method || 'Cash',
        note: `Thu tiền phạt tại Sổ nợ đọng thư viện (${activeReceiptData.borrowCode})`
      };

      const res = await invoiceApi.createInvoice(payload);
      if (res.success && res.data) {
        triggerToast(`🎉 Đã thu tiền thành công! Mã biên lai ${res.data.invoiceCode}. Đã tự động mở lại quyền mượn sách.`);
        setActiveReceiptData({
          ...res.data,
          isPending: false
        });
        fetchPendingFines();
        fetchRevenueSummary();
        fetchReceiptHistory();

        // Phát sự kiện toàn cục để Dashboard tự động cập nhật số liệu thời gian thực không cần F5
        window.dispatchEvent(
          new CustomEvent('smartlib-revenue-updated', {
            detail: {
              invoiceCode: res.data.invoiceCode,
              amount: res.data.amountPaid
            }
          })
        );

        // Tự động thêm biên lai mới vào đầu danh sách lịch sử biên lai
        const newReceipt = {
          code: res.data.invoiceCode || `BL-2026-${String(Math.floor(1000 + Math.random() * 9000))}`,
          date: new Date().toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          reader: `${activeReceiptData.readerName} (${activeReceiptData.readerCode})`,
          type: activeReceiptData.reason || 'Thu tiền phạt quá hạn sách',
          amount: `${(activeReceiptData.finalAmount || activeReceiptData.amountPaid || 0).toLocaleString('vi-VN')} đ`,
          method: method === 'Transfer' ? 'QR VietQR' : 'Tiền mặt',
          isQr: method === 'Transfer',
          cashier: user?.fullName || 'Thủ thư Nguyễn Văn A'
        };
        setReceiptsList((prev) => [newReceipt, ...prev]);
      } else {
        triggerToast(`❌ Lỗi thu tiền: ${res.message}`);
      }
    } catch (err) {
      triggerToast(`❌ Lỗi giao dịch: ${err.response?.data?.message || err.message}`);
      throw err;
    }
  };

  // Xử lý xem & in lại biên lai cũ từ bảng Lịch sử biên lai đã thu
  const handlePrintPastReceipt = (r) => {
    const numAmount = parseInt(r.amount.replace(/[^0-9]/g, ''), 10) || 0;
    setActiveReceiptData({
      invoiceCode: r.code,
      readerName: r.reader.split('(')[0]?.trim() || r.reader,
      readerCode: r.reader.match(/\(([^)]+)\)/)?.[1] || 'N/A',
      reason: r.type,
      amountPaid: numAmount,
      totalAmount: numAmount,
      paymentMethod: r.method,
      cashierName: r.cashier,
      paymentDate: new Date()
    });
    setIsReceiptModalOpen(true);
  };

  // Lọc danh sách độc giả theo từ khóa & mức độ rủi ro
  const filteredReaders = useMemo(() => {
    const q = (externalSearch || '').toLowerCase().trim();
    return readers.filter((r) => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.bookTitle.toLowerCase().includes(q);

      const matchRisk =
        filterRisk === 'all'
          ? true
          : filterRisk === 'very_high'
          ? r.score >= 80
          : filterRisk === 'high'
          ? r.score >= 50 && r.score < 80
          : r.score < 50;

      return matchSearch && matchRisk;
    });
  }, [readers, externalSearch, filterRisk]);

  // Xử lý gửi nhắc nhở đơn lẻ
  const handleConfirmSendReminder = () => {
    if (!remindReader) return;
    setIsSendingReminder(true);

    setTimeout(() => {
      setReaders((prev) =>
        prev.map((item) =>
          item.id === remindReader.id ? { ...item, reminderSent: true } : item
        )
      );
      setIsSendingReminder(false);
      triggerToast(
        `Đã gửi thành công thông báo nhắc nhở đến độc giả ${remindReader.name} (${remindReader.studentCode}) qua Email & Zalo!`
      );
      setRemindReader(null);
    }, 700);
  };

  // Xử lý gửi nhắc nhở hàng loạt
  const handleBatchRemind = () => {
    const count = filteredReaders.filter((r) => !r.reminderSent).length;
    if (count === 0) {
      triggerToast('Tất cả độc giả trong danh sách đã được gửi nhắc nhở trước đó!');
      return;
    }

    setReaders((prev) =>
      prev.map((r) => ({
        ...r,
        reminderSent: true
      }))
    );
    triggerToast(
      `Đã phát lệnh gửi nhắc nhở hàng loạt thành công cho ${count} độc giả có nguy cơ trễ hạn!`
    );
  };

  // Xuất file báo cáo thống kê Excel / CSV chuẩn UTF-8 từ danh sách biên lai thực tế
  const handleExportExcel = () => {
    if (!receiptsList || receiptsList.length === 0) {
      triggerToast('⚠️ Không có dữ liệu biên lai để xuất file Excel!');
      return;
    }

    try {
      // Tiêu đề các cột trong file CSV
      const headers = ['Mã biên lai', 'Ngày thu tiền', 'Độc giả (MSSV)', 'Khoản thu / Vi phạm', 'Số tiền (VNĐ)', 'Hình thức', 'Thủ thư thu tiền'];
      const rows = receiptsList.map((r) => [
        `"${r.code || ''}"`,
        `"${r.date || ''}"`,
        `"${r.reader || ''}"`,
        `"${(r.type || '').replace(/"/g, '""')}"`,
        `"${r.amount || ''}"`,
        `"${r.method || ''}"`,
        `"${r.cashier || ''}"`
      ]);

      // Tạo nội dung CSV kèm UTF-8 BOM (\uFEFF) để Excel hiển thị đúng tiếng Việt có dấu
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Bao_Cao_Bien_Lai_Thu_Phat_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerToast('✅ Đã xuất tệp danh sách biên lai thu phạt thành công (Mở tốt trên Microsoft Excel)!');
    } catch (err) {
      triggerToast(`❌ Lỗi khi xuất tệp: ${err.message}`);
    }
  };

  return (
    <div className="fine-revenue-container">
      {/* ----------------------------------------------------------------------
          1. NAVIGATION SUB-TABS & THANH ĐIỀU HƯỚNG TỔNG (URL SUB-ROUTES)
          ---------------------------------------------------------------------- */}
      <div className="fine-revenue-toolbar">
        <div className="fine-revenue-tabs">
          <button
            className={`fine-tab-btn ${currentSubTab === 'ai-forecast' ? 'active' : ''}`}
            onClick={() => handleTabChange('ai-forecast')}
            type="button"
          >
            <Sparkles size={16} />
            <span>AI Dự báo & Xu hướng</span>
            <span className="fine-tab-badge">Mặc định</span>
          </button>

          <button
            className={`fine-tab-btn ${currentSubTab === 'arrears' ? 'active' : ''}`}
            onClick={() => handleTabChange('arrears')}
            type="button"
          >
            <AlertTriangle size={15} />
            <span>Sổ nợ đọng & Sách hư hỏng</span>
            <span className="fine-tab-badge">
              {revenueSummary ? revenueSummary.totalPendingFinesCount : backendPendingFines.length > 0 ? backendPendingFines.length : 47}
            </span>
          </button>

          <button
            className={`fine-tab-btn ${currentSubTab === 'receipts' ? 'active' : ''}`}
            onClick={() => handleTabChange('receipts')}
            type="button"
          >
            <ReceiptText size={15} />
            <span>Biên lai đã thu</span>
            <span className="fine-tab-badge">
              {revenueSummary ? `${(revenueSummary.totalCollectedRevenue / 1000000).toFixed(2)}M` : '15.45M'}
            </span>
          </button>

          <button
            className={`fine-tab-btn ${currentSubTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => handleTabChange('breakdown')}
            type="button"
          >
            <TrendingUp size={15} />
            <span>Biểu đồ & Thống kê vi phạm</span>
          </button>
        </div>

        <div className="fine-toolbar-actions">
          <button className="btn-secondary-action" onClick={handleExportExcel} type="button">
            <Download size={15} />
            <span>Xuất file Excel</span>
          </button>

          {currentSubTab === 'ai-forecast' && (
            <button className="btn-primary-action" onClick={handleBatchRemind} type="button">
              <Bell size={15} />
              <span>Gửi nhắc nhở hàng loạt</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          2. BA THẺ CHỈ SỐ KPI TỔNG QUAN (GIỮ CỐ ĐỊNH Ở ĐẦU TRANG)
          ---------------------------------------------------------------------- */}
      <div className="revenue-kpi-grid">
        {/* Thẻ 1: Tổng tiền phạt đã thu */}
        <div className="revenue-kpi-card">
          <div className="revenue-kpi-top">
            <span className="revenue-kpi-title">Tổng tiền phạt đã thu</span>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-blue">
              <ReceiptText size={20} />
            </div>
          </div>
          <div className="revenue-kpi-value">
            {revenueSummary
              ? `${Number(revenueSummary.totalCollectedRevenue || 0).toLocaleString('vi-VN')} đ`
              : '15.450.000 đ'}
          </div>
          <div className="revenue-kpi-footer">
            <span className="revenue-growth-badge">
              <TrendingUp size={13} />
              +12%
            </span>
            <span>so với tháng trước</span>
          </div>
        </div>

        {/* Thẻ 2: Tiền phạt chưa thu / nợ đọng */}
        <div className="revenue-kpi-card">
          <div className="revenue-kpi-top">
            <span className="revenue-kpi-title">Tiền phạt chưa thu / nợ đọng</span>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-yellow">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="revenue-kpi-value">
            {revenueSummary
              ? `${Number(revenueSummary.totalPendingArrears || 0).toLocaleString('vi-VN')} đ`
              : backendPendingFines.length > 0
              ? `${backendPendingFines.reduce((sum, f) => sum + (f.finalAmount || 0), 0).toLocaleString('vi-VN')} đ`
              : '2.150.000 đ'}
          </div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">
              {revenueSummary
                ? `${revenueSummary.totalOverdueBorrowsCount || revenueSummary.totalPendingFinesCount} lượt mượn quá hạn`
                : `${backendPendingFines.length > 0 ? backendPendingFines.length : 47} lượt mượn quá hạn`}
            </span>
          </div>
        </div>

        {/* Thẻ 3: Tổng giá trị sách bị mất/hư hỏng */}
        <div className="revenue-kpi-card">
          <div className="revenue-kpi-top">
            <span className="revenue-kpi-title">Tổng giá trị sách bị mất/hư hỏng</span>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-red">
              <Award size={20} />
            </div>
          </div>
          <div className="revenue-kpi-value">
            {revenueSummary
              ? `${Number(revenueSummary.totalDamageBookValue || 0).toLocaleString('vi-VN')} đ`
              : '3.800.000 đ'}
          </div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">
              {revenueSummary
                ? `${revenueSummary.totalPendingFinesCount} trường hợp cần xử lý`
                : '12 trường hợp cần xử lý'}
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          3. NỘI DUNG TỪNG TAB THEO URL SUB-ROUTE
          ---------------------------------------------------------------------- */}
      {currentSubTab === 'ai-forecast' && (
        <RevenueAiForecastTab
          readers={readers}
          filteredReaders={filteredReaders}
          filterRisk={filterRisk}
          setFilterRisk={setFilterRisk}
          showExpected={showExpected}
          setShowExpected={setShowExpected}
          showPredicted={showPredicted}
          setShowPredicted={setShowPredicted}
          hoveredPointIndex={hoveredPointIndex}
          setHoveredPointIndex={setHoveredPointIndex}
          onSelectReader={setSelectedReader}
          onRemindReader={setRemindReader}
        />
      )}

      {currentSubTab === 'arrears' && (
        <RevenueArrearsTab
          backendPendingFines={backendPendingFines}
          isLoadingFines={isLoadingFines}
          fetchPendingFines={fetchPendingFines}
          onOpenPayModal={handleOpenPayModal}
        />
      )}

      {currentSubTab === 'receipts' && (
        <RevenueReceiptsTab
          receipts={receiptsList}
          onPrintReceipt={handlePrintPastReceipt}
          triggerToast={triggerToast}
        />
      )}

      {currentSubTab === 'breakdown' && (
        <RevenueBreakdownTab
          revenueSummary={revenueSummary}
          receiptsList={receiptsList}
          backendPendingFines={backendPendingFines}
        />
      )}

      {/* ----------------------------------------------------------------------
          MODAL 1: CHI TIẾT PHÂN TÍCH NGUY CƠ AI CỦA ĐỘC GIẢ
          ---------------------------------------------------------------------- */}
      {selectedReader && (
        <div className="fine-modal-overlay" onClick={() => setSelectedReader(null)}>
          <div className="fine-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fine-modal-header">
              <h3 className="fine-modal-title">
                <Sparkles size={18} color="#2563eb" />
                <span>Chi tiết Phiếu mượn & AI Phân tích rủi ro</span>
              </h3>
              <button
                className="fine-modal-close"
                onClick={() => setSelectedReader(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fine-modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Độc giả (MSSV)</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedReader.name} ({selectedReader.studentCode})
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    {selectedReader.department}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Phiếu mượn & Hạn trả</div>
                  <div style={{ fontWeight: 700, color: '#2563eb' }}>
                    {selectedReader.id}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600 }}>
                    Hạn: {selectedReader.dueDate}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Tác phẩm đang giữ:
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px'
                  }}
                >
                  <BookOpen size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {selectedReader.bookTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Mã bản sao: {selectedReader.bookCode} • Đơn giá phạt: {selectedReader.estimatedDailyFine}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ai-factors-box">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    Trọng số các yếu tố ảnh hưởng rủi ro (AI Explanation):
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: `${selectedReader.scoreColor}15`,
                      color: selectedReader.scoreColor,
                      fontWeight: 700
                    }}
                  >
                    {selectedReader.riskLabel} ({selectedReader.score}%)
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedReader.factors.map((f, i) => (
                    <div key={i} className="ai-factor-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronRight size={14} color="#64748b" />
                        <span style={{ fontSize: '13px', color: '#334155' }}>{f.label}</span>
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: f.weight.startsWith('+') ? '#ef4444' : '#10b981'
                        }}
                      >
                        {f.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '10px',
                  padding: '12px'
                }}
              >
                <Clock size={16} color="#2563eb" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#1e40af', lineHeight: '1.5' }}>
                  <strong>Đề xuất can thiệp sớm:</strong> Nên gửi nhắc nhở trước 2 ngày qua tin nhắn Zalo ZNS và thông báo ứng dụng SmartLib Mobile để giảm 73% nguy cơ phát sinh nợ xấu.
                </div>
              </div>
            </div>

            <div className="fine-modal-footer">
              <button
                className="btn-secondary-action"
                onClick={() => setSelectedReader(null)}
                type="button"
              >
                Đóng
              </button>
              <button
                className="btn-primary-action"
                onClick={() => {
                  const target = selectedReader;
                  setSelectedReader(null);
                  setRemindReader(target);
                }}
                type="button"
              >
                <Bell size={14} />
                <span>Gửi nhắc nhở cho bạn đọc này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL 2: GỬI NHẮC NHỞ CẢNH BÁO SỚM CHO ĐỘC GIẢ
          ---------------------------------------------------------------------- */}
      {remindReader && (
        <div className="fine-modal-overlay" onClick={() => setRemindReader(null)}>
          <div className="fine-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fine-modal-header">
              <h3 className="fine-modal-title">
                <Bell size={18} color="#2563eb" />
                <span>Gửi thông báo nhắc nhở sắp đến hạn trả sách</span>
              </h3>
              <button
                className="fine-modal-close"
                onClick={() => setRemindReader(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fine-modal-body">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Các kênh gửi thông báo tự động:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>Email sinh viên ({remindReader.studentCode}@smartlib.edu.vn)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>Tin nhắn Zalo ZNS (Số điện thoại đã xác thực bạn đọc)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>Thông báo đẩy trên Ứng dụng Thư Viện SmartLib Mobile</span>
                  </label>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155'
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  [Bản xem trước tin nhắn gửi đi]
                </div>
                Thư viện trường Đại học thông báo: Bạn <strong>{remindReader.name}</strong> đang mượn cuốn sách{' '}
                <strong>"{remindReader.bookTitle}"</strong> (Phiếu mượn: {remindReader.id}). Hạn hoàn trả sách là ngày{' '}
                <strong style={{ color: '#ef4444' }}>{remindReader.dueDate}</strong>. Vui lòng mang sách đến quầy trả sách đúng hạn hoặc thực hiện gia hạn trực tuyến để tránh phát sinh phí phạt {remindReader.estimatedDailyFine}!
              </div>
            </div>

            <div className="fine-modal-footer">
              <button
                className="btn-secondary-action"
                onClick={() => setRemindReader(null)}
                disabled={isSendingReminder}
                type="button"
              >
                Hủy bỏ
              </button>

              <button
                className="btn-primary-action"
                onClick={handleConfirmSendReminder}
                disabled={isSendingReminder}
                type="button"
              >
                {isSendingReminder ? (
                  <span>Đang phát thông báo...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Xác nhận gửi nhắc nhở</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL BIÊN LAI THU PHẠT KẾ TOÁN BẤT BIẾN K80 / A5 (Story LOLRA-19)
          ---------------------------------------------------------------------- */}
      {activeReceiptData && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          invoiceData={activeReceiptData}
          defaultFormat="k80"
          onConfirmPayment={activeReceiptData.isPending ? handleConfirmPaymentFromModal : null}
        />
      )}

      {/* ----------------------------------------------------------------------
          TOAST THÔNG BÁO TÁC VỤ THÀNH CÔNG
          ---------------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fine-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
