import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCw
} from 'lucide-react';

/**
 * Component Tab 2: Sổ nợ đọng & Xử lý sách hư hỏng (Story LOLRA-19)
 * Hỗ trợ phân trang danh sách & tìm kiếm nhanh
 */
export default function RevenueArrearsTab({
  backendPendingFines = [],
  isLoadingFines = false,
  fetchPendingFines,
  onOpenPayModal
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Lọc danh sách khoản nợ phạt theo từ khóa tìm kiếm
  const filteredFines = useMemo(() => {
    if (!searchQuery.trim()) return backendPendingFines;
    const q = searchQuery.toLowerCase().trim();
    return backendPendingFines.filter((item) => {
      const name = (item.readerName || '').toLowerCase();
      const code = (item.readerCode || '').toLowerCase();
      const book = (item.bookTitle || '').toLowerCase();
      const borrow = (item.borrowCode || '').toLowerCase();
      return name.includes(q) || code.includes(q) || book.includes(q) || borrow.includes(q);
    });
  }, [backendPendingFines, searchQuery]);

  const totalItems = filteredFines.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Tự động điều chỉnh trang nếu vượt quá giới hạn sau khi lọc
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Đồng bộ giá trị input nhảy trang
  useEffect(() => {
    setJumpPageInput(currentPage.toString());
  }, [currentPage]);

  // Cắt mảng theo trang hiện tại
  const paginatedFines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFines.slice(startIndex, startIndex + pageSize);
  }, [filteredFines, currentPage, pageSize]);

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Tính danh sách các nút phân trang có hỗ trợ dấu ...
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleRefresh = () => {
    if (fetchPendingFines) {
      fetchPendingFines();
    }
    setCurrentPage(1);
  };

  const handleJumpPage = (e) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(jumpPageInput, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
      } else {
        setJumpPageInput(currentPage.toString());
      }
      e.target.blur();
    }
  };

  const handleJumpBlur = () => {
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      setJumpPageInput(currentPage.toString());
    }
  };

  return (
    <div className="arrears-grid">
      {/* CỘT TRÁI: DANH SÁCH CÁC TRƯỜNG HỢP QUÁ HẠN & NỢ PHẠT TÍCH LŨY */}
      <div className="arrears-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Danh sách các trường hợp quá hạn & nợ phạt tích lũy{' '}
            <span style={{ color: '#2563eb', fontWeight: 600 }}>
              ({searchQuery ? `${filteredFines.length}/` : ''}
              {backendPendingFines.length > 0 ? backendPendingFines.length : 0})
            </span>
          </h3>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoadingFines}
            style={{
              fontSize: '12.5px',
              background: 'none',
              border: 'none',
              color: '#2563eb',
              cursor: isLoadingFines ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            <RotateCw size={13} className={isLoadingFines ? 'spin-icon' : ''} />
            <span>{isLoadingFines ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {/* Ô TÌM KIẾM NHANH */}
        {backendPendingFines.length > 0 && (
          <div className="arrears-search-box">
            <Search size={15} className="arrears-search-icon" />
            <input
              type="text"
              className="arrears-search-input"
              placeholder="Tìm theo tên độc giả, MSSV, tên sách, mã phiếu mượn..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="arrears-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                title="Xóa bộ lọc tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* DANH SÁCH CÁC KHOẢN PHẠT */}
        <div className="arrears-list">
          {paginatedFines.length > 0 ? (
            paginatedFines.map((item, idx) => (
              <div
                key={item.receiptId || item.borrowCode || `${currentPage}-${idx}`}
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
          ) : searchQuery ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13.5px' }}>
              <div>Không tìm thấy trường hợp nợ phạt nào khớp với "<strong>{searchQuery}</strong>"</div>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  marginTop: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  color: '#2563eb',
                  fontWeight: 600
                }}
              >
                Xóa tìm kiếm
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13.5px' }}>
              🎉 Hiện tại không có độc giả nào có khoản phạt nợ đọng!
            </div>
          )}
        </div>

        {/* THANH ĐIỀU KHIỂN PHÂN TRANG */}
        {totalItems > 0 && (
          <div className="arrears-pagination">
            <div className="arrears-pagination-info">
              <span>
                Hiển thị <strong>{startIdx} - {endIdx}</strong> / <strong>{totalItems.toLocaleString('vi-VN')}</strong> trường hợp
              </span>
              <div className="arrears-page-size-wrap">
                <label htmlFor="arrearsPageSizeSelect" style={{ fontSize: '12px', color: '#64748b' }}>
                  Hiển thị:
                </label>
                <select
                  id="arrearsPageSizeSelect"
                  className="arrears-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  title="Chọn số lượng trường hợp hiển thị trên mỗi trang"
                >
                  <option value={5}>5 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>
            </div>

            <div className="arrears-pagination-controls">
              <button
                type="button"
                className="arrears-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="Trang đầu"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                className="arrears-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Trang trước"
              >
                <ChevronLeft size={15} />
              </button>

              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="arrears-page-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={`arrears-page-btn ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className="arrears-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Trang tiếp"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                className="arrears-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Trang cuối"
              >
                <ChevronsRight size={15} />
              </button>

              {totalPages > 5 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', fontSize: '12px', color: '#64748b' }}>
                  <span>Đến</span>
                  <input
                    type="text"
                    style={{
                      width: '42px',
                      height: '28px',
                      textAlign: 'center',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#2563eb',
                      outline: 'none',
                      backgroundColor: '#f8fafc'
                    }}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    onKeyDown={handleJumpPage}
                    onBlur={handleJumpBlur}
                    title="Nhập số trang và nhấn Enter"
                  />
                </div>
              )}
            </div>
          </div>
        )}
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
