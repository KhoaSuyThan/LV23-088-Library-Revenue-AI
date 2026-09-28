import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  ReceiptText,
  Bell,
  Search,
  Filter,
  Download,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Send,
  Eye,
  CreditCard,
  Banknote,
  Printer,
  ChevronRight,
  BookOpen,
  User,
  Clock,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import './FineRevenue.css';

/**
 * Dữ liệu độc giả nguy cơ trễ hạn cao (AI phân tích)
 * Khớp 100% Mockup Figma thiết kế của SmartLib AI
 */
const INITIAL_AI_READERS = [
  {
    id: 'PM-9920',
    name: 'Nguyễn Văn Minh',
    studentCode: '102220184',
    department: 'Khoa Công Nghệ Thông Tin',
    bookTitle: 'Nhập môn Machine Learning',
    bookCode: 'BC000001-A',
    dueDate: '25/09/2026',
    score: 92,
    scoreColor: '#ef4444',
    riskLevel: 'very_high',
    riskLabel: 'Nguy cơ rất cao',
    factors: [
      { label: 'Lịch sử trả sách trễ hạn 3/4 lần trước', weight: '+40%' },
      { label: 'Trùng lịch thi học phần cuối kỳ', weight: '+27%' },
      { label: 'Đang mượn cùng lúc 3 cuốn sách', weight: '+25%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9842',
    name: 'Trần Thị Hồng Hạnh',
    studentCode: '102210103',
    department: 'Khoa Điện Tử Viễn Thông',
    bookTitle: 'Giáo trình Cấu trúc dữ liệu',
    bookCode: 'BC000002-A',
    dueDate: '26/09/2026',
    score: 78,
    scoreColor: '#f97316',
    riskLevel: 'high',
    riskLabel: 'Nguy cơ cao',
    factors: [
      { label: 'Có 1 lần trễ hạn kỳ trước', weight: '+35%' },
      { label: 'Khoảng cách địa lý sinh viên xa trường', weight: '+23%' },
      { label: 'Thời gian mượn đã kéo dài 20 ngày', weight: '+20%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9811',
    name: 'Lê Hoàng Nam',
    studentCode: '102220455',
    department: 'Khoa Quản Trị Kinh Doanh',
    bookTitle: 'Database Systems 10th Ed',
    bookCode: 'BC000003-A',
    dueDate: '28/09/2026',
    score: 55,
    scoreColor: '#f59e0b',
    riskLevel: 'medium',
    riskLabel: 'Nguy cơ trung bình',
    factors: [
      { label: 'Chưa từng trễ hạn nhưng mượn sách chuyên khảo dày', weight: '+30%' },
      { label: 'Tần suất đến thư viện giảm 40%', weight: '+25%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9799',
    name: 'Phạm Minh Đức',
    studentCode: '102200234',
    department: 'Khoa Luật & Hành Chính',
    bookTitle: 'Lịch sử Triết học Tây Phương',
    bookCode: 'BC000004-A',
    dueDate: '29/09/2026',
    score: 34,
    scoreColor: '#3b82f6',
    riskLevel: 'low',
    riskLabel: 'Nguy cơ thấp',
    factors: [
      { label: 'Lịch sử trả sách uy tín đúng hạn 100%', weight: '-40%' },
      { label: 'Điểm tín nhiệm bạn đọc xuất sắc (98/100)', weight: '-26%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9780',
    name: 'Vũ Thị Mai',
    studentCode: '102230198',
    department: 'Khoa Ngoại Ngữ Ứng Dụng',
    bookTitle: 'Trí Tuệ Nhân Tạo Hiện Đại',
    bookCode: 'BC000005-B',
    dueDate: '24/09/2026',
    score: 86,
    scoreColor: '#ef4444',
    riskLevel: 'very_high',
    riskLabel: 'Nguy cơ rất cao',
    factors: [
      { label: 'Quá hạn 1 ngày chưa đến trả sách', weight: '+55%' },
      { label: 'Chưa phản hồi email thông báo trước đó', weight: '+31%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  },
  {
    id: 'PM-9765',
    name: 'Đỗ Hoàng Quân',
    studentCode: '102210512',
    department: 'Khoa Kinh Tế Số',
    bookTitle: 'Hệ Thống Phân Tán Thực Hành',
    bookCode: 'BC000006-A',
    dueDate: '27/09/2026',
    score: 65,
    scoreColor: '#f97316',
    riskLevel: 'high',
    riskLabel: 'Nguy cơ cao',
    factors: [
      { label: 'Thời gian giữ sách vượt 85% hạn mức quy định', weight: '+40%' },
      { label: 'Sinh viên năm cuối chuẩn bị bảo vệ đề án', weight: '+25%' }
    ],
    reminderSent: false,
    estimatedDailyFine: '5.000 đ/ngày'
  }
];

/**
 * Dữ liệu các điểm trên đồ thị 30 ngày tới
 */
const CHART_POINTS = [
  { date: '01/09', expected: '3.200.000 đ', aiPredicted: '3.200.000 đ', x: 30, yExp: 195, yAi: 195 },
  { date: '05/09', expected: '2.100.000 đ', aiPredicted: '5.400.000 đ', x: 180, yExp: 215, yAi: 165 },
  { date: '10/09', expected: '6.800.000 đ', aiPredicted: '8.900.000 đ', x: 340, yExp: 175, yAi: 145 },
  { date: '15/09', expected: '5.200.000 đ', aiPredicted: '7.100.000 đ', x: 500, yExp: 185, yAi: 155 },
  { date: '20/09', expected: '9.400.000 đ', aiPredicted: '11.800.000 đ', x: 660, yExp: 145, yAi: 120 },
  { date: '25/09', expected: '12.600.000 đ', aiPredicted: '11.100.000 đ', x: 810, yExp: 130, yAi: 135 },
  { date: '30/09 [Dự báo]', expected: '15.450.000 đ', aiPredicted: '16.800.000 đ', x: 970, yExp: 110, yAi: 105 }
];

/**
 * Danh sách biên lai đã thu (cho Tab Biên lai)
 */
const RECENT_RECEIPTS = [
  {
    code: 'BL-2026-0891',
    date: '28/09/2026 14:15',
    reader: 'Nguyễn Văn Minh (102220184)',
    type: 'Phạt trễ hạn 5 ngày',
    amount: '25.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0890',
    date: '28/09/2026 11:20',
    reader: 'Lê Thị Khánh Huyền (102230045)',
    type: 'Bồi hoàn rách trang sách BC000002-A',
    amount: '20.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Nguyễn Văn A'
  },
  {
    code: 'BL-2026-0889',
    date: '27/09/2026 16:40',
    reader: 'Phan Hoàng Long (102220412)',
    type: 'Cấp lại thẻ thư viện bị mất',
    amount: '50.000 đ',
    method: 'QR VietQR',
    isQr: true,
    cashier: 'Thủ thư Trần Văn B'
  },
  {
    code: 'BL-2026-0888',
    date: '27/09/2026 09:30',
    reader: 'Trần Văn Tùng (102210882)',
    type: 'Đền bù làm mất sách Deep Learning',
    amount: '240.000 đ',
    method: 'Tiền mặt',
    isQr: false,
    cashier: 'Thủ thư Nguyễn Văn A'
  }
];

export default function FineRevenue({ user, externalSearch = '' }) {
  // Quản lý tab nội bộ phân hệ Thu phạt
  const [subTab, setSubTab] = useState('ai_forecast'); // 'ai_forecast' | 'arrears' | 'receipts' | 'breakdown'

  // Dữ liệu danh sách độc giả nguy cơ
  const [readers, setReaders] = useState(INITIAL_AI_READERS);

  // Bộ lọc mức độ nguy cơ
  const [filterRisk, setFilterRisk] = useState('all'); // 'all' | 'very_high' | 'high' | 'medium'

  // Hover trên đồ thị SVG
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null);

  // Hiển thị/ẩn đường trên biểu đồ
  const [showExpected, setShowExpected] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);

  // Modal Chi tiết phân tích AI
  const [selectedReader, setSelectedReader] = useState(null);

  // Modal Gửi nhắc nhở
  const [remindReader, setRemindReader] = useState(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Thông báo Toast thành công
  const [toastMessage, setToastMessage] = useState('');

  // Hiện toast tạm thời
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Lọc danh sách độc giả theo từ khóa & mức độ rủi ro
  const filteredReaders = useMemo(() => {
    const q = (externalSearch || '').toLowerCase().trim();
    return readers.filter((r) => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.bookTitle.toLowerCase().includes(q);

      const matchRisk =
        filterRisk === 'all'
          ? true
          : filterRisk === 'very_high'
          ? r.score >= 80
          : filterRisk === 'high'
          ? r.score >= 50 && r.score < 80
          : r.score < 50;

      return matchSearch && matchRisk;
    });
  }, [readers, externalSearch, filterRisk]);

  // Xử lý gửi nhắc nhở đơn lẻ
  const handleConfirmSendReminder = () => {
    if (!remindReader) return;
    setIsSendingReminder(true);

    setTimeout(() => {
      setReaders((prev) =>
        prev.map((item) =>
          item.id === remindReader.id ? { ...item, reminderSent: true } : item
        )
      );
      setIsSendingReminder(false);
      triggerToast(
        `Đã gửi thành công thông báo nhắc nhở đến độc giả ${remindReader.name} (${remindReader.studentCode}) qua Email & Zalo!`
      );
      setRemindReader(null);
    }, 700);
  };

  // Xử lý gửi nhắc nhở hàng loạt cho tất cả độc giả nguy cơ cao
  const handleBatchRemind = () => {
    const count = filteredReaders.filter((r) => !r.reminderSent).length;
    if (count === 0) {
      triggerToast('Tất cả độc giả trong danh sách đã được gửi nhắc nhở trước đó!');
      return;
    }

    setReaders((prev) =>
      prev.map((r) => ({
        ...r,
        reminderSent: true
      }))
    );
    triggerToast(
      `Đã phát lệnh gửi nhắc nhở hàng loạt thành công cho ${count} độc giả có nguy cơ trễ hạn!`
    );
  };

  // Xuất file báo cáo thống kê Excel giả lập
  const handleExportExcel = () => {
    triggerToast('Đang kết xuất tệp Báo_Cáo_Thu_Phạt_SmartLib_09_2026.xlsx thành công!');
  };

  return (
    <div className="fine-revenue-container">
      {/* ----------------------------------------------------------------------
          1. NAVIGATION SUB-TABS & THANH ĐIỀU HƯỚNG TỔNG
          ---------------------------------------------------------------------- */}
      <div className="fine-revenue-toolbar">
        <div className="fine-revenue-tabs">
          <button
            className={`fine-tab-btn ${subTab === 'ai_forecast' ? 'active' : ''}`}
            onClick={() => setSubTab('ai_forecast')}
          >
            <Sparkles size={16} />
            <span>AI Dự báo & Xu hướng</span>
            <span className="fine-tab-badge">Mặc định</span>
          </button>

          <button
            className={`fine-tab-btn ${subTab === 'arrears' ? 'active' : ''}`}
            onClick={() => setSubTab('arrears')}
          >
            <AlertTriangle size={15} />
            <span>Sổ nợ đọng & Sách hư hỏng</span>
            <span className="fine-tab-badge">47</span>
          </button>

          <button
            className={`fine-tab-btn ${subTab === 'receipts' ? 'active' : ''}`}
            onClick={() => setSubTab('receipts')}
          >
            <ReceiptText size={15} />
            <span>Biên lai đã thu</span>
            <span className="fine-tab-badge">15.45M</span>
          </button>

          <button
            className={`fine-tab-btn ${subTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => setSubTab('breakdown')}
          >
            <TrendingUp size={15} />
            <span>Cơ cấu doanh thu</span>
          </button>
        </div>

        <div className="fine-toolbar-actions">
          <button className="btn-secondary-action" onClick={handleExportExcel} type="button">
            <Download size={15} />
            <span>Xuất file Excel</span>
          </button>

          <button
            className="btn-primary-action"
            onClick={handleBatchRemind}
            type="button"
            title="Gửi email & Zalo cảnh báo tự động cho độc giả có nguy cơ cao"
          >
            <Bell size={15} />
            <span>Gửi nhắc nhở hàng loạt</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          2. HÀNG 3 THẺ CHỈ SỐ STAT CARDS (Khớp 100% Mockup Figma)
          ---------------------------------------------------------------------- */}
      <div className="revenue-kpi-grid">
        {/* Thẻ 1: Tổng tiền phạt đã thu */}
        <div
          className="revenue-kpi-card"
          onClick={() => setSubTab('receipts')}
          style={{ cursor: 'pointer' }}
          title="Nhấp để xem chi tiết danh sách biên lai"
        >
          <div className="revenue-kpi-top">
            <h3 className="revenue-kpi-title">Tổng tiền phạt đã thu</h3>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-blue">
              <ReceiptText size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="revenue-kpi-value">15.450.000 đ</div>
          <div className="revenue-kpi-footer">
            <span className="revenue-growth-badge">
              <ArrowUpRight size={12} strokeWidth={3} />
              +12%
            </span>
            <span className="revenue-kpi-subtext">so với tháng trước</span>
          </div>
        </div>

        {/* Thẻ 2: Tiền phạt chưa thu / nợ đọng */}
        <div
          className="revenue-kpi-card"
          onClick={() => setSubTab('arrears')}
          style={{ cursor: 'pointer' }}
          title="Nhấp để xem 47 trường hợp mượn quá hạn"
        >
          <div className="revenue-kpi-top">
            <h3 className="revenue-kpi-title">Tiền phạt chưa thu / nợ đọng</h3>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-yellow">
              <AlertTriangle size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="revenue-kpi-value">2.150.000 đ</div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">47 lượt mượn quá hạn</span>
          </div>
        </div>

        {/* Thẻ 3: Tổng giá trị sách bị mất/hư hỏng */}
        <div
          className="revenue-kpi-card"
          onClick={() => setSubTab('arrears')}
          style={{ cursor: 'pointer' }}
          title="Nhấp để xem 12 ca bồi thường sách"
        >
          <div className="revenue-kpi-top">
            <h3 className="revenue-kpi-title">Tổng giá trị sách bị mất/hư hỏng</h3>
            <div className="revenue-kpi-icon-box revenue-kpi-icon-red">
              <GraduationCap size={20} strokeWidth={2.2} />
            </div>
          </div>
          <div className="revenue-kpi-value">3.800.000 đ</div>
          <div className="revenue-kpi-footer">
            <span className="revenue-kpi-subtext">12 trường hợp cần xử lý</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          3. NỘI DUNG CHÍNH THEO CÁC SUB-TAB
          ---------------------------------------------------------------------- */}
      {subTab === 'ai_forecast' && (
        <>
          {/* ==================================================================
              A. BIỂU ĐỒ THU PHẠT & XU HƯỚNG TRỄ HẠN 30 NGÀY TỚI (FULL-WIDTH)
              ================================================================== */}
          <div className="revenue-chart-card">
            <div className="revenue-chart-header">
              <h3 className="revenue-chart-title">
                <span>Biểu đồ Thu phạt & Xu hướng Trễ hạn 30 ngày tới</span>
              </h3>

              <div className="revenue-chart-right">
                <div className="revenue-legend-group">
                  <div
                    className={`revenue-legend-item ${!showExpected ? 'dimmed' : ''}`}
                    onClick={() => setShowExpected(!showExpected)}
                    title="Nhấp để ẩn/hiện Doanh thu kỳ vọng"
                  >
                    <div className="legend-dot-blue"></div>
                    <span>Doanh thu kỳ vọng</span>
                  </div>

                  <div
                    className={`revenue-legend-item ${!showPredicted ? 'dimmed' : ''}`}
                    onClick={() => setShowPredicted(!showPredicted)}
                    title="Nhấp để ẩn/hiện AI dự báo"
                  >
                    <div className="legend-dot-red"></div>
                    <span>AI dự báo</span>
                  </div>
                </div>

                <div className="revenue-chart-controls">
                  <button className="btn-chart-range active" type="button">
                    30 ngày
                  </button>
                  <button className="btn-chart-range" type="button">
                    Theo quý
                  </button>
                </div>
              </div>
            </div>

            {/* Vùng đồ thị SVG tương tác */}
            <div className="revenue-svg-wrapper">
              <svg
                className="revenue-svg-chart"
                viewBox="0 0 1000 240"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Gradient xanh mềm */}
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>

                  {/* Gradient đỏ mềm */}
                  <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Các đường gióng ngang mờ */}
                <line x1="30" y1="40" x2="970" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="90" x2="970" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="140" x2="970" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="30" y1="190" x2="970" y2="190" stroke="#e2e8f0" strokeWidth="1" />

                {/* Vùng diện tích mờ dưới đường xanh */}
                {showExpected && (
                  <polygon
                    points="30,195 180,215 340,175 500,185 660,145 810,130 970,110 970,190 30,190"
                    fill="url(#blueGradient)"
                  />
                )}

                {/* Vùng diện tích mờ dưới đường đỏ */}
                {showPredicted && (
                  <polygon
                    points="30,195 180,165 340,145 500,155 660,120 810,135 970,105 970,190 30,190"
                    fill="url(#redGradient)"
                  />
                )}

                {/* Đường xanh: Doanh thu kỳ vọng */}
                {showExpected && (
                  <path
                    d="M 30 195 
                       L 180 215 
                       L 340 175 
                       L 500 185 
                       L 660 145 
                       L 810 130 
                       L 970 110"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Đường đỏ: AI dự báo */}
                {showPredicted && (
                  <path
                    d="M 30 195 
                       L 180 165 
                       L 340 145 
                       L 500 155 
                       L 660 120 
                       L 810 135 
                       L 970 105"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Các điểm neo tương tác trên đồ thị */}
                {CHART_POINTS.map((pt, idx) => (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Cột dọc nhận hover vô hình */}
                    <rect
                      x={pt.x - 30}
                      y="20"
                      width="60"
                      height="180"
                      fill="transparent"
                    />

                    {/* Vạch gióng đứng khi hover */}
                    {hoveredPointIndex === idx && (
                      <line
                        x1={pt.x}
                        y1="30"
                        x2={pt.x}
                        y2="190"
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        strokeWidth="1.2"
                      />
                    )}

                    {/* Điểm tròn xanh */}
                    {showExpected && (
                      <circle
                        cx={pt.x}
                        cy={pt.yExp}
                        r={hoveredPointIndex === idx ? 6 : 4}
                        fill="#ffffff"
                        stroke="#3b82f6"
                        strokeWidth={hoveredPointIndex === idx ? 3 : 2}
                      />
                    )}

                    {/* Điểm tròn đỏ */}
                    {showPredicted && (
                      <circle
                        cx={pt.x}
                        cy={pt.yAi}
                        r={hoveredPointIndex === idx ? 6 : 4}
                        fill="#ffffff"
                        stroke="#ef4444"
                        strokeWidth={hoveredPointIndex === idx ? 3 : 2}
                      />
                    )}

                    {/* Nhãn trục hoành */}
                    <text
                      x={pt.x}
                      y="218"
                      fill={hoveredPointIndex === idx ? '#0f172a' : '#94a3b8'}
                      fontWeight={hoveredPointIndex === idx ? '700' : '500'}
                      fontSize="12.5"
                      textAnchor={
                        idx === 0
                          ? 'start'
                          : idx === CHART_POINTS.length - 1
                          ? 'end'
                          : 'middle'
                      }
                    >
                      {pt.date}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Floating Tooltip khi người dùng di chuột */}
              {hoveredPointIndex !== null && (
                <div
                  className="chart-tooltip-box"
                  style={{
                    left: `${(CHART_POINTS[hoveredPointIndex].x / 1000) * 100}%`
                  }}
                >
                  <div className="chart-tooltip-date">
                    Mốc thời gian: {CHART_POINTS[hoveredPointIndex].date}
                  </div>
                  <div className="chart-tooltip-row">
                    <span style={{ color: '#93c5fd' }}>● Doanh thu kỳ vọng:</span>
                    <strong>{CHART_POINTS[hoveredPointIndex].expected}</strong>
                  </div>
                  <div className="chart-tooltip-row">
                    <span style={{ color: '#fca5a5' }}>● AI dự báo trễ hạn:</span>
                    <strong>{CHART_POINTS[hoveredPointIndex].aiPredicted}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==================================================================
              B. BẢNG DANH SÁCH ĐỘC GIẢ CÓ NGUY CƠ TRỄ HẠN CAO (AI PHÂN TÍCH)
              ================================================================== */}
          <div className="revenue-table-card">
            <div className="revenue-table-header">
              <div className="revenue-table-title-group">
                <h3 className="revenue-table-title">
                  Danh sách độc giả có nguy cơ trễ hạn cao (AI phân tích)
                </h3>
                <span className="ai-engine-chip">
                  <Sparkles size={13} />
                  <span>XGBoost & Random Forest v2.4 (Độ chính xác: 91.8%)</span>
                </span>
              </div>

              <div className="revenue-table-actions">
                {/* Lọc theo mức độ rủi ro */}
                <div className="filter-pills">
                  <button
                    className={`filter-pill-btn ${filterRisk === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterRisk('all')}
                  >
                    Tất cả ({readers.length})
                  </button>
                  <button
                    className={`filter-pill-btn ${filterRisk === 'very_high' ? 'active' : ''}`}
                    onClick={() => setFilterRisk('very_high')}
                  >
                    Nguy cơ rất cao (≥80%)
                  </button>
                  <button
                    className={`filter-pill-btn ${filterRisk === 'high' ? 'active' : ''}`}
                    onClick={() => setFilterRisk('high')}
                  >
                    Nguy cơ cao (50-79%)
                  </button>
                  <button
                    className={`filter-pill-btn ${filterRisk === 'medium' ? 'active' : ''}`}
                    onClick={() => setFilterRisk('medium')}
                  >
                    Nguy cơ thấp (&lt;50%)
                  </button>
                </div>
              </div>
            </div>

            {/* Bảng dữ liệu tương tác */}
            <div style={{ overflowX: 'auto' }}>
              <table className="revenue-table">
                <thead>
                  <tr>
                    <th>Mã phiếu mượn</th>
                    <th>Họ tên độc giả (MSSV)</th>
                    <th>Tên sách đang mượn</th>
                    <th>Hạn trả sách</th>
                    <th>Xác suất trễ (AI Score)</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReaders.map((row) => (
                    <tr key={row.id}>
                      {/* Mã phiếu mượn */}
                      <td>
                        <span
                          className="borrow-code-cell"
                          onClick={() => setSelectedReader(row)}
                          title="Nhấp để xem chi tiết phiếu & phân tích AI"
                        >
                          {row.id}
                        </span>
                      </td>

                      {/* Họ tên độc giả */}
                      <td>
                        <div className="reader-cell-main">
                          <span className="reader-cell-name">
                            {row.name}{' '}
                            <span className="reader-cell-code">({row.studentCode})</span>
                          </span>
                        </div>
                      </td>

                      {/* Tên sách đang mượn */}
                      <td>
                        <div className="book-title-cell" title={row.bookTitle}>
                          {row.bookTitle}
                        </div>
                      </td>

                      {/* Hạn trả sách */}
                      <td>
                        <span className="due-date-cell">{row.dueDate}</span>
                      </td>

                      {/* Xác suất trễ (AI Score) */}
                      <td>
                        <div className="ai-score-cell">
                          <div className="ai-score-bar-bg">
                            <div
                              className="ai-score-bar-fill"
                              style={{
                                width: `${row.score}%`,
                                backgroundColor: row.scoreColor
                              }}
                            ></div>
                          </div>
                          <span
                            className="ai-score-value"
                            style={{ color: row.scoreColor }}
                          >
                            {row.score}%
                          </span>
                        </div>
                      </td>

                      {/* Nút thao tác: Gửi nhắc nhở */}
                      <td style={{ textAlign: 'center' }}>
                        {row.reminderSent ? (
                          <span className="btn-send-reminder sent">
                            <CheckCircle2 size={13} />
                            <span>Đã gửi nhắc nhở</span>
                          </span>
                        ) : (
                          <button
                            className="btn-send-reminder"
                            type="button"
                            onClick={() => setRemindReader(row)}
                            title="Gửi email và thông báo Zalo cảnh báo sắp đến hạn"
                          >
                            <Bell size={13} />
                            <span>Gửi nhắc nhở</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredReaders.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                        <div style={{ color: '#64748b' }}>
                          Không tìm thấy độc giả nào phù hợp với bộ lọc hiện tại.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ----------------------------------------------------------------------
          TAB PHỤ: SỔ NỢ ĐỌNG & XỬ LÝ SÁCH HƯ HỎNG (47 LƯỢT QUÁ HẠN)
          ---------------------------------------------------------------------- */}
      {subTab === 'arrears' && (
        <div className="arrears-grid">
          <div className="arrears-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
              Danh sách 47 trường hợp quá hạn & nợ phạt tích lũy
            </h3>
            <div className="arrears-list">
              {[
                {
                  code: 'PM-9920',
                  name: 'Nguyễn Văn Minh (102220184)',
                  book: 'Nhập môn Machine Learning',
                  overdueDays: 5,
                  fee: '25.000 đ'
                },
                {
                  code: 'PM-9915',
                  name: 'Đặng Tuấn Anh (102210443)',
                  book: 'Giải tích 2 Nâng cao',
                  overdueDays: 14,
                  fee: '70.000 đ'
                },
                {
                  code: 'PM-9908',
                  name: 'Lê Thùy Dung (102220912)',
                  book: 'Xác suất Thống kê ứng dụng',
                  overdueDays: 8,
                  fee: '40.000 đ'
                },
                {
                  code: 'PM-9892',
                  name: 'Hoàng Minh Quân (102230556)',
                  book: 'Kiến trúc máy tính hiện đại',
                  overdueDays: 22,
                  fee: '110.000 đ'
                }
              ].map((item, idx) => (
                <div key={idx} className="arrears-item">
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '3px' }}>
                      Sách: {item.book} • Mã phiếu: <strong>{item.code}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '15px' }}>
                      {item.fee}
                    </div>
                    <div style={{ fontSize: '12px', color: '#dc2626' }}>
                      Quá hạn {item.overdueDays} ngày
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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
      )}

      {/* ----------------------------------------------------------------------
          TAB PHỤ: LỊCH SỬ BIÊN LAI ĐÃ THU (15.450.000 Đ)
          ---------------------------------------------------------------------- */}
      {subTab === 'receipts' && (
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
              onClick={() => triggerToast('Đang kết xuất tất cả biên lai sang file PDF...')}
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
                </tr>
              </thead>
              <tbody>
                {RECENT_RECEIPTS.map((r, idx) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          TAB PHỤ: CƠ CẤU DOANH THU & NGUỒN THU
          ---------------------------------------------------------------------- */}
      {subTab === 'breakdown' && (
        <div className="arrears-grid">
          <div className="arrears-card">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f172a' }}>
              Phân bổ dòng tiền thu phạt Tháng 09/2026
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
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
              ].map((item, idx) => (
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
      )}

      {/* ----------------------------------------------------------------------
          MODAL 1: CHI TIẾT PHÂN TÍCH NGUY CƠ AI CỦA ĐỘC GIẢ
          ---------------------------------------------------------------------- */}
      {selectedReader && (
        <div className="fine-modal-overlay" onClick={() => setSelectedReader(null)}>
          <div className="fine-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fine-modal-header">
              <h3 className="fine-modal-title">
                <Sparkles size={18} color="#2563eb" />
                <span>Chi tiết Phiếu mượn & AI Phân tích rủi ro</span>
              </h3>
              <button
                className="fine-modal-close"
                onClick={() => setSelectedReader(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fine-modal-body">
              {/* Thẻ tóm tắt thông tin */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Độc giả (MSSV)</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {selectedReader.name} ({selectedReader.studentCode})
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '2px' }}>
                    {selectedReader.department}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Phiếu mượn & Hạn trả</div>
                  <div style={{ fontWeight: 700, color: '#2563eb' }}>
                    {selectedReader.id}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#ef4444', fontWeight: 600 }}>
                    Hạn: {selectedReader.dueDate}
                  </div>
                </div>
              </div>

              {/* Sách đang mượn */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Tác phẩm đang giữ:
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px'
                  }}
                >
                  <BookOpen size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      {selectedReader.bookTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Mã bản sao: {selectedReader.bookCode} • Đơn giá phạt: {selectedReader.estimatedDailyFine}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trọng số phân tích AI (Feature Importance) */}
              <div className="ai-factors-box">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                    Yếu tố AI đánh giá ({selectedReader.score}% nguy cơ trễ hạn)
                  </span>
                  <span
                    style={{
                      backgroundColor: selectedReader.scoreColor,
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}
                  >
                    {selectedReader.riskLabel}
                  </span>
                </div>

                {selectedReader.factors.map((factor, idx) => (
                  <div key={idx} className="ai-factor-item">
                    <span style={{ color: '#475569' }}>{factor.label}</span>
                    <strong style={{ color: '#ef4444' }}>{factor.weight}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="fine-modal-footer">
              <button
                className="btn-secondary-action"
                onClick={() => setSelectedReader(null)}
                type="button"
              >
                Đóng
              </button>

              <button
                className="btn-primary-action"
                type="button"
                onClick={() => {
                  const target = selectedReader;
                  setSelectedReader(null);
                  setRemindReader(target);
                }}
              >
                <Bell size={14} />
                <span>Gửi thông báo nhắc nhở ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL 2: GỬI NHẮC NHỞ TRỄ HẠN CHO ĐỘC GIẢ
          ---------------------------------------------------------------------- */}
      {remindReader && (
        <div className="fine-modal-overlay" onClick={() => setRemindReader(null)}>
          <div className="fine-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fine-modal-header">
              <h3 className="fine-modal-title">
                <Bell size={18} color="#ef4444" />
                <span>Gửi nhắc nhở hạn trả sách</span>
              </h3>
              <button
                className="fine-modal-close"
                onClick={() => setRemindReader(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="fine-modal-body">
              <div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: '#475569' }}>
                  Hệ thống sẽ gửi thông báo cảnh báo sớm đến độc giả qua các kênh liên lạc sau:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>
                      Email sinh viên: <strong>{remindReader.studentCode}@sv.edu.vn</strong>
                    </span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>Tin nhắn Zalo ZNS (Số điện thoại đã xác thực bạn đọc)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      color: '#0f172a'
                    }}
                  >
                    <input type="checkbox" defaultChecked />
                    <span>Thông báo đẩy trên Ứng dụng Thư Viện SmartLib Mobile</span>
                  </label>
                </div>
              </div>

              {/* Nội dung thông báo mẫu */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155'
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  [Bản xem trước tin nhắn gửi đi]
                </div>
                Thư viện trường Đại học thông báo: Bạn <strong>{remindReader.name}</strong> đang mượn cuốn sách{' '}
                <strong>"{remindReader.bookTitle}"</strong> (Phiếu mượn: {remindReader.id}). Hạn hoàn trả sách là ngày{' '}
                <strong style={{ color: '#ef4444' }}>{remindReader.dueDate}</strong>. Vui lòng mang sách đến quầy trả sách đúng hạn hoặc thực hiện gia hạn trực tuyến để tránh phát sinh phí phạt {remindReader.estimatedDailyFine}!
              </div>
            </div>

            <div className="fine-modal-footer">
              <button
                className="btn-secondary-action"
                onClick={() => setRemindReader(null)}
                disabled={isSendingReminder}
                type="button"
              >
                Hủy bỏ
              </button>

              <button
                className="btn-primary-action"
                onClick={handleConfirmSendReminder}
                disabled={isSendingReminder}
                type="button"
              >
                {isSendingReminder ? (
                  <span>Đang phát thông báo...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Xác nhận gửi nhắc nhở</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          TOAST THÔNG BÁO TÁC VỤ THÀNH CÔNG
          ---------------------------------------------------------------------- */}
      {toastMessage && (
        <div className="fine-toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
