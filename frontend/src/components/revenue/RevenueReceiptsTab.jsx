import React from 'react';
import { Printer, CreditCard, Banknote } from 'lucide-react';

/**
 * Component Tab 3: Lịch sử Biên lai đã thu
 */
export default function RevenueReceiptsTab({
  receipts = [],
  onPrintReceipt,
  triggerToast
}) {
  return (
    <div className="revenue-table-card">
      <div className="receipts-summary-box">
        <div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Tổng tích lũy biên lai đã thu</div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>
            15.450.000 VNĐ
          </div>
          <div style={{ fontSize: '13px', color: '#86efac', marginTop: '4px' }}>
            ✓ Đã đối soát tài chính ngân hàng ngày 28/09/2026
          </div>
        </div>
        <button
          className="btn-secondary-action"
          style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          onClick={() => triggerToast && triggerToast('Đang kết xuất tất cả biên lai sang file PDF...')}
        >
          <Printer size={15} />
          <span>In bảng kê biên lai</span>
        </button>
      </div>

      <div style={{ overflowX: 'auto', marginTop: '16px' }}>
        <table className="revenue-table">
          <thead>
            <tr>
              <th>Mã biên lai</th>
              <th>Thời gian thu</th>
              <th>Độc giả nộp phạt</th>
              <th>Lý do thu phạt</th>
              <th>Phương thức</th>
              <th>Số tiền</th>
              <th>Thủ thư tiếp nhận</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r, idx) => (
              <tr key={idx}>
                <td>
                  <strong style={{ color: '#2563eb' }}>{r.code}</strong>
                </td>
                <td>{r.date}</td>
                <td>{r.reader}</td>
                <td>{r.type}</td>
                <td>
                  <span
                    className={`receipt-method-badge ${
                      r.isQr ? 'receipt-method-qr' : 'receipt-method-cash'
                    }`}
                  >
                    {r.isQr ? <CreditCard size={12} /> : <Banknote size={12} />}
                    {r.method}
                  </span>
                </td>
                <td>
                  <strong style={{ color: '#0f172a' }}>{r.amount}</strong>
                </td>
                <td>{r.cashier}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    style={{ padding: '3px 8px', fontSize: '11.5px', borderRadius: '4px' }}
                    onClick={() => onPrintReceipt && onPrintReceipt(r)}
                    title="Xem chi tiết & In biên lai K80 / A5"
                  >
                    <Printer size={12} />
                    <span>In phiếu</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
