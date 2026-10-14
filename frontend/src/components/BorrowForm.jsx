import React, { useState, useEffect, useRef, useId } from 'react';
import {
  PlusCircle,
  ScanLine,
  X,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Loader2,
  BookOpen,
  CheckCircle2,
  Trash2,
  FileText,
  Sparkles
} from 'lucide-react';
import { borrowApi } from '../api/borrowApi';
import { rulesApi } from '../api/rulesApi';
import BarcodeCameraModal from './BarcodeCameraModal';
import { decodeBarcodeFromImage, getImageFileFromClipboard } from '../utils/barcodeImageDecoder';
import './BorrowForm.css';

/**
 * Component BorrowForm: Tiếp nhận thẻ bạn đọc và tạo phiếu mượn sách bằng quét mã vạch Barcode (Story LOLRA-16).
 * 
 * Tiêu chí nghiệm thu:
 * - Scenario 1: Độc giả hợp lệ (IsActive = true, không nợ phạt), quét mã thẻ và mã vạch sách (tối đa 5 cuốn), tạo thành công.
 * - Scenario 2: Từ chối mượn sách khi có nợ phạt quá hạn hoặc quá 5 cuốn, hiển thị cảnh báo đỏ và giữ nguyên kho sách.
 * - Sub-task Huy (TH): Kết nối Camera Scanner trực tiếp và phím tắt F2.
 */
export default function BorrowForm({ onBorrowSuccess, onPreviewBorrow, showToast }) {
  // Input IDs duy nhất
  const readerInputId = useId();
  const bookCodeInputId = useId();
  const dueDateInputId = useId();

  // Dữ liệu phiếu mượn
  const [readerCode, setReaderCode] = useState('');
  const [currentBookBarcode, setCurrentBookBarcode] = useState('');
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  // Xác định ngày hôm nay theo hệ thống (chuẩn hóa 00:00:00)
  const getToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  // Định dạng ngày sang DD/MM/YYYY
  const formatDateToVn = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Định dạng ngày sang YYYY-MM-DD (dùng cho thuộc tính min của date picker)
  const formatDateToIso = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const today = getToday();
  const todayStr = formatDateToVn(today);
  const todayIso = formatDateToIso(today);

  // Hạn mức và quy định mượn trả động (đồng bộ từ rulesApi.getSystemRules())
  const [systemRules, setSystemRules] = useState(null);
  const [maxBorrowLimit, setMaxBorrowLimit] = useState(5);
  const [standardBorrowDays, setStandardBorrowDays] = useState(14);
  const [memberType, setMemberType] = useState('Student');
  const [readerInfo, setReaderInfo] = useState(null);
  const [isLoadingReader, setIsLoadingReader] = useState(false);

  // Mặc định ngày hẹn trả (sẽ tự động cập nhật theo cấu hình Admin khi tải xong)
  const [dueDate, setDueDate] = useState(() => {
    const d = getToday();
    d.setDate(d.getDate() + 14);
    return formatDateToVn(d);
  });
  const [dueDateError, setDueDateError] = useState('');
  const datePickerInputRef = useRef(null);

  // Tự động tải cấu hình quy định hiện hành từ máy chủ (Story LOLRA-72)
  useEffect(() => {
    const loadSystemRules = async () => {
      try {
        const rules = await rulesApi.getSystemRules();
        if (rules) {
          setSystemRules(rules);
          const studentDays = Number(rules.borrowDays_Student) || 14;
          const studentLimit = Number(rules.borrowLimit_Student) || Number(rules.borrowLimit_MaxTogether) || 5;

          // Cập nhật hạn mức mượn và số ngày mượn tiêu chuẩn mặc định cho độc giả sinh viên
          setMaxBorrowLimit(studentLimit);
          setStandardBorrowDays(studentDays);

          // Cập nhật thời hạn mượn mặc định theo cấu hình Admin
          const d = getToday();
          d.setDate(d.getDate() + studentDays);
          setDueDate(formatDateToVn(d));
        }
      } catch (err) {
        console.warn('Không thể nạp quy định hệ thống cho quầy mượn:', err);
      }
    };

    loadSystemRules();
  }, []);

  // Parse chuỗi DD/MM/YYYY sang Date object
  const parseVnDateToObj = (str) => {
    if (!str) return null;
    const parts = str.trim().split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        const obj = new Date(y, m, d);
        if (obj.getFullYear() === y && obj.getMonth() === m && obj.getDate() === d) {
          return obj;
        }
      }
    }
    return null;
  };

  // Tính số ngày chênh lệch giữa hạn trả đang chọn và hôm nay để highlight chính xác chip thời hạn (+7, +14, +30 ngày)
  const getDiffDaysFromToday = (dateStr) => {
    const dateObj = parseVnDateToObj(dateStr);
    if (!dateObj) return null;
    const todayMidnight = getToday();
    const diffTime = dateObj.getTime() - todayMidnight.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const activeQuickDays = getDiffDaysFromToday(dueDate);

  // Lấy chuỗi YYYY-MM-DD từ dueDate để đồng bộ vào picker
  const getIsoFromDueDate = (str) => {
    const obj = parseVnDateToObj(str);
    return obj ? formatDateToIso(obj) : '';
  };

  // Lấy ngày tối đa cho phép mượn theo cấu hình quy định hiện hành (YYYY-MM-DD)
  const getMaxIsoDate = () => {
    const maxD = getToday();
    maxD.setDate(maxD.getDate() + (Number(standardBorrowDays) || 14));
    return formatDateToIso(maxD);
  };

  // Hàm kiểm tra hợp lệ hạn trả dự kiến (phải đúng định dạng dd/mm/yyyy, không ở quá khứ và không vượt quá số ngày mượn tiêu chuẩn)
  const validateDueDate = (str) => {
    if (!str || !str.trim()) {
      return 'Vui lòng nhập hoặc chọn Hạn trả dự kiến!';
    }
    const trimmed = str.trim();
    const regex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (!regex.test(trimmed)) {
      return 'Hạn trả dự kiến phải có định dạng dd/mm/yyyy (ví dụ: 14/10/2026)!';
    }
    const dateObj = parseVnDateToObj(trimmed);
    if (!dateObj) {
      return 'Ngày/tháng/năm không hợp lệ trong lịch thực tế!';
    }
    const todayMidnight = getToday();
    if (dateObj.getTime() < todayMidnight.getTime()) {
      return `⚠️ Hạn trả không được ở trong quá khứ! Phải từ hôm nay (${todayStr}) trở đi.`;
    }
    const maxAllowedDate = getToday();
    maxAllowedDate.setDate(maxAllowedDate.getDate() + (Number(standardBorrowDays) || 14));
    if (dateObj.getTime() > maxAllowedDate.getTime()) {
      const roleText = memberType === 'Lecturer' ? 'Cán bộ & Giảng viên' : 'Bạn đọc Sinh viên';
      return `⚠️ Hạn trả không được vượt quá số ngày mượn tiêu chuẩn (${standardBorrowDays} ngày) quy định cho ${roleText}!`;
    }
    return '';
  };

  // Xử lý khi chọn ngày từ Hộp thoại lịch (Native Date Picker)
  const handleDatePickerChange = (e) => {
    const val = e.target.value; // YYYY-MM-DD
    if (!val) return;
    const [y, m, d] = val.split('-');
    const newVnStr = `${d}/${m}/${y}`;
    setDueDate(newVnStr);
    setDueDateError('');
  };

  // Nút chọn nhanh thời hạn: +7 ngày, +14 ngày (chuẩn), +30 ngày
  const handleQuickDueDate = (days) => {
    const d = getToday();
    d.setDate(d.getDate() + days);
    const newStr = formatDateToVn(d);
    setDueDate(newStr);
    setDueDateError('');
  };

  // Kiểm tra tư cách độc giả và cập nhật hạn mức động theo đối tượng (Sinh viên / Giảng viên)
  const checkReaderEligibility = async (code) => {
    const clean = (code !== undefined ? code : readerCode).trim();
    const defaultStudentLimit = systemRules
      ? (Number(systemRules.borrowLimit_Student) || Number(systemRules.borrowLimit_MaxTogether) || 5)
      : 5;
    const defaultLecturerLimit = systemRules
      ? (Number(systemRules.borrowLimit_Teacher) || 10)
      : 10;
    const defaultStudentDays = systemRules
      ? (Number(systemRules.borrowDays_Student) || 14)
      : 14;
    const defaultLecturerDays = systemRules
      ? (Number(systemRules.borrowDays_Teacher) || 30)
      : 30;

    if (!clean) {
      setReaderInfo(null);
      setMaxBorrowLimit(defaultStudentLimit);
      setMemberType('Student');
      setStandardBorrowDays(defaultStudentDays);
      const d = getToday();
      d.setDate(d.getDate() + defaultStudentDays);
      setDueDate(formatDateToVn(d));
      setDueDateError('');
      return;
    }

    setIsLoadingReader(true);
    try {
      const res = await borrowApi.checkEligibility(clean);
      if (res && res.success && res.data) {
        const data = res.data;
        setReaderInfo(data);
        const isLecturer = data.memberType === 'Lecturer';
        const limit = data.maxBorrowLimit || (isLecturer ? defaultLecturerLimit : defaultStudentLimit);
        const borrowDays = data.standardBorrowDays || (isLecturer ? defaultLecturerDays : defaultStudentDays);
        setMaxBorrowLimit(limit);
        setMemberType(data.memberType || 'Student');
        setStandardBorrowDays(borrowDays);

        // Tự động gán Hạn trả dự kiến bằng đúng số ngày mượn tiêu chuẩn cấu hình cho đối tượng này
        const d = getToday();
        d.setDate(d.getDate() + borrowDays);
        setDueDate(formatDateToVn(d));
        setDueDateError('');

        if (!data.canBorrow || !data.isActive) {
          const reason = data.rejectionReason || (!data.isActive ? 'Tài khoản thẻ thư viện đang bị khóa. Hệ thống từ chối mượn sách.' : 'Độc giả không đủ điều kiện mượn sách!');
          setBorrowError(reason);
          if (showToast) showToast(`⚠️ ${reason}`);
        } else {
          setBorrowError('');
          if (showToast) {
            showToast(`👤 Độc giả: ${data.fullName} [${isLecturer ? `Giảng viên (Tối đa ${limit} cuốn)` : `Sinh viên (Tối đa ${limit} cuốn)`}]`);
          }
        }
      }
    } catch (err) {
      console.warn('Không kiểm tra được tư cách bạn đọc qua API:', err);
    } finally {
      setIsLoadingReader(false);
    }
  };

  // Trạng thái xử lý và cảnh báo
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [borrowError, setBorrowError] = useState('');

  // State Modal Camera Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState('reader'); // 'reader' | 'book'

  // Phím tắt F2: Tự động nhảy con trỏ chuột vào ô Quét mã thẻ bạn đọc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const inputElem = document.getElementById(readerInputId);
        if (inputElem) {
          inputElem.focus();
          inputElem.select?.();
          if (showToast) {
            showToast('⚡ [Phím tắt F2]: Sẵn sàng quét mã thẻ bạn đọc / MSSV');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerInputId, showToast]);

  // Trạng thái kiểm tra mã vạch với CSDL
  const [isCheckingBarcode, setIsCheckingBarcode] = useState(false);

  // Thêm một mã vạch sách vào danh sách mượn - BẮT BUỘC SO KHỚP VỚI CSDL TRƯỚC KHI THÊM
  const handleAddBarcodeToList = async (barcodeToAdd) => {
    const code = (barcodeToAdd || currentBookBarcode).trim().toUpperCase();
    if (!code) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét Mã vạch sách!');
      return;
    }

    // Kiểm tra xem mã vạch đã được thêm vào phiếu mượn hiện tại chưa
    if (selectedBarcodes.some((b) => (typeof b === 'string' ? b : b.barcode) === code)) {
      if (showToast) showToast(`⚠️ Mã vạch sách [${code}] đã có trong danh sách mượn!`);
      setCurrentBookBarcode('');
      return;
    }

    if (selectedBarcodes.length >= maxBorrowLimit) {
      setBorrowError(`Hệ thống chỉ cho phép mượn tối đa ${maxBorrowLimit} cuốn sách trong một phiếu (${memberType === 'Lecturer' ? 'Giảng viên' : 'Sinh viên'}).`);
      if (showToast) showToast(`⚠️ Đã đạt hạn mức tối đa ${maxBorrowLimit} cuốn sách!`);
      return;
    }

    setIsCheckingBarcode(true);
    setBorrowError('');

    try {
      // 1. So khớp mã vạch với Cơ sở dữ liệu thư viện qua API
      const res = await borrowApi.lookupBarcode(code);
      const copyData = res?.data;

      if (!copyData || !copyData.barcode) {
        throw new Error(`Không tìm thấy mã vạch [${code}] trên hệ thống.`);
      }

      // 2. Kiểm tra trạng thái bản sao (Chỉ bản sao Available mới được mượn theo Scenario 2)
      if (copyData.status !== 'Available') {
        const statusMap = {
          Borrowed: 'Đang được mượn bởi người khác',
          Damaged: 'Bị hư hỏng / bảo trì',
          Lost: 'Đã báo mất'
        };
        const statusDesc = statusMap[copyData.status] || copyData.status;
        const errMsg = `Bản sao [${code}] ("${copyData.bookTitle}") đang ở trạng thái [${statusDesc}], không thể mượn!`;
        setBorrowError(errMsg);
        if (showToast) showToast(`⚠️ ${errMsg}`);
        // BUG-04: Giữ nguyên mã và bôi đen để thủ thư sửa nhanh
        setCurrentBookBarcode(code);
        setTimeout(() => {
          const input = document.getElementById(bookCodeInputId);
          if (input) {
            input.focus();
            input.select?.();
          }
        }, 50);
        return;
      }

      // 3. Thêm bản sao hợp lệ vào danh sách mượn
      setSelectedBarcodes((prev) => [
        ...prev,
        {
          barcode: copyData.barcode,
          title: copyData.bookTitle || 'Sách thư viện',
          status: copyData.status
        }
      ]);
      setCurrentBookBarcode('');
      setBorrowError('');
      if (showToast) {
        showToast(
          `➕ Đã thêm cuốn sách [${copyData.barcode}] - "${copyData.bookTitle}" vào phiếu mượn (${selectedBarcodes.length + 1
          }/${maxBorrowLimit})`
        );
      }
    } catch (err) {
      // Báo lỗi khi mã không tồn tại trên hệ thống (404 Not Found)
      const notFoundMsg =
        err.response?.data?.message ||
        `Mã vạch [${code}] không tồn tại trên hệ thống thư viện! Vui lòng kiểm tra lại.`;
      setBorrowError(notFoundMsg);
      if (showToast) showToast(`❌ ${notFoundMsg}`);

      // BUG-04: Giữ nguyên chuỗi mã vạch vừa gõ và bôi đen toàn bộ (select) để người dùng sửa nhanh thay vì xóa trắng
      setCurrentBookBarcode(code);
      setTimeout(() => {
        const input = document.getElementById(bookCodeInputId);
        if (input) {
          input.focus();
          input.select?.();
        }
      }, 50);
    } finally {
      setIsCheckingBarcode(false);
    }
  };

  // Xóa mã vạch khỏi danh sách
  const handleRemoveBarcode = (codeToRemove) => {
    setSelectedBarcodes((prev) =>
      prev.filter((b) => (typeof b === 'string' ? b : b.barcode) !== codeToRemove)
    );
  };

  // Xử lý phím tắt dán mã vạch sách (Ctrl + V): Hỗ trợ cả dán chuỗi văn bản và dán ảnh chụp Barcode
  const handleBarcodePaste = async (e) => {
    // 1. Kiểm tra nếu clipboard chứa file ảnh (ảnh chụp màn hình, ảnh Barcode)
    const imageFile = getImageFileFromClipboard(e);
    if (imageFile) {
      e.preventDefault();
      if (showToast) showToast('📷 Đang quét mã vạch từ hình ảnh vừa dán (Ctrl + V)...');
      setIsCheckingBarcode(true);
      try {
        const res = await decodeBarcodeFromImage(imageFile);
        if (res && res.success && res.barcode) {
          const detected = res.barcode.trim().toUpperCase();
          if (showToast) showToast(`🎯 Nhận diện thành công mã: ${detected}`);
          setCurrentBookBarcode(detected);
          await handleAddBarcodeToList(detected);
        } else {
          if (showToast) showToast('⚠️ Không tìm thấy mã vạch hợp lệ trong ảnh vừa dán.');
        }
      } catch (err) {
        if (showToast) showToast('❌ Lỗi giải mã hình ảnh barcode: ' + (err.message || ''));
      } finally {
        setIsCheckingBarcode(false);
      }
      return;
    }

    // 2. Nếu là văn bản dán thông thường
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText) {
      const clean = pastedText.trim().toUpperCase();
      if (clean) {
        e.preventDefault();
        setCurrentBookBarcode(clean);
        if (showToast) showToast(`📋 Đã dán mã sách: ${clean}`);
        if (/^BC\d+/i.test(clean)) {
          await handleAddBarcodeToList(clean);
        }
      }
    }
  };

  // Xử lý dán mã độc giả (Ctrl + V)
  const handleReaderPaste = async (e) => {
    const imageFile = getImageFileFromClipboard(e);
    if (imageFile) {
      e.preventDefault();
      if (showToast) showToast('📷 Đang quét mã thẻ từ ảnh dán (Ctrl + V)...');
      setIsLoadingReader(true);
      try {
        const res = await decodeBarcodeFromImage(imageFile);
        if (res && res.success && res.barcode) {
          const detected = res.barcode.trim().toUpperCase();
          setReaderCode(detected);
          await checkReaderEligibility(detected);
          if (showToast) showToast(`🎯 Quét mã thẻ bạn đọc: ${detected}`);
        }
      } catch (err) {
        console.warn('Lỗi quét mã thẻ:', err);
      } finally {
        setIsLoadingReader(false);
      }
      return;
    }

    const pastedText = e.clipboardData?.getData('text');
    if (pastedText) {
      const clean = pastedText.trim().toUpperCase();
      if (clean) {
        e.preventDefault();
        setReaderCode(clean);
        await checkReaderEligibility(clean);
      }
    }
  };

  // Mở modal Camera Scanner
  const handleOpenScanner = (target) => {
    setScannerTarget(target);
    setIsScannerOpen(true);
  };

  // Xử lý khi camera quét thành công mã vạch
  const handleScanSuccess = async (scannedCode) => {
    setIsScannerOpen(false);
    const cleanCode = (scannedCode || '').trim();
    if (!cleanCode) return;

    if (scannerTarget === 'reader') {
      setReaderCode(cleanCode);
      setBorrowError('');
      if (showToast) showToast(`⚡ Đã quét mã thẻ độc giả: ${cleanCode}`);

      // Kiểm tra ngay tư cách độc giả và cập nhật hạn mức động
      checkReaderEligibility(cleanCode);

      // Quy trình quét liên hoàn: Tự động focus sang ô Mã vạch sách
      setTimeout(() => {
        const bookInput = document.getElementById(bookCodeInputId);
        if (bookInput) {
          bookInput.focus();
          bookInput.select?.();
        }
      }, 250);
    } else {
      // Quét mã sách: So khớp và thêm trực tiếp vào danh sách mượn
      await handleAddBarcodeToList(cleanCode);
    }
  };

  // Chuyển định dạng ngày DD/MM/YYYY sang YYYY-MM-DD
  const parseDueDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Thực thi gửi yêu cầu tạo phiếu mượn lên Backend (POST /api/borrows)
  const executeSubmitBorrow = async () => {
    setBorrowError('');

    const cleanReader = readerCode.trim();
    if (!cleanReader) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét Mã độc giả / MSSV!');
      document.getElementById(readerInputId)?.focus();
      return;
    }

    // Kiểm tra độc giả có bị khóa thẻ hoặc không đủ điều kiện mượn không
    if (readerInfo && (!readerInfo.canBorrow || !readerInfo.isActive)) {
      const reason = readerInfo.rejectionReason || (!readerInfo.isActive ? 'Tài khoản thẻ thư viện đang bị khóa. Hệ thống từ chối mượn sách.' : 'Độc giả không đủ điều kiện mượn sách!');
      setBorrowError(reason);
      if (showToast) showToast(`❌ Từ chối mượn sách: ${reason}`);
      return;
    }

    // Kiểm tra tính hợp lệ của Hạn trả dự kiến (định dạng dd/mm/yyyy và không được trong quá khứ)
    const dateErr = validateDueDate(dueDate);
    if (dateErr) {
      setDueDateError(dateErr);
      setBorrowError(dateErr);
      if (showToast) showToast(`❌ ${dateErr}`);
      document.getElementById(dueDateInputId)?.focus();
      return;
    }

    // Lấy danh sách mã vạch hợp lệ từ danh sách đã so khớp CSDL
    let barcodesToSubmit = selectedBarcodes.map((b) => (typeof b === 'string' ? b : b.barcode));

    if (barcodesToSubmit.length === 0) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét ít nhất một cuốn sách hợp lệ vào phiếu mượn!');
      document.getElementById(bookCodeInputId)?.focus();
      return;
    }

    if (barcodesToSubmit.length > maxBorrowLimit) {
      setBorrowError(`Số sách yêu cầu vượt quá hạn mức tối đa ${maxBorrowLimit} cuốn (${memberType === 'Lecturer' ? 'Giảng viên' : 'Sinh viên'}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        readerCode: cleanReader,
        barcodes: barcodesToSubmit,
        dueDate: parseDueDate(dueDate)
      };

      const res = await borrowApi.createBorrow(payload);
      if (res && res.success && res.data) {
        const created = res.data;
        if (showToast) {
          showToast(`✅ ${res.message || `Tạo phiếu mượn ${created.borrowCode} thành công!`}`);
        }

        // Reset form sau khi tạo phiếu thành công
        setSelectedBarcodes([]);
        setCurrentBookBarcode('');
        setBorrowError('');

        // Báo lên component cha để refresh danh sách giao dịch
        if (onBorrowSuccess) {
          onBorrowSuccess(created);
        }
      } else {
        const msg = res?.message || 'Không thể tạo phiếu mượn.';
        setBorrowError(msg);
        if (showToast) showToast(`❌ Từ chối mượn sách: ${msg}`);
      }
    } catch (err) {
      // Bắt lỗi từ chối mượn sách (HTTP 400 Bad Request theo Scenario 2)
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Lỗi từ chối mượn sách từ máy chủ.';
      setBorrowError(serverMsg);
      if (showToast) showToast(`❌ Từ chối mượn: ${serverMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit từ form khi người dùng nhấn Enter hoặc bấm Xác nhận
  const handleSubmit = (e) => {
    e.preventDefault();
    executeSubmitBorrow();
  };

  // Xem trước biểu mẫu Phiếu mượn sách A4 trước khi tạo chính thức
  const handlePreviewBorrow = (e) => {
    e?.preventDefault?.();
    setBorrowError('');

    const cleanReader = readerCode.trim();
    if (!cleanReader) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét Mã độc giả / MSSV trước khi xem trước!');
      document.getElementById(readerInputId)?.focus();
      return;
    }

    const dateErr = validateDueDate(dueDate);
    if (dateErr) {
      setDueDateError(dateErr);
      setBorrowError(dateErr);
      if (showToast) showToast(`❌ ${dateErr}`);
      document.getElementById(dueDateInputId)?.focus();
      return;
    }

    let barcodesToSubmit = selectedBarcodes.map((b) => (typeof b === 'string' ? b : b.barcode));
    if (barcodesToSubmit.length === 0) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét ít nhất một cuốn sách vào phiếu mượn trước khi xem trước!');
      document.getElementById(bookCodeInputId)?.focus();
      return;
    }

    if (barcodesToSubmit.length > maxBorrowLimit) {
      const limitErr = `Số sách yêu cầu (${barcodesToSubmit.length}) vượt quá hạn mức tối đa ${maxBorrowLimit} cuốn (${memberType === 'Lecturer' ? 'Giảng viên' : 'Sinh viên'}).`;
      setBorrowError(limitErr);
      if (showToast) showToast(`❌ ${limitErr}`);
      return;
    }

    // Chuẩn bị danh sách sách đầy đủ để đưa vào bản in A4 xem trước
    const previewItems = selectedBarcodes.map((b, idx) => {
      const code = typeof b === 'string' ? b : b.barcode;
      const title = typeof b === 'string' ? `Tài liệu Thư viện [${code}]` : (b.title || 'Tài liệu Thư viện');
      const author = typeof b === 'string' ? 'Nhiều tác giả' : (b.author || 'Nhiều tác giả');
      return {
        title,
        author,
        barcode: code,
        dueDate: dueDate,
        note: 'Sách mượn mới (Tình trạng tốt)'
      };
    });

    const deptDisplay = (readerInfo?.department && readerInfo?.department !== 'Standard')
      ? readerInfo?.department
      : (memberType === 'Lecturer' ? 'Cán bộ / Giảng viên' : 'Khoa Công nghệ Thông tin');

    // Mở Modal xem trước chuẩn A4 và cung cấp callback xác nhận tạo phiếu
    onPreviewBorrow?.({
      isPreviewOnly: true,
      id: 'PM-DRAFT',
      borrowCode: 'PM-DRAFT',
      readerName: readerInfo?.fullName || `Độc giả (${cleanReader})`,
      readerCode: cleanReader,
      studentCode: cleanReader,
      department: deptDisplay,
      rawBorrowDate: todayIso,
      rawDueDate: parseDueDate(dueDate),
      borrowDate: todayStr,
      dueDate: dueDate,
      items: previewItems,
      // Nút xác nhận tạo phiếu mượn trực tiếp từ trong Modal xem trước
      onConfirmCreate: () => {
        executeSubmitBorrow();
      }
    });
  };

  return (
    <section className="circulation-card borrow-form-card" aria-label="Tạo phiếu mượn mới">
      <div className="card-header-row">
        <h2 className="card-title">TẠO PHIẾU MƯỢN MỚI</h2>
        <div className="card-icon-blue" title="Mượn sách mới (Story LOLRA-16)">
          <PlusCircle size={20} strokeWidth={2.2} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-form">
        {/* Nhập Mã độc giả / MSSV */}
        <div className="form-group">
          <div className="form-label-with-badge">
            <label htmlFor={readerInputId} className="form-label">
              Mã độc giả / MSSV <span className="hotkey-badge" title="Nhấn F2 để quét nhanh">[F2]</span>
            </label>
            {readerInfo && (
              <>
                <span className={`reader-member-badge ${memberType === 'Lecturer' ? 'badge-lecturer' : 'badge-student'}`}>
                  {memberType === 'Lecturer'
                    ? ` Giảng viên (Tối đa ${maxBorrowLimit} cuốn)`
                    : ` Sinh viên (Tối đa ${maxBorrowLimit} cuốn)`}
                </span>
                {!readerInfo.isActive && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 800, border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🔒 Thẻ đã bị khóa
                  </span>
                )}
              </>
            )}
            {isLoadingReader && (
              <Loader2 size={13} className="spin-icon" style={{ color: '#2563eb', marginLeft: '6px' }} />
            )}
          </div>
          <div className="input-with-icon">
            <button
              type="button"
              className="input-prefix-scan-btn"
              title="Nhấn để mở Camera quét Thẻ bạn đọc (Webcam / Súng đọc)"
              onClick={() => handleOpenScanner('reader')}
            >
              <ScanLine size={16} />
            </button>
            <input
              id={readerInputId}
              type="text"
              className="form-control"
              placeholder="Quét mã vạch thẻ hoặc nhập MSSV..."
              value={readerCode}
              onChange={(e) => {
                setReaderCode(e.target.value);
                if (!e.target.value.trim()) {
                  const defaultStudentLimit = systemRules
                    ? (Number(systemRules.borrowLimit_Student) || Number(systemRules.borrowLimit_MaxTogether) || 5)
                    : 5;
                  setReaderInfo(null);
                  setMaxBorrowLimit(defaultStudentLimit);
                  setMemberType('Student');
                }
              }}
              onPaste={handleReaderPaste}
              onBlur={() => checkReaderEligibility(readerCode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  checkReaderEligibility(readerCode);
                  document.getElementById(bookCodeInputId)?.focus();
                }
              }}
            />
            {readerCode && (
              <button
                type="button"
                className="input-clear-btn"
                onClick={() => {
                  const defaultStudentLimit = systemRules
                    ? (Number(systemRules.borrowLimit_Student) || Number(systemRules.borrowLimit_MaxTogether) || 5)
                    : 5;
                  const defaultStudentDays = systemRules
                    ? (Number(systemRules.borrowDays_Student) || 14)
                    : 14;
                  setReaderCode('');
                  setReaderInfo(null);
                  setMaxBorrowLimit(defaultStudentLimit);
                  setMemberType('Student');
                  setStandardBorrowDays(defaultStudentDays);
                  const d = getToday();
                  d.setDate(d.getDate() + defaultStudentDays);
                  setDueDate(formatDateToVn(d));
                  setDueDateError('');
                }}
                title="Xóa mã độc giả"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Card thẩm định rủi ro AI ONNX Runtime theo thời gian thực (Story LOLRA-21) */}
        {readerInfo && (
          <div className={`ai-risk-card-compact ai-risk-tier-${readerInfo.aiRiskTier?.toLowerCase() || 'low'}`}>
            <div className="ai-risk-card-header">
              <div className="ai-risk-title-group">
                <Sparkles size={15} className="ai-sparkle-icon" />
                <span className="ai-risk-title">THẨM ĐỊNH RỦI RO AI</span>
                <span className="ai-latency-badge" title="Mô hình ONNX Runtime chạy in-process">&lt;1ms</span>
              </div>
              <div className="ai-risk-badges-group">
                <span className="credit-score-pill" title="Điểm tín nhiệm độc giả trong hệ thống">
                  Tín nhiệm: <strong>{readerInfo.creditScore ?? 100}/100</strong>
                </span>
                <span className={`ai-tier-badge badge-${readerInfo.aiRiskBadgeColor || 'success'}`}>
                  {readerInfo.aiRiskTier === 'High' ? (
                    <><AlertTriangle size={12} /> RỦI RO CAO ({((readerInfo.aiRiskScore ?? 0) * 100).toFixed(1)}%)</>
                  ) : readerInfo.aiRiskTier === 'Medium' ? (
                    <><AlertCircle size={12} /> RỦI RO VỪA ({((readerInfo.aiRiskScore ?? 0) * 100).toFixed(1)}%)</>
                  ) : (
                    <><CheckCircle2 size={12} /> AN TOÀN ({((readerInfo.aiRiskScore ?? 0) * 100).toFixed(1)}%)</>
                  )}
                </span>
              </div>
            </div>
            {readerInfo.aiSuggestedAction && (
              <div className="ai-risk-card-body">
                <span className="ai-action-label">Khuyến nghị AI:</span>
                <span className="ai-action-text">{readerInfo.aiSuggestedAction}</span>
              </div>
            )}
          </div>
        )}

        {/* Ô quét mã vạch sách & Hạn trả dự kiến */}
        <div className="form-two-cols">
          <div className="form-group">
            <label htmlFor={bookCodeInputId} className="form-label">
              Mã vạch sách ({selectedBarcodes.length}/{maxBorrowLimit} cuốn)
            </label>
            <div className="input-with-icon">
              <button
                type="button"
                className="input-prefix-scan-btn"
                title="Nhấn để mở Camera quét Mã vạch sách (Webcam)"
                onClick={() => handleOpenScanner('book')}
              >
                <ScanLine size={16} />
              </button>
              <input
                id={bookCodeInputId}
                type="text"
                className="form-control"
                placeholder={isCheckingBarcode ? 'Đang so khớp với CSDL...' : 'BC000001-A... (Ctrl+V dán, Enter để kiểm tra)'}
                value={currentBookBarcode}
                disabled={isCheckingBarcode}
                onChange={(e) => setCurrentBookBarcode(e.target.value)}
                onPaste={handleBarcodePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBarcodeToList();
                  }
                }}
              />
              {isCheckingBarcode ? (
                <Loader2 size={15} className="spin-icon" style={{ color: '#2563eb', marginRight: '8px' }} />
              ) : currentBookBarcode ? (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => setCurrentBookBarcode('')}
                  title="Xóa mã sách"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="form-group due-date-form-group">
            <div className="due-date-header-row">
              <label htmlFor={dueDateInputId} className="form-label">
                Hạn trả dự kiến
              </label>
              <span className="today-indicator-tag" title="Ngày hiện tại theo thời gian thực hệ thống">
                Hôm nay: <strong>{todayStr}</strong>
              </span>
            </div>

            <div className={`input-with-icon due-date-input-wrap ${dueDateError ? 'has-error' : ''}`}>
              <button
                type="button"
                className="input-prefix-scan-btn calendar-trigger-btn"
                title="Nhấn để mở Hộp thoại lịch (Date Picker) - Không cho phép chọn ngày quá khứ"
                onClick={() => {
                  if (datePickerInputRef.current?.showPicker) {
                    datePickerInputRef.current.showPicker();
                  } else {
                    datePickerInputRef.current?.focus();
                  }
                }}
              >
                <Calendar size={16} />
              </button>

              <input
                id={dueDateInputId}
                type="text"
                className={`form-control ${dueDateError ? 'input-error-border' : ''}`}
                placeholder="dd/mm/yyyy"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (dueDateError) setDueDateError('');
                }}
                onBlur={(e) => {
                  const err = validateDueDate(e.target.value);
                  setDueDateError(err);
                }}
              />

              {/* Hộp thoại Date Picker HTML5 với thuộc tính min={todayIso} và max={getMaxIsoDate()} để khóa chọn ngày quá khứ hoặc vượt quá hạn tiêu chuẩn */}
              <input
                ref={datePickerInputRef}
                type="date"
                min={todayIso}
                max={getMaxIsoDate()}
                value={getIsoFromDueDate(dueDate)}
                onChange={handleDatePickerChange}
                className="native-hidden-date-picker"
                tabIndex={-1}
                aria-hidden="true"
              />

              <button
                type="button"
                className="btn-open-calendar-pill"
                onClick={() => {
                  if (datePickerInputRef.current?.showPicker) {
                    datePickerInputRef.current.showPicker();
                  } else {
                    datePickerInputRef.current?.focus();
                  }
                }}
                title="Mở hộp thoại lịch"
              >
                Chọn lịch
              </button>
            </div>

            {/* Thông báo lỗi nếu chọn hoặc nhập ngày trong quá khứ hoặc vượt quá tiêu chuẩn */}
            {dueDateError && (
              <div className="due-date-alert-msg">
                <AlertTriangle size={13} className="alert-inline-icon" />
                <span>{dueDateError}</span>
              </div>
            )}

            {/* Thanh chọn nhanh số ngày thời hạn mượn (đồng bộ theo cấu hình Admin FineRules) */}
            <div className="quick-due-chips-bar">
              <span className="quick-due-title" title={`Số ngày mượn tiêu chuẩn cấu hình hệ thống: ${standardBorrowDays} ngày`}>
                Thời hạn (chuẩn {standardBorrowDays}N):
              </span>
              {standardBorrowDays > 7 && (
                <button
                  type="button"
                  className={`quick-due-chip ${activeQuickDays === 7 ? 'chip-active' : ''}`}
                  onClick={() => handleQuickDueDate(7)}
                  title="Mượn 7 ngày (1 tuần)"
                >
                  +7 ngày
                </button>
              )}
              {standardBorrowDays > 14 && standardBorrowDays !== 14 && (
                <button
                  type="button"
                  className={`quick-due-chip ${activeQuickDays === 14 ? 'chip-active' : ''}`}
                  onClick={() => handleQuickDueDate(14)}
                  title="Mượn 14 ngày (2 tuần)"
                >
                  +14 ngày
                </button>
              )}
              <button
                type="button"
                className={`quick-due-chip ${activeQuickDays === standardBorrowDays ? 'chip-active' : ''}`}
                onClick={() => handleQuickDueDate(standardBorrowDays)}
                title={`Mượn ${standardBorrowDays} ngày (Chuẩn quy định ${memberType === 'Lecturer' ? 'Giảng viên' : 'Sinh viên'})`}
              >
                +{standardBorrowDays} ngày (Chuẩn {memberType === 'Lecturer' ? 'GV' : 'SV'})
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách các cuốn sách đã quét vào phiếu mượn (Scenario 1) */}
        {selectedBarcodes.length > 0 && (
          <div className="selected-barcodes-box">
            <div className="selected-barcodes-header">
              <span className="selected-barcodes-title">
                Sách sẽ mượn ({selectedBarcodes.length}/{maxBorrowLimit} cuốn):
              </span>
              <button
                type="button"
                className="btn-clear-all-books"
                onClick={() => setSelectedBarcodes([])}
                title="Xóa tất cả sách đã chọn"
              >
                Xóa tất cả
              </button>
            </div>
            <div className="barcodes-chips-list">
              {selectedBarcodes.map((item, index) => {
                const code = typeof item === 'string' ? item : item.barcode;
                const title = typeof item === 'string' ? '' : item.title;
                return (
                  <div key={code} className="barcode-chip-item" title={title ? `${code} - ${title}` : code}>
                    <span className="chip-index">{index + 1}.</span>
                    <span className="chip-barcode">{code}</span>
                    {title && (
                      <span
                        className="chip-book-title"
                        style={{
                          fontSize: '11.5px',
                          color: '#475569',
                          maxWidth: '180px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginLeft: '4px'
                        }}
                      >
                        ({title})
                      </span>
                    )}
                    <button
                      type="button"
                      className="chip-remove-btn"
                      onClick={() => handleRemoveBarcode(code)}
                      title={`Bỏ cuốn ${code}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Thanh chọn nhanh mã bạn đọc để kiểm thử Scenario 1 (Thành công) & Scenario 2 (Từ chối) */}
        <div className="quick-test-bar">
          <span className="quick-test-label">Thử nghiệm nhanh:</span>
          <button
            type="button"
            className="test-chip chip-success"
            title="Độc giả hợp lệ, thẻ hoạt động, không nợ phạt, sách Available (Scenario 1)"
            onClick={async () => {
              setReaderCode('RD20260001');
              setSelectedBarcodes([]);
              setBorrowError('');
              await checkReaderEligibility('RD20260001');
              await handleAddBarcodeToList('BC000001-C');
            }}
          >
            ✓ RD20260001 (Mượn OK)
          </button>
          <button
            type="button"
            className="test-chip chip-danger"
            title="Đang có nợ phạt quá hạn 45.000đ (Scenario 2 - Từ chối)"
            onClick={async () => {
              setReaderCode('102220184');
              setSelectedBarcodes([]);
              setBorrowError('');
              await checkReaderEligibility('102220184');
              await handleAddBarcodeToList('BC000002-B');
            }}
          >
            ✗ 102220184 (Nợ phạt)
          </button>
          <button
            type="button"
            className="test-chip chip-danger"
            title="Thẻ độc giả bị khóa (Scenario 2 - Từ chối)"
            onClick={async () => {
              setReaderCode('102230045');
              setSelectedBarcodes([]);
              setBorrowError('');
              await checkReaderEligibility('102230045');
              await handleAddBarcodeToList('BC000013-A');
            }}
          >
            ✗ 102230045 (Khóa thẻ)
          </button>
          <button
            type="button"
            className="test-chip chip-danger"
            title="Đã mượn tối đa 5 cuốn (Scenario 2 - Từ chối)"
            onClick={async () => {
              setReaderCode('102220412');
              setSelectedBarcodes([]);
              setBorrowError('');
              await checkReaderEligibility('102220412');
              await handleAddBarcodeToList('BC000001-C');
            }}
          >
            ✗ 102220412 (Max 5 cuốn)
          </button>
        </div>

        {/* Cảnh báo đỏ từ chối mượn sách theo Scenario 2 (AC Story LOLRA-16) */}
        {borrowError && (
          <div className="borrow-error-banner" role="alert">
            <AlertTriangle size={18} className="error-icon" />
            <div className="error-content">
              <span className="error-title">HỆ THỐNG TỪ CHỐI TẠO PHIẾU MƯỢN:</span>
              <span className="error-desc">{borrowError}</span>
            </div>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setBorrowError('')}
              title="Đóng cảnh báo"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Nhóm 2 nút hành động: Xem trước phiếu mượn & Xác nhận tạo phiếu mượn */}
        <div className="borrow-actions-row">
          <button
            type="button"
            className="btn-preview-borrow"
            onClick={handlePreviewBorrow}
            disabled={isSubmitting}
            title="Xem trước mẫu biểu Phiếu mượn sách chuẩn A4 PDF trước khi ghi nhận"
          >
            <FileText size={16} />
            <span>Xem trước phiếu mượn</span>
          </button>

          <button
            type="submit"
            className="btn-confirm-borrow-flex"
            disabled={isSubmitting || (readerInfo && (!readerInfo.canBorrow || !readerInfo.isActive))}
            title={
              readerInfo && (!readerInfo.canBorrow || !readerInfo.isActive)
                ? 'Độc giả bị chặn mượn sách do thẻ đã bị khóa hoặc vi phạm quy định!'
                : 'Ghi nhận giao dịch mượn sách chính thức vào CSDL'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Đang ghi nhận...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>XÁC NHẬN TẠO PHIẾU MƯỢN</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal Camera Scanner thời gian thực hỗ trợ Webcam rời & Lật ngang */}
      <BarcodeCameraModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        targetField={scannerTarget === 'reader' ? 'reader' : 'borrowBook'}
        title={
          scannerTarget === 'reader'
            ? 'QUÉT MÃ THẺ BẠN ĐỌC / THẺ SINH VIÊN'
            : 'QUÉT MÃ VẠCH BẢN SAO SÁCH (CODE 128)'
        }
      />
    </section>
  );
}
