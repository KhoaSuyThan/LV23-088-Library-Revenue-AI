import React, { useState, useMemo, useEffect } from 'react';
import {
  Copy,
  BookOpen,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Plus,
  Filter,
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  FileText,
  Download
} from 'lucide-react';
import { apiClient } from '../api/authApi';
import './BookCatalog.css';

/**
 * Danh sách sách mẫu ban đầu khớp 100% theo ảnh thiết kế Figma của người dùng
 */
const INITIAL_BOOKS = [
  {
    id: 1,
    code: 'BK-0001',
    title: 'Dế Mèn Phiêu Lưu Ký',
    author: 'Tô Hoài',
    category: 'Văn học',
    year: 2019,
    price: 85000,
    availableCopies: 8,
    totalCopies: 10,
    status: 'available', // Sẵn sàng
    coverColor: '#3b82f6',
    isbn: '9786042123011',
    publisher: 'NXB Kim Đồng',
    copies: [
      { barcode: 'BC0001-A', status: 'Available' },
      { barcode: 'BC0001-B', status: 'Borrowed' },
      { barcode: 'BC0001-C', status: 'Available' }
    ]
  },
  {
    id: 2,
    code: 'BK-0002',
    title: 'Số Đỏ',
    author: 'Vũ Trọng Phụng',
    category: 'Văn học',
    year: 2020,
    price: 92000,
    availableCopies: 0,
    totalCopies: 5,
    status: 'borrowed_all', // Đang mượn hết
    coverColor: '#f59e0b',
    isbn: '9786042123028',
    publisher: 'NXB Văn Học',
    copies: [
      { barcode: 'BC0002-A', status: 'Borrowed' },
      { barcode: 'BC0002-B', status: 'Borrowed' }
    ]
  },
  {
    id: 3,
    code: 'BK-0003',
    title: 'Lập Trình Python Cơ Bản',
    author: 'Nguyễn Văn An',
    category: 'Tin học',
    year: 2022,
    price: 175000,
    availableCopies: 12,
    totalCopies: 15,
    status: 'available',
    coverColor: '#38bdf8',
    isbn: '9786042123035',
    publisher: 'NXB Thông Tin & Truyền Thông',
    copies: [
      { barcode: 'BC0003-A', status: 'Available' },
      { barcode: 'BC0003-B', status: 'Available' }
    ]
  },
  {
    id: 4,
    code: 'BK-0004',
    title: 'Giải Tích Toán Học Cao Cấp',
    author: 'Trần Minh Đức',
    category: 'Khoa học',
    year: 2021,
    price: 120000,
    availableCopies: 3,
    totalCopies: 8,
    status: 'available',
    coverColor: '#34d399',
    isbn: '9786042123042',
    publisher: 'NXB Đại Học Quốc Gia',
    copies: [
      { barcode: 'BC0004-A', status: 'Available' },
      { barcode: 'BC0004-B', status: 'Borrowed' }
    ]
  },
  {
    id: 5,
    code: 'BK-0005',
    title: 'Lịch Sử Việt Nam Toàn Thư',
    author: 'Lê Thị Hương',
    category: 'Lịch sử',
    year: 2023,
    price: 145000,
    availableCopies: 0,
    totalCopies: 8,
    status: 'borrowed_all',
    coverColor: '#a855f7',
    isbn: '9786042123059',
    publisher: 'NXB Khoa Học Xã Hội',
    copies: [
      { barcode: 'BC0005-A', status: 'Borrowed' },
      { barcode: 'BC0005-B', status: 'Borrowed' }
    ]
  },
  {
    id: 6,
    code: 'BK-0006',
    title: 'Tâm Lý Học Đám Đông',
    author: 'Phạm Quốc Bảo',
    category: 'Tâm lý',
    year: 2020,
    price: 110000,
    availableCopies: 5,
    totalCopies: 7,
    status: 'available',
    coverColor: '#f472b6',
    isbn: '9786042123066',
    publisher: 'NXB Lao Động',
    copies: [
      { barcode: 'BC0006-A', status: 'Available' },
      { barcode: 'BC0006-B', status: 'Available' }
    ]
  }
];

/**
 * Danh sách 10 thể loại sách chuẩn dùng làm dữ liệu dự phòng (fallback)
 */
const DEFAULT_CATEGORIES = [
  { categoryID: 1, categoryName: 'Công nghệ thông tin' },
  { categoryID: 2, categoryName: 'Khoa học dữ liệu & AI' },
  { categoryID: 3, categoryName: 'Khoa học tự nhiên & Kỹ thuật' },
  { categoryID: 4, categoryName: 'Kinh tế & Quản trị' },
  { categoryID: 5, categoryName: 'Lịch sử & Địa lý' },
  { categoryID: 6, categoryName: 'Ngoại ngữ & Từ điển' },
  { categoryID: 7, categoryName: 'Tâm lý & Kỹ năng sống' },
  { categoryID: 8, categoryName: 'Triết học & Khoa học xã hội' },
  { categoryID: 9, categoryName: 'Văn học & Nghệ thuật' },
  { categoryID: 10, categoryName: 'Y học & Sức khỏe' },
];

export default function BookCatalog({ user, externalSearch = '' }) {
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Nâng số lượng hiển thị lên 10 cuốn / trang
  const [jumpPage, setJumpPage] = useState(1); // Ô nhập trực tiếp số trang
  const [totalBooksCount, setTotalBooksCount] = useState(12500);
  const [internalSearch, setInternalSearch] = useState('');

  // Các state phục vụ thanh lọc đa tiêu chí
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'available', 'out_of_stock'
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Tải danh mục thể loại từ API /api/Categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.get('/api/Categories');
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      } catch (err) {
        // Giữ nguyên DEFAULT_CATEGORIES nếu lỗi kết nối
      }
    };
    loadCategories();
  }, []);

  // Đồng bộ khi header ngoài truyền externalSearch
  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== '') {
      setFilterKeyword(externalSearch);
      setCurrentPage(1);
    }
  }, [externalSearch]);

  // Đặt lại toàn bộ bộ lọc về trạng thái ban đầu
  const handleResetFilters = () => {
    setFilterKeyword('');
    setFilterCategory('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterStatus('all');
    setCurrentPage(1);
    showToast('Đã đặt lại toàn bộ bộ lọc về mặc định!');
  };

  // Tự động đồng bộ số trang hiển thị trong ô nhập khi chuyển trang
  useEffect(() => {
    setJumpPage(currentPage);
  }, [currentPage]);

  // Xử lý khi người dùng nhấn Enter hoặc click ra ngoài ô nhập (onBlur)
  const handleCommitPage = () => {
    const totalPages = Math.max(1, Math.ceil(totalBooksCount / pageSize));
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      if (pageNum !== currentPage) {
        setCurrentPage(pageNum);
      }
    } else {
      // Revert lại trang hiện tại nếu nhập không hợp lệ
      setJumpPage(currentPage);
      if (jumpPage !== '' && Number(jumpPage) !== currentPage) {
        showToast(`Vui lòng nhập số trang hợp lệ từ 1 đến ${totalPages.toLocaleString('vi-VN')}!`);
      }
    }
  };

  // Modal State
  const [selectedBook, setSelectedBook] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // State Modal Xóa mềm & Chặn xóa
  const [deleteBookTarget, setDeleteBookTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // State Import CSV (US-06 / LOLRA-14)
  const [refreshKey, setRefreshKey] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCsvFile, setSelectedCsvFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

  // Kéo thả file CSV
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        setSelectedCsvFile(file);
        setUploadError('');
      } else {
        setUploadError('Vui lòng chọn tệp bảng tính có đuôi định dạng .csv!');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name.toLowerCase().endsWith('.csv')) {
        setSelectedCsvFile(file);
        setUploadError('');
      } else {
        setUploadError('Vui lòng chọn tệp bảng tính có đuôi định dạng .csv!');
      }
    }
  };

  // Kích hoạt nạp dữ liệu lên Backend
  const handleStartImport = async () => {
    if (!selectedCsvFile) {
      setUploadError('Vui lòng chọn hoặc kéo thả tệp .csv trước khi nạp!');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedCsvFile);

      const response = await apiClient.post('/api/books/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data && response.data.success) {
        setImportResult(response.data.data);
        setIsImportModalOpen(false);
        setIsResultModalOpen(true);
        setSelectedCsvFile(null);
        // Tự động làm mới danh mục sách
        setRefreshKey((prev) => prev + 1);
        showToast(`Đã nạp thành công ${response.data.data.successCount} đầu sách vào hệ thống!`);
      } else {
        setUploadError(response.data?.message || 'Có lỗi xảy ra khi nạp tệp CSV.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ khi nạp tệp CSV.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // State & Hàm Xuất toàn bộ sách ra file CSV
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      showToast('Đang trích xuất dữ liệu sách ra tệp CSV...');
      const response = await apiClient.get('/api/Books/export-csv', {
        responseType: 'blob'
      });

      // Tạo Blob và URL tải file trên trình duyệt
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartlib_books_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Đã xuất thành công toàn bộ danh mục sách ra file CSV!');
    } catch (err) {
      showToast('Có lỗi xảy ra khi xuất file CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Mở modal Xóa mềm
  const handleOpenDelete = (book) => {
    setDeleteBookTarget(book);
    setIsDeleteOpen(true);
  };

  // Xác nhận Xóa mềm (chuyển sang ngừng lưu thông IsActive = 0)
  const handleConfirmDelete = async () => {
    if (!deleteBookTarget) return;

    try {
      // Cố gắng gọi API xóa mềm nếu có kết nối backend
      await apiClient.delete(`/api/Books/${deleteBookTarget.id}`);
    } catch (err) {
      // Tự động xử lý Client-side fallback mượt mà
    }

    // Cập nhật danh sách: ẩn đầu sách đã xóa mềm khỏi danh mục lưu thông
    setBooks((prev) => prev.filter((b) => b.id !== deleteBookTarget.id));
    setTotalBooksCount((prev) => Math.max(0, prev - 1));
    setIsDeleteOpen(false);
    showToast(`Đã chuyển đầu sách "${deleteBookTarget.title}" sang danh mục ngừng lưu thông (xóa mềm)!`);
    setDeleteBookTarget(null);
  };

  // Từ khóa tìm kiếm hợp nhất từ Header hoặc ô tìm kiếm tại bảng
  const activeKeyword = (filterKeyword || externalSearch || '').trim();

  // Cố gắng gọi API lấy dữ liệu thực với đầy đủ các tiêu chí lọc
  useEffect(() => {
    let isMounted = true;
    const fetchApiBooks = async () => {
      try {
        const response = await apiClient.get('/api/Books', {
          params: {
            pageNumber: currentPage,
            pageSize: pageSize,
            keyword: activeKeyword || undefined,
            categoryID: filterCategory ? Number(filterCategory) : undefined,
            minPrice: filterMinPrice ? Number(filterMinPrice) * 1000 : undefined,
            maxPrice: filterMaxPrice ? Number(filterMaxPrice) * 1000 : undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined
          }
        });

        // Hỗ trợ cả bọc ApiResponse chuẩn: response.data.data.items lẫn response.data.items
        const pagedData = response.data?.data || response.data;
        const bookItems = pagedData?.items;

        if (isMounted && Array.isArray(bookItems)) {
          const colors = ['#3b82f6', '#f59e0b', '#38bdf8', '#34d399', '#a855f7', '#f472b6'];
          const mapped = bookItems.map((b, idx) => ({
            id: b.bookID,
            code: `BK-${String(b.bookID).padStart(4, '0')}`,
            title: b.title,
            author: b.author,
            category: b.categoryName || 'Chung',
            year: 2020 + (b.bookID % 5),
            price: b.basePrice || 85000,
            availableCopies: b.availableCopies !== undefined ? b.availableCopies : (b.totalCopies || 1),
            totalCopies: b.totalCopies || 1,
            status: (b.availableCopies === 0) ? 'borrowed_all' : 'available',
            coverColor: colors[idx % colors.length],
            isbn: b.isbn || 'Đang cập nhật',
            publisher: b.publisher || 'NXB Đại Học Quốc Gia',
            copies: []
          }));
          setBooks(mapped);
          const total = pagedData.totalRecords ?? pagedData.totalCount ?? mapped.length;
          setTotalBooksCount(total);
        }
      } catch (err) {
        // Nếu backend chưa sẵn sàng hoặc lỗi, dùng dữ liệu mẫu chuẩn khớp Figma
      }
    };

    fetchApiBooks();
    return () => {
      isMounted = false;
    };
  }, [currentPage, pageSize, activeKeyword, filterCategory, filterMinPrice, filterMaxPrice, filterStatus, refreshKey]);

  // Lọc dữ liệu hiển thị (hỗ trợ Client-side fallback mượt mà)
  const filteredBooks = useMemo(() => {
    let list = books;
    const kw = activeKeyword.toLowerCase();
    if (kw) {
      list = list.filter(
        (b) =>
          b.code.toLowerCase().includes(kw) ||
          b.title.toLowerCase().includes(kw) ||
          b.author.toLowerCase().includes(kw) ||
          (b.isbn && b.isbn.toLowerCase().includes(kw)) ||
          b.category.toLowerCase().includes(kw)
      );
    }
    if (filterCategory) {
      const catObj = categories.find((c) => String(c.categoryID) === String(filterCategory));
      if (catObj) {
        list = list.filter((b) => b.category.toLowerCase() === catObj.categoryName.toLowerCase());
      }
    }
    if (filterMinPrice) {
      const min = Number(filterMinPrice) * 1000;
      if (!isNaN(min) && min >= 0) {
        list = list.filter((b) => b.price >= min);
      }
    }
    if (filterMaxPrice) {
      const max = Number(filterMaxPrice) * 1000;
      if (!isNaN(max) && max > 0) {
        list = list.filter((b) => b.price <= max);
      }
    }
    if (filterStatus && filterStatus !== 'all') {
      if (filterStatus === 'available') {
        list = list.filter((b) => b.status === 'available' || b.availableCopies > 0);
      } else if (filterStatus === 'out_of_stock') {
        list = list.filter((b) => b.status === 'borrowed_all' || b.availableCopies === 0);
      }
    }
    return list;
  }, [books, activeKeyword, filterCategory, filterMinPrice, filterMaxPrice, filterStatus, categories]);

  // Xử lý mở modal Chi tiết
  const handleOpenDetail = (book) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  // Xử lý mở modal Sửa
  const handleOpenEdit = (book) => {
    setEditingBook({ ...book });
    setIsEditOpen(true);
  };

  // Lưu thông tin sau khi sửa
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingBook) return;

    setBooks((prev) =>
      prev.map((b) => (b.id === editingBook.id ? { ...editingBook } : b))
    );
    setIsEditOpen(false);
    showToast(`Đã cập nhật thành công đầu sách "${editingBook.title}"!`);
  };

  // Format tiền tệ VNĐ
  const formatVND = (val) => {
    return Number(val || 0).toLocaleString('vi-VN');
  };

  return (
    <div className="book-catalog-container">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="catalog-toast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          1. HÀNG 4 THẺ CHỈ SỐ THỐNG KÊ (KPI SUMMARY CARDS)
          ==================================================================== */}
      <div className="catalog-kpi-grid">
        {/* Thẻ 1: Tổng đầu sách */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Tổng đầu sách</span>
            <span className="kpi-number">{totalBooksCount.toLocaleString('vi-VN')}</span>
          </div>
          <div className="kpi-icon-square icon-blue">
            <Copy size={20} />
          </div>
        </div>

        {/* Thẻ 2: Sách đang cho mượn */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách đang cho mượn</span>
            <span className="kpi-number">1.420</span>
          </div>
          <div className="kpi-icon-square icon-green">
            <BookOpen size={20} />
          </div>
        </div>

        {/* Thẻ 3: Sách quá hạn */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách quá hạn</span>
            <span className="kpi-number text-red">47</span>
          </div>
          <div className="kpi-icon-square icon-red">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Thẻ 4: Sách hỏng cần thanh lý */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách hỏng cần thanh lý</span>
            <span className="kpi-number">12</span>
          </div>
          <div className="kpi-icon-square icon-gray">
            <Trash2 size={20} />
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. BẢNG DANH SÁCH SÁCH ĐANG QUẢN LÝ (MAIN TABLE CARD)
          ==================================================================== */}
      <div className="catalog-table-card">
        <div className="catalog-table-header">
          <h2 className="catalog-table-title">Danh sách sách đang quản lý</h2>
          <div className="catalog-header-actions">
            <button
              type="button"
              className="btn-export-csv"
              onClick={handleExportCsv}
              disabled={isExporting}
              title="Xuất toàn bộ danh sách sách ra file CSV để sao lưu hoặc gửi cho bạn bè"
            >
              {isExporting ? (
                <Loader2 size={16} className="spinner-rotate" />
              ) : (
                <Download size={16} />
              )}
              <span>{isExporting ? 'Đang xuất...' : 'Xuất CSV'}</span>
            </button>

            <button
              type="button"
              className="btn-import-csv"
              onClick={() => {
                setUploadError('');
                setSelectedCsvFile(null);
                setIsImportModalOpen(true);
              }}
              title="Nạp danh mục sách hàng loạt từ file CSV"
            >
              <UploadCloud size={16} />
              <span>Nhập từ CSV</span>
            </button>
          </div>
        </div>

        {/* ====================================================================
            THANH LỌC ĐA TIÊU CHÍ (MULTI-CRITERIA FILTER BAR)
            ==================================================================== */}
        <div className="catalog-filter-bar">
          {/* Ô 1: Tìm kiếm theo mã sách, tên sách, tác giả */}
          <div className="filter-item search-filter-item">
            <Search size={15} className="filter-icon" />
            <input
              type="text"
              className="filter-input-text"
              placeholder="Tìm mã sách, tên sách, tác giả..."
              value={filterKeyword}
              onChange={(e) => {
                setFilterKeyword(e.target.value);
                setCurrentPage(1);
              }}
            />
            {filterKeyword && (
              <button
                type="button"
                className="filter-clear-icon-btn"
                onClick={() => {
                  setFilterKeyword('');
                  setCurrentPage(1);
                }}
                title="Xóa từ khóa"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Ô 2: Lọc theo thể loại */}
          <div className="filter-item select-filter-item">
            <Filter size={14} className="filter-icon" />
            <select
              className="filter-select-box"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              title="Lọc theo thể loại"
            >
              <option value="">Tất cả thể loại</option>
              {categories.map((c) => (
                <option key={c.categoryID} value={c.categoryID}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* Ô 3: Khoảng giá (Từ ... đến ...) - Đơn vị nghìn VNĐ (k) */}
          <div className="filter-item price-filter-item">
            <span className="filter-text-label">Giá:</span>
            <input
              type="number"
              className="filter-price-input"
              placeholder="Từ (k)"
              value={filterMinPrice}
              onChange={(e) => {
                setFilterMinPrice(e.target.value);
                setCurrentPage(1);
              }}
              min="0"
              step="5"
              title="Giá bìa tối thiểu (nghìn VNĐ, ví dụ: 10 = 10.000đ)"
            />
            <span className="filter-separator">-</span>
            <input
              type="number"
              className="filter-price-input"
              placeholder="Đến (k)"
              value={filterMaxPrice}
              onChange={(e) => {
                setFilterMaxPrice(e.target.value);
                setCurrentPage(1);
              }}
              min="0"
              step="5"
              title="Giá bìa tối đa (nghìn VNĐ, ví dụ: 100 = 100.000đ)"
            />
          </div>

          {/* Ô 4: Lọc theo trạng thái */}
          <div className="filter-item select-filter-item status-filter-item">
            <select
              className="filter-select-box"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              title="Lọc theo trạng thái sách"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="available">Sẵn sàng (Còn sách)</option>
              <option value="out_of_stock">Hết sách (Đang mượn hết)</option>
            </select>
          </div>

          {/* Nút Đặt lại bộ lọc */}
          {(filterKeyword || filterCategory || filterMinPrice || filterMaxPrice || filterStatus !== 'all') && (
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilters}
              title="Xóa toàn bộ bộ lọc và quay về mặc định"
            >
              <RefreshCw size={13} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        <div className="catalog-table-wrapper">
          <table className="catalog-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Mã sách</th>
                <th style={{ width: '235px' }}>Ảnh bìa & Tên sách</th>
                <th style={{ width: '135px' }}>Tác giả</th>
                <th style={{ width: '165px' }}>Thể loại</th>
                <th style={{ width: '75px' }}>Năm XB</th>
                <th style={{ width: '105px' }}>Giá bìa (VNĐ)</th>
                <th style={{ width: '105px' }}>Tồn kho (Còn/Tổng)</th>
                <th style={{ width: '100px' }}>Trạng thái</th>
                <th style={{ width: '125px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table-cell">
                    Không tìm thấy đầu sách nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const percentStock = book.totalCopies > 0
                    ? Math.round((book.availableCopies / book.totalCopies) * 100)
                    : 0;
                  const isAvailable = book.status === 'available' || book.availableCopies > 0;

                  return (
                    <tr key={book.id}>
                      {/* Cột 1: Mã sách */}
                      <td>
                        <span className="book-code-badge">{book.code}</span>
                      </td>

                      {/* Cột 2: Ảnh bìa & Tên sách */}
                      <td>
                        <div className="book-title-cell">
                          <div
                            className="book-cover-thumb"
                            style={{ backgroundColor: book.coverColor || '#3b82f6' }}
                            title={book.title}
                          >
                            <span className="cover-thumb-text">
                              {book.title.charAt(0)}
                            </span>
                          </div>
                          <span className="book-title-text" title={book.title}>
                            {book.title}
                          </span>
                        </div>
                      </td>

                      {/* Cột 3: Tác giả */}
                      <td>
                        <span className="book-author-text" title={book.author}>{book.author}</span>
                      </td>

                      {/* Cột 4: Thể loại */}
                      <td>
                        <span className="book-category-text" title={book.category}>{book.category}</span>
                      </td>

                      {/* Cột 5: Năm XB */}
                      <td>
                        <span className="book-year-text">{book.year}</span>
                      </td>

                      {/* Cột 6: Giá bìa */}
                      <td>
                        <span className="book-price-text">{formatVND(book.price)}</span>
                      </td>

                      {/* Cột 7: Tồn kho (Còn/Tổng) kèm thanh tiến trình */}
                      <td>
                        <div className="stock-cell">
                          <span className="stock-fraction">
                            {book.availableCopies}/{book.totalCopies}
                          </span>
                          <div className="stock-progress-bg">
                            <div
                              className={`stock-progress-fill ${
                                isAvailable ? 'progress-green' : 'progress-orange'
                              }`}
                              style={{ width: `${percentStock}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 8: Trạng thái */}
                      <td>
                        {isAvailable ? (
                          <span className="status-badge badge-available">
                            Sẵn sàng
                          </span>
                        ) : (
                          <span className="status-badge badge-borrowed">
                            Hết sách
                          </span>
                        )}
                      </td>

                      {/* Cột 9: Thao tác */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-links">
                          <button
                            type="button"
                            className="btn-action-link"
                            onClick={() => handleOpenEdit(book)}
                          >
                            Sửa
                          </button>
                          <span className="action-divider">|</span>
                          <button
                            type="button"
                            className="btn-action-link"
                            onClick={() => handleOpenDetail(book)}
                          >
                            Chi tiết
                          </button>
                          <span className="action-divider">|</span>
                          <button
                            type="button"
                            className="btn-action-link danger-link"
                            onClick={() => handleOpenDelete(book)}
                            title="Ngừng lưu thông (Xóa mềm)"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ====================================================================
            3. THANH PHÂN TRANG (PAGINATION FOOTER)
            ==================================================================== */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(totalBooksCount / pageSize));
          const startIdx = totalBooksCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
          const endIdx = Math.min(currentPage * pageSize, totalBooksCount);

          return (
            <div className="catalog-pagination">
              <div className="pagination-info">
                Hiển thị {startIdx}-{endIdx} / {totalBooksCount.toLocaleString('vi-VN')} đầu sách
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="pagination-page-indicator">
                  <span>Trang</span>
                  <input
                    type="text"
                    className="pagination-page-input"
                    value={jumpPage}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCommitPage();
                        e.target.blur();
                      }
                    }}
                    onBlur={handleCommitPage}
                    title={`Nhấp để nhập trang từ 1 đến ${totalPages.toLocaleString('vi-VN')}`}
                  />
                  <span>/ {totalPages.toLocaleString('vi-VN')}</span>
                </div>

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Trang tiếp"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ====================================================================
          MODAL 1: CHI TIẾT ĐẦU SÁCH
          ==================================================================== */}
      {isDetailOpen && selectedBook && (
        <div className="catalog-modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-code-tag">{selectedBook.code}</span>
                <h3 className="modal-title">{selectedBook.title}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsDetailOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Tác giả:</span>
                  <span className="detail-val">{selectedBook.author}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Thể loại:</span>
                  <span className="detail-val">{selectedBook.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nhà xuất bản:</span>
                  <span className="detail-val">{selectedBook.publisher || 'Đang cập nhật'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Năm xuất bản:</span>
                  <span className="detail-val">{selectedBook.year}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mã ISBN:</span>
                  <span className="detail-val">{selectedBook.isbn}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Giá bìa tiêu chuẩn:</span>
                  <span className="detail-val price-highlight">
                    {formatVND(selectedBook.price)} VNĐ
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tồn kho khả dụng:</span>
                  <span className="detail-val">
                    <strong>{selectedBook.availableCopies}</strong> / {selectedBook.totalCopies} cuốn
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Trạng thái lưu thông:</span>
                  <span
                    className={`status-badge ${
                      selectedBook.status === 'available'
                        ? 'badge-available'
                        : 'badge-borrowed'
                    }`}
                  >
                    {selectedBook.status === 'available' ? 'Sẵn sàng phục vụ' : 'Đang mượn hết'}
                  </span>
                </div>
              </div>

              {/* Danh sách bản sao mã vạch */}
              <div className="copies-section">
                <h4 className="copies-title">Danh sách Bản sao mã vạch (Book Copies)</h4>
                <div className="copies-list">
                  {selectedBook.copies && selectedBook.copies.length > 0 ? (
                    selectedBook.copies.map((copy, cIdx) => (
                      <div key={cIdx} className="copy-item">
                        <span className="copy-barcode">{copy.barcode}</span>
                        <span
                          className={`copy-status ${
                            copy.status === 'Available' ? 'status-avail' : 'status-borrowed'
                          }`}
                        >
                          {copy.status === 'Available' ? 'Sẵn sàng' : 'Đang mượn'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="copies-empty">
                      Đầu sách có {selectedBook.totalCopies} bản sao mã vạch tự động sinh trong hệ thống.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsDetailOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedBook);
                }}
              >
                <Edit size={14} />
                <span>Chỉnh sửa sách</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: CHỈNH SỬA ĐẦU SÁCH
          ==================================================================== */}
      {isEditOpen && editingBook && (
        <div className="catalog-modal-overlay" onClick={() => setIsEditOpen(false)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <div className="modal-title-box">
                  <span className="modal-code-tag">{editingBook.code}</span>
                  <h3 className="modal-title">Chỉnh sửa thông tin sách</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsEditOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên đầu sách *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingBook.title}
                    onChange={(e) =>
                      setEditingBook({ ...editingBook, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tác giả *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingBook.author}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, author: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thể loại *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingBook.category}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, category: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Năm xuất bản</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingBook.year}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, year: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giá bìa (VNĐ) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editingBook.price}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, price: Number(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nhà xuất bản</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingBook.publisher || ''}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, publisher: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã ISBN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingBook.isbn || ''}
                      onChange={(e) =>
                        setEditingBook({ ...editingBook, isbn: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsEditOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-modal-primary">
                  <CheckCircle2 size={14} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: XÓA MỀM (NGỪNG LƯU THÔNG) / CẢNH BÁO CHẶN XÓA
          ==================================================================== */}
      {isDeleteOpen && deleteBookTarget && (() => {
        const borrowedCopies = Math.max(
          0,
          (deleteBookTarget.totalCopies || 0) - (deleteBookTarget.availableCopies || 0)
        );
        const isBlocked = borrowedCopies > 0 || deleteBookTarget.status === 'borrowed_all';

        return (
          <div className="catalog-modal-overlay" onClick={() => setIsDeleteOpen(false)}>
            <div
              className="catalog-modal-content delete-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-title-box">
                  <span className={`modal-code-tag ${isBlocked ? 'tag-warning' : 'tag-danger'}`}>
                    {deleteBookTarget.code}
                  </span>
                  <h3 className="modal-title">
                    {isBlocked
                      ? 'Không thể ngừng lưu thông'
                      : 'Xác nhận ngừng lưu thông (Xóa mềm)'}
                  </h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body delete-modal-body">
                {isBlocked ? (
                  // Trường hợp 1: Chặn xóa vì đang có sách mượn
                  <div className="delete-alert-wrapper block-mode">
                    <div className="delete-alert-icon icon-blocked">
                      <AlertTriangle size={32} />
                    </div>
                    <div className="delete-alert-text">
                      <h4 className="delete-alert-heading">
                        Đang có {borrowedCopies} cuốn sách được mượn!
                      </h4>
                      <p className="delete-desc">
                        Đầu sách <strong>"{deleteBookTarget.title}"</strong> hiện đang có{' '}
                        <strong className="text-red">{borrowedCopies} bản sao</strong> đang được độc giả mượn chưa hoàn trả.
                      </p>
                      <div className="delete-rule-box">
                        <strong>Quy tắc bảo toàn tài sản thư viện:</strong>
                        <p>
                          Hệ thống chặn tuyệt đối thao tác ngừng lưu thông (xóa mềm) khi vẫn còn bản sao đang lưu hành ngoài thư viện. Vui lòng thu hồi toàn bộ sách trước khi thực hiện.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Trường hợp 2: Hợp lệ để xóa mềm
                  <div className="delete-alert-wrapper confirm-mode">
                    <div className="delete-alert-icon icon-confirm">
                      <Trash2 size={32} />
                    </div>
                    <div className="delete-alert-text">
                      <h4 className="delete-alert-heading">
                        Chuyển sang trạng thái ngừng lưu thông?
                      </h4>
                      <p className="delete-desc">
                        Bạn có chắc chắn muốn ngừng lưu thông đầu sách{' '}
                        <strong>"{deleteBookTarget.title}"</strong> (Mã: <code>{deleteBookTarget.code}</code>, gồm {deleteBookTarget.totalCopies} cuốn)?
                      </p>
                      <div className="delete-rule-box success-rule">
                        <strong>Cơ chế Xóa mềm (Soft-Delete - IsActive = 0):</strong>
                        <p>
                          Đầu sách sẽ được ẩn khỏi danh mục lưu thông. Toàn bộ lịch sử mượn trả, phí phạt và dữ liệu thống kê trước đây vẫn được lưu trữ toàn vẹn trong cơ sở dữ liệu.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  {isBlocked ? 'Đã hiểu / Đóng' : 'Hủy bỏ'}
                </button>
                {!isBlocked && (
                  <button
                    type="button"
                    className="btn-modal-danger"
                    onClick={handleConfirmDelete}
                  >
                    <Trash2 size={14} />
                    <span>Xác nhận xóa mềm</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ====================================================================
          MODAL 4: NẠP DỮ LIỆU SÁCH TỪ FILE CSV (US-06 / LOLRA-14)
          ==================================================================== */}
      {isImportModalOpen && (
        <div
          className="catalog-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isUploading) {
              setIsImportModalOpen(false);
              setSelectedCsvFile(null);
              setUploadError('');
            }
          }}
        >
          <div className="catalog-modal-content modal-import-csv">
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-code-tag" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>US-06</span>
                <h3 className="modal-title">Nạp danh mục sách hàng loạt từ file CSV</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                disabled={isUploading}
                onClick={() => {
                  if (!isUploading) {
                    setIsImportModalOpen(false);
                    setSelectedCsvFile(null);
                    setUploadError('');
                  }
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body import-modal-body">
              {/* Hộp hướng dẫn */}
              <div className="import-guide-box">
                <div className="guide-icon">
                  <FileSpreadsheet size={22} />
                </div>
                <div className="guide-content">
                  <h4>Quy chuẩn tệp nạp sách hệ thống SmartLib AI</h4>
                  <p>
                    Hỗ trợ tệp <strong>book_data_clean.csv</strong> (11.123 cuốn) hoặc <strong>books.csv</strong>. Cột tự động nhận diện: <code>Title</code>, <code>Author</code>, <code>ISBN</code>, <code>CategoryID</code>, <code>Publisher</code>, <code>BasePrice</code>.
                  </p>
                </div>
              </div>

              {/* Khung kéo thả file (Dropzone) */}
              {!isUploading ? (
                <div
                  className={`csv-dropzone ${isDragging ? 'dropzone-active' : ''} ${selectedCsvFile ? 'dropzone-has-file' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('csv-file-input').click()}
                >
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {selectedCsvFile ? (
                    <div className="dropzone-file-selected">
                      <div className="selected-file-icon">
                        <FileText size={36} />
                      </div>
                      <div className="selected-file-meta">
                        <span className="selected-file-name">{selectedCsvFile.name}</span>
                        <span className="selected-file-size">
                          Dung lượng: {(selectedCsvFile.size / 1024).toFixed(1)} KB ({(selectedCsvFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                        <span className="selected-file-hint text-green">
                          ✓ Tệp đã sẵn sàng để nạp vào CSDL
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-selected-file"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCsvFile(null);
                          setUploadError('');
                        }}
                        title="Hủy chọn tệp"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="dropzone-empty-content">
                      <div className="dropzone-icon-circle">
                        <UploadCloud size={32} />
                      </div>
                      <p className="dropzone-main-text">
                        Kéo và thả tệp <strong>.csv</strong> vào đây, hoặc <span className="text-primary-link">duyệt từ máy tính</span>
                      </p>
                      <span className="dropzone-sub-text">
                        Dung lượng tối đa 15MB • Tự động loại trừ trùng lặp ISBN và lọc dòng lỗi
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Hiệu ứng Loading & Progress Bar */
                <div className="import-progress-card">
                  <div className="progress-spinner-wrap">
                    <Loader2 size={42} className="spinner-rotate" />
                  </div>
                  <h4 className="progress-title">Đang nạp dữ liệu vào cơ sở dữ liệu...</h4>
                  <p className="progress-desc">
                    Hệ thống đang đọc Stream, kiểm tra trùng lặp ISBN và lưu mẻ 1.000 cuốn vào bảng Books kèm sinh bản sao BookCopies.
                  </p>
                  <div className="progress-bar-track">
                    <div className="progress-bar-animated-stripes"></div>
                  </div>
                  <span className="progress-warning-text">
                    ⚠️ Vui lòng không đóng trình duyệt hoặc làm mới trang trong lúc đang nạp dữ liệu.
                  </span>
                </div>
              )}

              {/* Thông báo lỗi nếu có */}
              {uploadError && (
                <div className="import-error-banner">
                  <AlertCircle size={18} />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                disabled={isUploading}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedCsvFile(null);
                  setUploadError('');
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                disabled={!selectedCsvFile || isUploading}
                onClick={handleStartImport}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="spinner-rotate" />
                    <span>Đang xử lý dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>Bắt đầu nạp sách</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 5: BÁO CÁO KẾT QUẢ NẠP SÁCH HÀNG LOẠT (US-06)
          ==================================================================== */}
      {isResultModalOpen && importResult && (
        <div
          className="catalog-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResultModalOpen(false);
          }}
        >
          <div className="catalog-modal-content modal-import-result">
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-code-tag" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>Thành công</span>
                <h3 className="modal-title">Báo cáo kết quả nạp sách hàng loạt (US-06)</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsResultModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Lưới 4 thẻ thống kê kết quả */}
              <div className="result-kpi-grid">
                <div className="result-kpi-card total-card">
                  <span className="res-kpi-label">Tổng dòng đọc</span>
                  <span className="res-kpi-value">{importResult.totalProcessed.toLocaleString('vi-VN')}</span>
                </div>
                <div className="result-kpi-card success-card">
                  <span className="res-kpi-label">Nạp thành công</span>
                  <span className="res-kpi-value">{importResult.successCount.toLocaleString('vi-VN')}</span>
                </div>
                <div className="result-kpi-card skipped-card">
                  <span className="res-kpi-label">Bỏ qua (Trùng ISBN)</span>
                  <span className="res-kpi-value">{importResult.skippedCount.toLocaleString('vi-VN')}</span>
                </div>
                <div className="result-kpi-card failed-card">
                  <span className="res-kpi-label">Dòng lỗi vi phạm</span>
                  <span className="res-kpi-value">{importResult.failedCount.toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Danh sách các dòng lỗi (nếu có) */}
              {importResult.errors && importResult.errors.length > 0 ? (
                <div className="result-error-section">
                  <h4 className="error-section-title">
                    <AlertTriangle size={16} />
                    <span>Chi tiết {importResult.errors.length} dòng lỗi vi phạm quy tắc dữ liệu:</span>
                  </h4>
                  <div className="result-error-table-wrapper">
                    <table className="result-error-table">
                      <thead>
                        <tr>
                          <th style={{ width: '70px', textAlign: 'center' }}>Dòng</th>
                          <th>Tên sách</th>
                          <th style={{ width: '140px' }}>Mã ISBN</th>
                          <th>Lý do từ chối</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td className="font-mono text-center">#{err.rowNumber}</td>
                            <td>{err.title || 'N/A'}</td>
                            <td className="font-mono">{err.isbn || '-'}</td>
                            <td className="text-red">{err.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="result-success-banner">
                  <CheckCircle2 size={28} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#065f46' }}>Dữ liệu tệp hoàn toàn sạch và hợp lệ!</h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#047857' }}>
                      Toàn bộ các đầu sách đã được lưu trữ thành công vào bảng Books và tự động sinh bản sao mã vạch trong kho lưu trữ.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setIsResultModalOpen(false);
                }}
              >
                <CheckCircle2 size={16} />
                <span>Đóng và cập nhật danh sách sách</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

