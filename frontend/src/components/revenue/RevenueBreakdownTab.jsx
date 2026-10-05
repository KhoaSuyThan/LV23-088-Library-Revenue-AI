import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  ReceiptText,
  ShieldAlert,
  BookOpen,
  QrCode,
  Banknote,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Flame,
  Info
} from 'lucide-react';
import './RevenueAnalyticsDashboard.css';

/**
 * Dashboard Biểu đồ Doanh thu Thu phạt & Thống kê Vi phạm (Story LOLRA-17 / Sprint 5.1)
 * Hiển thị số liệu phân tích tài chính, xu hướng dòng tiền và cơ cấu vi phạm thư viện.
 */
export default function RevenueBreakdownTab({
  revenueSummary,
  receiptsList = [],
  backendPendingFines = []
}) {
  const [timeRange, setTimeRange] = useState('30d');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showActual, setShowActual] = useState(true);
  const [showExpected, setShowExpected] = useState(true);

  // Nhãn tháng hiện tại
  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    return `Tháng ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }, []);

  // 1. TỔNG HỢP CÁC CHỈ SỐ TÀI CHÍNH TỔNG QUÁT (KPI METRICS)
  const metrics = useMemo(() => {
    const totalCollected = revenueSummary?.totalCollectedRevenue || 15450000;
    const totalPending = revenueSummary?.totalPendingArrears || 2350000;
    const totalDamage = revenueSummary?.totalDamageBookValue || 3800000;
    const invoicesCount = revenueSummary?.totalInvoicesCount || (receiptsList.length > 0 ? receiptsList.length : 128);
    const pendingCount = revenueSummary?.totalPendingFinesCount || (backendPendingFines.length > 0 ? backendPendingFines.length : 47);

    const totalPotential = totalCollected + totalPending;
    const recoveryRate = totalPotential > 0 ? Math.round((totalCollected / totalPotential) * 1000) / 10 : 86.8;

    return {
      totalCollected,
      totalPending,
      totalDamage,
      invoicesCount,
      pendingCount,
      recoveryRate
    };
  }, [revenueSummary, receiptsList, backendPendingFines]);

  // 2. DỮ LIỆU ĐIỂM BIỂU ĐỒ XU HƯỚNG THEO THỜI GIAN (TREND POINTS)
  const trendData = useMemo(() => {
    const month = new Date().getMonth() + 1;

    if (timeRange === '7d') {
      return [
        { label: 'T2', date: '29/09', actual: 450000, expected: 550000 },
        { label: 'T3', date: '30/09', actual: 620000, expected: 700000 },
        { label: 'T4', date: '01/10', actual: 890000, expected: 950000 },
        { label: 'T5', date: '02/10', actual: 520000, expected: 600000 },
        { label: 'T6', date: '03/10', actual: 1150000, expected: 1200000 },
        { label: 'T7', date: '04/10', actual: 780000, expected: 850000 },
        { label: 'CN', date: '05/10', actual: 950000, expected: 1000000 }
      ];
    }

    if (timeRange === 'quarter') {
      return [
        { label: 'Tháng 07', date: 'T7/2026', actual: 12400000, expected: 13500000 },
        { label: 'Tháng 08', date: 'T8/2026', actual: 14100000, expected: 15000000 },
        { label: 'Tháng 09', date: 'T9/2026', actual: 15450000, expected: 16800000 },
        { label: 'Tháng 10 (Dự báo)', date: 'T10/2026', actual: 16200000, expected: 18000000 }
      ];
    }

    // Mặc định: 30 ngày (Lấy từ backend hoặc mốc chu kỳ 5 ngày trong tháng)
    if (revenueSummary?.trendPoints && revenueSummary.trendPoints.length > 0) {
      return revenueSummary.trendPoints.map((pt) => ({
        label: pt.dateLabel,
        date: pt.dateLabel,
        actual: Number(pt.actualRevenue || 0),
        expected: Number(pt.expectedRevenue || 0)
      }));
    }

    return [
      { label: `01/${month}`, date: `01/${month}`, actual: 1200000, expected: 1400000 },
      { label: `05/${month}`, date: `05/${month}`, actual: 1850000, expected: 2100000 },
      { label: `10/${month}`, date: `10/${month}`, actual: 2900000, expected: 3200000 },
      { label: `15/${month}`, date: `15/${month}`, actual: 2400000, expected: 2800000 },
      { label: `20/${month}`, date: `20/${month}`, actual: 3950000, expected: 4300000 },
      { label: `25/${month}`, date: `25/${month}`, actual: 4600000, expected: 5100000 },
      { label: `30/${month}`, date: `30/${month} (Dự báo)`, actual: 5800000, expected: 6400000 }
    ];
  }, [timeRange, revenueSummary]);

  // TÍNH TOÁN TỌA ĐỘ SVG CHO BIỂU ĐỒ XU HƯỚNG
  const chartCoordinates = useMemo(() => {
    if (!trendData || trendData.length === 0) return { actualPath: '', expectedPath: '', areaPath: '', points: [] };

    const maxVal = Math.max(...trendData.map((d) => Math.max(d.actual, d.expected)), 1000000) * 1.15;
    const svgWidth = 1000;
    const svgHeight = 220;
    const paddingX = 40;
    const paddingYTop = 30;
    const paddingYBottom = 35;
    const availableWidth = svgWidth - paddingX * 2;
    const availableHeight = svgHeight - paddingYTop - paddingYBottom;
    const baselineY = svgHeight - paddingYBottom;

    const points = trendData.map((item, idx) => {
      const x = paddingX + (idx / Math.max(1, trendData.length - 1)) * availableWidth;
      const yActual = baselineY - (item.actual / maxVal) * availableHeight;
      const yExpected = baselineY - (item.expected / maxVal) * availableHeight;
      return { ...item, x, yActual, yExpected };
    });

    // Đường thực tế (Actual)
    const actualPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yActual.toFixed(1)}`).join(' ');
    // Đường diện tích dưới Thực tế (Area fill)
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const areaPath = `${actualPath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
    // Đường kỳ vọng / nợ đọng (Expected)
    const expectedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yExpected.toFixed(1)}`).join(' ');

    return { actualPath, expectedPath, areaPath, points, baselineY };
  }, [trendData]);

  // 3. THỐNG KÊ CƠ CẤU 4 NHÓM VI PHẠM TRỌNG TÂM
  const violationStats = useMemo(() => {
    const bd = revenueSummary?.breakdown;
    let overdueAmt = 10042500;
    let damageAmt = 2650000;
    let lostAmt = 1212500;
    let cardAmt = 1545000;

    if (Array.isArray(bd) && bd.length > 0) {
      bd.forEach((item) => {
        const name = (item.sourceName || '').toLowerCase();
        if (name.includes('trễ') || name.includes('overdue') || name.includes('quá hạn')) {
          overdueAmt = Number(item.amount || 0);
        } else if (name.includes('hỏng') || name.includes('rách') || name.includes('damage')) {
          damageAmt = Number(item.amount || 0);
        } else if (name.includes('mất') || name.includes('lost')) {
          lostAmt = Number(item.amount || 0);
        } else {
          cardAmt = Number(item.amount || 0);
        }
      });
    }

    const totalViolations = overdueAmt + damageAmt + lostAmt + cardAmt || 1;
    const pOverdue = Math.round((overdueAmt / totalViolations) * 100);
    const pDamage = Math.round((damageAmt / totalViolations) * 100);
    const pLost = Math.round((lostAmt / totalViolations) * 100);
    const pCard = Math.max(0, 100 - pOverdue - pDamage - pLost);

    return [
      {
        id: 'overdue',
        name: 'Phạt trễ hạn trả sách',
        desc: 'Mức phạt 5.000 đ/ngày theo quy chế lưu thông',
        amount: overdueAmt,
        percent: pOverdue,
        casesCount: 38,
        color: '#2563eb',
        tag: 'Phổ biến nhất',
        tagClass: 'tag-blue',
        riskLevel: 'Cần nhắc nhở sớm'
      },
      {
        id: 'damage',
        name: 'Hư hỏng bìa, rách trang, vẽ bẩn',
        desc: 'Bồi hoàn 20% - 50% nguyên giá bìa ấn phẩm',
        amount: damageAmt,
        percent: pDamage,
        casesCount: 9,
        color: '#f59e0b',
        tag: 'Hư tổn vật lý',
        tagClass: 'tag-amber',
        riskLevel: 'Cần kiểm tra kỹ'
      },
      {
        id: 'lost',
        name: 'Làm mất tài liệu thư viện',
        desc: 'Đền bù 100% - 150% giá bìa niêm yết hiện hành',
        amount: lostAmt,
        percent: pLost,
        casesCount: 4,
        color: '#ef4444',
        tag: 'Nghiêm trọng',
        tagClass: 'tag-red',
        riskLevel: 'Cảnh báo học vụ'
      },
      {
        id: 'card',
        name: 'Phí cấp lại thẻ & Vi phạm khác',
        desc: 'Lệ phí in lại thẻ từ, vi phạm nội quy phòng tự học',
        amount: cardAmt,
        percent: pCard,
        casesCount: 12,
        color: '#8b5cf6',
        tag: 'Dịch vụ thẻ',
        tagClass: 'tag-purple',
        riskLevel: 'Hành chính'
      }
    ];
  }, [revenueSummary]);

  // 4. PHƯƠNG THỨC THANH TOÁN (QR vs TIỀN MẶT)
  const paymentStats = useMemo(() => {
    let qrTotal = 0;
    let cashTotal = 0;
    let qrCount = 0;
    let cashCount = 0;

    if (receiptsList && receiptsList.length > 0) {
      receiptsList.forEach((r) => {
        const amt = typeof r.amount === 'number'
          ? r.amount
          : parseInt(String(r.amount || '').replace(/[^0-9]/g, ''), 10) || 0;

        if (r.isQr || (r.method && r.method.toLowerCase().includes('qr')) || (r.method && r.method.toLowerCase().includes('chuyển khoản'))) {
          qrTotal += amt;
          qrCount += 1;
        } else {
          cashTotal += amt;
          cashCount += 1;
        }
      });
    } else {
      qrTotal = 8961000;
      cashTotal = 6489000;
      qrCount = 74;
      cashCount = 54;
    }

    const sum = qrTotal + cashTotal || 1;
    const qrPercent = Math.round((qrTotal / sum) * 100);
    const cashPercent = Math.max(0, 100 - qrPercent);

    return {
      qrTotal,
      cashTotal,
      qrCount,
      cashCount,
      qrPercent,
      cashPercent
    };
  }, [receiptsList]);

  // 5. TOP ĐẦU SÁCH CÓ TỶ LỆ VI PHẠM / QUÁ HẠN CAO NHẤT
  const topViolatedBooks = [
    {
      id: 1,
      title: 'Harry Potter and the Half-Blood Prince (Harry Potter #6)',
      barcode: 'BC000001-B',
      category: 'Tiểu thuyết / Văn học nước ngoài',
      overdueCount: 14,
      damageCount: 2,
      totalFine: '420.000 đ',
      risk: 'Rất cao',
      riskClass: 'risk-pill-high',
      solution: 'Tăng bản sao dự phòng & giảm hạn mượn 14 ngày'
    },
    {
      id: 2,
      title: 'Giáo trình Cấu trúc dữ liệu và Giải thuật',
      barcode: 'BC000002-A',
      category: 'Giáo trình CNTT',
      overdueCount: 11,
      damageCount: 1,
      totalFine: '350.000 đ',
      risk: 'Cao',
      riskClass: 'risk-pill-medium',
      solution: 'Gửi thông báo nhắc nhở tự động trước 3 ngày'
    },
    {
      id: 3,
      title: 'Database Systems: The Complete Book (10th Edition)',
      barcode: 'BC000003-A',
      category: 'Sách chuyên khảo máy tính',
      overdueCount: 8,
      damageCount: 3,
      totalFine: '580.000 đ',
      risk: 'Cao',
      riskClass: 'risk-pill-medium',
      solution: 'Kiểm tra kỹ gáy sách khi tiếp nhận tại quầy'
    },
    {
      id: 4,
      title: 'Lịch sử Triết học Tây Phương (Tập 1 & 2)',
      barcode: 'BC000004-A',
      category: 'Khoa học Xã hội',
      overdueCount: 6,
      damageCount: 0,
      totalFine: '180.000 đ',
      risk: 'Vừa',
      riskClass: 'risk-pill-low',
      solution: 'Cho phép gia hạn thêm 1 lần trực tuyến'
    },
    {
      id: 5,
      title: 'Oxford Advanced Learner\'s Dictionary 10th Edition',
      barcode: 'BC000005-A',
      category: 'Từ điển & Ngoại ngữ',
      overdueCount: 5,
      damageCount: 2,
      totalFine: '290.000 đ',
      risk: 'Vừa',
      riskClass: 'risk-pill-low',
      solution: 'Ưu tiên phục vụ đọc tại chỗ trong phòng đọc'
    }
  ];

  return (
    <div className="revenue-analytics-container">
      {/* ====================================================================
          1. THANH ĐIỀU KHIỂN & BỘ LỌC KHOẢNG THỜI GIAN
          ==================================================================== */}
      <div className="analytics-header-bar">
        <div className="analytics-header-left">
          <div className="analytics-header-icon">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="analytics-header-title">
              Dashboard Biểu đồ Doanh thu Thu phạt & Thống kê Vi phạm
            </h2>
            <p className="analytics-header-desc">
              Theo dõi biến động dòng tiền, tỷ lệ thu hồi nợ phạt và phân tích 4 nhóm vi phạm trọng điểm ({currentMonthLabel})
            </p>
          </div>
        </div>

        <div className="analytics-time-pills">
          <button
            type="button"
            className={`time-pill-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            className={`time-pill-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            className={`time-pill-btn ${timeRange === 'quarter' ? 'active' : ''}`}
            onClick={() => setTimeRange('quarter')}
          >
            Theo quý
          </button>
        </div>
      </div>

      {/* ====================================================================
          2. HÀNG 4 THẺ METRICS CHỈ SỐ TÀI CHÍNH & TỶ LỆ THU HỒI NỢ
          ==================================================================== */}
      <div className="analytics-metrics-grid">
        {/* Thẻ 1: Thực thu lũy kế */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Thực thu ngân sách phạt</span>
            <div className="metric-card-icon metric-icon-blue">
              <ReceiptText size={18} />
            </div>
          </div>
          <div className="metric-card-value">
            {metrics.totalCollected.toLocaleString('vi-VN')} đ
          </div>
          <div className="metric-card-footer">
            <span className="metric-badge-growth">
              <ArrowUpRight size={13} /> +12.4%
            </span>
            <span>Đã lập {metrics.invoicesCount} biên lai</span>
          </div>
        </div>

        {/* Thẻ 2: Tiền phạt nợ đọng tồn đọng */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Dòng tiền phạt nợ đọng</span>
            <div className="metric-card-icon metric-icon-amber">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-card-value" style={{ color: '#d97706' }}>
            {metrics.totalPending.toLocaleString('vi-VN')} đ
          </div>
          <div className="metric-card-footer">
            <span className="metric-badge-warn">
              <Flame size={12} /> {metrics.pendingCount} lượt
            </span>
            <span>Độc giả chưa thanh toán</span>
          </div>
        </div>

        {/* Thẻ 3: Tỷ lệ thu hồi nợ (Recovery Rate) */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Tỷ lệ thu hồi nợ phạt</span>
            <div className="metric-card-icon metric-icon-emerald">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-card-value" style={{ color: '#059669' }}>
            {metrics.recoveryRate}%
          </div>
          <div className="metric-card-footer" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11.5px' }}>
              <span>Tiến độ thu hồi ngân sách</span>
              <strong style={{ color: '#059669' }}>Đạt mục tiêu (&gt;85%)</strong>
            </div>
            <div className="metric-recovery-bar">
              <div
                className="metric-recovery-fill"
                style={{ width: `${Math.min(100, Math.max(0, metrics.recoveryRate))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Thẻ 4: Giá trị thiệt hại sách hư hỏng/mất */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-card-label">Thiệt hại sách hỏng/mất</span>
            <div className="metric-card-icon metric-icon-rose">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="metric-card-value" style={{ color: '#e11d48' }}>
            {metrics.totalDamage.toLocaleString('vi-VN')} đ
          </div>
          <div className="metric-card-footer">
            <span>Cần bồi hoàn & phục chế</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. HÀNG BIỂU ĐỒ KÉP: XU HƯỚNG DOANH THU & PHƯƠNG THỨC THANH TOÁN
          ==================================================================== */}
      <div className="analytics-charts-dual-grid">
        {/* CỘT TRÁI: Biểu đồ xu hướng đa trục (Area & Line SVG) */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">
              <Calendar size={17} style={{ color: '#2563eb' }} />
              <span>Biểu đồ Xu hướng Thu phạt & Dòng tiền Nợ đọng</span>
            </h3>

            <div className="analytics-chart-legend">
              <div
                className={`legend-item ${!showActual ? 'dimmed' : ''}`}
                onClick={() => setShowActual(!showActual)}
                title="Nhấp để ẩn/hiện Thực thu ngân sách"
              >
                <div className="legend-circle-blue"></div>
                <span>Doanh thu thực thu</span>
              </div>

              <div
                className={`legend-item ${!showExpected ? 'dimmed' : ''}`}
                onClick={() => setShowExpected(!showExpected)}
                title="Nhấp để ẩn/hiện Dòng tiền nợ đọng/kỳ vọng"
              >
                <div className="legend-circle-amber"></div>
                <span>Nợ phát sinh / Mục tiêu</span>
              </div>
            </div>
          </div>

          {/* Vùng biểu đồ SVG đa điểm tương tác */}
          <div className="chart-svg-container" onMouseLeave={() => setHoveredPoint(null)}>
            <svg viewBox="0 0 1000 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Lưới gióng ngang trục tung */}
              <line x1="40" y1="35" x2="960" y2="35" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="85" x2="960" y2="85" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="135" x2="960" y2="135" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="185" x2="960" y2="185" stroke="#e2e8f0" strokeWidth="1.2" />

              {/* Vùng đổ bóng Area Fill dưới đường thực thu */}
              {showActual && chartCoordinates.areaPath && (
                <path d={chartCoordinates.areaPath} fill="url(#actualGradient)" />
              )}

              {/* Đường cong thực thu (Màu xanh dương) */}
              {showActual && chartCoordinates.actualPath && (
                <path
                  d={chartCoordinates.actualPath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Đường nét đứt kỳ vọng / nợ đọng (Màu vàng cam) */}
              {showExpected && chartCoordinates.expectedPath && (
                <path
                  d={chartCoordinates.expectedPath}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Điểm neo tương tác & nhãn mốc thời gian */}
              {chartCoordinates.points.map((pt, idx) => (
                <g key={idx}>
                  {/* Đường gióng dọc khi hover */}
                  {hoveredPoint?.date === pt.date && (
                    <line
                      x1={pt.x}
                      y1={35}
                      x2={pt.x}
                      y2={chartCoordinates.baselineY}
                      stroke="#94a3b8"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Điểm neo Thực thu (Xanh) */}
                  {showActual && (
                    <circle
                      cx={pt.x}
                      cy={pt.yActual}
                      r={hoveredPoint?.date === pt.date ? 6 : 4.5}
                      fill="#ffffff"
                      stroke="#2563eb"
                      strokeWidth={hoveredPoint?.date === pt.date ? 3.5 : 2.5}
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                  )}

                  {/* Điểm neo Kỳ vọng (Cam) */}
                  {showExpected && (
                    <circle
                      cx={pt.x}
                      cy={pt.yExpected}
                      r={hoveredPoint?.date === pt.date ? 5 : 3.5}
                      fill="#ffffff"
                      stroke="#f59e0b"
                      strokeWidth="2.2"
                      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                      onMouseEnter={() => setHoveredPoint(pt)}
                    />
                  )}

                  {/* Nhãn mốc thời gian trục hoành */}
                  <text
                    x={pt.x}
                    y={208}
                    fill="#64748b"
                    fontSize="11.5"
                    fontWeight="500"
                    textAnchor={idx === 0 ? 'start' : idx === chartCoordinates.points.length - 1 ? 'end' : 'middle'}
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            {/* Tooltip nổi khi rê chuột vào điểm mốc */}
            {hoveredPoint && (
              <div
                className="chart-tooltip-floating"
                style={{
                  left: `${(hoveredPoint.x / 1000) * 100}%`,
                  top: `${Math.min(hoveredPoint.yActual, hoveredPoint.yExpected)}px`
                }}
              >
                <div className="chart-tooltip-date">Mốc ngày: {hoveredPoint.date}</div>
                <div className="chart-tooltip-row">
                  <span style={{ color: '#93c5fd' }}>● Thực thu:</span>
                  <strong>{hoveredPoint.actual.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="chart-tooltip-row">
                  <span style={{ color: '#fcd34d' }}>● Nợ / Mục tiêu:</span>
                  <strong>{hoveredPoint.expected.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Tỷ lệ phương thức thanh toán (VietQR vs Tiền mặt) */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">
              <QrCode size={17} style={{ color: '#10b981' }} />
              <span>Phương thức Thanh toán</span>
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Tự động đối soát</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px' }}>
            {/* Thanh toán QR VietQR */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
                  <QrCode size={15} style={{ color: '#2563eb' }} />
                  <span>Chuyển khoản QR (VietQR / Napas)</span>
                </span>
                <strong style={{ color: '#2563eb' }}>{paymentStats.qrPercent}%</strong>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${paymentStats.qrPercent}%`,
                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.6s ease'
                  }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11.5px', color: '#64748b' }}>
                <span>{paymentStats.qrTotal.toLocaleString('vi-VN')} đ</span>
                <span>{paymentStats.qrCount} giao dịch</span>
              </div>
            </div>

            {/* Thanh toán Tiền mặt */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '13px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a' }}>
                  <Banknote size={15} style={{ color: '#10b981' }} />
                  <span>Tiền mặt tại quầy lưu thông</span>
                </span>
                <strong style={{ color: '#10b981' }}>{paymentStats.cashPercent}%</strong>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${paymentStats.cashPercent}%`,
                    background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                    borderRadius: '999px',
                    transition: 'width 0.6s ease'
                  }}
                ></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11.5px', color: '#64748b' }}>
                <span>{paymentStats.cashTotal.toLocaleString('vi-VN')} đ</span>
                <span>{paymentStats.cashCount} giao dịch</span>
              </div>
            </div>

            {/* Ghi chú tối ưu ngân sách */}
            <div
              style={{
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#475569',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <Info size={15} style={{ color: '#2563eb', flexShrink: 0, marginTop: '1px' }} />
              <span>
                Thanh toán qua mã VietQR đạt <strong>{paymentStats.qrPercent}%</strong> tổng dòng tiền phạt, giúp thủ thư loại bỏ hoàn toàn rủi ro sai sót kiểm đếm tiền mặt.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. THỐNG KÊ CƠ CẤU 4 LOẠI VI PHẠM TRỌNG ĐIỂM
          ==================================================================== */}
      <div className="violation-section">
        <div className="violation-section-header">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: '#f59e0b' }} />
              <span>Thống Kê Cơ Cấu 4 Nhóm Vi Phạm Quy Chế Thư Viện</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Phân loại nguồn thu phát sinh theo tính chất lỗi vi phạm và tác động học vụ
            </p>
          </div>
        </div>

        {/* Thanh Segmented Bar phân khúc đa màu */}
        <div className="violation-segmented-bar">
          {violationStats.map((item) => (
            <div
              key={item.id}
              className="segmented-bar-item"
              style={{
                width: `${Math.max(4, item.percent)}%`,
                backgroundColor: item.color
              }}
              title={`${item.name}: ${item.percent}% (${item.amount.toLocaleString('vi-VN')} đ)`}
            ></div>
          ))}
        </div>

        {/* Lưới 4 thẻ thống kê chi tiết từng loại vi phạm */}
        <div className="violation-cards-grid">
          {violationStats.map((item) => (
            <div
              key={item.id}
              className="violation-card-item"
              style={{ borderLeftColor: item.color }}
            >
              <div>
                <div className="violation-card-top">
                  <h4 className="violation-card-title">{item.name}</h4>
                  <span className={`violation-card-tag ${item.tagClass}`}>{item.tag}</span>
                </div>
                <div className="violation-card-amount">
                  {item.amount.toLocaleString('vi-VN')} đ
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                  {item.desc}
                </div>
              </div>

              <div className="violation-card-detail">
                <span>
                  <strong>{item.casesCount}</strong> vụ việc ({item.percent}%)
                </span>
                <span style={{ color: item.color, fontWeight: 600 }}>{item.riskLevel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================================
          5. BẢNG XẾP HẠNG TOP ĐẦU SÁCH CÓ TỶ LỆ VI PHẠM CAO NHẤT
          ==================================================================== */}
      <div className="top-books-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} style={{ color: '#2563eb' }} />
              <span>Top Đầu Sách Thường Xuyên Vi Phạm (Trễ hạn / Hư hỏng)</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Cảnh báo danh mục tài liệu có rủi ro hao mòn cao để thủ thư lưu ý khi xử lý mượn/trả
            </p>
          </div>
        </div>

        <div className="top-books-table-wrapper">
          <table className="top-books-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>Hạng</th>
                <th>Tên đầu sách & Phân loại</th>
                <th>Mã Barcode</th>
                <th style={{ textAlign: 'center' }}>Lượt trễ hạn</th>
                <th style={{ textAlign: 'center' }}>Hư hỏng</th>
                <th>Tiền phạt phát sinh</th>
                <th>Mức độ</th>
                <th>Đề xuất giải pháp thư viện</th>
              </tr>
            </thead>
            <tbody>
              {topViolatedBooks.map((book) => (
                <tr key={book.id}>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`rank-badge ${book.id === 1 ? 'rank-1' : book.id === 2 ? 'rank-2' : book.id === 3 ? 'rank-3' : 'rank-default'}`}>
                      {book.id}
                    </span>
                  </td>
                  <td>
                    <div className="book-title-cell">{book.title}</div>
                    <span className="book-category-tag">{book.category}</span>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {book.barcode}
                    </code>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                    {book.overdueCount} lần
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: book.damageCount > 0 ? '#d97706' : '#64748b' }}>
                    {book.damageCount} cuốn
                  </td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>
                    {book.totalFine}
                  </td>
                  <td>
                    <span className={`risk-pill ${book.riskClass}`}>
                      ● {book.risk}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#475569' }}>
                    {book.solution}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
