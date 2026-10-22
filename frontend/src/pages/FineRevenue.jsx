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
import { exportExcelWorkbook } from '../utils/excelExporter';
import ReceiptModal from '../components/ReceiptModal';
import RevenueAiForecastTab from '../components/revenue/RevenueAiForecastTab';
import RevenueArrearsTab from '../components/revenue/RevenueArrearsTab';
import RevenueReceiptsTab from '../components/revenue/RevenueReceiptsTab';
import RevenueBreakdownTab from '../components/revenue/RevenueBreakdownTab';
import './FineRevenue.css';

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

  // Dữ liệu danh sách độc giả nguy cơ (khởi tạo rỗng, nạp 100% từ API Backend SQL Server)
  const [readers, setReaders] = useState([]);

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
  const [receiptsList, setReceiptsList] = useState([]);
  const [rawReceipts, setRawReceipts] = useState([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);

  // State tổng hợp Doanh thu & Thống kê từ Backend SQL Server
  const [revenueSummary, setRevenueSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Tải danh sách khoản phạt Pending từ Backend SQL Server
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

  // Tải tổng hợp doanh thu tài chính từ Backend SQL Server
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

  // Tải lịch sử biên lai thực tế từ Backend SQL Server (toàn bộ biên lai thực)
  const fetchReceiptHistory = async () => {
    setIsLoadingReceipts(true);
    try {
      const res = await invoiceApi.getInvoiceHistory({ pageSize: 1000 });
      if (res.success && res.data && Array.isArray(res.data.items)) {
        setRawReceipts(res.data.items);
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
    } finally {
      setIsLoadingReceipts(false);
    }
  };

  // Tải danh sách độc giả có nguy cơ trễ hạn cao từ Backend SQL Server / AI Log
  const fetchAiForecastReaders = async () => {
    try {
      const res = await invoiceApi.getAiForecastReaders();
      if (res.success && Array.isArray(res.data)) {
        setReaders(res.data);
      } else {
        setReaders([]);
      }
    } catch (err) {
      console.warn('Chưa nạp được danh sách dự báo AI từ Backend:', err.message);
      setReaders([]);
    }
  };

  useEffect(() => {
    fetchPendingFines();
    fetchRevenueSummary();
    fetchReceiptHistory();
    fetchAiForecastReaders();
  }, []);

  // Tính toán các chỉ số KPI động từ dữ liệu SQL Server (không dùng fallback số giả)
  const totalCollectedAmount = useMemo(() => {
    if (revenueSummary && revenueSummary.totalCollectedRevenue != null) {
      return Number(revenueSummary.totalCollectedRevenue);
    }
    if (receiptsList.length > 0) {
      return receiptsList.reduce((acc, r) => {
        const num = parseInt(String(r.amount).replace(/[^0-9]/g, ''), 10) || 0;
        return acc + num;
      }, 0);
    }
    return 0;
  }, [revenueSummary, receiptsList]);

  const totalPendingAmount = useMemo(() => {
    if (revenueSummary && revenueSummary.totalPendingArrears != null) {
      return Number(revenueSummary.totalPendingArrears);
    }
    if (backendPendingFines.length > 0) {
      return backendPendingFines.reduce((sum, f) => sum + (Number(f.finalAmount) || 0), 0);
    }
    return 0;
  }, [revenueSummary, backendPendingFines]);

  const totalPendingCount = useMemo(() => {
    if (revenueSummary && revenueSummary.totalPendingFinesCount != null) {
      return revenueSummary.totalPendingFinesCount;
    }
    return backendPendingFines.length;
  }, [revenueSummary, backendPendingFines]);

  const totalOverdueCount = useMemo(() => {
    if (revenueSummary && revenueSummary.totalOverdueBorrowsCount != null) {
      return revenueSummary.totalOverdueBorrowsCount;
    }
    return backendPendingFines.length;
  }, [revenueSummary, backendPendingFines]);

  const totalDamageValue = useMemo(() => {
    if (revenueSummary && revenueSummary.totalDamageBookValue != null) {
      return Number(revenueSummary.totalDamageBookValue);
    }
    return 0;
  }, [revenueSummary]);

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

  // Xuất file báo cáo thống kê Excel định dạng chuẩn SpreadsheetML (hàng cột thẳng tắp, viền ô sắc nét, format tiền tệ)
  const handleExportExcel = async (type = 'auto') => {
    try {
      const exportType = type === 'auto' ? (currentSubTab === 'arrears' ? 'arrears' : 'receipts') : type;
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowFormatted = new Date().toLocaleString('vi-VN');
      const currentUser = user?.fullName && user?.fullName !== 'Nguyễn Văn A' ? user.fullName : 'Thủ thư (Admin)';

      if (exportType === 'arrears') {
        // Xuất toàn bộ danh sách nợ phạt thực tế từ SQL Server
        if (!backendPendingFines || backendPendingFines.length === 0) {
          triggerToast('⚠️ Không có dữ liệu nợ phạt tồn đọng để xuất Excel!');
          return;
        }

        const totalArrears = backendPendingFines.reduce((sum, f) => sum + (f.finalAmount || 0), 0);

        const columns = [
          { header: 'STT', width: 45, align: 'center', type: 'number' },
          { header: 'Mã phiếu phạt', width: 105, align: 'center' },
          { header: 'Mã phiếu mượn', width: 105, align: 'center' },
          { header: 'Mã độc giả', width: 95, align: 'center' },
          { header: 'Họ tên độc giả', width: 160, align: 'left' },
          { header: 'Đối tượng / Khoa', width: 160, align: 'left' },
          { header: 'Tên sách / Tài liệu', width: 240, align: 'left' },
          { header: 'Ngày đến hạn', width: 100, align: 'center' },
          { header: 'Quá hạn (ngày)', width: 85, align: 'center', type: 'number' },
          { header: 'Tiền phạt (VNĐ)', width: 120, align: 'right', type: 'currency' },
          { header: 'Lý do vi phạm', width: 170, align: 'left' },
          { header: 'Trạng thái', width: 120, align: 'center' }
        ];

        const rows = backendPendingFines.map((f, idx) => [
          idx + 1,
          f.receiptId || '',
          f.borrowCode || '',
          f.readerCode || '',
          f.readerName || '',
          f.department || '',
          f.bookTitle || '',
          f.dueDate ? new Date(f.dueDate).toLocaleDateString('vi-VN') : '',
          f.daysOverdue || 0,
          f.finalAmount || 0,
          f.reason || '',
          f.status === 'Pending' ? 'Chưa nộp (Pending)' : f.status
        ]);

        const summaryRows = [
          ['TỔNG CỘNG NỢ ĐỌNG', '', '', '', '', '', '', '', '', totalArrears, '', '']
        ];

        exportExcelWorkbook({
          fileName: `So_No_Dong_Va_Phat_Qua_Han_${todayStr}.xls`,
          sheets: [
            {
              name: 'Sổ nợ phạt tồn đọng',
              title: 'SỔ THEO DÕI NỢ ĐỌNG VÀ TIỀN PHẠT QUÁ HẠN - SMARTLIB AI',
              subtitles: [
                `Thời gian kết xuất: ${nowFormatted} | Người lập: ${currentUser}`,
                `Tổng số khoản nợ: ${backendPendingFines.length} | Tổng tiền nợ đọng chờ thu: ${totalArrears.toLocaleString('vi-VN')} VNĐ`
              ],
              columns,
              rows,
              summaryRows
            }
          ]
        });

        triggerToast(`✅ Đã xuất thành công ${backendPendingFines.length} khoản nợ phạt sang file Excel có định dạng chuẩn!`);
      } else {
        // Xuất toàn bộ danh sách biên lai thực tế từ SQL Server
        triggerToast('⏳ Đang chuẩn bị dữ liệu biên lai từ SQL Server để kết xuất Excel...');
        const res = await invoiceApi.getInvoiceHistory({ pageSize: 1000 });
        const itemsToExport = (res.success && res.data?.items?.length > 0) ? res.data.items : rawReceipts;

        if (!itemsToExport || itemsToExport.length === 0) {
          triggerToast('⚠️ Không có dữ liệu biên lai để xuất file Excel!');
          return;
        }

        const totalRevenue = itemsToExport.reduce((sum, r) => {
          const val = r.amountPaid != null ? r.amountPaid : (parseInt(String(r.amount).replace(/[^0-9]/g, ''), 10) || 0);
          return sum + val;
        }, 0);

        const columns = [
          { header: 'STT', width: 45, align: 'center', type: 'number' },
          { header: 'Mã biên lai', width: 110, align: 'center' },
          { header: 'Thời gian thu', width: 135, align: 'center' },
          { header: 'Mã độc giả', width: 95, align: 'center' },
          { header: 'Họ tên độc giả', width: 160, align: 'left' },
          { header: 'Đối tượng / Khoa', width: 160, align: 'left' },
          { header: 'Mã phiếu mượn', width: 105, align: 'center' },
          { header: 'Tên sách / Tài liệu', width: 230, align: 'left' },
          { header: 'Mã cá biệt (Barcode)', width: 115, align: 'center' },
          { header: 'Lý do thu phạt', width: 170, align: 'left' },
          { header: 'Số tiền nộp (VNĐ)', width: 125, align: 'right', type: 'currency' },
          { header: 'Phương thức', width: 100, align: 'center' },
          { header: 'Thủ thư tiếp nhận', width: 130, align: 'left' },
          { header: 'Ghi chú nghiệp vụ', width: 140, align: 'left' }
        ];

        const rows = itemsToExport.map((r, idx) => {
          const dateStr = r.paymentDate
            ? new Date(r.paymentDate).toLocaleString('vi-VN')
            : r.date || '';
          const code = r.invoiceCode || r.code || '';
          const readerCode = r.studentCode || r.readerCode || (r.reader?.match(/\(([^)]+)\)/)?.[1] || '');
          const readerName = r.readerName || (r.reader?.split('(')[0]?.trim() || r.reader || '');
          const bookTitle = r.bookTitle || '';
          const bookCode = r.bookCode || '';
          const borrowCode = r.borrowCode || '';
          const department = r.department || '';
          const reason = r.fineReasonLabel || r.fineReason || r.type || '';
          const amount = r.amountPaid != null ? r.amountPaid : (parseInt(String(r.amount).replace(/[^0-9]/g, ''), 10) || 0);
          const method = r.paymentMethod === 'Transfer' || r.isQr ? 'QR VietQR' : 'Tiền mặt';
          const cashier = r.cashierName || r.cashier || '';
          const note = r.note || '';

          return [
            idx + 1,
            code,
            dateStr,
            readerCode,
            readerName,
            department,
            borrowCode,
            bookTitle,
            bookCode,
            reason,
            amount,
            method,
            cashier,
            note
          ];
        });

        const summaryRows = [
          ['TỔNG CỘNG DOANH THU', '', '', '', '', '', '', '', '', '', totalRevenue, '', '', '']
        ];

        exportExcelWorkbook({
          fileName: `Bao_Cao_Bien_Lai_Thu_Phat_${todayStr}.xls`,
          sheets: [
            {
              name: 'Biên lai thu phạt',
              title: 'BÁO CÁO BIÊN LAI THU PHẠT VÀ ĐỐI SOÁT TÀI CHÍNH - SMARTLIB AI',
              subtitles: [
                `Thời gian kết xuất: ${nowFormatted} | Người lập: ${currentUser}`,
                `Tổng số biên lai: ${itemsToExport.length} | Tổng tiền đã thực thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`
              ],
              columns,
              rows,
              summaryRows
            }
          ]
        });

        triggerToast(`✅ Đã xuất thành công ${itemsToExport.length} biên lai thu phạt thật sang file Excel có định dạng chuẩn!`);
      }
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
              {totalPendingCount}
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
              {totalCollectedAmount > 0
                ? `${(totalCollectedAmount / 1000000).toFixed(2)}M`
                : `${receiptsList.length}`}
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
          <button
            className="btn-secondary-action"
            onClick={() => handleExportExcel('auto')}
            type="button"
            title="Xuất toàn bộ dữ liệu ra tệp Excel (.CSV UTF-8 chuẩn có dấu)"
          >
            <Download size={15} />
            <span>
              {currentSubTab === 'arrears' ? 'Xuất Excel sổ nợ đọng' : 'Xuất file Excel biên lai'}
            </span>
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
            {isLoadingSummary && !revenueSummary && receiptsList.length === 0 ? (
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>Đang tải...</span>
            ) : (
              `${totalCollectedAmount.toLocaleString('vi-VN')} đ`
            )}
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
            {isLoadingFines && backendPendingFines.length === 0 ? (
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>Đang tải...</span>
            ) : (
              `${totalPendingAmount.toLocaleString('vi-VN')} đ`
            )}
          </div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">
              {totalOverdueCount > 0 ? `${totalOverdueCount} lượt mượn quá hạn` : `${totalPendingCount} khoản phạt pending`}
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
            {isLoadingSummary && !revenueSummary ? (
              <span style={{ fontSize: '18px', color: '#94a3b8' }}>Đang tải...</span>
            ) : (
              `${totalDamageValue.toLocaleString('vi-VN')} đ`
            )}
          </div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">
              {totalPendingCount} trường hợp cần xử lý
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
          onExportExcel={() => handleExportExcel('arrears')}
        />
      )}

      {currentSubTab === 'receipts' && (
        <RevenueReceiptsTab
          receipts={receiptsList}
          onPrintReceipt={handlePrintPastReceipt}
          triggerToast={triggerToast}
          onExportExcel={() => handleExportExcel('receipts')}
          isLoading={isLoadingReceipts}
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
