import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RotateCw,
  Loader2,
  ShieldAlert,
  Info
} from 'lucide-react';
import { readerApi } from '../api/readerApi';
import './ReaderProfiles.css';

// SVG Avatar Fallback khi offline hoặc lỗi tải ảnh
const fallbackAvatar = (name) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="%23e2e8f0"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold" fill="%2364748b">${encodeURIComponent(
    (name || 'R').charAt(0).toUpperCase()
  )}</text></svg>`;

export default function ReaderProfiles({ user, externalSearch = '' }) {
  // Bộ lọc danh sách
  const [facultyFilter, setFacultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // Trạng thái dữ liệu kết nối SQL Server
  const [readers, setReaders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingLockId, setUpdatingLockId] = useState(null);
  const [isSendingWarning, setIsSendingWarning] = useState(false);

  // Độc giả được chọn hiển thị chi tiết bên cột phải
  const [selectedReaderCode, setSelectedReaderCode] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  // Hộp thoại xác nhận Khóa / Mở khóa thẻ độc giả (Ảnh 16)
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    reader: null,
    action: 'lock' // 'lock' | 'unlock'
  });

  // Chuyển đổi mức độ rủi ro AI sang thuần tiếng Việt (Ảnh 15)
  const getRiskLabel = (riskType) => {
    if (riskType === 'high') return 'Cao';
    if (riskType === 'medium') return 'Trung bình';
    return 'Thấp';
  };

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3800);
  }, []);

  // Mở hộp thoại xác nhận trước khi khóa hoặc mở khóa
  const requestToggleLock = (reader, e) => {
    if (e) e.stopPropagation();
    if (!reader || updatingLockId) return;
    const isLocked = !reader.isActive;
    setConfirmModalData({
      isOpen: true,
      reader,
      action: isLocked ? 'unlock' : 'lock'
    });
  };

  // Xác nhận hành động từ Modal
  const handleConfirmModalAction = () => {
    const { reader } = confirmModalData;
    setConfirmModalData({ isOpen: false, reader: null, action: 'lock' });
    if (reader) {
      handleToggleLock(reader);
    }
  };

  // Tải danh sách độc giả và số liệu thống kê từ Backend SQL Server
  const fetchReadersData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [readersRes, summaryRes] = await Promise.all([
        readerApi.getReaders(),
        readerApi.getSummary()
      ]);

      if (readersRes && readersRes.success && Array.isArray(readersRes.data)) {
        setReaders(readersRes.data);
        // Chọn độc giả đầu tiên nếu chưa chọn
        if (readersRes.data.length > 0) {
          setSelectedReaderCode((prev) => {
            const exists = readersRes.data.some((r) => r.readerCode === prev);
            return exists ? prev : readersRes.data[0].readerCode;
          });
        }
      }

      if (summaryRes && summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu độc giả từ SQL Server:', err);
      showToast('⚠️ Không thể tải dữ liệu từ SQL Server. Đang sử dụng dữ liệu bộ nhớ đệm.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Tự động gọi API khi component mount
  useEffect(() => {
    fetchReadersData();
  }, [fetchReadersData]);

  // Lọc danh sách theo các tiêu chí (kèm từ khóa tìm kiếm trên Header)
  const filteredReaders = useMemo(() => {
    const kw = externalSearch ? externalSearch.toLowerCase().trim() : '';
    return readers.filter((r) => {
      // 1. Lọc theo từ khóa tìm kiếm nhanh (Tên, MSSV, Email, Khoa)
      if (kw) {
        const matchSearch =
          (r.readerCode && r.readerCode.toLowerCase().includes(kw)) ||
          (r.fullName && r.fullName.toLowerCase().includes(kw)) ||
          (r.email && r.email.toLowerCase().includes(kw)) ||
          (r.faculty && r.faculty.toLowerCase().includes(kw)) ||
          (r.classGroup && r.classGroup.toLowerCase().includes(kw));
        if (!matchSearch) return false;
      }

      // 2. Lọc theo Khoa/Viện
      if (facultyFilter !== 'all' && r.faculty !== facultyFilter) return false;

      // 3. Lọc theo trạng thái Thẻ (active / locked)
      if (statusFilter !== 'all') {
        const isLocked = !r.isActive;
        if (statusFilter === 'active' && isLocked) return false;
        if (statusFilter === 'locked' && !isLocked) return false;
      }

      // 4. Lọc theo mức độ rủi ro AI
      if (riskFilter !== 'all') {
        if (riskFilter === 'high' && r.riskType !== 'high') return false;
        if (riskFilter === 'medium' && r.riskType !== 'medium') return false;
        if (riskFilter === 'low' && r.riskType !== 'low') return false;
      }

      return true;
    });
  }, [readers, facultyFilter, statusFilter, riskFilter, externalSearch]);

  // Độc giả được chọn hiển thị chi tiết bên cột phải
  const selectedReader = useMemo(() => {
    if (filteredReaders.length === 0) return readers[0] || null;
    return (
      filteredReaders.find((r) => r.readerCode === selectedReaderCode) ||
      filteredReaders[0]
    );
  }, [readers, filteredReaders, selectedReaderCode]);

  // ====================================================================
  // XỬ LÝ KHÓA / MỞ KHÓA THẺ ĐỘC GIẢ (CẬP NHẬT TRỰC TIẾP SQL SERVER)
  // Đổi trạng thái ngay sang "Đã khóa" và chặn mượn sách bên quầy lưu thông
  // ====================================================================
  const handleToggleLock = async (reader, e) => {
    if (e) e.stopPropagation();
    if (!reader || updatingLockId) return;

    const targetReaderId = reader.readerId || reader.readerID;
    const currentIsActive = reader.isActive;
    const newIsActive = !currentIsActive;
    const newStatus = newIsActive ? 'active' : 'locked';

    // 1. CẬP NHẬT TRẠNG THÁI GIAO DIỆN NGAY LẬP TỨC (Optimistic UI Update)
    setReaders((prev) =>
      prev.map((r) => {
        const rId = r.readerId || r.readerID;
        if (rId === targetReaderId) {
          return {
            ...r,
            isActive: newIsActive,
            status: newStatus
          };
        }
        return r;
      })
    );

    // Hiển thị toast thông báo phản hồi ngay lập tức cho người dùng
    showToast(
      newIsActive
        ? `🔓 Đã mở khóa thẻ bạn đọc cho ${reader.fullName} (${reader.readerCode}). Độc giả có thể tiếp tục mượn sách.`
        : `🔒 ĐÃ KHÓA THẺ độc giả ${reader.fullName} (${reader.readerCode})! Độc giả này bị CHẶN MƯỢN SÁCH bên quầy lưu thông.`
    );

    setUpdatingLockId(targetReaderId);

    // 2. GỌI API BACKEND ĐỒNG BỘ VÀO CSDL SQL SERVER
    try {
      const res = await readerApi.toggleLock(targetReaderId);
      if (res && res.success && res.data) {
        // Cập nhật lại với dữ liệu chính xác từ SQL Server
        setReaders((prev) =>
          prev.map((r) => {
            const rId = r.readerId || r.readerID;
            if (rId === targetReaderId) {
              return {
                ...r,
                isActive: res.data.isActive,
                status: res.data.status
              };
            }
            return r;
          })
        );
      } else {
        throw new Error(res?.message || 'Lỗi khi cập nhật trạng thái thẻ');
      }
    } catch (err) {
      console.error('Lỗi khi gọi API khóa thẻ:', err);
      // Rollback lại trạng thái cũ nếu gặp sự cố kết nối máy chủ
      setReaders((prev) =>
        prev.map((r) => {
          const rId = r.readerId || r.readerID;
          if (rId === targetReaderId) {
            return {
              ...r,
              isActive: currentIsActive,
              status: currentIsActive ? 'active' : 'locked'
            };
          }
          return r;
        })
      );
      showToast(`❌ Không thể lưu vào SQL Server: ${err.message || 'Lỗi mạng'}`);
    } finally {
      setUpdatingLockId(null);
    }
  };

  // Xử lý Gửi email cảnh báo trễ hạn (BUG-01: Báo lỗi chính xác khi lỗi mạng/API)
  const handleSendWarningEmail = async (reader) => {
    if (!reader || isSendingWarning) return;
    const targetReaderId = reader.readerId || reader.readerID;

    setIsSendingWarning(true);
    showToast(`📧 Đang gửi thông báo cảnh báo trễ hạn đến ${reader.email || reader.fullName}...`);

    try {
      const res = await readerApi.sendWarning(targetReaderId);
      if (res && res.success) {
        showToast(`✅ Đã gửi cảnh báo trễ hạn thành công đến ${reader.fullName} (${reader.email})!`);
      } else {
        showToast(`⚠️ ${res?.message || 'Gửi cảnh báo không thành công'}`);
      }
    } catch (err) {
      console.error('Lỗi khi gửi email cảnh báo:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Lỗi mạng hoặc không thể kết nối đến máy chủ!';
      showToast(`❌ Gửi cảnh báo thất bại: ${errMsg}`);
    } finally {
      setIsSendingWarning(false);
    }
  };

  return (
    <div className="reader-page-container">
      {/* ====================================================================
          1. BỘ LỌC DANH SÁCH (FILTER BAR) & NÚT LÀM MỚI (ẢNH 17 & 18)
          ==================================================================== */}
      <div className="reader-filter-bar">
        <span className="filter-label">Lọc danh sách:</span>

        {/* Dropdown Khoa/Viện */}
        <div className="filter-group-item">
          <label className="filter-item-title" htmlFor="filter-faculty">Khoa/Viện:</label>
          <div className="filter-select-wrapper">
            <select
              id="filter-faculty"
              className="filter-select"
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="CNTT">CNTT</option>
              <option value="Kinh Tế">Kinh Tế</option>
              <option value="Cơ Khí">Cơ Khí</option>
              <option value="Ngoại Ngữ">Ngoại Ngữ</option>
            </select>
            <ChevronDown size={14} className="filter-chevron" />
          </div>
        </div>

        {/* Dropdown Trạng thái Thẻ */}
        <div className="filter-group-item">
          <label className="filter-item-title" htmlFor="filter-status">Trạng thái:</label>
          <div className="filter-select-wrapper">
            <select
              id="filter-status"
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Đang khóa thẻ</option>
            </select>
            <ChevronDown size={14} className="filter-chevron" />
          </div>
        </div>

        {/* Dropdown Mức rủi ro AI */}
        <div className="filter-group-item">
          <label className="filter-item-title" htmlFor="filter-risk">Mức rủi ro AI:</label>
          <div className="filter-select-wrapper">
            <select
              id="filter-risk"
              className="filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
              <option value="low">Thấp</option>
            </select>
            <ChevronDown size={14} className="filter-chevron" />
          </div>
        </div>

        {/* Nút Làm mới dữ liệu */}
        <button
          type="button"
          className="btn-refresh-readers"
          onClick={() => fetchReadersData(true)}
          disabled={isLoading || isRefreshing}
          title="Tải lại danh sách độc giả"
        >
          <RotateCw size={14} className={isRefreshing ? 'spin-icon' : ''} />
          <span>{isRefreshing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
        </button>
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
          <div className="reader-kpi-value">
            {summary ? summary.totalActiveReaders : readers.filter((r) => r.isActive).length} bạn đọc
          </div>
          <div className="reader-kpi-bottom">
            <span className="kpi-badge-growth">
              Tổng số: {summary ? summary.totalReaders : readers.length}
            </span>
            <span>trong toàn hệ thống</span>
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
          <div className="reader-kpi-value">
            {summary ? summary.debtReadersCount : readers.filter((r) => (r.fineDebtRaw || 0) > 0).length} bạn đọc
          </div>
          <div className="reader-kpi-bottom">
            <span>
              Tổng nợ:{' '}
              {summary
                ? `${summary.totalDebtAmount.toLocaleString('vi-VN')} đ`
                : `${readers.reduce((s, r) => s + (r.fineDebtRaw || 0), 0).toLocaleString('vi-VN')} đ`}
            </span>
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
          <div className="reader-kpi-value val-orange">
            {summary ? summary.highRiskCount : readers.filter((r) => r.riskType === 'high').length} bạn đọc
          </div>
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
          <div className="reader-kpi-value val-green">
            {summary ? summary.averageCreditScore : 86}/100
          </div>
          <div className="reader-kpi-bottom">
            <span>Xếp hạng: Uy tín tốt</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. BỐ CỤC 2 CỘT: DANH SÁCH BẢNG SQL SERVER & TRỰC QUAN HÓA AI
          ==================================================================== */}
      <div className="reader-main-grid">
        {/* ---------------- CỘT TRÁI: BẢNG HỒ SƠ ĐỘC GIẢ SQL SERVER ---------------- */}
        <div className="reader-card">
          <div className="reader-card-header">
            <h3 className="reader-card-title">
              Danh sách hồ sơ độc giả toàn hệ thống ({filteredReaders.length} kết quả)
            </h3>
          </div>

          <div className="reader-table-wrapper">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <Loader2 size={26} className="spin-icon" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
                <p style={{ fontSize: '13.5px', fontWeight: 500 }}>Đang nạp danh sách độc giả từ SQL Server...</p>
              </div>
            ) : (
              <table className="reader-table">
                <thead>
                  <tr>
                    <th>MSSV & Họ tên</th>
                    <th>Khoa/Lớp</th>
                    <th>Sách đang mượn</th>
                    <th>Nợ phạt tồn đọng</th>
                    <th>Tín nhiệm</th>
                    <th>Rủi ro AI</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReaders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: 'center',
                          padding: '40px 16px',
                          color: '#64748b',
                          fontSize: '13.5px'
                        }}
                      >
                        Không tìm thấy hồ sơ độc giả nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredReaders.map((r) => {
                      const isSelected = r.readerCode === selectedReaderCode;
                      const isLocked = !r.isActive;
                      const isUpdating = updatingLockId === (r.readerId || r.readerID);

                      return (
                        <tr
                          key={r.readerCode || r.readerId}
                          className={`reader-table-row ${isSelected ? 'selected' : ''} ${isLocked ? 'row-locked' : ''}`}
                          onClick={() => setSelectedReaderCode(r.readerCode)}
                        >
                          {/* MSSV & Họ tên */}
                          <td>
                            <div className="reader-info-cell">
                              <img
                                src={r.avatar}
                                alt={r.fullName}
                                className="reader-avatar"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = fallbackAvatar(r.fullName);
                                }}
                              />
                              <div className="reader-name-block">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="reader-full-name">{r.fullName}</span>
                                  {r.memberType === 'Lecturer' && (
                                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#4338ca', fontWeight: 700 }}>
                                      Giảng viên
                                    </span>
                                  )}
                                </div>
                                <span className="reader-sub-info">
                                  {r.readerCode} • {r.email ? `${r.email.split('@')[0]}@` : 'smartlib@'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Khoa/Lớp */}
                          <td>
                            <div className="reader-dept-cell">
                              <span className="reader-dept-name">{r.faculty || 'CNTT'} •</span>
                              <span className="reader-class-name">{r.classGroup || 'K21-CC'}</span>
                            </div>
                          </td>

                          {/* Sách đang mượn */}
                          <td>
                            <div className="reader-books-cell" title={r.currentBooksSummary}>
                              {r.currentBooksSummary && r.currentBooksSummary.startsWith('•') ? (
                                <span className="reader-books-none">{r.currentBooksSummary}</span>
                              ) : (
                                <span>
                                  <strong>{r.activeBorrowCount} cuốn:</strong> {r.currentBooksSummary}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Nợ phạt tồn đọng */}
                          <td>
                            <span
                              className={`reader-debt-cell ${
                                (r.fineDebtRaw || 0) > 0 ? 'debt-active' : 'debt-zero'
                              }`}
                            >
                              {r.fineDebt || '0 VNĐ'}
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

                          {/* Rủi ro AI (Thuần tiếng Việt - Ảnh 15) */}
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
                              {getRiskLabel(r.riskType)}
                            </span>
                          </td>

                          {/* Trạng thái Thẻ */}
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`reader-status-badge ${
                                isLocked ? 'reader-status-locked' : 'reader-status-active'
                              }`}
                            >
                              {isLocked ? (
                                <>
                                  <Lock size={11} />
                                  <span>Đã khóa thẻ</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={11} />
                                  <span>Hoạt động</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Thao tác: Bấm Khóa thẻ đổi ngay sang Đã khóa */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="reader-action-cell" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="action-link-detail"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReaderCode(r.readerCode);
                                  showToast(`Đang xem chi tiết hồ sơ độc giả: ${r.fullName} (${r.readerCode})`);
                                }}
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                className={isLocked ? 'action-link-unlock' : 'action-link-lock'}
                                onClick={(e) => requestToggleLock(r, e)}
                                disabled={isUpdating}
                                title={
                                  isLocked
                                    ? 'Nhấn để mở khóa thẻ cho độc giả mượn sách lại'
                                    : 'Nhấn để KHÓA THẺ (Chặn mượn sách tại quầy lưu thông)'
                                }
                              >
                                {isUpdating ? (
                                  'Đang lưu...'
                                ) : isLocked ? (
                                  'Mở khóa'
                                ) : (
                                  'Khóa thẻ'
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ---------------- CỘT PHẢI: HỒ SƠ NHANH & TRỰC QUAN HÓA AI ---------------- */}
        <div className="reader-card reader-preview-card">
          <div className="reader-card-header" style={{ marginBottom: '12px' }}>
            <h3 className="reader-card-title">Hồ sơ nhanh & Trực quan hóa AI</h3>
          </div>

          {selectedReader ? (
            <>
              {/* Tiêu đề & Thông tin độc giả */}
              <div className="preview-profile-header">
                <img
                  src={selectedReader.avatar}
                  alt={selectedReader.fullName}
                  className="preview-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackAvatar(selectedReader.fullName);
                  }}
                />
                <div className="preview-profile-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 className="preview-name">{selectedReader.fullName}</h4>
                    <span
                      className={`reader-status-badge ${
                        !selectedReader.isActive ? 'reader-status-locked' : 'reader-status-active'
                      }`}
                      style={{ fontSize: '10px', padding: '1px 6px' }}
                    >
                      {!selectedReader.isActive ? 'ĐÃ KHÓA THẺ' : 'HOẠT ĐỘNG'}
                    </span>
                  </div>
                  <span className="preview-meta">
                    Mã thẻ: <strong>{selectedReader.readerCode}</strong> • Khoa {selectedReader.faculty || 'CNTT'} (
                    {selectedReader.classGroup || 'K21-CC'})
                  </span>
                </div>
              </div>

              {/* Thông báo nếu thẻ đang bị khóa */}
              {!selectedReader.isActive && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#b91c1c',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <ShieldAlert size={16} />
                  <span>Thẻ độc giả đang bị KHÓA. Hệ thống sẽ TỪ CHỐI mượn sách bên quầy lưu thông.</span>
                </div>
              )}

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h5 className="preview-section-title">
                    SÁCH ĐANG GIỮ ({String((selectedReader.books || []).length).padStart(2, '0')} cuốn)
                  </h5>
                  {selectedReader.books && selectedReader.books.length > 3 && (
                    <span style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                      Cuộn để xem tiếp
                    </span>
                  )}
                </div>

                {!selectedReader.books || selectedReader.books.length === 0 ? (
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
                  disabled={isSendingWarning}
                  style={isSendingWarning ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                >
                  {isSendingWarning ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Đang gửi email...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Gửi cảnh báo Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={!selectedReader.isActive ? 'btn-unlock-account' : 'btn-lock-account'}
                  onClick={() => requestToggleLock(selectedReader)}
                  disabled={updatingLockId === (selectedReader.readerId || selectedReader.readerID)}
                >
                  {!selectedReader.isActive ? (
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
            </>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
              Vui lòng chọn một độc giả để xem hồ sơ chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* Modal xác nhận Khóa / Mở khóa thẻ độc giả (Ảnh 16) */}
      {confirmModalData.isOpen && confirmModalData.reader && (
        <div
          className="reader-modal-overlay"
          onClick={() => setConfirmModalData({ isOpen: false, reader: null, action: 'lock' })}
        >
          <div className="reader-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`reader-modal-header ${confirmModalData.action === 'lock' ? 'header-lock' : 'header-unlock'}`}>
              <div className="reader-modal-icon-wrap">
                {confirmModalData.action === 'lock' ? <Lock size={22} /> : <Unlock size={22} />}
              </div>
              <h4 className="reader-modal-title">
                {confirmModalData.action === 'lock' ? 'Xác nhận Khóa thẻ độc giả' : 'Xác nhận Mở khóa thẻ'}
              </h4>
            </div>

            <div className="reader-modal-body">
              <p className="reader-modal-text">
                Bạn có chắc chắn muốn {confirmModalData.action === 'lock' ? 'KHÓA THẺ' : 'mở khóa thẻ'} của độc giả{' '}
                <strong>{confirmModalData.reader.fullName}</strong> (Mã thẻ:{' '}
                <code>{confirmModalData.reader.readerCode}</code>)?
              </p>
              {confirmModalData.action === 'lock' ? (
                <div className="reader-modal-warning-note">
                  <ShieldAlert size={16} />
                  <span>
                    Sau khi khóa, độc giả sẽ bị <strong>CHẶN MƯỢN SÁCH</strong> ngay lập tức tại quầy lưu thông.
                  </span>
                </div>
              ) : (
                <div className="reader-modal-info-note">
                  <CheckCircle2 size={16} />
                  <span>Độc giả sẽ được khôi phục quyền mượn sách bình thường tại quầy lưu thông.</span>
                </div>
              )}
            </div>

            <div className="reader-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setConfirmModalData({ isOpen: false, reader: null, action: 'lock' })}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className={`btn-modal-confirm ${confirmModalData.action === 'lock' ? 'btn-confirm-lock' : 'btn-confirm-unlock'}`}
                onClick={handleConfirmModalAction}
              >
                {confirmModalData.action === 'lock' ? 'Xác nhận Khóa thẻ' : 'Xác nhận Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

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
