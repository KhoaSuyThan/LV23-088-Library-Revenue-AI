import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Bell,
  CheckCircle2
} from 'lucide-react';
import TablePagination from '../common/TablePagination';

/**
 * Các điểm dữ liệu mốc thời gian trên đồ thị SVG 30 ngày (Figma chuẩn)
 */
const CHART_POINTS = [
  { x: 30, yExp: 195, yAi: 195, date: '01/09', expected: '1.200.000 đ', aiPredicted: '1.200.000 đ' },
  { x: 180, yExp: 215, yAi: 165, date: '05/09', expected: '850.000 đ', aiPredicted: '2.400.000 đ' },
  { x: 340, yExp: 175, yAi: 145, date: '10/09', expected: '2.100.000 đ', aiPredicted: '3.600.000 đ' },
  { x: 500, yExp: 185, yAi: 155, date: '15/09', expected: '1.800.000 đ', aiPredicted: '3.100.000 đ' },
  { x: 660, yExp: 145, yAi: 120, date: '20/09', expected: '3.900.000 đ', aiPredicted: '5.200.000 đ' },
  { x: 810, yExp: 130, yAi: 135, date: '25/09', expected: '4.600.000 đ', aiPredicted: '4.400.000 đ' },
  { x: 970, yExp: 110, yAi: 105, date: '30/09 [Dự báo]', expected: '5.800.000 đ', aiPredicted: '6.200.000 đ' }
];

/**
 * Component Tab 1: AI Dự báo & Xu hướng Trễ hạn (Default Tab)
 */
export default function RevenueAiForecastTab({
  readers = [],
  filteredReaders = [],
  filterRisk = 'all',
  setFilterRisk,
  showExpected = true,
  setShowExpected,
  showPredicted = true,
  setShowPredicted,
  hoveredPointIndex = null,
  setHoveredPointIndex,
  onSelectReader,
  onRemindReader
}) {
  // Phân trang danh sách độc giả nguy cơ (Chuẩn mẫu BookCatalog)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5); // Hỗ trợ 5, 10, 20 / trang (mặc định: 5)

  // Tự động quay về trang 1 khi thay đổi bộ lọc mức độ rủi ro
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRisk]);

  // Cắt lát dữ liệu theo trang hiện tại
  const paginatedReaders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReaders.slice(startIndex, startIndex + pageSize);
  }, [filteredReaders, currentPage, pageSize]);
  return (
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
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>

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
                <rect
                  x={pt.x - 30}
                  y="20"
                  width="60"
                  height="180"
                  fill="transparent"
                />

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
              {paginatedReaders.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span
                      className="borrow-code-cell"
                      onClick={() => onSelectReader && onSelectReader(row)}
                      title="Nhấp để xem chi tiết phiếu & phân tích AI"
                    >
                      {row.id}
                    </span>
                  </td>

                  <td>
                    <div className="reader-cell-main">
                      <span className="reader-cell-name">
                        {row.name}{' '}
                        <span className="reader-cell-code">({row.studentCode})</span>
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="book-title-cell" title={row.bookTitle}>
                      {row.bookTitle}
                    </div>
                  </td>

                  <td>
                    <span className="due-date-cell">{row.dueDate}</span>
                  </td>

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
                        onClick={() => onRemindReader && onRemindReader(row)}
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

        {/* Phân trang danh sách độc giả nguy cơ theo chuẩn BookCatalog */}
        {filteredReaders.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredReaders.length}
            pageSizeOptions={[5, 10, 20]}
            unitLabel="hồ sơ nguy cơ"
            className="table-pagination-card-bleed"
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </>
  );
}
