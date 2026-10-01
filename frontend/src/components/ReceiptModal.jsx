import React, { useRef, useState } from 'react';
import {
  Printer,
  Download,
  X,
  Receipt,
  CheckCircle2,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Sparkles,
  QrCode,
  Loader2,
  Clock
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { generateBarcodeSvg } from '../utils/barcodeGenerator';
import './ReceiptModal.css';

/**
 * Component Modal Phiếu Thu Phạt & Hóa Đơn Kế Toán (Story LOLRA-19)
 * Đã chuẩn hóa:
 * - Đại học Công nghệ TP.HCM (HUTECH)
 * - Tinh chỉnh font chữ nhỏ gọn, đều đẹp, không bị tràn chữ
 * - Hỗ trợ XEM TRƯỚC BIÊN LAI trước khi bấm xác nhận thu tiền
 * - Căn chỉnh nút đóng (X) ngay ngắn ở góc phải
 * 
 * @param {boolean} isOpen Trạng thái mở modal
 * @param {() => void} onClose Hàm đóng modal
 * @param {object} invoiceData Dữ liệu hóa đơn / khoản phạt cần thu
 * @param {'k80' | 'a5'} [defaultFormat='k80'] Khổ in mặc định
 * @param {(paymentMethod: string) => Promise<boolean | void>} [onConfirmPayment] Hàm xác nhận thu tiền
 */
export default function ReceiptModal({
  isOpen,
  onClose,
  invoiceData = null,
  defaultFormat = 'k80',
  onConfirmPayment = null
}) {
  const printAreaRef = useRef(null);
  const [format, setFormat] = useState(defaultFormat); // 'k80' | 'a5'
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Phương thức thanh toán được chọn khi xem trước
  const [selectedMethod, setSelectedMethod] = useState(
    invoiceData?.paymentMethod === 'Transfer' ? 'Transfer' : 'Cash'
  );

  if (!isOpen || !invoiceData) return null;

  // Trạng thái: Đang xem trước chờ xác nhận thu hay đã xuất hóa đơn
  const isPending = Boolean(invoiceData.isPending || !invoiceData.invoiceCode || invoiceData.status === 'Pending');

  // Chuẩn hóa dữ liệu hiển thị
  const invoiceCode = invoiceData.invoiceCode || 'INV-DRAFT';
  const readerName = invoiceData.readerName || 'Bạn đọc Thư viện';
  const readerCode = invoiceData.readerCode || 'N/A';
  const department = invoiceData.department || 'Độc giả HUTECH';
  const bookTitle = invoiceData.bookTitle || 'Tài liệu Thư viện';
  const borrowCode = invoiceData.borrowCode || (invoiceData.borrowingId ? `PM-${String(invoiceData.borrowingId).padStart(4, '0')}` : 'PM-N/A');
  const reason = invoiceData.reason || 'Xử phạt vi phạm quy định mượn trả';
  const cashierName = invoiceData.cashierName || 'Thủ thư tiếp nhận';
  const paymentMethodText = (isPending ? selectedMethod : invoiceData.paymentMethod) === 'Transfer' ? 'Chuyển khoản QR' : 'Tiền mặt tại quầy';

  const totalAmount = Number(invoiceData.totalAmount || invoiceData.amountPaid || invoiceData.finalAmount || 0);
  const discountAmount = Number(invoiceData.discountAmount || 0);
  const amountPaid = Number(invoiceData.amountPaid || invoiceData.finalAmount || totalAmount);

  // Ngày giờ thu tiền
  const paymentDate = invoiceData.paymentDate ? new Date(invoiceData.paymentDate) : new Date();
  const dateStr = paymentDate.toLocaleDateString('vi-VN');
  const timeStr = paymentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Xử lý xác nhận thu tiền
  const handleExecutePayment = async () => {
    if (!onConfirmPayment) return;
    setIsSubmittingPay(true);
    try {
      await onConfirmPayment(selectedMethod);
    } catch (err) {
      console.error('Lỗi xác nhận thu tiền:', err);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // In trực tiếp qua trình duyệt với CSS @media print
  const handlePrint = () => {
    window.print();
  };

  // Xuất file PDF sắc nét
  const handleExportPdf = async () => {
    const element = printAreaRef.current;
    if (!element) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const isK80 = format === 'k80';

      const pdf = isK80
        ? new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, Math.max(120, (canvas.height * 80) / canvas.width)]
          })
        : new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
          });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BienLai_${invoiceCode || 'HUTECH'}_${format.toUpperCase()}.pdf`);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="receipt-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="receipt-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* THANH ĐIỀU HƯỚNG & CÔNG CỤ TRÊN CÙNG (Ẩn khi in ấn) */}
        <div className="receipt-modal-header no-print">
          {/* HÀNG 1: TIÊU ĐỀ & NÚT ĐÓNG X RIÊNG BIỆT Ở GÓC PHẢI */}
          <div className="modal-header-top-row">
            <div className="modal-header-left">
              <div className={`modal-icon-badge ${isPending ? 'badge-pending' : 'badge-paid'}`}>
                <Receipt size={18} />
              </div>
              <div className="modal-title-wrap">
                <div className="modal-title-line">
                  <h2 className="modal-title">
                    {isPending ? 'XEM TRƯỚC BIÊN LAI THU TIỀN PHẠT' : 'BIÊN LAI THU TIỀN PHẠT ĐIỆN TỬ'}
                  </h2>
                  <span className={`status-pill ${isPending ? 'pill-pending' : 'pill-paid'}`}>
                    {isPending ? 'Chờ xác nhận thu' : 'Đã thu tiền (Paid)'}
                  </span>
                </div>
                <p className="modal-subtitle">
                  {isPending ? (
                    <span>Kiểm tra chi tiết biên lai trước khi xác nhận thu tiền vào quỹ thư viện HUTECH</span>
                  ) : (
                    <span>Mã hóa đơn kế toán: <strong>{invoiceCode}</strong> • Phiếu mượn: <strong>{borrowCode}</strong></span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-close-action"
              onClick={onClose}
              title="Đóng cửa sổ biên lai (Esc)"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </div>

          {/* HÀNG 2: BỘ CHỌN KHỔ IN & CÁC NÚT THAO TÁC (TÁCH BIỆT RÕ RÀNG) */}
          <div className="modal-header-bottom-bar">
            {/* Bộ chọn khổ in K80 vs A5 */}
            <div className="format-toggle-group" role="radiogroup" aria-label="Chọn khổ in">
              <span className="format-toggle-label">Khổ in:</span>
              <button
                type="button"
                className={`format-btn ${format === 'k80' ? 'active' : ''}`}
                onClick={() => setFormat('k80')}
                title="Khổ in nhiệt 80mm chuẩn quầy POS thu ngân"
              >
                Khổ K80 (POS)
              </button>
              <button
                type="button"
                className={`format-btn ${format === 'a5' ? 'active' : ''}`}
                onClick={() => setFormat('a5')}
                title="Khổ in A5 biểu mẫu hành chính lưu trữ hồ sơ"
              >
                Khổ A5 (Hành chính)
              </button>
            </div>

            {/* Các nút thao tác nghiệp vụ */}
            <div className="modal-action-tools">
              {isPending && onConfirmPayment ? (
                <>
                  <div className="inline-method-picker">
                    <span className="picker-lbl">Phương thức:</span>
                    <button
                      type="button"
                      className={`method-chip ${selectedMethod === 'Cash' ? 'active' : ''}`}
                      onClick={() => setSelectedMethod('Cash')}
                      title="Nộp tiền mặt tại quầy"
                    >
                      <Banknote size={14} />
                      <span>Tiền mặt</span>
                    </button>
                    <button
                      type="button"
                      className={`method-chip ${selectedMethod === 'Transfer' ? 'active' : ''}`}
                      onClick={() => setSelectedMethod('Transfer')}
                      title="Chuyển khoản mã QR ngân hàng"
                    >
                      <QrCode size={14} />
                      <span>Chuyển khoản QR</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-confirm-action"
                    onClick={handleExecutePayment}
                    disabled={isSubmittingPay}
                    title="Xác nhận đã thu đủ tiền và lập hóa đơn bất biến"
                  >
                    {isSubmittingPay ? <Loader2 size={15} className="spin-icon" /> : <CheckCircle2 size={15} />}
                    <span>{isSubmittingPay ? 'Đang xác nhận...' : 'Xác nhận đã thu tiền'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-print-action"
                    onClick={handlePrint}
                    title="In trực tiếp ra máy in nhiệt hoặc máy in laser (Ctrl + P)"
                  >
                    <Printer size={15} />
                    <span>In biên lai</span>
                  </button>

                  <button
                    type="button"
                    className="btn-pdf-action"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    title="Xuất file PDF chất lượng cao"
                  >
                    <Download size={15} />
                    <span>{isExportingPdf ? 'Đang xuất...' : 'Xuất PDF'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* VÙNG NỘI DUNG BIÊN LAI (SẼ ĐƯỢC IN RA KHI GỌI WINDOW.PRINT) */}
        <div className="receipt-preview-viewport">
          <div
            id="receipt-print-area"
            ref={printAreaRef}
            className={`receipt-sheet-container sheet-${format}`}
          >
            {format === 'k80' ? (
              /* ==========================================================
                 ĐỊNH DẠNG KHỔ K80: MÁY IN NHIỆT 80MM (HUTECH LIBRARY POS)
                 ========================================================== */
              <div className="k80-receipt">
                <div className="k80-header">
                  <div className="k80-org-title">ĐẠI HỌC CÔNG NGHỆ TP.HCM</div>
                  <div className="k80-library-name">TRUNG TÂM THÔNG TIN - THƯ VIỆN HUTECH</div>
                  <div className="k80-address">475A Điện Biên Phủ, P. 25, Q. Bình Thạnh, TP.HCM</div>
                  <div className="k80-hotline">Hotline: (028) 5445 7777 • www.hutech.edu.vn</div>
                  <div className="k80-divider-double" />
                  <div className="k80-doc-title">BIÊN LAI THU TIỀN PHẠT</div>
                  <div className="k80-sub-title">(PHIẾU THU TÀI CHÍNH ĐIỆN TỬ)</div>
                  <div className="k80-code-line">
                    Số HĐ: <strong>{isPending ? '(Chờ cấp mã chính thức)' : invoiceCode}</strong>
                  </div>
                </div>

                {/* Mã vạch Barcode SVG của Hóa đơn */}
                {!isPending && invoiceCode && (
                  <div className="k80-barcode-wrap">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvg(invoiceCode, {
                          width: 200,
                          height: 38,
                          includeText: false
                        })
                      }}
                    />
                    <div className="k80-barcode-text">*{invoiceCode}*</div>
                  </div>
                )}

                <div className="k80-divider-dashed" />

                {/* Thông tin ngày giờ & Người thu */}
                <div className="k80-meta-group">
                  <div className="k80-row">
                    <span className="lbl">Ngày giờ:</span>
                    <span className="val">{dateStr} {timeStr}</span>
                  </div>
                  <div className="k80-row">
                    <span className="lbl">Thủ thư tiếp nhận:</span>
                    <span className="val font-bold">{cashierName}</span>
                  </div>
                  <div className="k80-row">
                    <span className="lbl">Mã phiếu mượn:</span>
                    <span className="val font-mono">{borrowCode}</span>
                  </div>
                </div>

                <div className="k80-divider-dashed" />

                {/* Thông tin Bạn đọc */}
                <div className="k80-meta-group">
                  <div className="k80-row">
                    <span className="lbl">Họ tên bạn đọc:</span>
                    <span className="val font-bold">{readerName}</span>
                  </div>
                  <div className="k80-row">
                    <span className="lbl">Mã SV / Bạn đọc:</span>
                    <span className="val font-mono">{readerCode}</span>
                  </div>
                  <div className="k80-row">
                    <span className="lbl">Khoa / Đơn vị:</span>
                    <span className="val">{department}</span>
                  </div>
                </div>

                <div className="k80-divider-dashed" />

                {/* Chi tiết nội dung vi phạm */}
                <div className="k80-item-group">
                  <div className="k80-item-title">LÝ DO XỬ PHẠT VI PHẠM:</div>
                  <div className="k80-reason-box">{reason}</div>
                  <div className="k80-book-line">Tài liệu: <em>{bookTitle}</em></div>
                </div>

                <div className="k80-divider-dashed" />

                {/* Bảng kê số tiền chi tiết */}
                <div className="k80-finance-group">
                  <div className="k80-row">
                    <span className="lbl">Tiền phạt gốc:</span>
                    <span className="val">{totalAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="k80-row text-success">
                      <span className="lbl">Giảm trừ rèn luyện:</span>
                      <span className="val">-{discountAmount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="k80-divider-solid" />
                  <div className="k80-total-row">
                    <span className="total-lbl">TỔNG THỰC THU:</span>
                    <span className="total-val">{amountPaid.toLocaleString('vi-VN')} VNĐ</span>
                  </div>
                  <div className="k80-row mt-1">
                    <span className="lbl">Hình thức nộp:</span>
                    <span className="val font-bold">{paymentMethodText}</span>
                  </div>
                </div>

                <div className="k80-divider-double" />

                {/* Xác nhận mở khóa mượn sách & Lời cảm ơn */}
                <div className="k80-footer">
                  <div className={`k80-status-badge ${isPending ? 'status-pending-badge' : 'status-paid-badge'}`}>
                    <CheckCircle2 size={12} />
                    <span>{isPending ? 'XEM TRƯỚC - CHỜ THU TIỀN' : 'ĐÃ THANH TOÁN (PAID)'}</span>
                  </div>
                  <div className="k80-unlock-notice">
                    {isPending
                      ? 'Quyền mượn sách sẽ được hệ thống mở lại ngay sau khi hoàn tất xác nhận thu tiền.'
                      : '✓ Đã tự động mở lại quyền mượn sách cho bạn đọc trên hệ thống SmartLib AI.'}
                  </div>
                  <div className="k80-thankyou">
                    Xin cảm ơn bạn đọc đã nộp phạt và tuân thủ nội quy thư viện HUTECH!
                  </div>
                  <div className="k80-datetime-bottom">In lúc: {new Date().toLocaleString('vi-VN')}</div>
                </div>
              </div>
            ) : (
              /* ==========================================================
                 ĐỊNH DẠNG KHỔ A5: BIỂU MẪU HÀNH CHÍNH LƯU TRỮ HỒ SƠ TÀI CHÍNH
                 ========================================================== */
              <div className="a5-receipt">
                {/* Tiêu đề Quốc hiệu & Đơn vị */}
                <div className="a5-header-grid">
                  <div className="a5-header-left">
                    <div className="a5-univ">ĐẠI HỌC CÔNG NGHỆ TP.HCM</div>
                    <div className="a5-dept">TRUNG TÂM THÔNG TIN - THƯ VIỆN</div>
                    <div className="a5-line-decor">---o0o---</div>
                  </div>
                  <div className="a5-header-right">
                    <div className="a5-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="a5-motto">Độc lập - Tự do - Hạnh phúc</div>
                    <div className="a5-line-decor">----------------</div>
                    <div className="a5-place-date">
                      <em>TP. Hồ Chí Minh, ngày {paymentDate.getDate()} tháng {paymentDate.getMonth() + 1} năm {paymentDate.getFullYear()}</em>
                    </div>
                  </div>
                </div>

                {/* Tiêu đề Biên lai */}
                <div className="a5-title-block">
                  <h1 className="a5-main-title">BIÊN LAI THU TIỀN PHẠT VI PHẠM THƯ VIỆN</h1>
                  <div className="a5-code-wrap">
                    <span>Mã biên lai: <strong>{isPending ? '(Chờ xác nhận thu)' : invoiceCode}</strong></span>
                    <span className="a5-code-sep">•</span>
                    <span>Mã phiếu mượn: <strong>{borrowCode}</strong></span>
                  </div>
                </div>

                {/* Thông tin Bạn đọc & Khoản thu */}
                <div className="a5-body-info">
                  <div className="a5-info-row">
                    <span className="a5-lbl">Họ và tên người nộp:</span>
                    <span className="a5-val font-bold">{readerName}</span>
                  </div>
                  <div className="a5-info-row">
                    <span className="a5-lbl">Mã bạn đọc / MSSV:</span>
                    <span className="a5-val font-mono">{readerCode}</span>
                    <span className="a5-lbl ml-4">Khoa / Đơn vị:</span>
                    <span className="a5-val">{department}</span>
                  </div>
                  <div className="a5-info-row">
                    <span className="a5-lbl">Lý do xử phạt:</span>
                    <span className="a5-val">{reason} (Tài liệu: <em>{bookTitle}</em>)</span>
                  </div>
                  <div className="a5-info-row">
                    <span className="a5-lbl">Hình thức nộp tiền:</span>
                    <span className="a5-val font-bold">{paymentMethodText}</span>
                  </div>
                </div>

                {/* Bảng đối soát tài chính */}
                <table className="a5-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Nội dung khoản thu</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Tiền phạt gốc</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Giảm trừ RL</th>
                      <th style={{ width: '19%', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>Thu tiền phạt vi phạm quy chế mượn trả</strong>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Phiếu mượn: {borrowCode} • {bookTitle}</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{totalAmount.toLocaleString('vi-VN')} đ</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>
                        {discountAmount > 0 ? `-${discountAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800 }}>
                        {amountPaid.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                        TỔNG CỘNG THỰC THU:
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                        {amountPaid.toLocaleString('vi-VN')} VNĐ
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="a5-words-line">
                  <em>(Số tiền viết bằng chữ: {amountPaid.toLocaleString('vi-VN')} đồng chẵn)</em>
                </div>

                <div className={`a5-unlock-badge ${isPending ? 'a5-unlock-pending' : ''}`}>
                  <CheckCircle2 size={14} />
                  <span>
                    {isPending
                      ? 'Lưu ý: Biên lai đang ở chế độ xem trước. Hệ thống sẽ mở lại quyền mượn sách ngay khi thủ thư xác nhận.'
                      : 'Xác nhận: Bạn đọc đã nộp đủ tiền phạt. Hệ thống SmartLib AI đã tự động khôi phục quyền mượn sách.'}
                  </span>
                </div>

                {/* Khu vực chữ ký 2 bên */}
                <div className="a5-sign-grid">
                  <div className="a5-sign-col">
                    <div className="sign-title">NGƯỜI NỘP TIỀN</div>
                    <div className="sign-sub"><em>(Ký, ghi rõ họ tên)</em></div>
                    <div className="sign-space" />
                    <div className="sign-name">{readerName}</div>
                  </div>

                  <div className="a5-sign-col">
                    <div className="sign-title">THỦ THƯ TIẾP NHẬN</div>
                    <div className="sign-sub"><em>(Ký, đóng dấu thu tiền)</em></div>
                    <div className="sign-space" />
                    <div className="sign-name">{cashierName}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
