import React, { useState, useId } from 'react';
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
  ScanLine
} from 'lucide-react';
import './CirculationDesk.css';

/**
 * Dữ liệu mẫu các giao dịch mượn/trả trong ngày (Khớp 100% thiết kế giao diện Figma)
 */
const INITIAL_TRANSACTIONS = [
  {
    id: 'PM-9920',
    bookCode: 'BC000001-A',
    readerName: 'Nguyễn Văn Minh',
    studentCode: '102220184',
    bookTitle: 'Nhập môn Machine Learning',
    borrowDate: '11/09/2026',
    dueDate: '20/09/2026',
    status: 'pending_fine',
    statusText: 'Chờ thu phạt',
    fineAmount: 45000,
    fineText: '45.000đ',
    overdueDays: 5,
    isOverdue: true,
    isDamaged: true,
    isLost: false,
    isOnTime: false,
    damageFee: 20000,
    overdueFee: 25000
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
    overdueFee: 0
  },
  {
    id: 'PM-9922',
    bookCode: 'BC000003-A',
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
    isOnTime: false,
    damageFee: 0,
    overdueFee: 0
  }
];

export default function CirculationDesk({ user, externalSearch = '' }) {
  // Danh sách giao dịch trong ngày
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Giao dịch đang được chọn để kiểm tra hoàn trả
  const [selectedTransactionId, setSelectedTransactionId] = useState('PM-9920');

  // Form tạo phiếu mượn mới
  const [borrowReaderCode, setBorrowReaderCode] = useState('');
  const [borrowBookCode, setBorrowBookCode] = useState('');
  const [borrowDueDate, setBorrowDueDate] = useState('30/09/2026');

  // Input tìm kiếm mã phiếu / mã vạch ở cột trả sách
  const [returnQuery, setReturnQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

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
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'transfer'
  const [toastMessage, setToastMessage] = useState('');

  const readerInputId = useId();
  const bookCodeInputId = useId();
  const dueDateInputId = useId();
  const returnInputId = useId();

  // Hiển thị toast thông báo
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Lấy dữ liệu chi tiết của phiếu mượn được chọn
  const currentTransaction =
    transactions.find((t) => t.id === selectedTransactionId) || transactions[0];

  // Tính toán số tiền phạt động dựa trên các checkbox
  const finePerDay = 5000;
  const overdueDays = currentTransaction?.overdueDays || 5;
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

  // Xử lý tạo phiếu mượn mới
  const handleCreateBorrow = (e) => {
    e.preventDefault();
    if (!borrowReaderCode.trim()) {
      showToast('⚠️ Vui lòng nhập Mã độc giả / MSSV!');
      return;
    }
    if (!borrowBookCode.trim()) {
      showToast('⚠️ Vui lòng nhập Mã vạch sách!');
      return;
    }

    const nextIdNum = 9920 + transactions.length;
    const newId = `PM-${nextIdNum}`;
    const cleanBookCode = borrowBookCode.trim().toUpperCase();
    const newTx = {
      id: newId,
      bookCode: cleanBookCode,
      readerName: borrowReaderCode.includes('102') ? `Sinh viên (${borrowReaderCode})` : borrowReaderCode,
      studentCode: borrowReaderCode,
      bookTitle: cleanBookCode.startsWith('BC') ? `Sách giáo trình [${cleanBookCode}]` : `Tài liệu mượn [${cleanBookCode}]`,
      borrowDate: new Date().toLocaleDateString('vi-VN'),
      dueDate: borrowDueDate || '30/09/2026',
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

    setTransactions([newTx, ...transactions]);
    setSelectedTransactionId(newId);
    setBorrowReaderCode('');
    setBorrowBookCode('');
    showToast(`✅ Tạo phiếu mượn ${newId} thành công cho độc giả!`);
  };

  // Xử lý tìm kiếm hoặc quét barcode hoàn trả
  const handleReturnSearch = (query) => {
    const q = (query || returnQuery).trim().toLowerCase();
    if (!q) return;

    const found = transactions.find(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.bookCode && t.bookCode.toLowerCase().includes(q)) ||
        t.studentCode.toLowerCase().includes(q) ||
        t.bookTitle.toLowerCase().includes(q)
    );

    if (found) {
      setSelectedTransactionId(found.id);
      setChecks({
        isOnTime: found.isOnTime,
        isOverdue: found.isOverdue,
        isDamaged: found.isDamaged,
        isLost: found.isLost
      });
      showToast(`🔍 Đã nạp thông tin phiếu ${found.id} (Mã sách: ${found.bookCode || 'N/A'}) - ${found.readerName}`);
    } else {
      showToast(`⚠️ Không tìm thấy phiếu mượn/sách phù hợp với từ khóa "${query || returnQuery}"`);
    }
  };

  // Mô phỏng quét mã vạch bằng máy quét barcode
  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setSelectedTransactionId('PM-9920');
      setReturnQuery('BC000001-A');
      setChecks({
        isOnTime: false,
        isOverdue: true,
        isDamaged: true,
        isLost: false
      });
      showToast('⚡ Máy đọc Barcode quét thành công mã vạch: BC000001-A (PM-9920 - Nhập môn Machine Learning)');
    }, 800);
  };

  // Xử lý áp dụng miễn giảm phạt
  const handleApplyWaiver = (discountPct, reasonText) => {
    setWaiverDiscountPercent(discountPct);
    setWaiverReason(reasonText);
    setShowWaiverModal(false);
    showToast(`🎉 Đã áp dụng miễn giảm ${discountPct}% (${reasonText})`);
  };

  // Xử lý xác nhận lập phiếu thu tiền phạt
  const handleConfirmPayment = () => {
    setShowReceiptModal(false);
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
  };

  // Lọc danh sách giao dịch nếu có externalSearch từ header
  const filteredTransactions = transactions.filter((t) => {
    if (!externalSearch.trim()) return true;
    const term = externalSearch.toLowerCase();
    return (
      t.id.toLowerCase().includes(term) ||
      t.readerName.toLowerCase().includes(term) ||
      t.studentCode.toLowerCase().includes(term) ||
      t.bookTitle.toLowerCase().includes(term)
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
        {/* THẺ TRÁI: TẠO PHIẾU MƯỢN MỚI */}
        <section className="circulation-card" aria-label="Tạo phiếu mượn mới">
          <div className="card-header-row">
            <h2 className="card-title">TẠO PHIẾU MƯỢN MỚI</h2>
            <div className="card-icon-blue" title="Mượn sách mới">
              <PlusCircle size={20} strokeWidth={2.2} />
            </div>
          </div>

          <form onSubmit={handleCreateBorrow} className="card-form">
            {/* Nhập Mã độc giả / MSSV */}
            <div className="form-group">
              <label htmlFor={readerInputId} className="form-label">Mã độc giả / MSSV</label>
              <div className="input-with-icon">
                <Search size={16} className="input-icon" />
                <input
                  id={readerInputId}
                  type="text"
                  className="form-control"
                  placeholder="Quét mã vạch hoặc nhập MSSV..."
                  value={borrowReaderCode}
                  onChange={(e) => setBorrowReaderCode(e.target.value)}
                />
              </div>
            </div>

            {/* 2 Cột: Mã vạch sách & Hạn trả dự kiến */}
            <div className="form-two-cols">
              <div className="form-group">
                <label htmlFor={bookCodeInputId} className="form-label">Mã vạch sách</label>
                <div className="input-with-icon">
                  <ScanLine size={16} className="input-icon" />
                  <input
                    id={bookCodeInputId}
                    type="text"
                    className="form-control"
                    placeholder="BC000001-A..."
                    value={borrowBookCode}
                    onChange={(e) => setBorrowBookCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor={dueDateInputId} className="form-label">Hạn trả dự kiến</label>
                <div className="input-with-icon">
                  <Calendar size={16} className="input-icon" />
                  <input
                    id={dueDateInputId}
                    type="text"
                    className="form-control"
                    placeholder="30/09/2026"
                    value={borrowDueDate}
                    onChange={(e) => setBorrowDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Nút xác nhận mượn sách màu xanh dương toàn chiều ngang */}
            <button type="submit" className="btn-confirm-borrow">
              Xác nhận mượn sách
            </button>
          </form>
        </section>

        {/* THẺ PHẢI: TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM */}
        <section className="circulation-card" aria-label="Tiếp nhận trả sách và kiểm tra vi phạm">
          <div className="card-header-row">
            <h2 className="card-title">TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM</h2>
            <div className="card-icon-orange" title="Xử lý trả sách">
              <ArrowLeftRight size={20} strokeWidth={2.2} />
            </div>
          </div>

          <p className="card-description">
            Quét mã vạch trên sách hoặc nhập Mã phiếu mượn để truy xuất nhanh thông tin giao dịch cần xử lý hoàn trả.
          </p>

          <div className="card-form">
            <div className="form-group">
              <label htmlFor={returnInputId} className="form-label">Mã phiếu mượn hoặc Mã vạch sách</label>
              <div className="input-with-icon">
                <Search size={16} className="input-icon" />
                <input
                  id={returnInputId}
                  type="text"
                  className="form-control"
                  placeholder="BC000001-A..."
                  value={returnQuery}
                  onChange={(e) => setReturnQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleReturnSearch();
                    }
                  }}
                />
              </div>
            </div>

            {/* Khung quét mã vạch từ máy đọc (Viền nét đứt tương tác) */}
            <div
              className={`barcode-scanner-zone ${isScanning ? 'is-scanning' : ''}`}
              onClick={handleSimulateScan}
              title="Nhấn vào đây để mô phỏng quét mã vạch Barcode từ máy đọc"
            >
              <span className="scanner-text">
                {isScanning ? '⚡ Đang giải mã Barcode...' : '[Đang chờ quét mã vạch từ máy đọc....]'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ====================================================================
          HÀNG 2: CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ
          ==================================================================== */}
      <section className="circulation-card return-detail-card" aria-label="Chi tiết kiểm tra sách hoàn trả">
        <h2 className="card-title mb-16">
          CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ ({currentTransaction?.id || 'PM-9920'})
        </h2>

        {/* 4 Cột siêu dữ liệu độc giả & sách */}
        <div className="metadata-grid">
          <div className="meta-item">
            <span className="meta-label">ĐỘC GIẢ</span>
            <span className="meta-value">
              {currentTransaction?.readerName} ({currentTransaction?.studentCode})
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">TÊN SÁCH</span>
            <span className="meta-value">
              {currentTransaction?.bookTitle}
              {currentTransaction?.bookCode && (
                <span className="barcode-tag" title="Mã vạch bản sách (Book Copy Barcode)">
                  <Barcode size={14} className="barcode-inline-icon" />
                  <span>{currentTransaction.bookCode}</span>
                </span>
              )}
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
            {/* Nút Miễn giảm phạt (Khung trắng viền đỏ) */}
            <button
              type="button"
              className="btn-waiver"
              onClick={() => setShowWaiverModal(true)}
              disabled={finalFine === 0 && waiverDiscountPercent === 0}
            >
              Miễn giảm phạt
            </button>

            {/* Nút Lập phiếu thu phạt (Đỏ đặc) */}
            <button
              type="button"
              className="btn-create-receipt"
              onClick={() => {
                if (finalFine === 0) {
                  showToast('ℹ️ Giao dịch không phát sinh phí phạt cần thu.');
                  return;
                }
                setShowReceiptModal(true);
              }}
            >
              Lập phiếu thu phạt
            </button>
          </div>
        </div>
      </section>

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
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const isSelected = tx.id === selectedTransactionId;
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
    </div>
  );
}
