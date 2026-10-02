import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  X
} from 'lucide-react';
import { borrowApi } from '../api/borrowApi';
import BorrowForm from '../components/BorrowForm';
import ReturnProcessing from '../components/ReturnProcessing';
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

  // Giao dịch đang được chọn trong bảng giao dịch trong ngày
  const [selectedTransactionId, setSelectedTransactionId] = useState(null);
  const [isLoadingBorrows, setIsLoadingBorrows] = useState(false);

  // Modal biểu mẫu hành chính Phiếu mượn sách & Phiếu trả sách chuẩn A4 PDF
  const [receiptModalConfig, setReceiptModalConfig] = useState({
    isOpen: false,
    type: 'borrow',
    data: null
  });
  const [toastMessage, setToastMessage] = useState('');

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
          const itemBasePrice = firstItem?.basePrice || 50000;
          // Quy tắc 10.1 & 10.2: Tính phạt 5.000đ/ngày và áp mức trần 100% giá bìa gốc
          const rawFine = isOverdue ? daysLate * 5000 : 0;
          const feeAmount = isOverdue ? Math.min(rawFine, itemBasePrice) : 0;

          const cleanItems = (item.items && item.items.length > 0)
            ? item.items.map((it) => ({
                title: it.title,
                author: it.author || 'Nhiều tác giả',
                barcode: it.barcode,
                dueDate: new Date(item.dueDate).toLocaleDateString('vi-VN'),
                note: it.returnDate ? 'Đã hoàn trả' : 'Đang mượn'
              }))
            : [
                {
                  title: firstItem?.title || `Tài liệu [${firstItem?.barcode || 'N/A'}]`,
                  author: firstItem?.author || 'Nhiều tác giả',
                  barcode: firstItem?.barcode || 'N/A',
                  dueDate: new Date(item.dueDate).toLocaleDateString('vi-VN'),
                  note: 'Nguyên vẹn'
                }
              ];

          const titleDisplay = cleanItems.length > 1
            ? `${cleanItems[0].title} (+${cleanItems.length - 1} cuốn khác)`
            : (cleanItems[0]?.title || `Mượn ${item.totalItems} cuốn sách`);

          return {
            id: item.borrowCode || `PM-${item.borrowingID}`,
            borrowingId: item.borrowingID,
            bookCode: firstItem?.barcode || 'N/A',
            readerName: item.readerName || 'Bạn đọc',
            studentCode: item.readerCode || 'N/A',
            department: item.memberType === 'Lecturer' ? 'Cán bộ / Giảng viên' : 'Khoa Công nghệ Thông tin',
            bookTitle: titleDisplay,
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
            items: cleanItems // BUG-06: Đầy đủ 100% các cuốn sách mượn
          };
        });
        setTransactions(mapped);
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

  // Xử lý khi tạo phiếu mượn mới thành công từ component BorrowForm (Story LOLRA-16)
  const handleBorrowSuccess = (created) => {
    if (!created) return;
    const firstItem = created.items && created.items.length > 0 ? created.items[0] : null;
    const cleanBarcode = firstItem?.barcode || 'Tài liệu';

    const cleanItems = (created.items && created.items.length > 0)
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
        ];

    const titleDisplay = cleanItems.length > 1
      ? `${cleanItems[0].title} (+${cleanItems.length - 1} cuốn khác)`
      : (cleanItems[0]?.title || `Tài liệu [${cleanBarcode}]`);

    const deptDisplay = created.memberType === 'Lecturer' ? 'Cán bộ / Giảng viên' : 'Khoa Công nghệ Thông tin';

    const newTx = {
      id: created.borrowCode,
      borrowingId: created.borrowingID,
      bookCode: cleanBarcode,
      readerName: created.readerName || 'Độc giả',
      studentCode: created.readerCode || '',
      department: deptDisplay,
      bookTitle: titleDisplay,
      borrowDate: new Date(created.borrowDate).toLocaleDateString('vi-VN'),
      dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
      rawBorrowDate: created.borrowDate,
      rawDueDate: created.dueDate,
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
      overdueFee: 0,
      items: cleanItems // BUG-06: Lưu trữ đầy đủ toàn bộ sách mượn
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
        department: deptDisplay,
        rawBorrowDate: created.borrowDate,
        rawDueDate: created.dueDate,
        borrowDate: new Date(created.borrowDate).toLocaleDateString('vi-VN'),
        dueDate: new Date(created.dueDate).toLocaleDateString('vi-VN'),
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
        items: cleanItems
      }
    });
  };

  // Xử lý khi nhấn nút Xem trước phiếu mượn từ component BorrowForm
  const handlePreviewBorrow = (previewData) => {
    if (!previewData) return;
    setReceiptModalConfig({
      isOpen: true,
      type: 'borrow',
      data: {
        ...previewData,
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa'
      }
    });
  };

  // Xử lý khi hoàn tất tiếp nhận trả sách rải rác / theo đợt từ component ReturnProcessing (Story LOLRA-17)
  const handleReturnSuccessFromProcessing = (result) => {
    if (!result) return;

    // Nếu người dùng chỉ bấm nút xem trước biểu mẫu phiếu trả sách A4 PDF
    if (result.isPreviewOnly) {
      setReceiptModalConfig({
        isOpen: true,
        type: 'return',
        data: {
          ...result,
          department: (result.department && result.department !== 'Standard') ? result.department : 'Khoa Công nghệ Thông tin',
          librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa'
        }
      });
      return;
    }

    // Cập nhật trạng thái phiếu và cuốn sách trong bảng giao dịch trong ngày
    setTransactions((prev) =>
      prev.map((t) => {
        const isMatch =
          t.id === result.borrowCode ||
          t.bookCode === result.barcode ||
          (Array.isArray(t.items) && t.items.some((it) => it.barcode === result.barcode));

        if (isMatch) {
          const hasFine = (result.totalFine || 0) > 0;
          return {
            ...t,
            status: hasFine ? 'returned_paid' : 'returned_ontime',
            statusText: hasFine ? 'Đã trả (Đã thu phạt)' : 'Đã trả (Đúng hạn)',
            fineAmount: result.totalFine || 0,
            fineText: hasFine ? `${result.totalFine.toLocaleString('vi-VN')}đ` : '0đ',
            isOnTime: result.isOnTime,
            isOverdue: result.isOverdue,
            isDamaged: result.isDamaged,
            isLost: result.isLost
          };
        }
        return t;
      })
    );

    // Tự động làm mới danh sách giao dịch gần đây từ Backend
    loadRecentTransactions();

    // Mở Modal Biểu mẫu Phiếu trả sách chuẩn A4 PDF với toàn bộ danh sách sách
    setReceiptModalConfig({
      isOpen: true,
      type: 'return',
      data: {
        id: result.borrowCode,
        borrowCode: result.borrowCode,
        readerName: result.readerName,
        studentCode: result.readerCode,
        readerCode: result.readerCode,
        department: (result.department && result.department !== 'Standard') ? result.department : 'Khoa Công nghệ Thông tin',
        rawBorrowDate: result.borrowDate,
        rawDueDate: result.dueDate,
        borrowDate: result.borrowDate ? new Date(result.borrowDate).toLocaleDateString('vi-VN') : '',
        dueDate: result.dueDate ? new Date(result.dueDate).toLocaleDateString('vi-VN') : '',
        returnDate: result.returnDate || new Date().toLocaleDateString('vi-VN'),
        fineAmount: result.totalFine || 0,
        statusText: (result.totalFine || 0) > 0
          ? `Đã hoàn trả - Đã nộp phạt: ${(result.totalFine || 0).toLocaleString('vi-VN')} VNĐ (${result.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản QR'})`
          : 'Hoàn trả đúng hạn, nguyên vẹn - Miễn phí',
        librarianName: user?.fullName || 'Nguyễn Võ Lê Khoa',
        items: (Array.isArray(result.items) && result.items.length > 0)
          ? result.items
          : [
              {
                title: result.bookTitle,
                author: result.author || 'Nhiều tác giả',
                barcode: result.barcode,
                dueDate: result.dueDate ? new Date(result.dueDate).toLocaleDateString('vi-VN') : '',
                returnDate: result.returnDate || new Date().toLocaleDateString('vi-VN'),
                note: (result.totalFine || 0) > 0
                  ? `Thu phạt ${(result.totalFine || 0).toLocaleString('vi-VN')}đ`
                  : 'Trả đúng hạn, tình trạng tốt'
              }
            ]
      }
    });
  };

  // Lọc danh sách giao dịch theo từ khóa tìm kiếm chung từ header
  const filteredTransactions = transactions.filter((t) => {
    const term = externalSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      (t.id && t.id.toLowerCase().includes(term)) ||
      (t.readerName && t.readerName.toLowerCase().includes(term)) ||
      (t.studentCode && t.studentCode.toLowerCase().includes(term)) ||
      (t.bookTitle && t.bookTitle.toLowerCase().includes(term)) ||
      (t.bookCode && t.bookCode.toLowerCase().includes(term)) ||
      (t.bookCode && t.bookCode.split('-')[0].toLowerCase().includes(term)) ||
      (t.bookId && String(t.bookId).toLowerCase() === term) ||
      (t.statusText && t.statusText.toLowerCase().includes(term)) ||
      (t.status && t.status.toLowerCase().includes(term)) ||
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
        <BorrowForm
          onBorrowSuccess={handleBorrowSuccess}
          onPreviewBorrow={handlePreviewBorrow}
          showToast={showToast}
        />

        {/* THẺ PHẢI: TIẾP NHẬN TRẢ SÁCH & KIỂM TRA VI PHẠM (Story LOLRA-17 - Component ReturnProcessing) */}
        <ReturnProcessing
          onReturnSuccess={handleReturnSuccessFromProcessing}
          showToast={showToast}
          user={user}
        />
      </div>

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
