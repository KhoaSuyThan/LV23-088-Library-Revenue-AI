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
  Info,
  X,
  FileText,
  Calendar,
  Phone,
  CreditCard,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { readerApi } from '../api/readerApi';
import TablePagination from '../components/common/TablePagination';
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

  // Phân trang hồ sơ độc giả theo mẫu chuẩn BookCatalog
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Hỗ trợ 10, 20, 50 độc giả / trang (mặc định: 10)

  // Độc giả được chọn hiển thị tóm tắt bên cột phải
  const [selectedReaderCode, setSelectedReaderCode] = useState('');

  // Độc giả hiển thị trong Cửa sổ chi tiết ở giữa (Modal)
  const [detailModalReaderId, setDetailModalReaderId] = useState(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  // Hộp thoại xác nhận Khóa / Mở khóa thẻ độc giả (Ảnh 16 & BUG-028)
  const [confirmModalData, setConfirmModalData] = useState({
    isOpen: false,
    reader: null,
    action: 'lock', // 'lock' | 'unlock'
    targetIsActive: false
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

  // Mở hộp thoại xác nhận trước khi khóa hoặc mở khóa với trạng thái đích xác định (BUG-028)
  const requestToggleLock = (reader, e = null, explicitTargetActive = null) => {
    if (e) e.stopPropagation();
    if (!reader || updatingLockId) return;
    const isLocked = !reader.isActive;
    const targetIsActive = explicitTargetActive !== null ? explicitTargetActive : isLocked;
    setConfirmModalData({
      isOpen: true,
      reader,
      action: targetIsActive ? 'unlock' : 'lock',
      targetIsActive
    });
  };

  // Xác nhận hành động từ Modal
  const handleConfirmModalAction = () => {
    const { reader, targetIsActive } = confirmModalData;
    setConfirmModalData({ isOpen: false, reader: null, action: 'lock', targetIsActive: false });
    if (reader) {
      handleToggleLock(reader, targetIsActive);
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

  // Tự động quay về trang 1 khi thay đổi bất kỳ tiêu chí lọc nào
  useEffect(() => {
    setCurrentPage(1);
  }, [facultyFilter, statusFilter, riskFilter, externalSearch]);

  // Danh sách độc giả được phân trang theo kích thước trang đang chọn
  const paginatedReaders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReaders.slice(startIndex, startIndex + pageSize);
  }, [filteredReaders, currentPage, pageSize]);

  // Độc giả được chọn hiển thị tóm tắt bên cột phải
  const selectedReader = useMemo(() => {
    if (filteredReaders.length === 0) return readers[0] || null;
    return (
      filteredReaders.find((r) => r.readerCode === selectedReaderCode) ||
      paginatedReaders[0] ||
      filteredReaders[0]
    );
  }, [readers, filteredReaders, paginatedReaders, selectedReaderCode]);

  // Độc giả hiển thị trong Cửa sổ Modal chi tiết ở giữa
  const detailReader = useMemo(() => {
    if (!detailModalReaderId) return null;
    return (
      readers.find(
        (r) =>
          (r.readerId || r.readerID) === detailModalReaderId ||
          r.readerCode === detailModalReaderId
      ) || null
    );
  }, [readers, detailModalReaderId]);

  // Mở cửa sổ Modal xem chi tiết hồ sơ độc giả
  const handleOpenDetailModal = (reader, e) => {
    if (e) e.stopPropagation();
    if (!reader) return;
    const targetId = reader.readerId || reader.readerID || reader.readerCode;
    setSelectedReaderCode(reader.readerCode);
    setDetailModalReaderId(targetId);
  };

  // Đóng cửa sổ chi tiết
  const handleCloseDetailModal = () => {
    setDetailModalReaderId(null);
  };

  // Hỗ trợ phím Escape để đóng nhanh cửa sổ Modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmModalData.isOpen) {
          setConfirmModalData({ isOpen: false, reader: null, action: 'lock' });
        } else if (detailModalReaderId) {
          setDetailModalReaderId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModalData.isOpen, detailModalReaderId]);

  // ====================================================================
  // XỬ LÝ KHÓA / MỞ KHÓA THẺ ĐỘC GIẢ (CẬP NHẬT TRỰC TIẾP SQL SERVER)
  // BUG-028: Sử dụng cập nhật trạng thái đích PUT /api/readers/{id}/status thay vì đảo mù.
  // Đồng bộ UI sau khi toàn luồng hoàn tất và đọc lại trạng thái thực từ SQL Server nếu có lỗi.
  // ====================================================================
  const handleToggleLock = async (reader, targetIsActive = null, e = null) => {
    if (e) e.stopPropagation();
    if (!reader || updatingLockId) return;

    const targetReaderId = reader.readerId || reader.readerID;
    const currentIsActive = reader.isActive;
    const desiredIsActive = targetIsActive !== null ? targetIsActive : !currentIsActive;
    const desiredStatus = desiredIsActive ? 'active' : 'locked';

    setUpdatingLockId(targetReaderId);

    // GỌI API BACKEND ĐỒNG BỘ VÀO CSDL SQL SERVER VỚI TRẠNG THÁI ĐÍCH
    try {
      const res = await readerApi.setStatus(targetReaderId, desiredIsActive);
      if (res && res.success && res.data) {
        const finalIsActive = res.data.isActive ?? desiredIsActive;
        const finalStatus = (res.data.status || (finalIsActive ? 'active' : 'locked')).toLowerCase();

        // Cập nhật lại với dữ liệu chính xác trả về từ Backend
        setReaders((prev) =>
          prev.map((r) => {
            const rId = r.readerId || r.readerID;
            if (rId === targetReaderId) {
              return {
                ...r,
                isActive: finalIsActive,
                status: finalStatus
              };
            }
            return r;
          })
        );

        // Hiển thị thông báo phản hồi KHI TOÀN LUỒNG ĐÃ HOÀN TẤT THÀNH CÔNG
        showToast(
          finalIsActive
            ? `🔓 Đã mở khóa thẻ bạn đọc cho ${reader.fullName} (${reader.readerCode}). Độc giả có thể tiếp tục mượn sách.`
            : `🔒 ĐÃ KHÓA THẺ độc giả ${reader.fullName} (${reader.readerCode})! Độc giả này bị CHẶN MƯỢN SÁCH bên quầy lưu thông.`
        );

        // Đồng bộ lại 4 thẻ KPI đầu trang
        readerApi.getSummary().then((sumRes) => {
          if (sumRes && sumRes.success && sumRes.data) {
            setSummary(sumRes.data);
          }
        }).catch(() => {});
      } else {
        throw new Error(res?.message || 'Lỗi khi cập nhật trạng thái thẻ');
      }
    } catch (err) {
      console.error('Lỗi khi gọi API khóa thẻ:', err);

      // Đọc lại trạng thái thực từ máy chủ sau khi có lỗi để đảm bảo không bị lệch hiển thị
      try {
        const fresh = await readerApi.getReaderById(targetReaderId);
        if (fresh && fresh.success && fresh.data) {
          setReaders((prev) =>
            prev.map((r) => {
              const rId = r.readerId || r.readerID;
              if (rId === targetReaderId) {
                return {
                  ...r,
                  isActive: fresh.data.isActive,
                  status: (fresh.data.status || (fresh.data.isActive ? 'active' : 'locked')).toLowerCase()
                };
              }
              return r;
            })
          );
        }
      } catch (syncErr) {
        console.error('Không thể đọc lại trạng thái độc giả sau lỗi:', syncErr);
      }

      showToast(`❌ Không thể lưu vào SQL Server: ${err.message || 'Lỗi mạng hoặc máy chủ'}`);
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
                    paginatedReaders.map((r) => {
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

                          {/* Thao tác: Bấm Chi tiết mở cửa sổ Modal ở giữa */}
                          <td style={{ textAlign: 'center' }}>
                            <div className="reader-action-cell" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="action-link-detail"
                                onClick={(e) => handleOpenDetailModal(r, e)}
                                title="Bấm để mở cửa sổ chi tiết hồ sơ độc giả"
                              >
                                Chi tiết
                              </button>

                              <button
                                type="button"
                                className={isLocked ? 'action-link-unlock' : 'action-link-lock'}
                                onClick={(e) => requestToggleLock(r, e, !r.isActive)}
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

          {/* Phân trang chuẩn hóa theo mẫu BookCatalog */}
          {!isLoading && filteredReaders.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredReaders.length}
              pageSizeOptions={[10, 20, 50]}
              unitLabel="độc giả"
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        {/* ---------------- CỘT PHẢI: BẢNG TÓM TẮT THÔNG TIN ĐỘC GIẢ ---------------- */}
        <div className="reader-card reader-preview-card reader-summary-card">
          <div className="reader-card-header preview-summary-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} className="summary-title-icon" />
              <h3 className="reader-card-title">Tóm tắt thông tin độc giả</h3>
            </div>
          </div>

          {selectedReader ? (
            <>
              {/* Tiêu đề & Thông tin nhanh độc giả */}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    Mã: <strong>{selectedReader.readerCode}</strong> • {selectedReader.faculty || 'CNTT'} (
                    {selectedReader.classGroup || 'K21-CC'})
                  </span>
                </div>
              </div>

              {/* Thông báo ngắn nếu thẻ đang bị khóa */}
              {!selectedReader.isActive && (
                <div className="summary-alert-locked">
                  <ShieldAlert size={14} />
                  <span>Thẻ đang bị KHÓA mượn sách.</span>
                </div>
              )}

              {/* Lưới 4 chỉ số tóm tắt nhanh (2x2 Quick Metrics) */}
              <div className="summary-quick-grid">
                <div className="summary-quick-item">
                  <span className="summary-quick-label">Sách mượn</span>
                  <span className="summary-quick-val">
                    {selectedReader.activeBorrowCount || 0} cuốn
                  </span>
                </div>
                <div className="summary-quick-item">
                  <span className="summary-quick-label">Nợ phạt</span>
                  <span className={`summary-quick-val ${(selectedReader.fineDebtRaw || 0) > 0 ? 'val-red' : ''}`}>
                    {selectedReader.fineDebt || '0 VNĐ'}
                  </span>
                </div>
                <div className="summary-quick-item">
                  <span className="summary-quick-label">Tín nhiệm</span>
                  <span className="summary-quick-val val-green">
                    {selectedReader.creditScore}/100
                  </span>
                </div>
                <div className="summary-quick-item">
                  <span className="summary-quick-label">Rủi ro AI</span>
                  <span className={`summary-quick-val ${
                    selectedReader.riskType === 'high' ? 'val-orange' : ''
                  }`}>
                    {getRiskLabel(selectedReader.riskType)} ({selectedReader.riskScore}%)
                  </span>
                </div>
              </div>

              {/* Tóm tắt tình trạng mượn sách nhanh */}
              <div className="summary-books-box">
                <div className="summary-box-title">
                  <span>Sách đang giữ ({selectedReader.activeBorrowCount || 0})</span>
                </div>
                {(!selectedReader.books || selectedReader.books.length === 0) ? (
                  <p className="summary-empty-text">Hiện tại không mượn cuốn sách nào.</p>
                ) : (
                  <div className="summary-mini-books">
                    {selectedReader.books.slice(0, 2).map((b, idx) => (
                      <div key={idx} className="summary-mini-book-item">
                        <span className="summary-book-name" title={b.title}>
                          • {b.title}
                        </span>
                        <span
                          className={
                            b.badgeType === 'overdue'
                              ? 'mini-badge-overdue'
                              : 'mini-badge-ok'
                          }
                        >
                          {b.badgeText}
                        </span>
                      </div>
                    ))}
                    {selectedReader.books.length > 2 && (
                      <span className="summary-more-books">
                        + và {selectedReader.books.length - 2} cuốn khác...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Tóm lược cảnh báo AI ngắn gọn */}
              <div className={`summary-ai-strip ${
                selectedReader.riskType === 'high' ? 'ai-strip-high' : selectedReader.riskType === 'medium' ? 'ai-strip-med' : 'ai-strip-low'
              }`}>
                {selectedReader.riskType === 'high' ? (
                  <AlertTriangle size={14} />
                ) : selectedReader.riskType === 'medium' ? (
                  <AlertCircle size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>
                  Đánh giá AI: <strong>{getRiskLabel(selectedReader.riskType)}</strong> (Trễ hạn: {selectedReader.riskScore}%)
                </span>
              </div>

              {/* Nút Xem chi tiết đầy đủ (Mở cửa sổ Modal ở giữa) */}
              <button
                type="button"
                className="btn-view-full-detail"
                onClick={() => handleOpenDetailModal(selectedReader)}
                title="Mở cửa sổ ở giữa để xem đầy đủ thông tin hồ sơ độc giả"
              >
                <ExternalLink size={15} />
                <span>Xem chi tiết đầy đủ</span>
              </button>

              {/* Cụm Nút Thao tác nhanh */}
              <div className="summary-quick-actions">
                <button
                  type="button"
                  className="btn-summary-warning"
                  onClick={() => handleSendWarningEmail(selectedReader)}
                  disabled={isSendingWarning}
                  title="Gửi email cảnh báo mượn sách / nợ phạt"
                >
                  {isSendingWarning ? (
                    <Loader2 size={13} className="spin-icon" />
                  ) : (
                    <Mail size={13} />
                  )}
                  <span>Cảnh báo Email</span>
                </button>

                <button
                  type="button"
                  className={!selectedReader.isActive ? 'btn-summary-unlock' : 'btn-summary-lock'}
                  onClick={(e) => requestToggleLock(selectedReader, e, !selectedReader.isActive)}
                  disabled={updatingLockId === (selectedReader.readerId || selectedReader.readerID)}
                  title={!selectedReader.isActive ? 'Mở khóa thẻ' : 'Khóa thẻ bạn đọc'}
                >
                  {!selectedReader.isActive ? <Unlock size={13} /> : <Lock size={13} />}
                  <span>{!selectedReader.isActive ? 'Mở khóa' : 'Khóa thẻ'}</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
              Vui lòng chọn một độc giả để xem tóm tắt thông tin.
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          CỬA SỔ Ở GIỮA: MODAL CHI TIẾT HỒ SƠ ĐỘC GIẢ (POPUP DIALOG)
          ==================================================================== */}
      {detailReader && (
        <div
          className="reader-modal-overlay"
          onClick={handleCloseDetailModal}
        >
          <div
            className="reader-detail-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="reader-detail-modal-header">
              <div className="detail-modal-header-left">
                <img
                  src={detailReader.avatar}
                  alt={detailReader.fullName}
                  className="detail-modal-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackAvatar(detailReader.fullName);
                  }}
                />
                <div className="detail-modal-title-group">
                  <div className="detail-modal-name-row">
                    <h3 className="detail-modal-name">{detailReader.fullName}</h3>
                    {detailReader.memberType === 'Lecturer' ? (
                      <span className="detail-badge-lecturer">Giảng viên</span>
                    ) : (
                      <span className="detail-badge-student">Sinh viên</span>
                    )}
                    <span
                      className={`reader-status-badge ${
                        !detailReader.isActive ? 'reader-status-locked' : 'reader-status-active'
                      }`}
                    >
                      {!detailReader.isActive ? (
                        <>
                          <Lock size={12} />
                          <span>Đã khóa thẻ</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Đang hoạt động</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="detail-modal-subtitle">
                    <span>Mã thẻ: <strong>{detailReader.readerCode}</strong></span>
                    <span>•</span>
                    <span>Khoa: <strong>{detailReader.faculty || 'CNTT'}</strong></span>
                    <span>•</span>
                    <span>Lớp: <strong>{detailReader.classGroup || 'K21-CC'}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-detail-modal-close"
                onClick={handleCloseDetailModal}
                title="Đóng cửa sổ chi tiết (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="reader-detail-modal-body">
              {/* Cảnh báo nếu thẻ bị khóa */}
              {!detailReader.isActive && (
                <div className="detail-alert-locked">
                  <ShieldAlert size={18} />
                  <div>
                    <strong>Thẻ độc giả này đang bị KHÓA!</strong> Hệ thống sẽ tự động TỪ CHỐI mượn sách tại quầy lưu thông cho đến khi được mở khóa.
                  </div>
                </div>
              )}

              {/* 1. Lưới 4 thẻ thống kê chỉ số chuyên sâu */}
              <div className="detail-metrics-grid">
                <div className="detail-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Điểm tín nhiệm</span>
                    <BookOpen size={16} className="metric-icon-blue" />
                  </div>
                  <div className="metric-number-row">
                    <span className={`metric-number ${
                      detailReader.creditScore >= 80 ? 'credit-good' : detailReader.creditScore >= 60 ? 'credit-fair' : 'credit-weak'
                    }`}>
                      {detailReader.creditScore}/100
                    </span>
                    <span className="metric-sub-tag">Xếp hạng: {detailReader.creditRating}</span>
                  </div>
                </div>

                <div className="detail-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Mức độ rủi ro AI</span>
                    <AlertTriangle size={16} className="metric-icon-orange" />
                  </div>
                  <div className="metric-number-row">
                    <span className="metric-number val-orange">
                      {detailReader.riskScore}%
                    </span>
                    <span className={`risk-badge ${
                      detailReader.riskType === 'high' ? 'risk-high' : detailReader.riskType === 'medium' ? 'risk-medium' : 'risk-low'
                    }`}>
                      {getRiskLabel(detailReader.riskType)}
                    </span>
                  </div>
                </div>

                <div className="detail-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Sách đang mượn</span>
                    <BookOpen size={16} className="metric-icon-blue" />
                  </div>
                  <div className="metric-number-row">
                    <span className="metric-number">
                      {detailReader.activeBorrowCount || 0}
                    </span>
                    <span className="metric-sub-text">cuốn sách lưu thông</span>
                  </div>
                </div>

                <div className="detail-metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Nợ phạt tồn đọng</span>
                    <span className="metric-icon-red" style={{ fontWeight: 800 }}>$</span>
                  </div>
                  <div className="metric-number-row">
                    <span className={`metric-number ${
                      (detailReader.fineDebtRaw || 0) > 0 ? 'debt-active' : 'debt-zero'
                    }`}>
                      {detailReader.fineDebt || '0 VNĐ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Thông tin hồ sơ & Liên hệ chi tiết */}
              <div className="detail-section-card">
                <h4 className="detail-section-title">
                  <Users size={16} />
                  <span>Thông tin định danh & Liên lạc</span>
                </h4>
                <div className="detail-info-grid">
                  <div className="info-item">
                    <span className="info-key">Họ và tên độc giả:</span>
                    <span className="info-val font-semibold">{detailReader.fullName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Mã thẻ bạn đọc (MSSV):</span>
                    <span className="info-val font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <CreditCard size={13} color="#2563eb" />
                      <span>{detailReader.readerCode}</span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Tài khoản đăng nhập:</span>
                    <span className="info-val">{detailReader.username || detailReader.readerCode}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Địa chỉ Email:</span>
                    <span className="info-val email-link" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Mail size={13} color="#2563eb" />
                      <span>{detailReader.email || 'Chưa cập nhật'}</span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Số điện thoại:</span>
                    <span className="info-val" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Phone size={13} color="#64748b" />
                      <span>{detailReader.phone || 'Chưa cập nhật'}</span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Khoa / Viện đào tạo:</span>
                    <span className="info-val">{detailReader.faculty || 'CNTT'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Lớp sinh hoạt / Khóa:</span>
                    <span className="info-val">{detailReader.classGroup || 'K21-CC'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Phân loại độc giả:</span>
                    <span className="info-val">{detailReader.memberType === 'Lecturer' ? 'Giảng viên' : 'Sinh viên'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-key">Hạn sử dụng thẻ:</span>
                    <span className="info-val" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} color="#64748b" />
                      <span>{detailReader.expiryDate ? new Date(detailReader.expiryDate).toLocaleDateString('vi-VN') : 'Không thời hạn'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Phân tích & Trực quan hóa rủi ro từ AI */}
              <div
                className={`ai-risk-alert-box detail-ai-box ${
                  detailReader.riskType === 'high'
                    ? 'alert-high'
                    : detailReader.riskType === 'medium'
                    ? 'alert-medium'
                    : 'alert-low'
                }`}
              >
                <div className="ai-alert-title-row">
                  {detailReader.riskType === 'high' ? (
                    <AlertTriangle size={18} />
                  ) : detailReader.riskType === 'medium' ? (
                    <AlertCircle size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} />
                    Trợ lý AI Đánh Giá Nguy Cơ Trễ Hạn: {detailReader.riskScore}%
                  </span>
                  <span className="ai-alert-level" style={{ marginLeft: 'auto' }}>
                    {detailReader.riskType === 'high'
                      ? 'MỨC ĐỘ: RỦI RO CAO'
                      : detailReader.riskType === 'medium'
                      ? 'MỨC ĐỘ: RỦI RO TRUNG BÌNH'
                      : 'MỨC ĐỘ: AN TOÀN'}
                  </span>
                </div>
                <p className="ai-alert-desc" style={{ fontSize: '13px', marginTop: '6px' }}>
                  {detailReader.aiDiagnosis || 'Hệ thống AI không phát hiện dấu hiệu bất thường trong lịch sử lưu thông của bạn đọc này.'}
                </p>
              </div>

              {/* 4. Danh mục sách đang mượn */}
              <div className="detail-section-card">
                <div className="detail-section-title-row">
                  <h4 className="detail-section-title">
                    <BookOpen size={16} />
                    <span>Danh mục sách đang mượn ({detailReader.books?.length || 0} cuốn)</span>
                  </h4>
                </div>

                {!detailReader.books || detailReader.books.length === 0 ? (
                  <div className="detail-empty-books">
                    <CheckCircle2 size={24} color="#16a34a" />
                    <p>Hiện tại độc giả không giữ bất kỳ cuốn sách nào của thư viện.</p>
                  </div>
                ) : (
                  <div className="detail-book-list">
                    {detailReader.books.map((b, idx) => (
                      <div key={idx} className="detail-book-item">
                        <div className="detail-book-main">
                          <span className="detail-book-title">{b.title}</span>
                          <span className="detail-book-sub">{b.subText}</span>
                        </div>
                        <div className="detail-book-badge-wrap">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="reader-detail-modal-footer">
              <button
                type="button"
                className="btn-warning-email"
                style={{ width: 'auto', padding: '8px 16px' }}
                onClick={() => handleSendWarningEmail(detailReader)}
                disabled={isSendingWarning}
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
                className={!detailReader.isActive ? 'btn-unlock-account' : 'btn-lock-account'}
                style={{ width: 'auto', padding: '8px 16px' }}
                onClick={(e) => requestToggleLock(detailReader, e, !detailReader.isActive)}
                disabled={updatingLockId === (detailReader.readerId || detailReader.readerID)}
              >
                {!detailReader.isActive ? (
                  <>
                    <Unlock size={16} />
                    <span>Mở khóa thẻ độc giả</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Khóa thẻ độc giả</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-modal-cancel"
                onClick={handleCloseDetailModal}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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
