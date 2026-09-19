import React, { useState, useMemo } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Unlock,
  CircleDollarSign,
  Info
} from 'lucide-react';
import './ReaderProfiles.css';

// SVG Avatar Fallback khi offline
const fallbackAvatar = (name) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23e2e8f0"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="%2364748b">${encodeURIComponent(
    name.charAt(0).toUpperCase()
  )}</text></svg>`;

export default function ReaderProfiles({ user }) {
  // Bộ lọc danh sách
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [riskFilter, setRiskFilter] = useState('all');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  // Dữ liệu danh sách hồ sơ độc giả (Khớp 100% ảnh Figma)
  const [readers, setReaders] = useState([
    {
      id: '2180600123',
      name: 'Nguyễn Văn A',
      email: 'vana@gmail.com',
      faculty: 'CNTT',
      classGroup: 'K21-CC',
      currentBooksSummary: 'AI Foundations, Python DS',
      fineDebt: '15.000 VNĐ',
      fineDebtRaw: 15000,
      creditScore: 45,
      creditRating: 'Yếu',
      riskLevelText: 'Cao (High)',
      riskType: 'high',
      riskScore: 88,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      aiDiagnosis:
        '* AI nhận diện: Thường trễ sách giáo trình sát đợt thi cuối kỳ. Điểm tín nhiệm hệ thống bị sụt giảm.',
      books: [
        {
          title: 'Nhập môn Machine Learning',
          badgeText: 'Trễ 3 ngày',
          badgeType: 'overdue',
          subText: 'Phí phạt tích lũy: 15.000 đ'
        },
        {
          title: 'Python for Data Science',
          badgeText: 'Còn 5 ngày',
          badgeType: 'remaining',
          subText: 'Hạn trả: 25/09/2026'
        }
      ]
    },
    {
      id: '2180600124',
      name: 'Trần Thị B',
      email: 'thib@gmail.com',
      faculty: 'Kinh Tế',
      classGroup: 'K21-KT',
      currentBooksSummary: 'Kinh tế vĩ mô 101',
      fineDebt: '0 VNĐ',
      fineDebtRaw: 0,
      creditScore: 95,
      creditRating: 'Tốt',
      riskLevelText: 'Thấp (Low)',
      riskType: 'low',
      riskScore: 12,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      aiDiagnosis:
        '* AI nhận diện: Lịch sử mượn trả luôn chuẩn xác trước hạn. Điểm tín nhiệm hệ thống đạt mức xuất sắc.',
      books: [
        {
          title: 'Kinh tế vĩ mô 101',
          badgeText: 'Còn 12 ngày',
          badgeType: 'remaining',
          subText: 'Hạn trả: 02/10/2026'
        }
      ]
    },
    {
      id: '2080601245',
      name: 'Phạm Minh C',
      email: 'minhc@gmail.com',
      faculty: 'Cơ Khí',
      classGroup: 'K20-CK',
      currentBooksSummary: 'Giáo trình Vật Liệu Học',
      fineDebt: '0 VNĐ',
      fineDebtRaw: 0,
      creditScore: 78,
      creditRating: 'Khá',
      riskLevelText: 'Vừa (Medium)',
      riskType: 'medium',
      riskScore: 48,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      aiDiagnosis:
        '* AI nhận diện: Có nguy cơ phát sinh trễ hạn 1-2 ngày ở giai đoạn thi đồ án kỳ 5. Cần hệ thống gửi email nhắc nhở sớm.',
      books: [
        {
          title: 'Giáo trình Vật Liệu Học',
          badgeText: 'Còn 2 ngày',
          badgeType: 'remaining',
          subText: 'Hạn trả: 22/09/2026'
        }
      ]
    },
    {
      id: '2280702111',
      name: 'Lê Thị D',
      email: 'thid@gmail.com',
      faculty: 'Ngoại Ngữ',
      classGroup: 'K22-NN',
      currentBooksSummary: '• None (Không mượn)',
      fineDebt: '0 VNĐ',
      fineDebtRaw: 0,
      creditScore: 90,
      creditRating: 'Tốt',
      riskLevelText: 'Thấp (Low)',
      riskType: 'low',
      riskScore: 5,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      aiDiagnosis:
        '* AI nhận diện: Độc giả hiện không nợ sách hay phí phạt. Được phép mượn tối đa 5 đầu sách cùng lúc.',
      books: []
    }
  ]);

  // Độc giả được chọn hiển thị chi tiết bên cột phải (Mặc định chọn Nguyễn Văn A)
  const [selectedReaderId, setSelectedReaderId] = useState('2180600123');

  const selectedReader = useMemo(() => {
    return readers.find((r) => r.id === selectedReaderId) || readers[0];
  }, [readers, selectedReaderId]);

  // Lọc danh sách theo các tiêu chí
  const filteredReaders = useMemo(() => {
    return readers.filter((r) => {
      if (facultyFilter !== 'all' && r.faculty !== facultyFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (riskFilter !== 'all') {
        if (riskFilter === 'high' && r.riskType !== 'high') return false;
        if (riskFilter === 'medium' && r.riskType !== 'medium') return false;
        if (riskFilter === 'low' && r.riskType !== 'low') return false;
      }
      return true;
    });
  }, [readers, facultyFilter, statusFilter, riskFilter]);

  // Xử lý Khóa / Mở khóa thẻ độc giả
  const handleToggleLock = (readerId, e) => {
    if (e) e.stopPropagation();
    setReaders((prev) =>
      prev.map((r) => {
        if (r.id === readerId) {
          const newStatus = r.status === 'locked' ? 'active' : 'locked';
          showToast(
            newStatus === 'locked'
              ? `Đã khóa quyền mượn sách của độc giả ${r.name} (${r.id})`
              : `Đã mở khóa thẻ bạn đọc cho ${r.name} (${r.id})`
          );
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
  };

  // Xử lý Gửi email cảnh báo trễ hạn
  const handleSendWarningEmail = (reader) => {
    showToast(`Đã gửi email cảnh báo trễ hạn đến ${reader.email}!`);
  };

  return (
    <div className="reader-page-container">
      {/* ====================================================================
          1. BỘ LỌC DANH SÁCH (FILTER BAR)
          ==================================================================== */}
      <div className="reader-filter-bar">
        <span className="filter-label">Lọc danh sách:</span>

        {/* Dropdown Khoa/Viện */}
        <div className="filter-select-wrapper">
          <select
            className="filter-select"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
          >
            <option value="all">Khoa/Viện: Tất cả</option>
            <option value="CNTT">Khoa/Viện: CNTT</option>
            <option value="Kinh Tế">Khoa/Viện: Kinh Tế</option>
            <option value="Cơ Khí">Khoa/Viện: Cơ Khí</option>
            <option value="Ngoại Ngữ">Khoa/Viện: Ngoại Ngữ</option>
          </select>
          <ChevronDown size={14} className="filter-chevron" />
        </div>

        {/* Dropdown Trạng thái */}
        <div className="filter-select-wrapper">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="active">Trạng thái: Hoạt động</option>
            <option value="locked">Trạng thái: Đang khóa thẻ</option>
            <option value="all">Trạng thái: Tất cả</option>
          </select>
          <ChevronDown size={14} className="filter-chevron" />
        </div>

        {/* Dropdown Mức rủi ro AI */}
        <div className="filter-select-wrapper">
          <select
            className="filter-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">Mức rủi ro AI: Tất cả</option>
            <option value="high">Mức rủi ro AI: Cao (High)</option>
            <option value="medium">Mức rủi ro AI: Vừa (Medium)</option>
            <option value="low">Mức rủi ro AI: Thấp (Low)</option>
          </select>
          <ChevronDown size={14} className="filter-chevron" />
        </div>
      </div>

      {/* ====================================================================
          2. HÀNG 4 THẺ KPI THỐNG KÊ (METRIC CARDS)
          ==================================================================== */}
      <div className="reader-kpi-grid">
        {/* Thẻ 1: Tổng độc giả hoạt động */}
        <div className="reader-kpi-card">
          <div className="reader-kpi-top">
            <h3 className="reader-kpi-title">Tổng độc giả hoạt động</h3>
            <div className="reader-kpi-icon-box reader-kpi-icon-blue">
              <Users size={22} strokeWidth={2.2} />
            </div>
          </div>
          <div className="reader-kpi-value">4,850 bạn đọc</div>
          <div className="reader-kpi-bottom">
            <span className="kpi-badge-growth">+1.2%</span>
            <span>so với tháng trước</span>
          </div>
        </div>

        {/* Thẻ 2: Độc giả đang nợ phạt */}
        <div className="reader-kpi-card">
          <div className="reader-kpi-top">
            <h3 className="reader-kpi-title">Độc giả đang nợ phạt</h3>
            <div className="reader-kpi-icon-box reader-kpi-icon-red">
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>$</span>
            </div>
          </div>
          <div className="reader-kpi-value">128 sinh viên</div>
          <div className="reader-kpi-bottom">
            <span>Tổng nợ: 4.820.000 đ</span>
          </div>
        </div>

        {/* Thẻ 3: Nguy cơ trễ hạn cao (AI) */}
        <div className="reader-kpi-card">
          <div className="reader-kpi-top">
            <h3 className="reader-kpi-title">Nguy cơ trễ hạn cao (AI)</h3>
            <div className="reader-kpi-icon-box reader-kpi-icon-orange">
              <GraduationCap size={22} strokeWidth={2.2} />
            </div>
          </div>
          <div className="reader-kpi-value val-orange">42 sinh viên</div>
          <div className="reader-kpi-bottom">
            <span>Cần theo dõi & cảnh báo</span>
          </div>
        </div>

        {/* Thẻ 4: Điểm tín nhiệm trung bình */}
        <div className="reader-kpi-card">
          <div className="reader-kpi-top">
            <h3 className="reader-kpi-title">Điểm tín nhiệm trung bình</h3>
            <div className="reader-kpi-icon-box reader-kpi-icon-blue">
              <BookOpen size={22} strokeWidth={2.2} />
            </div>
          </div>
          <div className="reader-kpi-value val-green">86/100</div>
          <div className="reader-kpi-bottom">
            <span>Xếp hạng: Uy tín tốt</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. BỐ CỤC 2 CỘT: DANH SÁCH BẢNG & TRỰC QUAN HÓA AI
          ==================================================================== */}
      <div className="reader-main-grid">
        {/* ---------------- CỘT TRÁI: BẢNG HỒ SƠ ĐỘC GIẢ ---------------- */}
        <div className="reader-card">
          <div className="reader-card-header">
            <h3 className="reader-card-title">Danh sách hồ sơ độc giả toàn hệ thống</h3>
          </div>

          <div className="reader-table-wrapper">
            <table className="reader-table">
              <thead>
                <tr>
                  <th>MSSV & Họ tên</th>
                  <th>Khoa/Lớp</th>
                  <th>Sách đang mượn</th>
                  <th>Nợ phạt tồn đọng</th>
                  <th>Tín nhiệm</th>
                  <th>Rủi ro AI</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReaders.map((r) => {
                  const isSelected = r.id === selectedReaderId;
                  const isLocked = r.status === 'locked';

                  return (
                    <tr
                      key={r.id}
                      className={`reader-table-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedReaderId(r.id)}
                    >
                      {/* MSSV & Họ tên */}
                      <td>
                        <div className="reader-info-cell">
                          <img
                            src={r.avatar}
                            alt={r.name}
                            className="reader-avatar"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallbackAvatar(r.name);
                            }}
                          />
                          <div className="reader-name-block">
                            <span className="reader-full-name">{r.name}</span>
                            <span className="reader-sub-info">
                              {r.id} • {r.email.split('@')[0]}@
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Khoa/Lớp */}
                      <td>
                        <div className="reader-dept-cell">
                          <span className="reader-dept-name">{r.faculty} •</span>
                          <span className="reader-class-name">{r.classGroup}</span>
                        </div>
                      </td>

                      {/* Sách đang mượn */}
                      <td>
                        <div className="reader-books-cell">
                          {r.currentBooksSummary.startsWith('•') ? (
                            <span className="reader-books-none">{r.currentBooksSummary}</span>
                          ) : (
                            r.currentBooksSummary
                          )}
                        </div>
                      </td>

                      {/* Nợ phạt tồn đọng */}
                      <td>
                        <span
                          className={`reader-debt-cell ${
                            r.fineDebtRaw > 0 ? 'debt-active' : 'debt-zero'
                          }`}
                        >
                          {r.fineDebt}
                        </span>
                      </td>

                      {/* Tín nhiệm */}
                      <td>
                        <span
                          className={`reader-credit-cell ${
                            r.creditScore >= 80
                              ? 'credit-good'
                              : r.creditScore >= 60
                              ? 'credit-fair'
                              : 'credit-weak'
                          }`}
                        >
                          {r.creditScore}/100 ({r.creditRating})
                        </span>
                      </td>

                      {/* Rủi ro AI */}
                      <td>
                        <span
                          className={`risk-badge ${
                            r.riskType === 'high'
                              ? 'risk-high'
                              : r.riskType === 'medium'
                              ? 'risk-medium'
                              : 'risk-low'
                          }`}
                        >
                          {r.riskLevelText}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="reader-action-cell" style={{ justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="action-link-detail"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReaderId(r.id);
                              showToast(`Đang xem chi tiết hồ sơ độc giả: ${r.name}`);
                            }}
                          >
                            Chi tiết
                          </button>

                          <button
                            type="button"
                            className={isLocked ? 'action-link-unlock' : 'action-link-lock'}
                            onClick={(e) => handleToggleLock(r.id, e)}
                          >
                            {isLocked ? 'Mở khóa' : 'Khóa thẻ'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------- CỘT PHẢI: HỒ SƠ NHANH & TRỰC QUAN HÓA AI ---------------- */}
        <div className="reader-card reader-preview-card">
          <div className="reader-card-header" style={{ marginBottom: '12px' }}>
            <h3 className="reader-card-title">Hồ sơ nhanh & Trực quan hóa AI</h3>
          </div>

          {/* Tiêu đề & Thông tin độc giả */}
          <div className="preview-profile-header">
            <img
              src={selectedReader.avatar}
              alt={selectedReader.name}
              className="preview-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackAvatar(selectedReader.name);
              }}
            />
            <div className="preview-profile-info">
              <h4 className="preview-name">{selectedReader.name}</h4>
              <span className="preview-meta">
                MSSV: {selectedReader.id} • Khoa {selectedReader.faculty}
              </span>
            </div>
          </div>

          {/* Hộp Cảnh báo Rủi ro AI */}
          <div
            className={`ai-risk-alert-box ${
              selectedReader.riskType === 'high'
                ? 'alert-high'
                : selectedReader.riskType === 'medium'
                ? 'alert-medium'
                : 'alert-low'
            }`}
          >
            <div className="ai-alert-title-row">
              {selectedReader.riskType === 'high' ? (
                <AlertTriangle size={17} />
              ) : selectedReader.riskType === 'medium' ? (
                <AlertCircle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}
              <span>Xác suất trễ hạn đợt này: {selectedReader.riskScore}%</span>
            </div>

            <span className="ai-alert-level">
              Mức độ cảnh báo:{' '}
              {selectedReader.riskType === 'high'
                ? 'RỦI RO CAO'
                : selectedReader.riskType === 'medium'
                ? 'RỦI RO TRUNG BÌNH'
                : 'AN TOÀN (RẤT THẤP)'}
            </span>

            <p className="ai-alert-desc">{selectedReader.aiDiagnosis}</p>
          </div>

          {/* Sách đang giữ */}
          <div className="preview-books-section">
            <h5 className="preview-section-title">
              SÁCH ĐANG GIỮ ({String(selectedReader.books.length).padStart(2, '0')} cuốn)
            </h5>

            {selectedReader.books.length === 0 ? (
              <div className="preview-empty-books">
                Hiện tại độc giả không giữ cuốn sách nào của thư viện.
              </div>
            ) : (
              <div className="preview-book-list">
                {selectedReader.books.map((b, idx) => (
                  <div key={idx} className="preview-book-item">
                    <div className="book-top-row">
                      <span className="book-title" title={b.title}>
                        {b.title}
                      </span>
                      <span
                        className={
                          b.badgeType === 'overdue'
                            ? 'book-badge-overdue'
                            : 'book-badge-remaining'
                        }
                      >
                        {b.badgeText}
                      </span>
                    </div>
                    <span className="book-sub-text">{b.subText}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cụm Nút Hành động */}
          <div className="preview-actions-group">
            <button
              type="button"
              className="btn-warning-email"
              onClick={() => handleSendWarningEmail(selectedReader)}
            >
              <Mail size={16} />
              <span>Gửi cảnh báo Email</span>
            </button>

            <button
              type="button"
              className={
                selectedReader.status === 'locked'
                  ? 'btn-unlock-account'
                  : 'btn-lock-account'
              }
              onClick={() => handleToggleLock(selectedReader.id)}
            >
              {selectedReader.status === 'locked' ? (
                <>
                  <Unlock size={16} />
                  <span>Mở khóa quyền mượn sách</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Khóa quyền mượn sách</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Toast thông báo hành động */}
      {toastMessage && (
        <div className="reader-toast">
          <Info size={16} color="#60a5fa" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
