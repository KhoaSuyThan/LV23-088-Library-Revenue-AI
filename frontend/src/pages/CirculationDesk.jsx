import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  PlusCircle,
  ArrowLeftRight,
  Search,
  Calendar,
  BookOpen,
  Check,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  X,
  Sparkles,
  QrCode,
  CreditCard,
  Banknote,
  Printer,
  Barcode,
  ScanLine,
  Loader2,
  FileText
} from 'lucide-react';
import { borrowApi } from '../api/borrowApi';
import { playScannerBeep } from '../utils/barcodeGenerator';
import BorrowForm from '../components/BorrowForm';
import BarcodeCameraModal from '../components/BarcodeCameraModal';
import CirculationReceiptModal from '../components/CirculationReceiptModal';
import './CirculationDesk.css';

/**
 * Dữ liệu mẫu các giao dịch mượn/trả trong ngày (Khớp 100% thiết kế giao diện Figma)
 */
const INITIAL_TRANSACTIONS = [
  {
    id: 'PM-0003',
    bookCode: 'BC000001-A',
    readerName: 'Trần Đức Huy',
    studentCode: 'RD20260001',
    bookTitle: 'Harry Potter and the Half-Blood Prince (Harry Potter #6)',
    borrowDate: '29/09/2026',
    dueDate: '30/09/2026',
    status: 'borrowing',
    statusText: 'Đang mượn',
    fineAmount: 0,
    fineText: '-',
    overdueDays: 0,
    isOverdue: false,
    isDamaged: false,
    isLost: false,
    isOnTime: true,
    damageFee: 0,
    overdueFee: 0,
    bookId: 1
  },
  {
    id: 'PM-9920',
    bookCode: 'BC000001-B',
    readerName: 'Nguyễn Văn Minh',
    studentCode: '102220184',
    bookTitle: 'Harry Potter and the Half-Blood Prince (Harry Potter #6)',
    borrowDate: '11/09/2026',
    dueDate: '20/09/2026',
    status: 'pending_fine',
    statusText: 'Chờ thu phạt',
    fineAmount: 45000,
    fineText: '45.000đ',
    overdueDays: 9,
    isOverdue: true,
    isDamaged: false,
    isLost: false,
    isOnTime: false,
    damageFee: 0,
    overdueFee: 45000,
    bookId: 1
  },
  {
    id: 'PM-9921',
    bookCode: 'BC000002-A',
    readerName: 'Lê Thị Khánh Huyền',
    studentCode: '102230045',
    bookTitle: 'Giáo trình cấu trúc dữ liệu',
    borrowDate: '05/09/2026',
    dueDate: '19/09/2026',
    status: 'returned_ontime',
    statusText: 'Đã trả (Đúng hạn)',
    fineAmount: 0,
    fineText: '0đ',
    overdueDays: 0,
    isOverdue: false,
    isDamaged: false,
    isLost: false,
    isOnTime: true,
    damageFee: 0,
    overdueFee: 0,
    bookId: 2
  },
  {
    id: 'PM-9922',
    bookCode: 'BC000002-B',
    readerName: 'Phan Hoàng Long',
    studentCode: '102220412',
    bookTitle: 'Database Systems 10th Edition',
    borrowDate: '16/09/2026',
    dueDate: '30/09/2026',
    status: 'borrowing',
    statusText: 'Đang mượn',
    fineAmount: 0,
    fineText: '-',
    overdueDays: 0,
    isOverdue: false,
    isDamaged: false,
    isLost: false,
    isOnTime: true,
    damageFee: 0,
    overdueFee: 0,
    bookId: 2
  }
];

export default function CirculationDesk({ user, externalSearch = '' }) {
  // Danh sách giao dịch trong ngày
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Giao dịch đang được chọn để kiểm tra hoàn trả (Mặc định ban đầu chưa tìm kiếm ai là null)
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);

  // Input tìm kiếm mã phiếu / mã vạch ở cột trả sách
  const [returnQuery, setReturnQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingBorrows, setIsLoadingBorrows] = useState(false);

  // State Modal Máy Quét Mã Vạch (Barcode Scanner) cho quầy trả sách
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Trạng thái kiểm tra vi phạm của giao dịch hiện tại
  const [checks, setChecks] = useState({
    isOnTime: false,
    isOverdue: true,
    isDamaged: true,
    isLost: false
  });

  // Tỷ lệ miễn giảm (0 -> 100%)
  const [waiverDiscountPercent, setWaiverDiscountPercent] = useState(0);
  const [waiverReason, setWaiverReason] = useState('');

  // Modals & Thông báo
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  // Modal biểu mẫu hành chính Phiếu mượn sách & Phiếu trả sách chuẩn A4 PDF
  const [receiptModalConfig, setReceiptModalConfig] = useState({
    isOpen: false,
    type: 'borrow',
    data: null
  });
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'
  const [toastMessage, setToastMessage] = useState('');

  const returnInputId = useId();

  // Hiển thị toast thông báo
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Hàm tính toán số ngày quá hạn thực tế dựa trên hạn trả của từng phiếu
  const calculateOverdueDays = (dueDateStr, rawDueDate) => {
    try {
      let due = null;
      if (rawDueDate) {
        due = new Date(rawDueDate);
      } else if (dueDateStr) {
        if (dueDateStr.includes('/')) {
          const [d, m, y] = dueDateStr.split('/').map(Number);
          due = new Date(y, m - 1, d, 23, 59, 59);
        } else {
          due = new Date(dueDateStr);
        }
      }
      if (!due || isNaN(due.getTime())) return 0;

      const now = new Date();
      // Đặt mốc hết ngày của hạn trả để tính đúng hạn
      due.setHours(23, 59, 59, 999);
      if (now > due) {
        const diffMs = now.getTime() - due.getTime();
        return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // Hàm chuyển định dạng ngày DD/MM/YYYY sang ISO
  const parseDateFromVn = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(Date.UTC(year, month, day, 23, 59, 59)).toISOString();
    }
    return null;
  };

  // Nạp danh sách giao dịch mượn thực tế từ CSDL Backend qua GET /api/borrows/recent
  const loadRecentTransactions = useCallback(async () => {
    setIsLoadingBorrows(true);
    try {
      const res = await borrowApi.getRecentBorrows(20);
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item) => {
          const firstItem = item.items && item.items.length > 0 ? item.items[0] : null;
          const daysLate = calculateOverdueDays(null, item.dueDate);
          const isOverdue = item.status === 'Overdue' || (daysLate > 0 && item.status !== 'Returned');
          const isReturned = item.status === 'Returned';
          const feeAmount = isOverdue ? daysLate * 5000 : 0;

          return {
            id: item.borrowCode || `PM-${item.borrowingID}`,
            borrowingId: item.borrowingID,
            bookCode: firstItem?.barcode || 'N/A',
            readerName: item.readerName || 'Bạn đọc',
            studentCode: item.readerCode || 'N/A',
            bookTitle: firstItem?.title || `Mượn ${item.totalItems} cuốn sách`,
            borrowDate: new Date(item.borrowDate).toLocaleDateString('vi-VN'),
            dueDate: new Date(item.dueDate).toLocaleDateString('vi-VN'),
            rawBorrowDate: item.borrowDate,
            rawDueDate: item.dueDate,
            status: isOverdue ? 'pending_fine' : (isReturned ? 'returned_ontime' : 'borrowing'),
            statusText: isOverdue ? 'Chờ thu phạt' : (isReturned ? 'Đã trả (Đúng hạn)' : 'Đang mượn'),
            fineAmount: feeAmount,
            fineText: feeAmount > 0 ? `${feeAmount.toLocaleString('vi-VN')}đ` : '-',
            overdueDays: daysLate,
            isOverdue: isOverdue,
            isDamaged: false,
            isLost: false,
            isOnTime: !isOverdue,
            damageFee: 0,
            overdueFee: feeAmount,
            bookId: firstItem?.bookID,
            items: item.items || []
          };
        });
        setTransactions(mapped);
        // Mặc định ban đầu chưa tìm kiếm ai thì chưa chọn phiếu nào
      }
    } catch (err) {
      console.warn('Chưa nạp được dữ liệu từ Backend, sử dụng danh sách mẫu:', err);
    } finally {
      setIsLoadingBorrows(false);
    }
  }, []);

  // Tự động gọi API nạp dữ liệu khi mở màn hình
  useEffect(() => {
    loadRecentTransactions();
  }, [loadRecentTransactions]);



  // Lấy dữ liệu chi tiết của phiếu mượn được chọn (chỉ có khi thủ thư tìm kiếm hoặc click chọn)
  const currentTransaction = selectedTransactionId
    ? (transactions.find((t) => t.id === selectedTransactionId) || null)
    : null;

  // Tự động đồng bộ trạng thái vi phạm (checks) theo đúng thông tin phiếu mượn của khách
  useEffect(() => {
    if (currentTransaction) {
      const daysLate = currentTransaction.overdueDays !== undefined
        ? currentTransaction.overdueDays
        : calculateOverdueDays(currentTransaction.dueDate, currentTransaction.rawDueDate);

      const isLate = daysLate > 0;
      setChecks({
        isOnTime: !isLate,
        isOverdue: isLate,
        isDamaged: false,
        isLost: false
      });
      setWaiverDiscountPercent(0);
      setWaiverReason('');
    }
  }, [selectedTransactionId, currentTransaction?.id]);

  // Tính toán số ngày trễ thực tế và số tiền phạt động dựa trên thông tin khách và các checkbox
  const finePerDay = 5000;
  const overdueDays = currentTransaction
    ? (currentTransaction.overdueDays !== undefined
        ? currentTransaction.overdueDays
        : calculateOverdueDays(currentTransaction.dueDate, currentTransaction.rawDueDate))
    : 0;

  const overdueFine = checks.isOverdue ? overdueDays * finePerDay : 0;
  const damageFee = checks.isDamaged ? 20000 : 0;
  const lostFee = checks.isLost ? 150000 : 0;

  const rawTotalFine = checks.isOnTime ? 0 : overdueFine + damageFee + lostFee;
  const discountAmount = Math.round((rawTotalFine * waiverDiscountPercent) / 100);
  const finalFine = Math.max(0, rawTotalFine - discountAmount);

  // Xử lý thay đổi checkbox kiểm tra vi phạm
  const handleCheckChange = (type) => {
    if (type === 'isOnTime') {
      setChecks({
        isOnTime: true,
        isOverdue: false,
        isDamaged: false,
        isLost: false
      });
    } else {
      setChecks((prev) => {
        const next = { ...prev, isOnTime: false, [type]: !prev[type] };
        // Nếu không chọn vi phạm nào, tự động tích Đúng hạn
        if (!next.isOverdue && !next.isDamaged && !next.isLost) {
          next.isOnTime = true;
        }
        return next;
      });
    }
  };

  // Xử lý khi tạo phiếu mượn mới thành công từ component BorrowForm (Story LOLRA-16)
  const handleBorrowSuccess = (created) => {
    if (!created) return;
    const firstItem = created.items && created.items.length > 0 ? created.items[0] : null;
    const cleanBarcode = firstItem?.barcode || 'Tài liệu';
    const newTx = {
      id: created.borrowCode,
      borrowingId: created.borrowingID,
      bookCode: cleanBarcode,
      readerName: created.readerName || 'Độc giả',
      studentCode: created.readerCode || '',
      bookTitle: firstItem?.title || `Tài liệu [${cleanBarcode}]`,
      borrowDate: new Date(created.borrowDate).toLocaleDateString('vi-VN'),
      dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
      status: 'borrowing',
      statusText: 'Đang mượn',
      fineAmount: 0,
      fineText: '-',
      overdueDays: 0,
      isOverdue: false,
      isDamaged: false,
      isLost: false,
      isOnTime: false,
      damageFee: 0,
      overdueFee: 0
    };

    setTransactions((prev) => [newTx, ...prev]);
    setSelectedTransactionId(created.borrowCode);

    // Tự động mở Modal Phiếu mượn sách chuẩn A4 (để xem trước, in hoặc tải file PDF)
    setReceiptModalConfig({
      isOpen: true,
      type: 'borrow',
      data: {
        id: created.borrowCode,
        borrowCode: created.borrowCode,
        borrowingId: created.borrowingID,
        readerName: created.readerName || 'Độc giả',
        readerCode: created.readerCode || '',
        studentCode: created.readerCode || '',
        department: created.memberType || 'Khoa Công nghệ Thông tin',
        rawBorrowDate: created.borrowDate,
        rawDueDate: created.dueDate,
        borrowDate: new Date(created.borrowDate).toLocaleDateString('vi-VN'),
        dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
        items: created.items && created.items.length > 0
          ? created.items.map((it) => ({
              title: it.title,
              author: it.author || 'Nhiều tác giả',
              barcode: it.barcode,
              dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
              note: 'Sách mượn mới (Tình trạng tốt)'
            }))
          : [
              {
                title: firstItem?.title || `Tài liệu [${cleanBarcode}]`,
                author: firstItem?.author || 'Nhiều tác giả',
                barcode: cleanBarcode,
                dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
                note: 'Sách mượn mới (Tình trạng tốt)'
              }
            ]
      }
    });
  };

  // Xử lý tìm kiếm hoặc quét barcode hoàn trả (hỗ trợ Mã sách, Mã vạch bản sao, Mã phiếu, MSSV, Tên sách)
  const handleReturnSearch = (query) => {
    const q = (query !== undefined ? query : returnQuery).trim().toLowerCase();
    if (!q) {
      showToast('⚠️ Vui lòng nhập Mã sách, Mã vạch hoặc Mã phiếu mượn để tìm kiếm!');
      return;
    }

    // Tìm kiếm đa chiều:
    // 1. Mã phiếu mượn (id)
    // 2. Mã vạch chính (bookCode, ví dụ BC000001-B, BC000001-A)
    // 3. Mã đầu sách gốc (bỏ hậu tố -A, -B, ví dụ BC000001)
    // 4. BookID (ID số của đầu sách trong CSDL)
    // 5. Chi tiết từng cuốn sách trong mảng items của phiếu
    // 6. MSSV / Mã độc giả (studentCode)
    // 7. Tên sách (bookTitle) hoặc Tên độc giả (readerName)
    const found = transactions.find((t) => {
      // Khớp mã phiếu mượn
      if (t.id && t.id.toLowerCase().includes(q)) return true;

      // Khớp mã vạch chính
      if (t.bookCode && t.bookCode.toLowerCase().includes(q)) return true;

      // Khớp mã sách gốc (Book Code Call Number - loại bỏ đuôi bản sao -A, -B,...)
      const baseCode = t.bookCode ? t.bookCode.split('-')[0].toLowerCase() : '';
      if (baseCode && (baseCode === q || baseCode.includes(q))) return true;

      // Khớp BookID số
      if (t.bookId && String(t.bookId).toLowerCase() === q) return true;

      // Khớp các cuốn sách trong mảng items (dành cho phiếu mượn nhiều cuốn)
      if (Array.isArray(t.items) && t.items.some((it) => {
        const itBarcode = (it.barcode || '').toLowerCase();
        const itBase = itBarcode.split('-')[0];
        const itTitle = (it.title || '').toLowerCase();
        const itBookId = String(it.bookID || '');
        return itBarcode.includes(q) || itBase === q || itBase.includes(q) || itTitle.includes(q) || itBookId === q;
      })) {
        return true;
      }

      // Khớp MSSV hoặc tên bạn đọc
      if (t.studentCode && t.studentCode.toLowerCase().includes(q)) return true;
      if (t.readerName && t.readerName.toLowerCase().includes(q)) return true;

      // Khớp tên sách
      if (t.bookTitle && t.bookTitle.toLowerCase().includes(q)) return true;

      return false;
    });

    if (found) {
      setSelectedTransactionId(found.id);
      // Đồng bộ tính toán trễ hạn
      const daysLate = found.overdueDays !== undefined
        ? found.overdueDays
        : calculateOverdueDays(found.dueDate, found.rawDueDate);
      const isLate = daysLate > 0;
      setChecks({
        isOnTime: !isLate,
        isOverdue: isLate,
        isDamaged: false,
        isLost: false
      });
      // Nếu tìm thấy một cuốn cụ thể trong items khớp với q, có thể hiển thị mã đó
      const matchedItem = Array.isArray(found.items)
        ? found.items.find((it) => (it.barcode || '').toLowerCase().includes(q))
        : null;
      const displayCode = matchedItem?.barcode || found.bookCode || found.id;
      showToast(`🔍 Đã tìm thấy: Phiếu ${found.id} - ${found.bookTitle} (Mã: ${displayCode}) của ${found.readerName}`);
    } else {
      showToast(`⚠️ Không tìm thấy phiếu mượn/sách phù hợp với mã: "${query !== undefined ? query : returnQuery}"`);
    }
  };

  // Mô phỏng quét mã vạch bằng máy quét barcode (Code 128)
  const handleSimulateScan = () => {
    setIsScannerModalOpen(true);
  };

  // Xử lý áp dụng miễn giảm phạt
  const handleApplyWaiver = (discountPct, reasonText) => {
    setWaiverDiscountPercent(discountPct);
    setWaiverReason(reasonText);
    setShowWaiverModal(false);
    showToast(`🎉 Đã áp dụng miễn giảm ${discountPct}% (${reasonText})`);
  };

  // Xử lý xác nhận trả sách đúng hạn (không phạt)
  const handleReturnSuccessOnTime = () => {
    if (!currentTransaction) return;
    const returnDateStr = new Date().toLocaleDateString('vi-VN');
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === currentTransaction.id
          ? {
              ...t,
              status: 'returned_ontime',
              statusText: 'Đã trả (Đúng hạn)',
              fineText: '0đ',
              fineAmount: 0,
              isOnTime: true,
              isOverdue: false
            }
          : t
      )
    );
    showToast(`✅ Đã hoàn tất tiếp nhận trả sách cho phiếu ${currentTransaction.id} (${currentTransaction.bookTitle})!`);

    // Tự động mở Modal Phiếu trả sách chuẩn A4 PDF
    setReceiptModalConfig({
      isOpen: true,
      type: 'return',
      data: {
        id: currentTransaction.id,
        borrowCode: currentTransaction.id,
        readerName: currentTransaction.readerName,
        studentCode: currentTransaction.studentCode,
        readerCode: currentTransaction.studentCode,
        department: currentTransaction.department || 'Khoa Công nghệ Thông tin',
        rawBorrowDate: currentTransaction.rawBorrowDate,
        rawDueDate: currentTransaction.rawDueDate,
        borrowDate: currentTransaction.borrowDate,
        dueDate: currentTransaction.dueDate,
        returnDate: returnDateStr,
        fineAmount: 0,
        statusText: 'Hoàn trả đúng hạn, nguyên vẹn - Miễn phí',
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
        items: currentTransaction.items && currentTransaction.items.length > 0
          ? currentTransaction.items.map((it) => ({
              title: it.title,
              author: it.author || 'Nhiều tác giả',
              barcode: it.barcode,
              dueDate: currentTransaction.dueDate,
              returnDate: returnDateStr,
              note: 'Trả đúng hạn, tình trạng tốt'
            }))
          : [
              {
                title: currentTransaction.bookTitle,
                author: currentTransaction.author || 'Nhiều tác giả',
                barcode: currentTransaction.bookCode,
                dueDate: currentTransaction.dueDate,
                returnDate: returnDateStr,
                note: 'Trả đúng hạn, tình trạng tốt'
              }
            ]
      }
    });
  };

  // Xử lý xác nhận lập phiếu thu tiền phạt
  const handleConfirmPayment = () => {
    setShowReceiptModal(false);
    const returnDateStr = new Date().toLocaleDateString('vi-VN');
    // Cập nhật trạng thái phiếu đã thu tiền
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === currentTransaction.id
          ? {
              ...t,
              status: 'returned_paid',
              statusText: 'Đã trả (Đã thu phạt)',
              fineText: '0đ'
            }
          : t
      )
    );
    showToast(`🧾 Đã lập phiếu thu và xác nhận thanh toán ${finalFine.toLocaleString('vi-VN')}đ cho phiếu ${currentTransaction.id}`);

    // Tự động mở Modal Phiếu trả sách chuẩn A4 PDF kèm thông tin thu phạt
    setReceiptModalConfig({
      isOpen: true,
      type: 'return',
      data: {
        id: currentTransaction.id,
        borrowCode: currentTransaction.id,
        readerName: currentTransaction.readerName,
        studentCode: currentTransaction.studentCode,
        readerCode: currentTransaction.studentCode,
        department: currentTransaction.department || 'Khoa Công nghệ Thông tin',
        rawBorrowDate: currentTransaction.rawBorrowDate,
        rawDueDate: currentTransaction.rawDueDate,
        borrowDate: currentTransaction.borrowDate,
        dueDate: currentTransaction.dueDate,
        returnDate: returnDateStr,
        fineAmount: finalFine,
        statusText: `Đã hoàn trả - Đã thu phạt: ${finalFine.toLocaleString('vi-VN')} VNĐ (${paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản QR'})`,
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
        items: currentTransaction.items && currentTransaction.items.length > 0
          ? currentTransaction.items.map((it) => ({
              title: it.title,
              author: it.author || 'Nhiều tác giả',
              barcode: it.barcode,
              dueDate: currentTransaction.dueDate,
              returnDate: returnDateStr,
              note: `Đã nộp phạt ${finalFine.toLocaleString('vi-VN')}đ (${paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản QR'})`
            }))
          : [
              {
                title: currentTransaction.bookTitle,
                author: currentTransaction.author || 'Nhiều tác giả',
                barcode: currentTransaction.bookCode,
                dueDate: currentTransaction.dueDate,
                returnDate: returnDateStr,
                note: `Đã nộp phạt ${finalFine.toLocaleString('vi-VN')}đ (${paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản QR'})`
              }
            ]
      }
    });
  };

  // Lọc danh sách giao dịch theo externalSearch từ header hoặc returnQuery từ ô tìm kiếm hoàn trả
  const filteredTransactions = transactions.filter((t) => {
    const ext = externalSearch.trim().toLowerCase();
    const ret = returnQuery.trim().toLowerCase();
    const term = ext || ret;
    if (!term) return true;
    return (
      (t.id && t.id.toLowerCase().includes(term)) ||
      (t.readerName && t.readerName.toLowerCase().includes(term)) ||
      (t.studentCode && t.studentCode.toLowerCase().includes(term)) ||
      (t.bookTitle && t.bookTitle.toLowerCase().includes(term)) ||
      (t.bookCode && t.bookCode.toLowerCase().includes(term)) ||
      (t.bookCode && t.bookCode.split('-')[0].toLowerCase().includes(term)) ||
      (t.bookId && String(t.bookId).toLowerCase() === term) ||
      (Array.isArray(t.items) && t.items.some((it) => {
        const itB = (it.barcode || '').toLowerCase();
        return itB.includes(term) || itB.split('-')[0].includes(term) || (it.title || '').toLowerCase().includes(term);
      }))
    );
  });

  return (
    <div className="circulation-desk-container">
      {/* Toast thông báo tương tác nổi */}
      {toastMessage && (
        <div className="circulation-toast">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage('')} className="toast-close-btn">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ====================================================================
          HÀNG 1: 2 THẺ (TẠO PHIẾU MƯỢN MỚI & TIẾP NHẬN TRẢ SÁCH)
          ==================================================================== */}
      <div className="circulation-top-grid">
        {/* THẺ TRÁI: TẠO PHIẾU MƯỢN MỚI (Story LOLRA-16 - Component BorrowForm) */}
        <BorrowForm onBorrowSuccess={handleBorrowSuccess} showToast={showToast} />

        {/* THẺ PHẢI: TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM */}
        <section className="circulation-card" aria-label="Tiếp nhận trả sách và kiểm tra vi phạm">
          <div className="card-header-row">
            <h2 className="card-title">TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM</h2>
            <div className="card-icon-orange" title="Xử lý trả sách">
              <ArrowLeftRight size={20} strokeWidth={2.2} />
            </div>
          </div>

          <p className="card-description">
            Quét mã vạch, nhập Mã đầu sách (BC000001), Mã vạch (BC000001-B) hoặc Mã phiếu mượn để truy xuất nhanh thông tin giao dịch hoàn trả.
          </p>

          <div className="card-form">
            <div className="form-group">
              <label htmlFor={returnInputId} className="form-label">Mã phiếu mượn / Mã sách / Mã vạch Barcode</label>
              <div className="input-with-icon">
                <button
                  type="button"
                  className="input-prefix-scan-btn"
                  title="Nhấn để tìm kiếm hoặc mở máy quét"
                  onClick={() => handleReturnSearch()}
                >
                  <Search size={16} />
                </button>
                <input
                  id={returnInputId}
                  type="text"
                  className="form-control"
                  placeholder="Nhập mã sách (BC000001), mã vạch (BC000001-B), mã phiếu..."
                  value={returnQuery}
                  onChange={(e) => setReturnQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleReturnSearch();
                    }
                  }}
                />
                {returnQuery && (
                  <button
                    type="button"
                    className="input-clear-btn"
                    onClick={() => {
                      setReturnQuery('');
                      setSelectedTransactionId(null);
                      showToast('ℹ️ Đã xóa tìm kiếm');
                    }}
                    title="Xóa nội dung tìm kiếm (X)"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Thanh gợi ý thử nghiệm nhanh mã sách & mã vạch bản sao A / B */}
            <div className="quick-test-bar">
              <span className="quick-test-label">Thử tìm nhanh:</span>
              <button
                type="button"
                className="test-chip chip-success"
                title="Tìm kiếm chính xác bản sao B (BC000001-B)"
                onClick={() => {
                  setReturnQuery('BC000001-B');
                  handleReturnSearch('BC000001-B');
                }}
              >
                🔍 BC000001-B (Cuốn B)
              </button>
              <button
                type="button"
                className="test-chip chip-success"
                title="Tìm kiếm bằng Mã đầu sách gốc không có hậu tố (BC000001)"
                onClick={() => {
                  setReturnQuery('BC000001');
                  handleReturnSearch('BC000001');
                }}
              >
                📖 BC000001 (Mã sách)
              </button>
              <button
                type="button"
                className="test-chip chip-neutral"
                title="Tìm kiếm bản sao A (BC000001-A)"
                onClick={() => {
                  setReturnQuery('BC000001-A');
                  handleReturnSearch('BC000001-A');
                }}
              >
                🏷️ BC000001-A (Cuốn A)
              </button>
            </div>

            {/* Khung quét mã vạch từ máy đọc (Viền nét đứt tương tác mở Barcode Scanner Modal) */}
            <div
              className={`barcode-scanner-zone ${isScannerModalOpen ? 'is-scanning' : ''}`}
              onClick={() => setIsScannerModalOpen(true)}
              title="Nhấn vào đây để mở Máy Quét Mã Vạch (Barcode Scanner) - hỗ trợ camera trực tiếp, lật ngang, súng đọc, dán ảnh Ctrl+V"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <ScanLine size={16} style={{ color: '#2563eb' }} />
                <span className="scanner-text" style={{ fontWeight: 600, color: '#1e40af' }}>
                  [Nhấn vào đây để mở Máy Quét Mã Vạch Barcode Scanner...]
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          HÀNG 2: CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ (Chỉ hiển thị khi đã tìm kiếm/quét)
          ==================================================================== */}
      {selectedTransactionId && currentTransaction && (
        <section className="circulation-card return-detail-card" aria-label="Chi tiết kiểm tra sách hoàn trả">
          <div className="card-header-row">
            <h2 className="card-title">
              CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ ({currentTransaction.id})
            </h2>
            <button
              type="button"
              className="btn-close-detail"
              onClick={() => {
                setSelectedTransactionId(null);
                setReturnQuery('');
                showToast('ℹ️ Đã đóng chi tiết và xóa tìm kiếm');
              }}
              title="Đóng và xóa chi tiết hoàn trả"
            >
              <X size={16} />
              <span>Đóng</span>
            </button>
          </div>

        {/* 4 Cột siêu dữ liệu độc giả & sách */}
        <div className="metadata-grid">
          <div className="meta-item">
            <span className="meta-label">ĐỘC GIẢ</span>
            <span className="meta-value">
              {currentTransaction?.readerName} ({currentTransaction?.studentCode})
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">TÊN SÁCH & MÃ SÁCH</span>
            <span className="meta-value">
              {currentTransaction?.bookTitle}
              <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                {currentTransaction?.bookCode && (
                  <span className="barcode-tag" title="Mã vạch bản sách (Barcode)">
                    <Barcode size={14} className="barcode-inline-icon" />
                    <span>Mã vạch: {currentTransaction.bookCode}</span>
                  </span>
                )}
                {currentTransaction?.bookCode && currentTransaction.bookCode.includes('-') && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--color-bg-secondary, #f1f5f9)',
                      color: 'var(--color-text-secondary, #475569)',
                      border: '1px solid var(--color-border, #cbd5e1)'
                    }}
                    title="Mã đầu sách gốc (Book Code)"
                  >
                    Mã sách: {currentTransaction.bookCode.split('-')[0]}
                  </span>
                )}
              </div>
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">NGÀY MƯỢN</span>
            <span className="meta-value">{currentTransaction?.borrowDate}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">HẠN TRẢ DỰ KIẾN</span>
            <span className="meta-value">{currentTransaction?.dueDate}</span>
          </div>
        </div>

        {/* Danh sách các ô tích chọn kiểm tra vi phạm */}
        <div className="violation-checks-row">
          {/* Đúng hạn */}
          <label className="checkbox-item" onClick={() => handleCheckChange('isOnTime')}>
            <div className={`custom-checkbox ${checks.isOnTime ? 'checked-green' : ''}`}>
              {checks.isOnTime && <Check size={14} strokeWidth={3} />}
            </div>
            <span className="checkbox-text">Đúng hạn</span>
          </label>

          {/* Quá hạn */}
          <label className="checkbox-item" onClick={() => handleCheckChange('isOverdue')}>
            <div className={`custom-checkbox ${checks.isOverdue ? 'checked-orange' : ''}`}>
              {checks.isOverdue && <Check size={14} strokeWidth={3} />}
            </div>
            <span className="checkbox-text">
              Quá hạn {overdueDays > 0 ? `(Trễ ${overdueDays} ngày)` : ''}
            </span>
          </label>

          {/* Sách rách/hỏng bìa */}
          <label className="checkbox-item" onClick={() => handleCheckChange('isDamaged')}>
            <div className={`custom-checkbox ${checks.isDamaged ? 'checked-orange' : ''}`}>
              {checks.isDamaged && <Check size={14} strokeWidth={3} />}
            </div>
            <span className="checkbox-text">Sách rách/hỏng bìa</span>
          </label>

          {/* Mất sách */}
          <label className="checkbox-item" onClick={() => handleCheckChange('isLost')}>
            <div className={`custom-checkbox ${checks.isLost ? 'checked-orange' : ''}`}>
              {checks.isLost && <Check size={14} strokeWidth={3} />}
            </div>
            <span className="checkbox-text">Mất sách</span>
          </label>
        </div>

        {/* Khung tổng kết tiền phạt dự kiến & các nút hành động (Nền hồng nhạt) */}
        <div className="fine-summary-banner">
          <div className="fine-info-left">
            <div className="fine-total-title">
              Tổng tiền phạt dự kiến: {finalFine.toLocaleString('vi-VN')} VNĐ
              {waiverDiscountPercent > 0 && (
                <span className="waiver-badge-applied">
                  (Đã giảm {waiverDiscountPercent}%)
                </span>
              )}
            </div>
            <div className="fine-breakdown-subtext">
              {checks.isOnTime ? (
                <span>(Sách hoàn trả đúng hạn, nguyên vẹn - Không phát sinh tiền phạt)</span>
              ) : (
                <span>
                  (Chi tiết:{' '}
                  {checks.isOverdue
                    ? `Phạt trễ hạn ${overdueDays} ngày x ${finePerDay.toLocaleString('vi-VN')}đ = ${overdueFine.toLocaleString('vi-VN')}đ`
                    : ''}
                  {checks.isOverdue && checks.isDamaged ? ' + ' : ''}
                  {checks.isDamaged
                    ? `Phụ phí hỏng bìa sách = ${damageFee.toLocaleString('vi-VN')}đ`
                    : ''}
                  {checks.isLost
                    ? `Phí bồi hoàn sách mất = ${lostFee.toLocaleString('vi-VN')}đ`
                    : ''}
                  {waiverDiscountPercent > 0 ? ` - Miễn giảm = ${discountAmount.toLocaleString('vi-VN')}đ` : ''}
                  )
                </span>
              )}
            </div>
          </div>

          <div className="fine-actions-right">
            {/* Nút Xem trước / In phiếu trả sách chuẩn mẫu A4 */}
            <button
              type="button"
              className="btn-preview-slip"
              title="Xem trước và xuất file PDF phiếu trả sách"
              onClick={() => {
                setReceiptModalConfig({
                  isOpen: true,
                  type: 'return',
                  data: {
                    id: currentTransaction.id,
                    borrowCode: currentTransaction.id,
                    readerName: currentTransaction.readerName,
                    studentCode: currentTransaction.studentCode,
                    readerCode: currentTransaction.studentCode,
                    department: currentTransaction.department || 'Khoa Công nghệ Thông tin',
                    rawBorrowDate: currentTransaction.rawBorrowDate,
                    rawDueDate: currentTransaction.rawDueDate,
                    borrowDate: currentTransaction.borrowDate,
                    dueDate: currentTransaction.dueDate,
                    returnDate: new Date().toLocaleDateString('vi-VN'),
                    fineAmount: finalFine,
                    statusText: finalFine === 0
                      ? 'Hoàn trả đúng hạn, nguyên vẹn'
                      : `Phát sinh tiền phạt ${finalFine.toLocaleString('vi-VN')} VNĐ`,
                    librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
                    items: currentTransaction.items && currentTransaction.items.length > 0
                      ? currentTransaction.items.map((it) => ({
                          title: it.title,
                          author: it.author || 'Nhiều tác giả',
                          barcode: it.barcode,
                          dueDate: currentTransaction.dueDate,
                          returnDate: new Date().toLocaleDateString('vi-VN'),
                          note: finalFine === 0 ? 'Trả đúng hạn' : `Phạt ${finalFine.toLocaleString('vi-VN')}đ`
                        }))
                      : [
                          {
                            title: currentTransaction.bookTitle,
                            author: currentTransaction.author || 'Nhiều tác giả',
                            barcode: currentTransaction.bookCode,
                            dueDate: currentTransaction.dueDate,
                            returnDate: new Date().toLocaleDateString('vi-VN'),
                            note: finalFine === 0 ? 'Trả đúng hạn' : `Phạt ${finalFine.toLocaleString('vi-VN')}đ`
                          }
                        ]
                  }
                });
              }}
            >
              <FileText size={16} />
              <span>Xem trước phiếu trả</span>
            </button>

            {finalFine === 0 ? (
              /* Nút Hoàn tất trả sách khi đúng hạn, không có phạt */
              <button
                type="button"
                className="btn-confirm-return"
                onClick={handleReturnSuccessOnTime}
                title="Xác nhận bạn đọc đã hoàn trả sách đúng hạn"
              >
                <CheckCircle2 size={16} />
                Xác nhận hoàn tất trả sách
              </button>
            ) : (
              <>
                {/* Nút Miễn giảm phạt (Khung trắng viền đỏ) */}
                <button
                  type="button"
                  className="btn-waiver"
                  onClick={() => setShowWaiverModal(true)}
                  disabled={waiverDiscountPercent === 100}
                >
                  Miễn giảm phạt
                </button>

                {/* Nút Lập phiếu thu phạt (Đỏ đặc) */}
                <button
                  type="button"
                  className="btn-create-receipt"
                  onClick={() => setShowReceiptModal(true)}
                >
                  Lập phiếu thu phạt
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    )}

      {/* ====================================================================
          HÀNG 3: CÁC GIAO DỊCH MƯỢN/TRẢ TRONG NGÀY
          ==================================================================== */}
      <section className="circulation-card transactions-card" aria-label="Các giao dịch mượn trả trong ngày">
        <h2 className="card-title mb-16">CÁC GIAO DỊCH MƯỢN/TRẢ TRONG NGÀY</h2>

        <div className="table-responsive">
          <table className="circulation-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Mã phiếu</th>
                <th style={{ width: '260px' }}>Độc giả</th>
                <th>Tên sách</th>
                <th style={{ width: '170px' }}>Trạng thái</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Tiền thu</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Phiếu in</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isSelected = tx.id === selectedTransactionId;
                const isBorrowSlip = tx.status === 'borrowing';
                return (
                  <tr
                    key={tx.id}
                    className={`table-row-item ${isSelected ? 'row-active' : ''}`}
                    onClick={() => {
                      setSelectedTransactionId(tx.id);
                      setChecks({
                        isOnTime: tx.isOnTime,
                        isOverdue: tx.isOverdue,
                        isDamaged: tx.isDamaged,
                        isLost: tx.isLost
                      });
                    }}
                  >
                    <td>
                      <button
                        type="button"
                        className="slip-code-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransactionId(tx.id);
                        }}
                      >
                        {tx.id}
                      </button>
                    </td>
                    <td>
                      <span className="reader-cell-text">
                        {tx.readerName} ({tx.studentCode})
                      </span>
                    </td>
                    <td>
                      <div className="book-cell-wrap">
                        <span className="book-cell-text">{tx.bookTitle}</span>
                        {tx.bookCode && (
                          <span className="table-barcode-pill" title="Mã vạch cuốn sách">
                            {tx.bookCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {tx.status === 'pending_fine' && (
                        <span className="status-badge badge-pending">Chờ thu phạt</span>
                      )}
                      {tx.status === 'returned_ontime' && (
                        <span className="status-badge badge-success">Đã trả (Đúng hạn)</span>
                      )}
                      {tx.status === 'returned_paid' && (
                        <span className="status-badge badge-success">Đã trả (Đã thu phạt)</span>
                      )}
                      {tx.status === 'borrowing' && (
                        <span className="status-badge badge-borrowing">Đang mượn</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        className={
                          tx.fineAmount > 0 ? 'amount-text-fine' : 'amount-text-neutral'
                        }
                      >
                        {tx.fineText}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-print-slip-row"
                        title={isBorrowSlip ? 'Xem / In Phiếu mượn sách (A4 PDF)' : 'Xem / In Phiếu trả sách (A4 PDF)'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptModalConfig({
                            isOpen: true,
                            type: isBorrowSlip ? 'borrow' : 'return',
                            data: {
                              id: tx.id,
                              borrowCode: tx.id,
                              readerName: tx.readerName,
                              studentCode: tx.studentCode,
                              readerCode: tx.studentCode,
                              department: tx.department || 'Khoa Công nghệ Thông tin',
                              rawBorrowDate: tx.rawBorrowDate,
                              rawDueDate: tx.rawDueDate,
                              borrowDate: tx.borrowDate,
                              dueDate: tx.dueDate,
                              returnDate: isBorrowSlip ? '' : new Date().toLocaleDateString('vi-VN'),
                              fineAmount: tx.fineAmount || 0,
                              statusText: tx.statusText,
                              librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
                              items: tx.items && tx.items.length > 0
                                ? tx.items
                                : [
                                    {
                                      title: tx.bookTitle,
                                      author: tx.author || 'Nhiều tác giả',
                                      barcode: tx.bookCode,
                                      dueDate: tx.dueDate,
                                      returnDate: isBorrowSlip ? '' : new Date().toLocaleDateString('vi-VN'),
                                      note: tx.statusText || 'Bình thường'
                                    }
                                  ]
                            }
                          });
                        }}
                      >
                        <Printer size={13} />
                        <span>{isBorrowSlip ? 'Phiếu mượn' : 'Phiếu trả'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====================================================================
          MODAL 1: MIỄN GIẢM TIỀN PHẠT THỦ THƯ (WAIVER MODAL)
          ==================================================================== */}
      {showWaiverModal && (
        <div className="modal-overlay" onClick={() => setShowWaiverModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sparkles size={20} className="modal-icon-sparkle" />
                <h3>Xét duyệt miễn giảm tiền phạt</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowWaiverModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-summary-box">
                <div className="modal-sum-row">
                  <span>Mã phiếu mượn:</span>
                  <strong>{currentTransaction.id}</strong>
                </div>
                <div className="modal-sum-row">
                  <span>Độc giả:</span>
                  <span>{currentTransaction.readerName} ({currentTransaction.studentCode})</span>
                </div>
                <div className="modal-sum-row">
                  <span>Tổng tiền phạt ban đầu:</span>
                  <span className="text-red-bold">{rawTotalFine.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div className="waiver-options-group">
                <label className="modal-field-label">Chọn tỷ lệ hoặc lý do miễn giảm:</label>
                <div className="waiver-presets-grid">
                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 100 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(100, 'Miễn giảm 100% (Sự cố hệ thống / Ốm đau)')}
                  >
                    <strong>Miễn 100%</strong>
                    <span>Bệnh viện / Bất khả kháng</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 50 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(50, 'Giảm 50% (Sinh viên diện chính sách)')}
                  >
                    <strong>Giảm 50%</strong>
                    <span>Sinh viên chính sách khó khăn</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 20 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(20, 'Giảm 20% (Điểm rèn luyện xuất sắc)')}
                  >
                    <strong>Giảm 20%</strong>
                    <span>Rèn luyện điểm cao (AI)</span>
                  </button>

                  <button
                    type="button"
                    className={`preset-btn ${waiverDiscountPercent === 0 ? 'active' : ''}`}
                    onClick={() => handleApplyWaiver(0, 'Không áp dụng miễn giảm')}
                  >
                    <strong>0% Phạt gốc</strong>
                    <span>Không miễn giảm</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowWaiverModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: LẬP BIÊN LAI THU PHẠT (RECEIPT MODAL)
          ==================================================================== */}
      {showReceiptModal && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-dialog modal-receipt" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Receipt size={20} className="modal-icon-receipt" />
                <h3>Lập phiếu thu phạt thư viện</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowReceiptModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="receipt-preview-card">
                <div className="receipt-header">
                  <div className="receipt-badge">BIÊN LAI ĐIỆN TỬ SMARTLIB AI</div>
                  <div className="receipt-code">Mã: PT-{new Date().getFullYear()}-{currentTransaction.id.replace('PM-', '')}</div>
                </div>

                <div className="receipt-details">
                  <div className="receipt-line">
                    <span className="lbl">Người nộp phạt:</span>
                    <span className="val">{currentTransaction.readerName}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Mã sinh viên:</span>
                    <span className="val">{currentTransaction.studentCode}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Tên tài liệu:</span>
                    <span className="val">{currentTransaction.bookTitle}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Lý do xử phạt:</span>
                    <span className="val">
                      {checks.isOverdue ? `Trễ hạn ${overdueDays} ngày` : ''}
                      {checks.isOverdue && checks.isDamaged ? ', ' : ''}
                      {checks.isDamaged ? 'Hỏng rách bìa' : ''}
                    </span>
                  </div>
                  <div className="receipt-divider"></div>
                  <div className="receipt-line-total">
                    <span>Số tiền thực thu:</span>
                    <span className="receipt-amount">{finalFine.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                </div>
              </div>

              {/* Lựa chọn phương thức thanh toán */}
              <div className="payment-methods-box">
                <div className="modal-field-label">Phương thức thanh toán:</div>
                <div className="payment-options">
                  <label
                    className={`pay-option ${paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    <Banknote size={18} />
                    <span>Tiền mặt tại quầy</span>
                  </label>
                  <label
                    className={`pay-option ${paymentMethod === 'transfer' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('transfer')}
                  >
                    <QrCode size={18} />
                    <span>Chuyển khoản QR code</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowReceiptModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-submit-pay"
                onClick={handleConfirmPayment}
              >
                <Printer size={15} />
                <span>Xác nhận thu & Xuất biên lai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: MÁY QUÉT MÃ VẠCH (BARCODE SCANNER) - ĐỒNG BỘ TỪ CATALOG
          ==================================================================== */}
      {/* ====================================================================
          MODAL MÁY QUÉT MÃ VẠCH (Tích hợp Live Webcam Stream, Lật ngang & Upload ảnh)
          ==================================================================== */}
      <BarcodeCameraModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerModalOpen(false);
          setReturnQuery(code);
          handleReturnSearch(code);
        }}
        targetField="return"
        title="MÁY QUÉT MÃ VẠCH SÁCH HOÀN TRẢ (RETURN SCANNER)"
      />

      {/* ====================================================================
          MODAL 4: BIỂU MẪU HÀNH CHÍNH PHIẾU MƯỢN / PHIẾU TRẢ SÁCH (IN & XUẤT A4 PDF)
          ==================================================================== */}
      <CirculationReceiptModal
        isOpen={receiptModalConfig.isOpen}
        onClose={() => setReceiptModalConfig((prev) => ({ ...prev, isOpen: false }))}
        type={receiptModalConfig.type}
        data={receiptModalConfig.data}
      />
    </div>
  );
}
