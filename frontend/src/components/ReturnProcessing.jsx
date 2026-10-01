import React, { useState, useEffect, useId } from 'react';
import {
  ArrowLeftRight,
  Search,
  ScanLine,
  X,
  Barcode,
  Check,
  CheckCircle2,
  FileText,
  Sparkles,
  Printer,
  Receipt,
  Banknote,
  QrCode,
  Loader2
} from 'lucide-react';
import { returnApi } from '../api/returnApi';
import { invoiceApi } from '../api/invoiceApi';
import { playScannerBeep } from '../utils/barcodeGenerator';
import BarcodeCameraModal from './BarcodeCameraModal';
import ReceiptModal from './ReceiptModal';
import './ReturnProcessing.css';

/**
 * Component Tiếp nhận trả sách rải rác & Kiểm tra vi phạm (Story LOLRA-17 - Sub-task 2).
 * Tích hợp gọi API Backend POST /api/returns/process-item và GET /api/returns/lookup.
 *
 * @param {object} props
 * @param {(result: object) => void} props.onReturnSuccess Callback khi hoàn tất trả sách thành công
 * @param {(msg: string) => void} props.showToast Hàm hiển thị toast thông báo
 * @param {object} props.user Thông tin người dùng/thủ thư đang đăng nhập
 */
export default function ReturnProcessing({ onReturnSuccess, showToast, user }) {
  const returnInputId = useId();

  // State tìm kiếm & tải dữ liệu
  const [returnQuery, setReturnQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State dữ liệu sách đang được tra cứu để trả
  const [lookupData, setLookupData] = useState(null);

  // Modal máy quét Barcode camera
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // State các checkbox kiểm tra vi phạm
  const [checks, setChecks] = useState({
    isOnTime: true,
    isOverdue: false,
    isDamaged: false,
    isLost: false
  });

  // Miễn giảm tiền phạt
  const [waiverDiscountPercent, setWaiverDiscountPercent] = useState(0);
  const [waiverReason, setWaiverReason] = useState('');
  const [showWaiverModal, setShowWaiverModal] = useState(false);

  // Modal thu tiền phạt
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'

  // Modal hiển thị & in ấn hóa đơn thu tiền chuẩn K80 / A5 (Story LOLRA-19)
  const [paidInvoiceData, setPaidInvoiceData] = useState(null);
  const [showPaidReceiptModal, setShowPaidReceiptModal] = useState(false);

  // Khi có dữ liệu tra cứu mới, tự động đồng bộ trạng thái quá hạn
  useEffect(() => {
    if (lookupData) {
      const isLate = lookupData.isOverdue || lookupData.overdueDays > 0;
      setChecks({
        isOnTime: !isLate,
        isOverdue: isLate,
        isDamaged: false,
        isLost: false
      });
      setWaiverDiscountPercent(0);
      setWaiverReason('');
    }
  }, [lookupData]);

  // Tính toán số tiền phạt động dựa trên thông tin tra cứu và các checkbox
  const finePerDay = lookupData?.finePerDay || 5000;
  const overdueDays = lookupData?.overdueDays || 0;
  const basePrice = lookupData?.basePrice || 50000;

  const overdueFine = checks.isOverdue ? overdueDays * finePerDay : 0;
  const damageFee = checks.isDamaged ? Math.max(20000, Math.round(basePrice * 0.4)) : 0;
  const lostFee = checks.isLost ? Math.round(basePrice * 1.1) : 0;

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
        if (!next.isOverdue && !next.isDamaged && !next.isLost) {
          next.isOnTime = true;
        }
        return next;
      });
    }
  };

  // Tra cứu thông tin sách đang mượn qua API Backend
  const handleLookup = async (codeToSearch) => {
    const q = (codeToSearch !== undefined ? codeToSearch : returnQuery).trim();
    if (!q) {
      showToast?.('⚠️ Vui lòng nhập hoặc quét Mã vạch bản sao (BC000001-A) hoặc Mã phiếu mượn.');
      return;
    }

    setIsSearching(true);
    try {
      const res = await returnApi.lookup(q);
      if (res.success && res.data) {
        setLookupData(res.data);
        playScannerBeep?.(true);
        showToast?.(`🔍 Đã tìm thấy: Phiếu ${res.data.borrowCode} - ${res.data.bookTitle} của bạn đọc ${res.data.readerName}`);
      } else {
        playScannerBeep?.(false);
        showToast?.(`⚠️ ${res.message || 'Không tìm thấy sách đang mượn khớp với mã đã nhập.'}`);
        setLookupData(null);
      }
    } catch (err) {
      playScannerBeep?.(false);
      const errMsg = err.response?.data?.message || err.message || 'Không thể tra cứu thông tin sách.';
      showToast?.(`⚠️ ${errMsg}`);
      setLookupData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Áp dụng tỷ lệ miễn giảm phạt
  const handleApplyWaiver = (discountPct, reasonText) => {
    setWaiverDiscountPercent(discountPct);
    setWaiverReason(reasonText);
    setShowWaiverModal(false);
    showToast?.(`🎉 Đã áp dụng miễn giảm ${discountPct}% (${reasonText})`);
  };

  // Xác nhận xử lý trả sách qua API Backend (POST /api/returns/process-item)
  const handleExecuteReturn = async (isPaidFine = false) => {
    if (!lookupData) return;

    // Xác định condition gửi lên Backend
    let condition = 'Good';
    if (checks.isLost) condition = 'Lost';
    else if (checks.isDamaged) condition = 'Damaged';

    setIsSubmitting(true);
    try {
      const payload = {
        barcode: lookupData.barcode,
        condition: condition,
        note: checks.isDamaged ? 'Hỏng bìa/rách sách' : checks.isLost ? 'Mất sách' : 'Nguyên vẹn',
        waiverDiscountPercent: waiverDiscountPercent,
        waiverReason: waiverReason || undefined
      };

      const res = await returnApi.processReturn(payload);
      if (res.success && res.data) {
        playScannerBeep?.(true);
        const result = res.data;

        showToast?.(`✅ ${result.message}`);
        setShowReceiptModal(false);

        // Nếu có phát sinh phạt và thủ thư bấm "Xác nhận thu & Xuất biên lai" (Story LOLRA-19)
        if (isPaidFine && result.receiptId) {
          try {
            const invRes = await invoiceApi.createInvoice({
              receiptId: result.receiptId,
              paymentMethod: paymentMethod === 'transfer' ? 'Transfer' : 'Cash',
              note: `Thu tiền phạt tại quầy lưu thông (${lookupData.borrowCode})`
            });

            if (invRes.success && invRes.data) {
              setPaidInvoiceData(invRes.data);
              setShowPaidReceiptModal(true);
              showToast?.(`🎉 Đã lập hóa đơn ${invRes.data.invoiceCode} và tự động mở lại quyền mượn sách!`);
            }
          } catch (invErr) {
            console.error('Lỗi khi lập hóa đơn thu phạt:', invErr);
            const errDetail = invErr.response?.data?.message || invErr.message || '';
            showToast?.(`⚠️ Tiếp nhận trả thành công nhưng chưa lập được hóa đơn: ${errDetail}`);
          }
        }

        // Gọi callback báo cho trang cha cập nhật bảng giao dịch và mở Modal Phiếu trả
        onReturnSuccess?.({
          ...result,
          paymentMethod: isPaidFine ? paymentMethod : null,
          waiverDiscountPercent: waiverDiscountPercent,
          readerName: lookupData.readerName,
          readerCode: lookupData.readerCode,
          department: lookupData.memberType || 'Khoa Công nghệ Thông tin',
          bookTitle: lookupData.bookTitle,
          author: lookupData.author,
          borrowDate: new Date(lookupData.borrowDate).toLocaleDateString('vi-VN'),
          dueDate: new Date(lookupData.dueDate).toLocaleDateString('vi-VN'),
          returnDate: new Date().toLocaleDateString('vi-VN'),
          finalFine: finalFine
        });

        // Xóa trắng form sau khi trả thành công
        setLookupData(null);
        setReturnQuery('');
      } else {
        playScannerBeep?.(false);
        showToast?.(`❌ Lỗi tiếp nhận trả sách: ${res.message}`);
      }
    } catch (err) {
      playScannerBeep?.(false);
      const errMsg = err.response?.data?.message || err.message || 'Lỗi khi xử lý tiếp nhận trả sách.';
      showToast?.(`❌ ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* THẺ TRÊN: TIẾP NHẬN TRẢ SÁCH & TÌM KIẾM MÃ VẠCH */}
      <section className="circulation-card" aria-label="Tiếp nhận trả sách và kiểm tra vi phạm">
        <div className="card-header-row">
          <h2 className="card-title">TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM (LOLRA-17)</h2>
          <div className="card-icon-orange" title="Xử lý trả sách">
            <ArrowLeftRight size={20} strokeWidth={2.2} />
          </div>
        </div>

        <p className="card-description">
          Quét mã vạch cuốn sách (BC000001-A), mã phiếu mượn hoặc tải tệp PDF phiếu mượn để hệ thống tự động nhận diện và hoàn trả tài sản về kho.
        </p>

        <div className="card-form">
          <div className="form-group">
            <label htmlFor={returnInputId} className="form-label">
              Mã vạch Barcode bản sao / Mã phiếu mượn
            </label>
            <div className="input-with-icon">
              <button
                type="button"
                className="input-prefix-scan-btn"
                title="Nhấn để tìm kiếm hoặc mở máy quét"
                onClick={() => handleLookup()}
                disabled={isSearching}
              >
                {isSearching ? <Loader2 size={16} className="spin-icon" /> : <Search size={16} />}
              </button>
              <input
                id={returnInputId}
                type="text"
                className="form-control"
                placeholder="Nhập mã vạch (BC000001-A), mã phiếu (PM-0005)..."
                value={returnQuery}
                onChange={(e) => setReturnQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
              />
              {returnQuery && (
                <button
                  type="button"
                  className="input-clear-btn"
                  onClick={() => {
                    setReturnQuery('');
                    setLookupData(null);
                    showToast?.('ℹ️ Đã xóa nội dung tìm kiếm');
                  }}
                  title="Xóa nội dung tìm kiếm (X)"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Thanh chip kiểm thử nhanh các bản sao đang mượn */}
          <div className="quick-test-bar">
            <span className="quick-test-label">Thử quét nhanh:</span>
            <button
              type="button"
              className="test-chip chip-success"
              title="Thử trả cuốn BC000001-A"
              onClick={() => {
                setReturnQuery('BC000001-A');
                handleLookup('BC000001-A');
              }}
            >
              🏷️ BC000001-A (Harry Potter)
            </button>
            <button
              type="button"
              className="test-chip chip-success"
              title="Thử trả cuốn BC000001-B"
              onClick={() => {
                setReturnQuery('BC000001-B');
                handleLookup('BC000001-B');
              }}
            >
              🏷️ BC000001-B (Harry Potter)
            </button>
            <button
              type="button"
              className="test-chip chip-neutral"
              title="Thử tra cứu phiếu PM-0005"
              onClick={() => {
                setReturnQuery('PM-0005');
                handleLookup('PM-0005');
              }}
            >
              📋 PM-0005
            </button>
          </div>

          {/* Khung tương tác mở Máy Quét Mã Vạch (Live Cam / Upload PDF & Ảnh) */}
          <div
            className={`barcode-scanner-zone ${isScannerModalOpen ? 'is-scanning' : ''}`}
            onClick={() => setIsScannerModalOpen(true)}
            title="Nhấn vào đây để mở Máy Quét Mã Vạch Barcode Scanner"
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <ScanLine size={16} style={{ color: '#2563eb' }} />
              <span className="scanner-text" style={{ fontWeight: 600, color: '#1e40af' }}>
                [Nhấn vào đây để mở Máy Quét Barcode / Tải PDF phiếu mượn...]
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* THẺ DƯỚI: CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ (Chỉ hiển thị khi đã tìm thấy sách) */}
      {lookupData && (
        <section className="circulation-card return-detail-card" aria-label="Chi tiết kiểm tra sách hoàn trả">
          <div className="card-header-row">
            <h2 className="card-title">
              CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ ({lookupData.borrowCode})
            </h2>
            <button
              type="button"
              className="btn-close-detail"
              onClick={() => {
                setLookupData(null);
                setReturnQuery('');
                showToast?.('ℹ️ Đã đóng chi tiết hoàn trả');
              }}
              title="Đóng và xóa chi tiết hoàn trả"
            >
              <X size={16} />
              <span>Đóng</span>
            </button>
          </div>

          {/* 4 Cột siêu dữ liệu độc giả & tài liệu */}
          <div className="metadata-grid">
            <div className="meta-item">
              <span className="meta-label">ĐỘC GIẢ</span>
              <span className="meta-value">
                {lookupData.readerName} ({lookupData.readerCode})
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">TÊN SÁCH & MÃ VẠCH</span>
              <span className="meta-value">
                {lookupData.bookTitle}
                <div style={{ display: 'flex', gap: '6px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="barcode-tag" title="Mã vạch cuốn sách">
                    <Barcode size={14} className="barcode-inline-icon" />
                    <span>Mã vạch: {lookupData.barcode}</span>
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    Giá gốc: {lookupData.basePrice.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">NGÀY MƯỢN</span>
              <span className="meta-value">
                {new Date(lookupData.borrowDate).toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="meta-item">
              <span className="meta-label">HẠN TRẢ DỰ KIẾN</span>
              <span className="meta-value">
                {new Date(lookupData.dueDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Danh sách các ô tích chọn kiểm tra vi phạm (Scenario 1 & 2) */}
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

          {/* Khung tổng kết tiền phạt dự kiến & các nút hành động */}
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
                  <span>(Sách hoàn trả đúng hạn, nguyên vẹn - Sẵn sàng nhập kho khả dụng)</span>
                ) : (
                  <span>
                    (Chi tiết:{' '}
                    {checks.isOverdue
                      ? `Phạt trễ hạn ${overdueDays} ngày x ${finePerDay.toLocaleString('vi-VN')}đ = ${overdueFine.toLocaleString('vi-VN')}đ`
                      : ''}
                    {checks.isOverdue && checks.isDamaged ? ' + ' : ''}
                    {checks.isDamaged ? `Phụ phí hỏng bìa = ${damageFee.toLocaleString('vi-VN')}đ` : ''}
                    {checks.isLost ? `Bồi hoàn sách mất = ${lostFee.toLocaleString('vi-VN')}đ` : ''}
                    {waiverDiscountPercent > 0 ? ` - Miễn giảm = ${discountAmount.toLocaleString('vi-VN')}đ` : ''}
                    )
                  </span>
                )}
              </div>
            </div>

            <div className="fine-actions-right">
              {/* Nút Xem trước phiếu trả */}
              <button
                type="button"
                className="btn-preview-slip"
                title="Xem trước mẫu phiếu trả sách A4 PDF"
                onClick={() => {
                  onReturnSuccess?.({
                    isPreviewOnly: true,
                    borrowCode: lookupData.borrowCode,
                    readerName: lookupData.readerName,
                    readerCode: lookupData.readerCode,
                    department: lookupData.memberType || 'Khoa Công nghệ Thông tin',
                    bookTitle: lookupData.bookTitle,
                    author: lookupData.author,
                    barcode: lookupData.barcode,
                    borrowDate: new Date(lookupData.borrowDate).toLocaleDateString('vi-VN'),
                    dueDate: new Date(lookupData.dueDate).toLocaleDateString('vi-VN'),
                    returnDate: new Date().toLocaleDateString('vi-VN'),
                    finalFine: finalFine,
                    statusText: finalFine === 0 ? 'Trả đúng hạn' : `Phát sinh tiền phạt ${finalFine.toLocaleString('vi-VN')}đ`
                  });
                }}
              >
                <FileText size={16} />
                <span>Xem trước phiếu trả</span>
              </button>

              {finalFine === 0 ? (
                /* Nút Xác nhận hoàn tất trả sách (Scenario 1) */
                <button
                  type="button"
                  className="btn-confirm-return"
                  onClick={() => handleExecuteReturn(false)}
                  disabled={isSubmitting}
                  title="Xác nhận bạn đọc đã hoàn trả sách đúng hạn và nhập lại kho"
                >
                  {isSubmitting ? <Loader2 size={16} className="spin-icon" /> : <CheckCircle2 size={16} />}
                  <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận hoàn tất trả sách'}</span>
                </button>
              ) : (
                /* Cụm nút khi có vi phạm phạt (Scenario 2) */
                <>
                  <button
                    type="button"
                    className="btn-waiver"
                    onClick={() => setShowWaiverModal(true)}
                    disabled={waiverDiscountPercent === 100 || isSubmitting}
                  >
                    Miễn giảm phạt
                  </button>

                  <button
                    type="button"
                    className="btn-create-receipt"
                    onClick={() => setShowReceiptModal(true)}
                    disabled={isSubmitting}
                  >
                    Lập phiếu thu phạt
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MODAL MIỄN GIẢM TIỀN PHẠT */}
      {showWaiverModal && lookupData && (
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
                  <strong>{lookupData.borrowCode}</strong>
                </div>
                <div className="modal-sum-row">
                  <span>Độc giả:</span>
                  <span>{lookupData.readerName} ({lookupData.readerCode})</span>
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

      {/* MODAL LẬP BIÊN LAI THU PHẠT */}
      {showReceiptModal && lookupData && (
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
                  <div className="receipt-code">Mã: PT-{new Date().getFullYear()}-{lookupData.borrowCode.replace('PM-', '')}</div>
                </div>

                <div className="receipt-details">
                  <div className="receipt-line">
                    <span className="lbl">Người nộp phạt:</span>
                    <span className="val">{lookupData.readerName}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Mã sinh viên:</span>
                    <span className="val">{lookupData.readerCode}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Tên tài liệu:</span>
                    <span className="val">{lookupData.bookTitle}</span>
                  </div>
                  <div className="receipt-line">
                    <span className="lbl">Lý do xử phạt:</span>
                    <span className="val">
                      {checks.isOverdue ? `Trễ hạn ${overdueDays} ngày` : ''}
                      {checks.isOverdue && checks.isDamaged ? ', ' : ''}
                      {checks.isDamaged ? 'Hỏng rách bìa' : ''}
                      {checks.isLost ? 'Mất sách' : ''}
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
                disabled={isSubmitting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-submit-pay"
                onClick={() => handleExecuteReturn(true)}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 size={15} className="spin-icon" /> : <Printer size={15} />}
                <span>{isSubmitting ? 'Đang xử lý...' : 'Xác nhận thu & Xuất biên lai'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÁY QUÉT BARCODE CAMERA MODAL (Hỗ trợ Live Webcam, Lật ngang, Zoom, Tải PDF & Ảnh) */}
      <BarcodeCameraModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerModalOpen(false);
          setReturnQuery(code);
          handleLookup(code);
        }}
        targetField="return"
        title="MÁY QUÉT MÃ VẠCH SÁCH HOÀN TRẢ (RETURN SCANNER)"
      />

      {/* MODAL BIÊN LAI THU PHẠT KẾ TOÁN BẤT BIẾN K80 / A5 (Story LOLRA-19) */}
      {paidInvoiceData && (
        <ReceiptModal
          isOpen={showPaidReceiptModal}
          onClose={() => setShowPaidReceiptModal(false)}
          invoiceData={paidInvoiceData}
          defaultFormat="k80"
        />
      )}
    </>
  );
}
