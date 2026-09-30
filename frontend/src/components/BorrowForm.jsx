import React, { useState, useEffect, useRef, useId } from 'react';
import {
  PlusCircle,
  ScanLine,
  X,
  Calendar,
  AlertTriangle,
  Loader2,
  BookOpen,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { borrowApi } from '../api/borrowApi';
import BarcodeCameraModal from './BarcodeCameraModal';
import './BorrowForm.css';

/**
 * Component BorrowForm: Tiếp nhận thẻ bạn đọc và tạo phiếu mượn sách bằng quét mã vạch Barcode (Story LOLRA-16).
 * 
 * Tiêu chí nghiệm thu:
 * - Scenario 1: Độc giả hợp lệ (IsActive = true, không nợ phạt), quét mã thẻ và mã vạch sách (tối đa 5 cuốn), tạo thành công.
 * - Scenario 2: Từ chối mượn sách khi có nợ phạt quá hạn hoặc quá 5 cuốn, hiển thị cảnh báo đỏ và giữ nguyên kho sách.
 * - Sub-task Huy (TH): Kết nối Camera Scanner trực tiếp và phím tắt F2.
 */
export default function BorrowForm({ onBorrowSuccess, showToast }) {
  // Input IDs duy nhất
  const readerInputId = useId();
  const bookCodeInputId = useId();
  const dueDateInputId = useId();

  // Dữ liệu phiếu mượn
  const [readerCode, setReaderCode] = useState('');
  const [currentBookBarcode, setCurrentBookBarcode] = useState('');
  const [selectedBarcodes, setSelectedBarcodes] = useState([]);
  const [dueDate, setDueDate] = useState(() => {
    // Mặc định ngày hẹn trả sau 14 ngày (định dạng DD/MM/YYYY)
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });

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

    if (selectedBarcodes.length >= 5) {
      setBorrowError('Hệ thống chỉ cho phép mượn tối đa 5 cuốn sách trong một phiếu (Scenario 1 & 2).');
      if (showToast) showToast('⚠️ Đã đạt hạn mức tối đa 5 cuốn sách!');
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
        setCurrentBookBarcode('');
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
          `➕ Đã thêm cuốn sách [${copyData.barcode}] - "${copyData.bookTitle}" vào phiếu mượn (${
            selectedBarcodes.length + 1
          }/5)`
        );
      }
    } catch (err) {
      // Báo lỗi khi mã không tồn tại trên hệ thống (404 Not Found)
      const notFoundMsg =
        err.response?.data?.message ||
        `Mã vạch [${code}] không tồn tại trên hệ thống thư viện! Vui lòng kiểm tra lại.`;
      setBorrowError(notFoundMsg);
      if (showToast) showToast(`❌ ${notFoundMsg}`);
      setCurrentBookBarcode('');
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

  // Gửi yêu cầu tạo phiếu mượn lên Backend (POST /api/borrows)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBorrowError('');

    const cleanReader = readerCode.trim();
    if (!cleanReader) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét Mã độc giả / MSSV!');
      document.getElementById(readerInputId)?.focus();
      return;
    }

    // Lấy danh sách mã vạch hợp lệ từ danh sách đã so khớp CSDL
    let barcodesToSubmit = selectedBarcodes.map((b) => (typeof b === 'string' ? b : b.barcode));

    if (barcodesToSubmit.length === 0) {
      if (showToast) showToast('⚠️ Vui lòng nhập hoặc quét ít nhất một cuốn sách hợp lệ vào phiếu mượn!');
      document.getElementById(bookCodeInputId)?.focus();
      return;
    }

    if (barcodesToSubmit.length > 5) {
      setBorrowError('Số sách yêu cầu vượt quá hạn mức tối đa 5 cuốn (Scenario 2).');
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
          <label htmlFor={readerInputId} className="form-label">
            Mã độc giả / MSSV <span className="hotkey-badge" title="Nhấn F2 để quét nhanh">[F2]</span>
          </label>
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
              onChange={(e) => setReaderCode(e.target.value)}
            />
            {readerCode && (
              <button
                type="button"
                className="input-clear-btn"
                onClick={() => setReaderCode('')}
                title="Xóa mã độc giả"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Ô quét mã vạch sách & Hạn trả dự kiến */}
        <div className="form-two-cols">
          <div className="form-group">
            <label htmlFor={bookCodeInputId} className="form-label">
              Mã vạch sách ({selectedBarcodes.length}/5 cuốn)
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
                placeholder={isCheckingBarcode ? 'Đang so khớp với CSDL...' : 'BC000001-A... (Enter để kiểm tra)'}
                value={currentBookBarcode}
                disabled={isCheckingBarcode}
                onChange={(e) => setCurrentBookBarcode(e.target.value)}
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

          <div className="form-group">
            <label htmlFor={dueDateInputId} className="form-label">
              Hạn trả dự kiến
            </label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input
                id={dueDateInputId}
                type="text"
                className="form-control"
                placeholder="DD/MM/YYYY"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Danh sách các cuốn sách đã quét vào phiếu mượn (Scenario 1) */}
        {selectedBarcodes.length > 0 && (
          <div className="selected-barcodes-box">
            <div className="selected-barcodes-header">
              <span className="selected-barcodes-title">
                Sách sẽ mượn ({selectedBarcodes.length}/5 cuốn):
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

        {/* Nút xác nhận mượn sách */}
        <button type="submit" className="btn-confirm-borrow" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="spin-icon" style={{ display: 'inline-block', marginRight: '6px' }} />
              Đang ghi nhận vào SQL Server...
            </>
          ) : (
            'XÁC NHẬN TẠO PHIẾU MƯỢN'
          )}
        </button>
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
