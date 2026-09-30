import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  BookOpen
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import './CirculationReceiptModal.css';

/**
 * Component Modal Phiếu Mượn Sách & Phiếu Trả Sách (Chuẩn biểu mẫu hành chính thư viện)
 * Hỗ trợ xem trước chuẩn A4, In trực tiếp (window.print) và Xuất file PDF (jsPDF + html2canvas)
 * 
 * @param {boolean} isOpen Trạng thái mở modal
 * @param {() => void} onClose Hàm đóng modal
 * @param {'borrow' | 'return'} type Loại phiếu: 'borrow' (Phiếu mượn) hoặc 'return' (Phiếu trả)
 * @param {object} data Dữ liệu phiếu mượn/trả
 */
export default function CirculationReceiptModal({
  isOpen,
  onClose,
  type = 'borrow',
  data = null
}) {
  const printAreaRef = useRef(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !data) return null;

  // Chuẩn hóa dữ liệu hiển thị cho Phiếu mượn hoặc Phiếu trả
  const isBorrow = type === 'borrow';
  const receiptCode = data.borrowCode || data.id || `PM-${data.borrowingId || '0001'}`;
  const readerName = data.readerName || 'Bạn đọc thư viện';
  const readerCode = data.readerCode || data.studentCode || 'N/A';
  const department = data.memberType || data.department || 'Khoa Công nghệ Thông tin';
  const librarianName = data.librarianName || 'Nguyễn Võ Lê Khoa';
  
  // Ngày tháng
  const borrowDateStr = data.rawBorrowDate
    ? new Date(data.rawBorrowDate).toLocaleDateString('vi-VN')
    : data.borrowDate || new Date().toLocaleDateString('vi-VN');

  const dueDateStr = data.rawDueDate
    ? new Date(data.rawDueDate).toLocaleDateString('vi-VN')
    : data.dueDate || '';

  const returnDateStr = data.returnDate || new Date().toLocaleDateString('vi-VN');

  // Danh sách các cuốn sách trong phiếu
  const bookItems = Array.isArray(data.items) && data.items.length > 0
    ? data.items
    : [
        {
          title: data.bookTitle || 'Tài liệu Thư viện',
          author: data.author || 'Nhiều tác giả',
          barcode: data.bookCode || 'BC000001-C',
          dueDate: dueDateStr,
          note: data.isOnTime !== undefined ? (data.isOnTime ? 'Đúng hạn, nguyên vẹn' : 'Quá hạn') : 'Nguyên vẹn'
        }
      ];

  // In trực tiếp qua hộp thoại in của trình duyệt
  const handlePrint = () => {
    window.print();
  };

  // Xuất file PDF chất lượng cao, giữ nguyên trọn vẹn 100% cả phiếu (từ Quốc hiệu đến Chữ ký) trên 1 trang A4
  const handleExportPdf = async () => {
    const element = printAreaRef.current;
    if (!element) return;
    setIsExportingPdf(true);
    try {
      // Đưa thanh cuộn về đỉnh để đảm bảo tọa độ chụp chuẩn xác tuyệt đối
      const container = element.parentElement;
      const originalScrollTop = container ? container.scrollTop : 0;
      if (container) container.scrollTop = 0;

      // Chiều rộng và chiều cao đầy đủ của cả tờ phiếu (kể cả phần bên dưới)
      const fullWidth = element.offsetWidth || element.scrollWidth;
      const fullHeight = element.scrollHeight || element.offsetHeight;

      // Chụp ảnh toàn bộ tờ phiếu với scale 2x đảm bảo sắc nét từng con chữ và mã vạch
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: fullWidth,
        height: fullHeight,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: document.documentElement.offsetHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const clonedSheet = clonedDoc.querySelector('.receipt-paper-sheet');
          if (clonedSheet) {
            clonedSheet.style.overflow = 'visible';
            clonedSheet.style.maxHeight = 'none';
            clonedSheet.style.height = 'auto';
          }
        }
      });

      if (container) container.scrollTop = originalScrollTop;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Nhúng thông tin định danh phiếu vào tệp PDF
      pdf.setProperties({
        title: isBorrow ? `Phiếu mượn sách ${receiptCode}` : `Phiếu trả sách ${receiptCode}`,
        subject: receiptCode,
        author: readerName,
        keywords: `${receiptCode}, Barcode: ${receiptCode}`,
        creator: 'SmartLib AI'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8; // Lề an toàn 8mm
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      // Cân đối tỷ lệ ảnh để toàn bộ phiếu (gồm chữ ký) nằm trọn vẹn trong đúng 1 trang A4
      let renderWidth = printableWidth;
      let renderHeight = (canvas.height * printableWidth) / canvas.width;

      if (renderHeight > printableHeight) {
        const scaleRatio = printableHeight / renderHeight;
        renderHeight = printableHeight;
        renderWidth = renderWidth * scaleRatio;
      }

      // Căn giữa trang A4
      const posX = (pageWidth - renderWidth) / 2;
      const posY = margin;

      pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      const filename = isBorrow
        ? `Phieu_Muon_Sach_${receiptCode}.pdf`
        : `Phieu_Tra_Sach_${receiptCode}.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error('Lỗi xuất PDF:', err);
      alert('Không thể tạo tệp PDF: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="receipt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="receipt-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header điều khiển trên màn hình */}
        <div className="receipt-modal-header no-print">
          <div className="receipt-modal-title">
            <FileText size={18} className="receipt-title-icon" />
            <span>{isBorrow ? 'Xem & In Phiếu Mượn Sách' : 'Xem & In Phiếu Trả Sách'}</span>
            <span className="receipt-tag-code">{receiptCode}</span>
          </div>

          <div className="receipt-header-actions">
            <button
              type="button"
              className="btn-receipt-action btn-print"
              onClick={handlePrint}
              title="In trực tiếp ra máy in hoặc lưu PDF qua hộp thoại in"
            >
              <Printer size={15} />
              <span>In phiếu</span>
            </button>

            <button
              type="button"
              className="btn-receipt-action btn-export-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              title="Tải tệp PDF cả phiếu về máy tính"
            >
              <Download size={15} />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải file PDF'}</span>
            </button>

            <button
              type="button"
              className="receipt-modal-close"
              onClick={onClose}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Khung tài liệu mô phỏng khổ giấy in A4 chuẩn hành chính */}
        <div className="receipt-paper-container">
          <div className="receipt-paper-sheet" ref={printAreaRef}>
            {/* 1. Quốc hiệu tiêu ngữ */}
            <div className="paper-header-national">
              <div className="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="national-motto">Độc lập - Tự do - Hạnh phúc</div>
              <div className="national-underline"></div>
            </div>

            {/* 2. Tiêu đề biểu mẫu */}
            <div className="paper-form-title">
              <h2>{isBorrow ? 'PHIẾU MƯỢN SÁCH' : 'PHIẾU TRẢ SÁCH'}</h2>
            </div>

            {/* 3. Thông tin hành chính của phiếu & Mã vạch quét tự động */}
            <div className="paper-info-section-with-barcode">
              <div className="paper-info-left">
                <div className="paper-info-row">
                  <span className="info-bullet">•</span>
                  <span className="info-label">Số phiếu:</span>
                  <span className="info-value info-code">{receiptCode}</span>
                </div>

                <div className="paper-info-row">
                  <span className="info-bullet">•</span>
                  <span className="info-label">{isBorrow ? 'Ngày mượn:' : 'Ngày trả:'}</span>
                  <span className="info-value">{isBorrow ? borrowDateStr : returnDateStr}</span>
                </div>

                <div className="paper-info-row">
                  <span className="info-bullet">•</span>
                  <span className="info-label">{isBorrow ? 'Người mượn:' : 'Người trả:'}</span>
                  <span className="info-value bold">{readerName}</span>
                </div>

                <div className="paper-info-row">
                  <span className="info-bullet">•</span>
                  <span className="info-label">Mã số bạn đọc:</span>
                  <span className="info-value bold">{readerCode}</span>
                </div>

                <div className="paper-info-row">
                  <span className="info-bullet">•</span>
                  <span className="info-label">Lớp/Khoa/Bộ phận:</span>
                  <span className="info-value">{department}</span>
                </div>
              </div>

              {/* Khối Mã vạch Barcode Code128 của Phiếu mượn/trả để quét tự động khi trả sách */}
              <div className="paper-barcode-box">
                <div
                  className="paper-barcode-graphic"
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSvg(receiptCode, {
                      width: 175,
                      height: 52,
                      showText: true,
                      fontSize: 10.5,
                      margin: 4
                    })
                  }}
                />
                <div className="paper-barcode-caption">Mã vạch quét phiếu</div>
              </div>
            </div>

            {/* 4. Danh sách tài liệu (Tỉ lệ 6 cột: 0.5 / 3.5 / 2 / 1.5 / 1.5 / 2 = 11 phần) */}
            <div className="paper-table-section">
              <div className="section-heading">
                {isBorrow ? '1. Danh sách sách mượn' : '1. Danh sách sách hoàn trả'}
              </div>

              <table className="paper-table">
                {/* Tỉ lệ 6 cột chính xác: 0.5 (4.55%), 3.5 (31.82%), 2 (18.18%), 1.5 (13.64%), 1.5 (13.64%), 2 (18.18%) */}
                <colgroup>
                  <col style={{ width: '4.55%' }} />
                  <col style={{ width: '31.82%' }} />
                  <col style={{ width: '18.18%' }} />
                  <col style={{ width: '13.64%' }} />
                  <col style={{ width: '13.64%' }} />
                  <col style={{ width: '18.18%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>STT</th>
                    <th>Tên sách</th>
                    <th>Tác giả</th>
                    <th style={{ textAlign: 'center' }}>Mã sách</th>
                    <th style={{ textAlign: 'center' }}>
                      {isBorrow ? 'Ngày hẹn trả' : 'Ngày trả'}
                    </th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {bookItems.map((item, idx) => (
                    <tr key={item.barcode || idx}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td className="book-title-cell">{item.title || 'Tài liệu Thư viện'}</td>
                      <td className="book-author-cell">{item.author || 'Nhiều tác giả'}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                        {item.barcode || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isBorrow ? (item.dueDate || dueDateStr) : returnDateStr}
                      </td>
                      <td className="book-note-cell">
                        {item.note ||
                          (isBorrow
                            ? 'Nguyên vẹn'
                            : data.isOnTime
                            ? 'Trả đúng hạn'
                            : data.isOverdue
                            ? `Trễ ${data.overdueDays || 0} ngày`
                            : 'Đã hoàn tất')}
                      </td>
                    </tr>
                  ))}
                  {/* Bổ sung các hàng trống nếu số lượng sách ít hơn 3 để giữ form đẹp */}
                  {bookItems.length < 3 &&
                    Array.from({ length: 3 - bookItems.length }).map((_, emptyIdx) => (
                      <tr key={`empty-${emptyIdx}`} className="empty-row">
                        <td style={{ textAlign: 'center' }}>{bookItems.length + emptyIdx + 1}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* 5. Điều khoản và cam kết */}
            <div className="paper-terms-section">
              <div className="section-heading">
                {isBorrow ? '2. Điều khoản mượn sách' : '2. Quy định hoàn tất'}
              </div>
              {isBorrow ? (
                <ul className="terms-list">
                  <li>Bạn đọc có trách nhiệm bảo quản sách cẩn thận và trả sách đúng hạn đã cam kết.</li>
                  <li>Nếu làm hỏng hoặc mất sách, bạn đọc phải bồi thường theo quy định của thư viện.</li>
                  <li>Trả sách muộn có thể bị tính phí phạt quá hạn theo quy định hiện hành.</li>
                </ul>
              ) : (
                <ul className="terms-list">
                  <li>Thư viện xác nhận bạn đọc đã hoàn tất việc giao trả tài liệu vào kho sách.</li>
                  <li>Tài liệu đã được thủ thư kiểm tra tình trạng vật lý đạt tiêu chuẩn lưu kho.</li>
                  <li>Mọi công nợ và nghĩa vụ liên quan đến phiếu này đã được tất toán đầy đủ.</li>
                </ul>
              )}
            </div>

            {/* 6. Phần chữ ký hai bên */}
            <div className="paper-signatures-row">
              <div className="sig-block sig-left">
                <div className="sig-role">{isBorrow ? 'Người mượn sách' : 'Người trả sách'}</div>
                <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                <div className="sig-space"></div>
                <div className="sig-name">{readerName}</div>
              </div>

              <div className="sig-block sig-right">
                <div className="sig-role">Thủ thư</div>
                <div className="sig-sub">(Ký, ghi rõ họ tên)</div>
                <div className="sig-space"></div>
                <div className="sig-name">{librarianName}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer điều khiển */}
        <div className="receipt-modal-footer no-print">
          <span className="receipt-hint-text">
            💡 Mẹo: Nhấn nút <strong>[Tải file PDF (Cả phiếu)]</strong> để xuất tệp lưu trữ hoặc in gửi bạn đọc.
          </span>
          <div className="receipt-footer-actions">
            <button
              type="button"
              className="btn-footer-print"
              onClick={handlePrint}
              title="In phiếu mượn/trả"
            >
              <Printer size={14} />
              <span>In phiếu</span>
            </button>
            <button
              type="button"
              className="btn-footer-export-pdf"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              title="Lưu toàn bộ tờ phiếu thành tệp PDF"
            >
              <Download size={14} />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải file PDF (Cả phiếu)'}</span>
            </button>
            <button type="button" className="btn-close-receipt" onClick={onClose}>
              Đóng lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
