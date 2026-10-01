import React from 'react';

/**
 * Component Tab 4: Cơ cấu doanh thu & Nguồn thu
 */
export default function RevenueBreakdownTab() {
  const breakdownItems = [
    {
      label: 'Phạt trễ hạn theo ngày (5.000đ/ngày)',
      amount: '10.042.500 đ',
      percent: 65,
      color: '#3b82f6'
    },
    {
      label: 'Bồi hoàn sách hỏng / rách / mất sách',
      amount: '3.862.500 đ',
      percent: 25,
      color: '#f97316'
    },
    {
      label: 'Phí cấp lại thẻ bạn đọc & dịch vụ thư viện',
      amount: '1.545.000 đ',
      percent: 10,
      color: '#8b5cf6'
    }
  ];

  return (
    <div className="arrears-grid">
      {/* CỘT TRÁI: PHÂN BỔ DÒNG TIỀN THU PHẠT */}
      <div className="arrears-card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
          Phân bổ dòng tiền thu phạt Tháng 09/2026
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {breakdownItems.map((item, idx) => (
            <div key={idx}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '13.5px'
                }}
              >
                <span>
                  <strong style={{ color: item.color }}>●</strong> {item.label}
                </span>
                <strong>
                  {item.amount} ({item.percent}%)
                </strong>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${item.percent}%`,
                    backgroundColor: item.color
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: TỶ LỆ THANH TOÁN */}
      <div className="arrears-card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
          Tỷ lệ thanh toán
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '13.5px'
              }}
            >
              <span>Chuyển khoản QR (VietQR / VNPay / MoMo)</span>
              <strong>58% (8.961.000 đ)</strong>
            </div>
            <div
              style={{
                height: '8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{ height: '100%', width: '58%', backgroundColor: '#2563eb' }}
              ></div>
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
                fontSize: '13.5px'
              }}
            >
              <span>Tiền mặt trực tiếp tại quầy lưu thông</span>
              <strong>42% (6.489.000 đ)</strong>
            </div>
            <div
              style={{
                height: '8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{ height: '100%', width: '42%', backgroundColor: '#10b981' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
