import React from 'react';
import { Receipt } from 'lucide-react';

/**
 * Component Tab 2: Sổ nợ đọng & Xử lý sách hư hỏng (Story LOLRA-19)
 */
export default function RevenueArrearsTab({
  backendPendingFines = [],
  isLoadingFines = false,
  fetchPendingFines,
  onOpenPayModal
}) {
  return (
    <div className="arrears-grid">
      {/* CỘT TRÁI: DANH SÁCH CÁC TRƯỜNG HỢP QUÁ HẠN & NỢ PHẠT TÍCH LŨY */}
      <div className="arrears-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Danh sách các trường hợp quá hạn & nợ phạt tích lũy (
            {backendPendingFines.length > 0 ? backendPendingFines.length : 0})
          </h3>
          <button
            type="button"
            onClick={fetchPendingFines}
            style={{
              fontSize: '12px',
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {isLoadingFines ? 'Đang tải...' : '↻ Làm mới'}
          </button>
        </div>

        <div className="arrears-list">
          {backendPendingFines.length > 0 ? (
            backendPendingFines.map((item, idx) => (
              <div
                key={idx}
                className="arrears-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {item.readerName} ({item.readerCode})
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                    Sách: {item.bookTitle} • Phiếu: <strong>{item.borrowCode}</strong>
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '6px'
                  }}
                >
                  <div>
                    <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '15px' }}>
                      {item.finalAmount?.toLocaleString('vi-VN')} đ
                    </span>
                    <span style={{ fontSize: '11.5px', color: '#dc2626', marginLeft: '6px' }}>
                      (Quá hạn {item.daysOverdue || 0} ngày)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn-primary-action"
                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '5px' }}
                    onClick={() => onOpenPayModal && onOpenPayModal(item)}
                    title="Thu tiền và xuất biên lai kế toán K80/A5 (LOLRA-19)"
                  >
                    <Receipt size={13} />
                    <span>Thu tiền ngay</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13.5px' }}>
              🎉 Hiện tại không có độc giả nào có khoản phạt nợ đọng!
            </div>
          )}
        </div>
      </div>

      {/* CỘT PHẢI: 12 TRƯỜNG HỢP BỒI HOÀN SÁCH MẤT / HƯ HẠI */}
      <div className="arrears-card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
          12 Trường hợp bồi hoàn sách mất / hư hại
        </h3>
        <div className="arrears-list">
          {[
            {
              reader: 'Trần Văn Tùng (102210882)',
              book: 'Deep Learning with Python',
              status: 'Mất sách',
              penalty: '240.000 đ'
            },
            {
              reader: 'Lê Thị Khánh Huyền (102230045)',
              book: 'Cấu trúc dữ liệu và giải thuật',
              status: 'Rách trang 14-18',
              penalty: '20.000 đ'
            },
            {
              reader: 'Bùi Đức Huy (102220199)',
              book: 'Nguyên lý hệ điều hành',
              status: 'Mất bìa sách',
              penalty: '35.000 đ'
            }
          ].map((c, i) => (
            <div key={i} className="arrears-item">
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px' }}>{c.reader}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{c.book}</div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '4px',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    fontWeight: 600
                  }}
                >
                  {c.status}
                </span>
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{c.penalty}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
