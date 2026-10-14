import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './TablePagination.css';

/**
 * Component phân trang chuẩn hóa dùng chung cho toàn bộ bảng dữ liệu trong SmartLib AI.
 * Khớp 100% mẫu phân trang của Phân hệ Quản lý Sách (BookCatalog).
 * 
 * @param {number} currentPage - Trang hiện tại (1-indexed)
 * @param {number} pageSize - Số dòng hiển thị trên mỗi trang
 * @param {number} totalItems - Tổng số bản ghi thực tế
 * @param {number[]} pageSizeOptions - Danh sách tùy chọn số dòng/trang (ví dụ: [10, 20, 50])
 * @param {string} unitLabel - Tên đơn vị đối tượng hiển thị (ví dụ: "độc giả", "khoản nợ", "biên lai")
 * @param {(newPage: number) => void} onPageChange - Callback khi chuyển trang
 * @param {(newSize: number) => void} onPageSizeChange - Callback khi đổi số dòng/trang
 * @param {string} className - Class CSS tùy chọn thêm bên ngoài
 */
export default function TablePagination({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  pageSizeOptions = [10, 20, 50],
  unitLabel = 'bản ghi',
  onPageChange,
  onPageSizeChange,
  className = ''
}) {
  const [jumpPage, setJumpPage] = useState(String(currentPage));
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Đồng bộ giá trị ô nhập khi currentPage thay đổi từ bên ngoài
  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage]);

  // Xử lý xác nhận số trang khi nhấn Enter hoặc mất tiêu điểm (onBlur)
  const handleCommitPage = () => {
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      if (pageNum !== currentPage && onPageChange) {
        onPageChange(pageNum);
      }
    } else {
      // Hoàn tác về trang hiện tại nếu người dùng nhập không hợp lệ
      setJumpPage(String(currentPage));
    }
  };

  return (
    <div className={`table-pagination-container ${className}`}>
      {/* NHÓM TRÁI: THÔNG TIN PHẠM VI DÒNG & BỘ CHỌN KÍCH THƯỚC TRANG */}
      <div className="table-pagination-left-group">
        <div className="table-pagination-info">
          Hiển thị {startIdx}-{endIdx} / {totalItems.toLocaleString('vi-VN')} {unitLabel}
        </div>

        <div className="table-pagination-size-selector">
          <label htmlFor={`pageSizeSelect-${unitLabel}`} className="table-size-selector-label">
            Hiển thị:
          </label>
          <select
            id={`pageSizeSelect-${unitLabel}`}
            className="table-size-selector-select"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) {
                onPageSizeChange(newSize);
              }
            }}
            title={`Chọn số lượng ${unitLabel} hiển thị trên mỗi trang`}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* NHÓM PHẢI: NÚT ĐIỀU HƯỚNG & Ô NHẬP NHẢY TRANG TRỰC TIẾP */}
      <div className="table-pagination-controls">
        <button
          type="button"
          className="table-pagination-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="table-pagination-page-indicator">
          <span>Trang</span>
          <input
            type="text"
            className="table-pagination-page-input"
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCommitPage();
                e.target.blur();
              }
            }}
            onBlur={handleCommitPage}
            title={`Nhập trang từ 1 đến ${totalPages.toLocaleString('vi-VN')}`}
          />
          <span>/ {totalPages.toLocaleString('vi-VN')}</span>
        </div>

        <button
          type="button"
          className="table-pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
          title="Trang tiếp"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
