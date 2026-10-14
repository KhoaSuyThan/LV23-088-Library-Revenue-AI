import React, { useState, useMemo, useEffect } from 'react';
import {
  Receipt,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCw,
  Download
} from 'lucide-react';

import TablePagination from '../common/TablePagination';

/**
 * Component Tab 2: Sổ nợ đọng & Xử lý sách hư hỏng (Story LOLRA-19)
 * Dữ liệu 100% từ SQL Server: Hỗ trợ phân trang danh sách, tìm kiếm nhanh và xuất file Excel
 */
export default function RevenueArrearsTab({
  backendPendingFines = [],
  isLoadingFines = false,
  fetchPendingFines,
  onOpenPayModal,
  onExportExcel
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Reset về trang 1 khi người dùng đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Cắt mảng theo trang hiện tại
  const paginatedFines = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFines.slice(startIndex, startIndex + pageSize);
  }, [filteredFines, currentPage, pageSize]);

  const handleRefresh = () => {
    if (fetchPendingFines) {
      fetchPendingFines();
    }
    setCurrentPage(1);
  };

  // Lấy các trường hợp nợ phạt quá hạn cao nhất từ SQL Server để ưu tiên thu hồi
  const topSevereFines = useMemo(() => {
    if (!backendPendingFines || backendPendingFines.length === 0) return [];
    return [...backendPendingFines]
      .sort((a, b) => (b.finalAmount || 0) - (a.finalAmount || 0) || (b.daysOverdue || 0) - (a.daysOverdue || 0))
      .slice(0, 5);
  }, [backendPendingFines]);

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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                style={{
                  fontSize: '12px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px'
                }}
                title="Xuất toàn bộ danh sách nợ phạt ra file Excel (.CSV UTF-8 chuẩn có dấu)"
              >
                <Download size={13} />
                <span>Xuất Excel ({backendPendingFines.length})</span>
              </button>
            )}
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

        {/* THANH ĐIỀU KHIỂN PHÂN TRANG CHUẨN */}
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[10, 20, 50]}
          unitLabel="khoản nợ"
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CỘT PHẢI: CÁC TRƯỜNG HỢP NỢ PHẠT CAO NHẤT CẦN ƯU TIÊN THU HỒI */}
      <div className="arrears-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
            Top vi phạm nợ phạt cao nhất ({topSevereFines.length})
          </h3>
          <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 700, backgroundColor: '#fef2f2', padding: '2px 8px', borderRadius: '4px' }}>
            Ưu tiên thu hồi
          </span>
        </div>
        <div className="arrears-list">
          {topSevereFines.length > 0 ? (
            topSevereFines.map((c, i) => (
              <div
                key={c.receiptId || i}
                className="arrears-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                    {c.readerName} ({c.readerCode})
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {c.bookTitle} • Phiếu: <strong>{c.borrowCode}</strong>
                  </div>
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
                    Quá hạn {c.daysOverdue || 0} ngày
                  </span>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '14px' }}>
                    {c.finalAmount?.toLocaleString('vi-VN')} đ
                  </div>
                  <button
                    type="button"
                    className="btn-primary-action"
                    style={{ padding: '3px 8px', fontSize: '11.5px', borderRadius: '4px' }}
                    onClick={() => onOpenPayModal && onOpenPayModal(c)}
                    title="Thu tiền phạt cho trường hợp này"
                  >
                    <Receipt size={12} />
                    <span>Thu ngay</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b', fontSize: '13px' }}>
              Không có trường hợp nợ phạt nào cần ưu tiên xử lý.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
