import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Download,
  Printer,
  QrCode,
  ScanLine,
  Sparkles,
  Check,
  ExternalLink,
  Layers,
  CheckSquare,
  Square,
  FolderPlus,
  ImageUp,
  RotateCcw
} from 'lucide-react';
import { apiClient } from '../api/authApi';
import { generateBarcodeSvg, generateQrCodeSvg, playScannerBeep } from '../utils/barcodeGenerator';
import { exportBarcodeLabelsPdf, openPrintDialog } from '../utils/barcodePdfPrinter';
import { decodeBarcodeFromImage, getImageFileFromClipboard } from '../utils/barcodeImageDecoder';
import './BookCatalog.css';

/**
 * Hàm loại bỏ dấu tiếng Việt để phục vụ tìm kiếm không phân biệt có dấu / không dấu (AC1)
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  let res = String(str);
  res = res.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  res = res.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  res = res.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  res = res.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  res = res.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  res = res.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  res = res.replace(/đ/g, 'd');
  res = res.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  res = res.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  res = res.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  res = res.replace(/Ò|Ó|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  res = res.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  res = res.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  res = res.replace(/Đ/g, 'D');
  return res.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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
  const [pageSize, setPageSize] = useState(20); // Số lượng sách hiển thị trên mỗi trang (mặc định: 20 theo AC4, hỗ trợ 10, 20, 50, 100)
  const [jumpPage, setJumpPage] = useState(1); // Ô nhập trực tiếp số trang
  const [totalBooksCount, setTotalBooksCount] = useState(12500);
  const [refreshKey, setRefreshKey] = useState(0); // Khóa làm mới danh sách và thống kê
  const [internalSearch, setInternalSearch] = useState('');
  const [isApiMode, setIsApiMode] = useState(false); // Đánh dấu dữ liệu được phân trang từ Server-side (AC4)

  // State 4 thẻ chỉ số thống kê KPI Cards từ CSDL
  const [catalogSummary, setCatalogSummary] = useState({
    totalBooks: 12500,
    borrowedBooks: 1420,
    overdueBooks: 47,
    damagedBooks: 12
  });

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

  // Tải dữ liệu 4 thẻ thống kê KPI Cards thời gian thực từ /api/Books/summary
  useEffect(() => {
    let isMounted = true;
    const fetchCatalogSummary = async () => {
      try {
        const res = await apiClient.get('/api/Books/summary');
        const data = res.data?.data || res.data;
        if (isMounted && data) {
          setCatalogSummary({
            totalBooks: data.totalBooks ?? 0,
            borrowedBooks: data.borrowedBooks ?? 0,
            overdueBooks: data.overdueBooks ?? 0,
            damagedBooks: data.damagedBooks ?? 0
          });
          if (data.totalBooks !== undefined && data.totalBooks > 0) {
            setTotalBooksCount(data.totalBooks);
          }
        }
      } catch (err) {
        // Giữ fallback mặc định nếu mất kết nối
      }
    };
    fetchCatalogSummary();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

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

  // State Quản lý Bản sao & Mã vạch (AC1 - AC5)
  const [detailActiveTab, setDetailActiveTab] = useState('copies'); // 'overview' | 'copies'
  const [selectedCopyBarcodes, setSelectedCopyBarcodes] = useState(new Set());
  const [copySearchKeyword, setCopySearchKeyword] = useState('');
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddCount, setBulkAddCount] = useState(5);
  const [bulkAddLoading, setBulkAddLoading] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTemplate, setPrintTemplate] = useState('a4'); // 'a4' | 'thermal'
  const [copiesToPrint, setCopiesToPrint] = useState([]);
  const [isViewBarcodeModalOpen, setIsViewBarcodeModalOpen] = useState(false);
  const [viewBarcodeCopy, setViewBarcodeCopy] = useState(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerInputValue, setScannerInputValue] = useState('');
  const [highlightedBarcode, setHighlightedBarcode] = useState('');
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const scannerImageInputRef = useRef(null);

  // State Modal Xóa mềm & Chặn xóa
  const [deleteBookTarget, setDeleteBookTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // State Modal Thêm Sách Mới
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    categoryID: '',
    isbn: '',
    publisher: '',
    year: new Date().getFullYear(),
    price: 50000,
    initialCopies: 1
  });

  // State Modal Thêm Nhanh Thể Loại
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // State Import CSV (US-06 / LOLRA-14)
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

  // Mở modal Thêm đầu sách mới
  const handleOpenAddBook = () => {
    const defaultCatId = categories && categories.length > 0 ? categories[0].categoryID : 1;
    setNewBook({
      title: '',
      author: '',
      categoryID: defaultCatId,
      isbn: '',
      publisher: 'NXB Đại Học Quốc Gia',
      year: new Date().getFullYear(),
      price: 50000,
      initialCopies: 1
    });
    setIsAddBookOpen(true);
  };

  // Xử lý tạo mới Thể loại sách
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      showToast('Vui lòng nhập tên thể loại sách.');
      return;
    }
    setIsSavingCategory(true);
    try {
      const res = await apiClient.post('/api/Categories', { categoryName: name });
      const created = res.data?.data || res.data;
      if (created) {
        setCategories((prev) => [...prev, created]);
        // Tự động gán thể loại mới cho form đang thao tác
        if (isAddBookOpen) {
          setNewBook((prev) => ({ ...prev, categoryID: created.categoryID }));
        } else if (isEditOpen && editingBook) {
          setEditingBook((prev) => ({
            ...prev,
            categoryID: created.categoryID,
            category: created.categoryName
          }));
        }
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
        showToast(`Đã thêm thành công thể loại "${created.categoryName}"!`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi tạo thể loại mới.';
      showToast(msg);
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Xử lý lưu đầu sách mới vào Database
  const handleSaveNewBook = async (e) => {
    e.preventDefault();
    if (!newBook.title.trim() || !newBook.author.trim()) {
      showToast('Vui lòng điền đầy đủ Tên đầu sách và Tác giả.');
      return;
    }

    setIsSavingBook(true);
    try {
      const payload = {
        title: newBook.title.trim(),
        author: newBook.author.trim(),
        categoryID: Number(newBook.categoryID) || (categories[0]?.categoryID || 1),
        isbn: newBook.isbn ? newBook.isbn.trim() : null,
        publisher: newBook.publisher ? newBook.publisher.trim() : 'Đang cập nhật',
        basePrice: Number(newBook.price) > 0 ? Number(newBook.price) : 50000,
        initialCopies: Number(newBook.initialCopies) > 0 ? Number(newBook.initialCopies) : 1
      };

      const res = await apiClient.post('/api/Books', payload);
      const created = res.data?.data || res.data;

      setIsAddBookOpen(false);
      setRefreshKey((prev) => prev + 1);
      showToast(`Đã thêm thành công đầu sách "${created?.title || payload.title}" với ${payload.initialCopies} bản sao vào CSDL!`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu đầu sách mới.';
      showToast(msg);
    } finally {
      setIsSavingBook(false);
    }
  };

  // Xác nhận Xóa mềm (chuyển sang ngừng lưu thông IsActive = 0)
  const handleConfirmDelete = async () => {
    if (!deleteBookTarget) return;

    try {
      // Gọi API xóa mềm lưu trực tiếp xuống Database
      const res = await apiClient.delete(`/api/Books/${deleteBookTarget.id}`);
      if (res.data && !res.data.success) {
        showToast(res.data.message || 'Không thể xóa đầu sách.');
        return;
      }

      // Cập nhật danh sách: ẩn đầu sách đã xóa mềm khỏi danh mục lưu thông
      setBooks((prev) => prev.filter((b) => b.id !== deleteBookTarget.id));
      setTotalBooksCount((prev) => Math.max(0, prev - 1));
      setIsDeleteOpen(false);
      setRefreshKey((prev) => prev + 1);
      showToast(`Đã chuyển đầu sách "${deleteBookTarget.title}" sang danh mục ngừng lưu thông (xóa mềm)!`);
      setDeleteBookTarget(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi thực hiện xóa mềm sách.';
      showToast(msg);
      setIsDeleteOpen(false);
    }
  };

  // Từ khóa tìm kiếm hợp nhất từ Header hoặc ô tìm kiếm tại bảng
  const activeKeyword = (filterKeyword || externalSearch || '').trim();

  // Cố gắng gọi API lấy dữ liệu thực với đầy đủ các tiêu chí lọc (AC1 - AC5)
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
            status: filterStatus !== 'all' ? filterStatus : undefined,
            onlyAvailable: filterStatus === 'available' ? true : undefined
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
            categoryID: b.categoryID,
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
          setIsApiMode(true);
        }
      } catch (err) {
        // Nếu backend chưa sẵn sàng hoặc lỗi, chuyển sang fallback dữ liệu mẫu
        if (isMounted) {
          setIsApiMode(false);
        }
      }
    };

    fetchApiBooks();
    return () => {
      isMounted = false;
    };
  }, [currentPage, pageSize, activeKeyword, filterCategory, filterMinPrice, filterMaxPrice, filterStatus, refreshKey]);

  // Lắng nghe phím tắt F2 để mở máy quét mã vạch nhanh chóng bất cứ lúc nào
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setScannerInputValue('');
        setIsScannerModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Lọc dữ liệu hiển thị (AC1 - AC4):
  // Khi ở chế độ API (Server-side): máy chủ đã xử lý toàn bộ tìm kiếm, bộ lọc và phân trang Skip/Take
  // Khi ở chế độ Fallback: hỗ trợ tìm kiếm không dấu, không phân biệt hoa thường và các bộ lọc
  const filteredBooks = useMemo(() => {
    if (isApiMode) {
      return books;
    }
    let list = books;
    const kw = removeVietnameseTones(activeKeyword.toLowerCase().trim());
    if (kw) {
      list = list.filter((b) => {
        const title = removeVietnameseTones((b.title || '').toLowerCase());
        const author = removeVietnameseTones((b.author || '').toLowerCase());
        const isbn = removeVietnameseTones((b.isbn || '').toLowerCase());
        const code = removeVietnameseTones((b.code || '').toLowerCase());
        return title.includes(kw) || author.includes(kw) || isbn.includes(kw) || code.includes(kw);
      });
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
  }, [books, isApiMode, activeKeyword, filterCategory, filterMinPrice, filterMaxPrice, filterStatus, categories]);

  // Xử lý mở modal Chi tiết kèm tải danh sách bản sao (AC1 - AC5)
  const handleOpenDetail = async (book, targetTab = 'copies') => {
    setSelectedBook(book);
    setIsDetailOpen(true);
    setDetailActiveTab(targetTab);
    setSelectedCopyBarcodes(new Set());
    setCopySearchKeyword('');

    try {
      const res = await apiClient.get(`/api/books/${book.id}/copies`);
      const copyList = res.data?.data || res.data;
      if (Array.isArray(copyList)) {
        const mappedCopies = copyList.map((c) => ({
          copyId: c.copyID,
          barcode: c.barcode,
          status: c.status || 'Available'
        }));

        setSelectedBook((prev) => (prev && prev.id === book.id ? { ...prev, copies: mappedCopies } : prev));
        setBooks((prev) =>
          prev.map((b) =>
            b.id === book.id
              ? {
                  ...b,
                  copies: mappedCopies,
                  totalCopies: mappedCopies.length,
                  availableCopies: mappedCopies.filter((c) => c.status === 'Available').length
                }
              : b
          )
        );
      }
    } catch (err) {
      // Fallback: nếu backend chưa có bản sao trong DB cho sách này, tự động sinh bản sao mẫu
      if (!book.copies || book.copies.length === 0) {
        const fallbackCopies = [];
        const count = book.totalCopies || 3;
        for (let i = 1; i <= count; i++) {
          fallbackCopies.push({
            copyId: Date.now() + i,
            barcode: `BC${String(book.id).padStart(6, '0')}-${String(i).padStart(3, '0')}`,
            status: i <= (book.availableCopies ?? count) ? 'Available' : 'Borrowed'
          });
        }
        setSelectedBook((prev) => (prev && prev.id === book.id ? { ...prev, copies: fallbackCopies } : prev));
      }
    }
  };

  // Thêm mới bản sao hàng loạt (Bulk Add - AC1, AC2)
  const handleBulkAddCopies = async () => {
    if (!selectedBook || bulkAddCount <= 0) return;
    setBulkAddLoading(true);

    try {
      // 1. Thử gọi API Backend .NET 10
      const res = await apiClient.post(`/api/books/${selectedBook.id}/copies/bulk`, {
        count: bulkAddCount
      });
      const createdDtos = res.data?.data || res.data;
      let newCopies = [];
      if (Array.isArray(createdDtos)) {
        newCopies = createdDtos.map((c) => ({
          copyId: c.copyID,
          barcode: c.barcode,
          status: c.status || 'Available'
        }));
      } else {
        throw new Error('API format mismatch, fallback to client');
      }

      const updatedCopies = [...(selectedBook.copies || []), ...newCopies];
      const updatedTotal = updatedCopies.length;
      const updatedAvail = updatedCopies.filter((c) => c.status === 'Available').length;

      const updatedBook = {
        ...selectedBook,
        copies: updatedCopies,
        totalCopies: updatedTotal,
        availableCopies: updatedAvail,
        status: updatedAvail > 0 ? 'available' : 'borrowed_all'
      };

      setSelectedBook(updatedBook);
      setBooks((prev) => prev.map((b) => (b.id === selectedBook.id ? updatedBook : b)));
      setIsBulkAddOpen(false);
      playScannerBeep(true);
      showToast(`Đã thêm thành công ${bulkAddCount} bản sao mới cho sách "${selectedBook.title}"!`);
    } catch (err) {
      // 2. Client-side fallback mượt mà
      const currentCopies = selectedBook.copies || [];
      const firstBarcode = currentCopies.find((c) => c.barcode)?.barcode;
      let prefix = `BC${String(selectedBook.id).padStart(6, '0')}`;
      if (firstBarcode && firstBarcode.includes('-')) {
        prefix = firstBarcode.split('-')[0];
      }

      let maxSeq = currentCopies.length;
      currentCopies.forEach((c) => {
        if (!c.barcode) return;
        const parts = c.barcode.split('-');
        if (parts.length > 1) {
          const suffix = parts[parts.length - 1].trim();
          const num = parseInt(suffix, 10);
          if (!isNaN(num)) {
            if (num > maxSeq) maxSeq = num;
          } else if (suffix.length === 1 && /[a-zA-Z]/.test(suffix)) {
            const charCode = suffix.toUpperCase().charCodeAt(0) - 65 + 1;
            if (charCode > maxSeq) maxSeq = charCode;
          }
        }
      });

      const generatedCopies = [];
      for (let i = 1; i <= bulkAddCount; i++) {
        const seq = maxSeq + i;
        generatedCopies.push({
          copyId: Date.now() + i,
          barcode: `${prefix}-${String(seq).padStart(3, '0')}`,
          status: 'Available'
        });
      }

      const updatedCopies = [...currentCopies, ...generatedCopies];
      const updatedTotal = updatedCopies.length;
      const updatedAvail = updatedCopies.filter((c) => c.status === 'Available').length;

      const updatedBook = {
        ...selectedBook,
        copies: updatedCopies,
        totalCopies: updatedTotal,
        availableCopies: updatedAvail,
        status: updatedAvail > 0 ? 'available' : 'borrowed_all'
      };

      setSelectedBook(updatedBook);
      setBooks((prev) => prev.map((b) => (b.id === selectedBook.id ? updatedBook : b)));
      setIsBulkAddOpen(false);
      playScannerBeep(true);
      showToast(`Đã tạo thành công ${bulkAddCount} bản sao với mã vạch liên tiếp!`);
    } finally {
      setBulkAddLoading(false);
    }
  };

  // Cập nhật trạng thái độc lập của bản sao (AC3)
  const handleUpdateCopyStatus = async (copy, newStatus) => {
    if (!selectedBook || !copy) return;

    try {
      if (copy.copyId) {
        await apiClient.patch(`/api/bookcopies/${copy.copyId}/status`, { status: newStatus });
      }
    } catch (err) {
      // fallback
    }

    const updatedCopies = (selectedBook.copies || []).map((c) =>
      c.barcode === copy.barcode ? { ...c, status: newStatus } : c
    );
    const updatedAvail = updatedCopies.filter((c) => c.status === 'Available').length;
    const updatedBook = {
      ...selectedBook,
      copies: updatedCopies,
      availableCopies: updatedAvail,
      status: updatedAvail > 0 ? 'available' : 'borrowed_all'
    };

    setSelectedBook(updatedBook);
    setBooks((prev) => prev.map((b) => (b.id === selectedBook.id ? updatedBook : b)));

    const statusLabels = {
      Available: 'Sẵn sàng phục vụ',
      Borrowed: 'Đang cho mượn',
      Damaged: 'Bị hỏng',
      Lost: 'Bị mất'
    };
    showToast(`Đã cập nhật bản sao [${copy.barcode}] sang trạng thái "${statusLabels[newStatus] || newStatus}"!`);
  };

  // Xóa một bản sao (AC3)
  const handleDeleteCopy = async (copy) => {
    if (!selectedBook || !copy) return;
    if (copy.status === 'Borrowed') {
      showToast('Không thể xóa bản sao đang trong trạng thái cho mượn!');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản sao có mã vạch [${copy.barcode}] khỏi hệ thống?`)) {
      return;
    }

    try {
      if (copy.copyId) {
        await apiClient.delete(`/api/bookcopies/${copy.copyId}`);
      }
    } catch (err) {
      // fallback
    }

    const updatedCopies = (selectedBook.copies || []).filter((c) => c.barcode !== copy.barcode);
    const updatedTotal = updatedCopies.length;
    const updatedAvail = updatedCopies.filter((c) => c.status === 'Available').length;
    const updatedBook = {
      ...selectedBook,
      copies: updatedCopies,
      totalCopies: updatedTotal,
      availableCopies: updatedAvail,
      status: updatedAvail > 0 ? 'available' : 'borrowed_all'
    };

    setSelectedBook(updatedBook);
    setBooks((prev) => prev.map((b) => (b.id === selectedBook.id ? updatedBook : b)));
    showToast(`Đã xóa bản sao [${copy.barcode}] thành công!`);
  };

  // Chọn checkbox từng bản sao
  const handleToggleSelectCopy = (barcode) => {
    setSelectedCopyBarcodes((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) {
        next.delete(barcode);
      } else {
        next.add(barcode);
      }
      return next;
    });
  };

  // Chọn hoặc bỏ chọn tất cả bản sao
  const handleToggleSelectAllCopies = (currentList) => {
    if (selectedCopyBarcodes.size === currentList.length && currentList.length > 0) {
      setSelectedCopyBarcodes(new Set());
    } else {
      setSelectedCopyBarcodes(new Set(currentList.map((c) => c.barcode)));
    }
  };

  // Mở modal in tem mã vạch (AC4)
  const handleOpenPrintModal = (singleCopy = null) => {
    if (singleCopy) {
      setCopiesToPrint([singleCopy]);
    } else {
      const currentCopies = selectedBook?.copies || [];
      if (selectedCopyBarcodes.size > 0) {
        setCopiesToPrint(currentCopies.filter((c) => selectedCopyBarcodes.has(c.barcode)));
      } else {
        setCopiesToPrint(currentCopies);
      }
    }
    setIsPrintModalOpen(true);
  };

  // Thực hiện xuất file PDF tem mã vạch (AC4)
  const handleExecutePdfExport = async () => {
    if (!copiesToPrint || copiesToPrint.length === 0) {
      showToast('Không có bản sao nào được chọn để xuất tem mã vạch!');
      return;
    }
    await exportBarcodeLabelsPdf(copiesToPrint, selectedBook, { format: printTemplate });
    showToast(`Đã tải xuống file PDF chứa ${copiesToPrint.length} tem mã vạch thành công!`);
  };

  // Thực hiện in trực tiếp qua máy in (AC4)
  const handleExecutePrint = () => {
    if (!copiesToPrint || copiesToPrint.length === 0) {
      showToast('Không có bản sao nào được chọn để in!');
      return;
    }
    openPrintDialog(copiesToPrint, selectedBook);
  };

  // Mở popup xem phóng to Barcode 1D & QR Code 2D
  const handleOpenViewBarcode = (copy) => {
    setViewBarcodeCopy(copy);
    setIsViewBarcodeModalOpen(true);
  };

  // Tra cứu bản sao bằng máy quét mã vạch (AC5)
  const handleBarcodeScanLookup = async (barcodeText) => {
    const cleanCode = (barcodeText || '').trim();
    if (!cleanCode) return;

    let targetBook = null;
    let targetCopy = null;

    // 1. Tìm trên client-side trong danh sách sách hiện tại
    for (const b of books) {
      if (b.copies && b.copies.length > 0) {
        const found = b.copies.find((c) => c.barcode.toLowerCase() === cleanCode.toLowerCase());
        if (found) {
          targetBook = b;
          targetCopy = found;
          break;
        }
      }
      if (b.code.toLowerCase() === cleanCode.toLowerCase() || (b.isbn && b.isbn.toLowerCase() === cleanCode.toLowerCase())) {
        targetBook = b;
        break;
      }
    }

    // 2. Nếu chưa có trên client, gọi API Backend tra cứu (hỗ trợ cả chuẩn 6 số và 4 số)
    if (!targetBook) {
      const candidates = [cleanCode];
      const matchBC = cleanCode.match(/^BC(\d+)-(.*)$/i);
      if (matchBC) {
        const num = parseInt(matchBC[1], 10);
        const suffix = matchBC[2].toUpperCase();
        const code6 = `BC${String(num).padStart(6, '0')}-${suffix}`;
        const code4 = `BC${String(num).padStart(4, '0')}-${suffix}`;
        if (!candidates.includes(code6)) candidates.push(code6);
        if (!candidates.includes(code4)) candidates.push(code4);
      }

      for (const candidate of candidates) {
        try {
          const res = await apiClient.get('/api/bookcopies/lookup', {
            params: { barcode: candidate }
          });
          const copyData = res.data?.data || res.data;
          if (copyData && copyData.bookID) {
            const bookRes = await apiClient.get(`/api/Books/${copyData.bookID}`);
            const bData = bookRes.data?.data || bookRes.data;
            if (bData) {
              targetBook = {
                id: bData.bookID,
                code: `BK-${String(bData.bookID).padStart(4, '0')}`,
                title: bData.title,
                author: bData.author,
                category: bData.categoryName || 'Chung',
                year: 2024,
                price: bData.basePrice || 85000,
                availableCopies: bData.availableCopies || 1,
                totalCopies: bData.totalCopies || 1,
                status: bData.availableCopies > 0 ? 'available' : 'borrowed_all',
                isbn: bData.isbn,
                publisher: bData.publisher,
                copies: (bData.copies || []).map((c) => ({
                  copyId: c.copyID,
                  barcode: c.barcode,
                  status: c.status || 'Available'
                }))
              };
              targetCopy = { barcode: copyData.barcode, status: copyData.status };
              break;
            }
          }
        } catch (err) {
          // Thử tiếp ứng viên biến thể tiếp theo nếu có
        }
      }
    }

    if (targetBook) {
      playScannerBeep(true);
      setIsScannerModalOpen(false);
      await handleOpenDetail(targetBook, 'copies');
      const finalBarcode = targetCopy?.barcode || cleanCode;
      setHighlightedBarcode(finalBarcode);
      showToast(`Đã tìm thấy bản sao [${finalBarcode}] của sách "${targetBook.title}"!`);

      // Tự động tắt viền phát sáng sau 6 giây
      setTimeout(() => {
        setHighlightedBarcode('');
      }, 6000);
    } else {
      playScannerBeep(false);
      showToast(`Không tìm thấy bản sao nào khớp với mã vạch "${cleanCode}"!`);
    }
  };

  // Xử lý tệp hình ảnh chứa mã vạch (Tải lên, Kéo thả hoặc Dán Clipboard Ctrl+V)
  const handleProcessBarcodeImage = async (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showToast('Vui lòng chọn hoặc dán tệp định dạng hình ảnh (PNG, JPG, WEBP,...)!');
      return;
    }

    setIsDecodingImage(true);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);

    try {
      showToast('Đang giải mã mã vạch / QR từ hình ảnh...');
      const result = await decodeBarcodeFromImage(file);
      if (result.success && result.barcode) {
        setScannerInputValue(result.barcode);
        playScannerBeep(true);
        showToast(`Đã nhận diện mã: [${result.barcode}] (${result.format || 'Barcode'})! Đang tra cứu...`);
        await handleBarcodeScanLookup(result.barcode);
      } else {
        playScannerBeep(false);
        showToast(result.message || 'Không tìm thấy mã vạch hợp lệ trong ảnh.');
      }
    } catch (err) {
      playScannerBeep(false);
      showToast('Lỗi khi giải mã ảnh: ' + (err.message || 'Không xác định'));
    } finally {
      setIsDecodingImage(false);
    }
  };

  // Đặt lại khung quét ảnh về trạng thái ban đầu (xóa ảnh xem trước)
  const handleResetScannerImage = (e) => {
    if (e) e.stopPropagation();
    setImagePreviewUrl(null);
    setIsDraggingImage(false);
    setIsDecodingImage(false);
    if (scannerImageInputRef.current) {
      scannerImageInputRef.current.value = '';
    }
  };

  // Lắng nghe sự kiện Paste (Ctrl + V) khi Modal Máy quét đang mở
  useEffect(() => {
    if (!isScannerModalOpen) {
      handleResetScannerImage();
      return;
    }

    const handleWindowPaste = (e) => {
      const imgFile = getImageFileFromClipboard(e);
      if (imgFile) {
        e.preventDefault();
        handleProcessBarcodeImage(imgFile);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isScannerModalOpen]);

  // Xử lý mở modal Sửa
  const handleOpenEdit = (book) => {
    setEditingBook({ ...book });
    setIsEditOpen(true);
  };

  // Lưu thông tin sau khi sửa (Gửi PUT lên Database)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBook) return;

    try {
      const selectedCatObj = categories.find(
        (c) => String(c.categoryID) === String(editingBook.categoryID) ||
               c.categoryName.toLowerCase() === (editingBook.category || '').toLowerCase()
      );
      const catId = selectedCatObj ? selectedCatObj.categoryID : (editingBook.categoryID || 1);

      const payload = {
        title: editingBook.title.trim(),
        author: editingBook.author.trim(),
        categoryID: Number(catId),
        isbn: editingBook.isbn ? editingBook.isbn.trim() : null,
        publisher: editingBook.publisher ? editingBook.publisher.trim() : 'Đang cập nhật',
        basePrice: Number(editingBook.price) > 0 ? Number(editingBook.price) : 50000
      };

      await apiClient.put(`/api/Books/${editingBook.id}`, payload);

      setBooks((prev) =>
        prev.map((b) =>
          b.id === editingBook.id
            ? {
                ...editingBook,
                categoryID: catId,
                category: selectedCatObj ? selectedCatObj.categoryName : editingBook.category
              }
            : b
        )
      );
      setIsEditOpen(false);
      setRefreshKey((prev) => prev + 1);
      showToast(`Đã cập nhật thành công đầu sách "${editingBook.title}" vào CSDL!`);
    } catch (err) {
      // Fallback cập nhật local nếu có lỗi
      setBooks((prev) =>
        prev.map((b) => (b.id === editingBook.id ? { ...editingBook } : b))
      );
      setIsEditOpen(false);
      const msg = err.response?.data?.message || `Đã cập nhật đầu sách "${editingBook.title}"!`;
      showToast(msg);
    }
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
            <span className="kpi-number">
              {(catalogSummary.totalBooks || totalBooksCount).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="kpi-icon-square icon-blue">
            <Copy size={20} />
          </div>
        </div>

        {/* Thẻ 2: Sách đang cho mượn */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách đang cho mượn</span>
            <span className="kpi-number">
              {catalogSummary.borrowedBooks.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="kpi-icon-square icon-green">
            <BookOpen size={20} />
          </div>
        </div>

        {/* Thẻ 3: Sách quá hạn */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách quá hạn</span>
            <span className="kpi-number text-red">
              {catalogSummary.overdueBooks.toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="kpi-icon-square icon-red">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Thẻ 4: Sách hỏng cần thanh lý */}
        <div className="catalog-kpi-card">
          <div className="kpi-info-col">
            <span className="kpi-label">Sách hỏng cần thanh lý</span>
            <span className="kpi-number">
              {catalogSummary.damagedBooks.toLocaleString('vi-VN')}
            </span>
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
            {/* Nút Thêm đầu sách mới */}
            <button
              type="button"
              className="btn-add-book"
              onClick={handleOpenAddBook}
              title="Thêm một đầu sách mới thủ công vào thư viện"
            >
              <Plus size={16} />
              <span>Thêm sách</span>
            </button>

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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filterKeyword.trim()) {
                  if (filterKeyword.trim().toUpperCase().startsWith('BC') || filterKeyword.trim().length >= 6) {
                    handleBarcodeScanLookup(filterKeyword.trim());
                  }
                }
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

          {/* Nút Độc Lập Bên Cạnh: Quét mã vạch (Barcode Scanner - AC5) */}
          <button
            type="button"
            className="filter-standalone-scanner-btn"
            onClick={() => {
              setScannerInputValue('');
              setIsScannerModalOpen(true);
            }}
            title="Mở máy quét mã vạch [F2]"
          >
            <ScanLine size={15} className="standalone-scanner-icon" />
            <span className="standalone-scanner-text">Quét mã</span>
          </button>

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
              title="Lọc theo trạng thái sách (AC2)"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="available">Sẵn sàng (Còn bản sao &gt; 0)</option>
              <option value="out_of_stock">Hết sách (Đang mượn hết)</option>
            </select>
          </div>

          {/* AC2: Tùy chọn chỉ hiển thị những sách đang có sẵn trong kho */}
          <label
            className="filter-item filter-checkbox-item"
            title="Chỉ hiển thị những sách đang có sẵn trong kho (số bản sao sẵn sàng cho mượn > 0) (AC2)"
          >
            <input
              type="checkbox"
              className="filter-checkbox-input"
              checked={filterStatus === 'available'}
              onChange={(e) => {
                setFilterStatus(e.target.checked ? 'available' : 'all');
                setCurrentPage(1);
              }}
            />
            <span className="filter-checkbox-text">Chỉ sách có sẵn (&gt; 0)</span>
          </label>

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
                <th style={{ width: '125px' }} title="Tổng số bản sao thư viện sở hữu và Số bản sao sẵn sàng cho mượn (AC3)">Tồn kho (Còn/Tổng)</th>
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

                      {/* Cột 7: Tồn kho (Còn/Tổng) - Thể hiện rõ: Tổng sở hữu và Sẵn sàng cho mượn (AC3) */}
                      <td>
                        <div
                          className="stock-cell"
                          title={`Tổng bản sao sở hữu: ${book.totalCopies} cuốn | Sẵn sàng cho mượn: ${book.availableCopies} cuốn (AC3)`}
                        >
                          <span className="stock-fraction">
                            <span className="stock-avail-count" title="Số bản sao sẵn sàng cho mượn">
                              {book.availableCopies}
                            </span>
                            <span className="stock-divider"> / </span>
                            <span className="stock-total-count" title="Tổng số bản sao sở hữu">
                              {book.totalCopies}
                            </span>
                            <span className="stock-unit"> cuốn</span>
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
              <div className="pagination-left-group">
                <div className="pagination-info">
                  Hiển thị {startIdx}-{endIdx} / {totalBooksCount.toLocaleString('vi-VN')} đầu sách
                </div>

                {/* Bộ chọn số lượng dòng hiển thị trên mỗi trang */}
                <div className="pagination-size-selector">
                  <label htmlFor="pageSizeSelect" className="size-selector-label">Hiển thị:</label>
                  <select
                    id="pageSizeSelect"
                    className="size-selector-select"
                    value={pageSize}
                    onChange={(e) => {
                      const newSize = Number(e.target.value);
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    title="Chọn số lượng đầu sách hiển thị trên mỗi trang"
                  >
                    <option value={10}>10 / trang</option>
                    <option value={20}>20 / trang</option>
                    <option value={50}>50 / trang</option>
                    <option value={100}>100 / trang</option>
                  </select>
                </div>
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

            {/* Thanh Tab điều hướng: Thông tin chung vs Quản lý Bản sao & Mã vạch */}
            <div className="modal-tabs-header">
              <button
                type="button"
                className={`modal-tab-btn ${detailActiveTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('overview')}
              >
                <BookOpen size={16} />
                <span>Thông tin chung</span>
              </button>
              <button
                type="button"
                className={`modal-tab-btn ${detailActiveTab === 'copies' ? 'active' : ''}`}
                onClick={() => setDetailActiveTab('copies')}
              >
                <QrCode size={16} />
                <span>Quản lý Bản sao & Mã vạch</span>
                <span className="tab-counter-badge">
                  {(selectedBook.copies && selectedBook.copies.length) || selectedBook.totalCopies || 0}
                </span>
              </button>
            </div>

            <div className="modal-body">
              {/* TAB 1: THÔNG TIN CHUNG */}
              {detailActiveTab === 'overview' && (
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
                        selectedBook.status === 'available' ? 'badge-available' : 'badge-borrowed'
                      }`}
                    >
                      {selectedBook.status === 'available' ? 'Sẵn sàng phục vụ' : 'Đang mượn hết'}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: QUẢN LÝ BẢN SAO & MÃ VẠCH (AC1 - AC5) */}
              {detailActiveTab === 'copies' && (
                <div className="copies-management-tab">
                  {/* Thanh thống kê trạng thái & Thao tác hành động */}
                  <div className="copies-action-bar">
                    <div className="copies-stats-group">
                      <span className="stat-pill stat-total">
                        Tổng: <strong>{(selectedBook.copies && selectedBook.copies.length) || 0}</strong>
                      </span>
                      <span className="stat-pill stat-avail">
                        Sẵn sàng:{' '}
                        <strong>
                          {selectedBook.copies?.filter((c) => c.status === 'Available').length || 0}
                        </strong>
                      </span>
                      <span className="stat-pill stat-borrowed">
                        Đang mượn:{' '}
                        <strong>
                          {selectedBook.copies?.filter((c) => c.status === 'Borrowed').length || 0}
                        </strong>
                      </span>
                      {selectedBook.copies?.some((c) => c.status === 'Damaged') && (
                        <span className="stat-pill stat-damaged">
                          Hỏng:{' '}
                          <strong>
                            {selectedBook.copies?.filter((c) => c.status === 'Damaged').length}
                          </strong>
                        </span>
                      )}
                      {selectedBook.copies?.some((c) => c.status === 'Lost') && (
                        <span className="stat-pill stat-lost">
                          Mất:{' '}
                          <strong>
                            {selectedBook.copies?.filter((c) => c.status === 'Lost').length}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div className="copies-buttons-group">
                      {/* Lọc nhanh theo mã vạch trong bảng bản sao */}
                      <div className="copy-search-box">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Lọc mã vạch..."
                          value={copySearchKeyword}
                          onChange={(e) => setCopySearchKeyword(e.target.value)}
                        />
                        {copySearchKeyword && (
                          <button
                            type="button"
                            className="btn-clear-copy-search"
                            onClick={() => setCopySearchKeyword('')}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Nút In tem mã vạch */}
                      <button
                        type="button"
                        className="btn-print-labels"
                        onClick={() => handleOpenPrintModal()}
                        title="In tem mã vạch cho các bản sao được chọn"
                      >
                        <Printer size={15} />
                        <span>In tem mã vạch</span>
                        {selectedCopyBarcodes.size > 0 && (
                          <span className="selected-count-badge">({selectedCopyBarcodes.size})</span>
                        )}
                      </button>

                      {/* Nút Thêm mới bản sao (Bulk Add) */}
                      <button
                        type="button"
                        className="btn-bulk-add"
                        onClick={() => {
                          setBulkAddCount(5);
                          setIsBulkAddOpen(true);
                        }}
                      >
                        <Plus size={15} />
                        <span>Thêm bản sao</span>
                      </button>
                    </div>
                  </div>

                  {/* BẢNG CHI TIẾT BẢN SAO (DATA TABLE) */}
                  <div className="copies-table-wrapper">
                    {(() => {
                      const list = (selectedBook.copies || []).filter((c) =>
                        !copySearchKeyword || c.barcode.toLowerCase().includes(copySearchKeyword.toLowerCase().trim())
                      );

                      if (list.length === 0) {
                        return (
                          <div className="copies-empty-state">
                            <Layers size={36} className="empty-icon" />
                            <p className="empty-title">Chưa có bản sao nào khớp với tìm kiếm</p>
                            <p className="empty-desc">Nhấn nút "Thêm bản sao" để tự động sinh mã vạch hàng loạt.</p>
                          </div>
                        );
                      }

                      const isAllSelected = list.length > 0 && selectedCopyBarcodes.size === list.length;

                      return (
                        <table className="copies-data-table">
                          <thead>
                            <tr>
                              <th style={{ width: '42px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="checkbox-btn"
                                  onClick={() => handleToggleSelectAllCopies(list)}
                                  title={isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                >
                                  {isAllSelected ? (
                                    <CheckSquare size={17} className="check-icon-active" />
                                  ) : (
                                    <Square size={17} className="check-icon-inactive" />
                                  )}
                                </button>
                              </th>
                              <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                              <th>Mã vạch (Barcode)</th>
                              <th>Tình trạng</th>
                              <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((copy, idx) => {
                              const isSelected = selectedCopyBarcodes.has(copy.barcode);
                              const isHighlighted = highlightedBarcode && copy.barcode.toLowerCase() === highlightedBarcode.toLowerCase();

                              return (
                                <tr
                                  key={copy.copyId || copy.barcode || idx}
                                  className={`${isSelected ? 'row-selected' : ''} ${isHighlighted ? 'row-scanned-pulse' : ''}`}
                                >
                                  {/* Checkbox chọn */}
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className="checkbox-btn"
                                      onClick={() => handleToggleSelectCopy(copy.barcode)}
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={16} className="check-icon-active" />
                                      ) : (
                                        <Square size={16} className="check-icon-inactive" />
                                      )}
                                    </button>
                                  </td>

                                  {/* STT */}
                                  <td style={{ textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                    {idx + 1}
                                  </td>

                                  {/* Cột Mã vạch: text + mini-barcode + xem phóng to */}
                                  <td>
                                    <div className="barcode-cell">
                                      <div className="mini-barcode-graphic" title="Mã vạch Code128">
                                        <span className="bar-stripe stripe-1"></span>
                                        <span className="bar-stripe stripe-2"></span>
                                        <span className="bar-stripe stripe-1"></span>
                                        <span className="bar-stripe stripe-3"></span>
                                        <span className="bar-stripe stripe-1"></span>
                                        <span className="bar-stripe stripe-2"></span>
                                        <span className="bar-stripe stripe-1"></span>
                                      </div>
                                      <span className="barcode-string-mono">{copy.barcode}</span>
                                      <button
                                        type="button"
                                        className="btn-view-barcode"
                                        onClick={() => handleOpenViewBarcode(copy)}
                                        title="Xem mã vạch 1D & QR Code 2D"
                                      >
                                        <QrCode size={13} />
                                        <span>Xem mã</span>
                                      </button>
                                      {isHighlighted && (
                                        <span className="scanned-tag">
                                          <Sparkles size={11} /> Vừa quét
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Cột Tình trạng: Nhãn màu trực quan + Đổi nhanh */}
                                  <td>
                                    <div className="status-dropdown-wrapper">
                                      <select
                                        className={`copy-status-select status-${(copy.status || 'Available').toLowerCase()}`}
                                        value={copy.status || 'Available'}
                                        onChange={(e) => handleUpdateCopyStatus(copy, e.target.value)}
                                        title="Nhấp để thay đổi trạng thái bản sao"
                                      >
                                        <option value="Available">● Sẵn sàng</option>
                                        <option value="Borrowed">● Đang mượn</option>
                                        <option value="Damaged">● Bị hỏng</option>
                                        <option value="Lost">● Bị mất</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* Cột Thao tác: In tem lẻ & Xóa */}
                                  <td style={{ textAlign: 'center' }}>
                                    <div className="copy-row-actions">
                                      <button
                                        type="button"
                                        className="btn-copy-action btn-copy-print"
                                        onClick={() => handleOpenPrintModal(copy)}
                                        title="In tem mã vạch cho riêng bản sao này"
                                      >
                                        <Printer size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className={`btn-copy-action btn-copy-delete ${copy.status === 'Borrowed' ? 'disabled' : ''}`}
                                        onClick={() => handleDeleteCopy(copy)}
                                        disabled={copy.status === 'Borrowed'}
                                        title={
                                          copy.status === 'Borrowed'
                                            ? 'Không thể xóa bản sao đang cho mượn'
                                            : 'Xóa bản sao khỏi hệ thống'
                                        }
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              )}
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
          MODAL CON 1: THÊM BẢN SAO HÀNG LOẠT (BULK ADD - AC2)
          ==================================================================== */}
      {isBulkAddOpen && selectedBook && (
        <div className="catalog-modal-overlay" onClick={() => !bulkAddLoading && setIsBulkAddOpen(false)}>
          <div className="catalog-modal-content bulk-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <span className="modal-code-tag">{selectedBook.code}</span>
                <h3 className="modal-title">Thêm bản sao hàng loạt (Bulk Add)</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => !bulkAddLoading && setIsBulkAddOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body bulk-add-body">
              <p className="bulk-add-intro">
                Đầu sách: <strong>{selectedBook.title}</strong>
              </p>

              {/* Nhập số lượng bản sao */}
              <div className="form-group-bulk">
                <label className="bulk-label">Số lượng bản sao cần thêm:</label>
                <div className="bulk-count-presets">
                  {[1, 5, 10, 20].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn-count-preset ${bulkAddCount === preset ? 'active' : ''}`}
                      onClick={() => setBulkAddCount(preset)}
                    >
                      +{preset} cuốn
                    </button>
                  ))}
                </div>

                <div className="bulk-number-input-row">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="bulk-number-input"
                    value={bulkAddCount}
                    onChange={(e) => setBulkAddCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  />
                  <span className="bulk-unit-text">cuốn sách</span>
                </div>
              </div>

              {/* Hộp xem trước các mã vạch liên tiếp sẽ được sinh */}
              <div className="bulk-preview-box">
                <div className="preview-header">
                  <Sparkles size={14} className="preview-sparkle" />
                  <span>Xem trước {bulkAddCount} mã vạch tự động sinh liên tiếp:</span>
                </div>
                <div className="preview-badges-list">
                  {(() => {
                    const currentCopies = selectedBook.copies || [];
                    const firstBarcode = currentCopies.find((c) => c.barcode)?.barcode;
                    let prefix = `BC${String(selectedBook.id).padStart(6, '0')}`;
                    if (firstBarcode && firstBarcode.includes('-')) {
                      prefix = firstBarcode.split('-')[0];
                    }

                    let maxSeq = currentCopies.length;
                    currentCopies.forEach((c) => {
                      if (!c.barcode) return;
                      const parts = c.barcode.split('-');
                      if (parts.length > 1) {
                        const suffix = parts[parts.length - 1].trim();
                        const num = parseInt(suffix, 10);
                        if (!isNaN(num)) {
                          if (num > maxSeq) maxSeq = num;
                        } else if (suffix.length === 1 && /[a-zA-Z]/.test(suffix)) {
                          const charCode = suffix.toUpperCase().charCodeAt(0) - 65 + 1;
                          if (charCode > maxSeq) maxSeq = charCode;
                        }
                      }
                    });

                    const previewItems = [];
                    const maxDisplay = Math.min(bulkAddCount, 6);
                    for (let i = 1; i <= maxDisplay; i++) {
                      const seq = maxSeq + i;
                      previewItems.push(`${prefix}-${String(seq).padStart(3, '0')}`);
                    }

                    return (
                      <>
                        {previewItems.map((code, pIdx) => (
                          <span key={pIdx} className="preview-badge-chip">
                            {code}
                          </span>
                        ))}
                        {bulkAddCount > 6 && (
                          <span className="preview-badge-more">...và {bulkAddCount - 6} mã tiếp theo</span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <p className="preview-note">
                  * Hệ thống sẽ tự động tạo {bulkAddCount} bản ghi độc lập với trạng thái mặc định là "Sẵn sàng".
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsBulkAddOpen(false)}
                disabled={bulkAddLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleBulkAddCopies}
                disabled={bulkAddLoading}
              >
                {bulkAddLoading ? (
                  <>
                    <Loader2 size={15} className="spinner" />
                    <span>Đang tạo bản sao...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Xác nhận tạo {bulkAddCount} bản sao</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL CON 2: XUẤT FILE PDF & IN TEM MÃ VẠCH (AC4)
          ==================================================================== */}
      {isPrintModalOpen && selectedBook && (
        <div className="catalog-modal-overlay" onClick={() => setIsPrintModalOpen(false)}>
          <div className="catalog-modal-content print-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <Printer size={18} className="print-header-icon" />
                <h3 className="modal-title">In Tem Nhãn Mã Vạch Thư Viện</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsPrintModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body print-modal-body">
              {/* Chọn kích thước / khổ tem in */}
              <div className="print-format-selector">
                <label className="format-label">Chọn định dạng tem in:</label>
                <div className="format-options-row">
                  <label className={`format-option-card ${printTemplate === 'a4' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="printFormat"
                      value="a4"
                      checked={printTemplate === 'a4'}
                      onChange={() => setPrintTemplate('a4')}
                    />
                    <div className="format-card-content">
                      <strong>Khổ Decal A4 (3 cột tiêu chuẩn)</strong>
                      <span>24 tem/trang, phù hợp in văn phòng và lưu kho thư viện</span>
                    </div>
                  </label>

                  <label className={`format-option-card ${printTemplate === 'thermal' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="printFormat"
                      value="thermal"
                      checked={printTemplate === 'thermal'}
                      onChange={() => setPrintTemplate('thermal')}
                    />
                    <div className="format-card-content">
                      <strong>Tem cuộn nhiệt 50mm x 30mm</strong>
                      <span>Máy in tem nhãn chuyên dụng (Zebra / Xprinter / TSC)</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Xem trước mẫu tem nhãn */}
              <div className="print-preview-section">
                <div className="preview-label-title">
                  <span>Mẫu tem nhãn xem trước (Tổng số tem sẽ in: <strong>{copiesToPrint.length}</strong> tem):</span>
                </div>

                <div className="sample-labels-container">
                  {copiesToPrint.slice(0, 2).map((copy, sIdx) => (
                    <div key={sIdx} className="sample-label-card">
                      <div className="sample-lib-header">SMARTLIB AI - THƯ VIỆN ĐẠI HỌC</div>
                      <div className="sample-book-name">{selectedBook.title}</div>
                      <div
                        className="sample-barcode-vector"
                        dangerouslySetInnerHTML={{
                          __html: generateBarcodeSvg(copy.barcode, {
                            width: 200,
                            height: 52,
                            fontSize: 10,
                            margin: 3
                          })
                        }}
                      />
                    </div>
                  ))}
                  {copiesToPrint.length > 2 && (
                    <div className="sample-more-hint">
                      + thêm {copiesToPrint.length - 2} tem tương tự theo danh sách đã chọn.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={handleExecutePdfExport}
              >
                <Download size={15} />
                <span>Tải file PDF</span>
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={handleExecutePrint}
              >
                <Printer size={15} />
                <span>In tem ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL CON 3: XEM LỚN MÃ VẠCH 1D & QR CODE 2D
          ==================================================================== */}
      {isViewBarcodeModalOpen && viewBarcodeCopy && (
        <div className="catalog-modal-overlay" onClick={() => setIsViewBarcodeModalOpen(false)}>
          <div className="catalog-modal-content view-barcode-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <QrCode size={18} className="qr-header-icon" />
                <h3 className="modal-title">Mã vạch bản sao: {viewBarcodeCopy.barcode}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsViewBarcodeModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body view-barcode-body">
              <p className="barcode-book-ref">
                Đầu sách: <strong>{selectedBook?.title}</strong>
              </p>

              <div className="dual-barcode-display">
                {/* Khung 1: Mã vạch Code 128 (1D) */}
                <div className="barcode-panel-card">
                  <h4 className="panel-title">Mã vạch tuyến tính 1D (Code 128)</h4>
                  <div
                    className="svg-container-1d"
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg(viewBarcodeCopy.barcode, {
                        width: 280,
                        height: 75,
                        fontSize: 12,
                        margin: 6
                      })
                    }}
                  />
                  <span className="panel-hint">Tương thích với mọi đầu đọc mã vạch laser / CCD</span>
                </div>

                {/* Khung 2: Mã QR (2D) */}
                <div className="barcode-panel-card">
                  <h4 className="panel-title">Mã QR 2D (Quick Response)</h4>
                  <div
                    className="svg-container-2d"
                    dangerouslySetInnerHTML={{
                      __html: generateQrCodeSvg(viewBarcodeCopy.barcode, 130)
                    }}
                  />
                  <span className="panel-hint">Quét bằng camera điện thoại hoặc máy quét 2D</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsViewBarcodeModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="btn-modal-primary"
                onClick={() => {
                  setIsViewBarcodeModalOpen(false);
                  handleOpenPrintModal(viewBarcodeCopy);
                }}
              >
                <Printer size={14} />
                <span>In tem bản sao này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL CON 4: MÁY QUÉT MÃ VẠCH (BARCODE SCANNER - AC5)
          ==================================================================== */}
      {isScannerModalOpen && (
        <div className="catalog-modal-overlay" onClick={() => setIsScannerModalOpen(false)}>
          <div className="catalog-modal-content scanner-dialog-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <ScanLine size={20} className="scanner-header-icon" />
                <h3 className="modal-title">Máy Quét Mã Vạch (Barcode Scanner)</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => {
                  handleResetScannerImage();
                  setIsScannerModalOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body scanner-dialog-body">
              {/* Hiệu ứng quét laser đồ họa & Vùng Drop-zone kéo thả ảnh */}
              <div
                className={`scanner-viewport-box ${isDraggingImage ? 'is-dragover' : ''} ${isDecodingImage ? 'is-decoding' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingImage(true);
                }}
                onDragLeave={() => setIsDraggingImage(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingImage(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessBarcodeImage(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => scannerImageInputRef.current?.click()}
                title="Bấm để chọn file ảnh, hoặc kéo thả ảnh mã vạch vào đây"
              >
                {imagePreviewUrl && (
                  <>
                    <img
                      src={imagePreviewUrl}
                      alt="Barcode preview"
                      className="scanner-preview-image"
                    />
                    <button
                      type="button"
                      className="btn-clear-scanner-preview"
                      onClick={handleResetScannerImage}
                      title="Xóa ảnh này / Đặt lại khung quét"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                <div className="scanner-target-reticle">
                  <div className="reticle-corner corner-tl"></div>
                  <div className="reticle-corner corner-tr"></div>
                  <div className="reticle-corner corner-bl"></div>
                  <div className="reticle-corner corner-br"></div>
                  <div className="laser-scan-line"></div>
                </div>
                <span className="scanner-status-text">
                  {isDecodingImage
                    ? 'Đang giải mã mã vạch / QR từ ảnh...'
                    : isDraggingImage
                    ? 'Thả tệp ảnh vào đây để quét mã...'
                    : imagePreviewUrl
                    ? 'Đang xem ảnh tải lên. Bấm nút [✕] hoặc [Đặt lại] để chọn ảnh khác'
                    : 'Kéo thả ảnh vào đây, nhấn Ctrl+V để dán, hoặc quét bằng súng đọc'}
                </span>
              </div>

              {/* Thanh công cụ: Nút tải ảnh mã vạch, nút Đặt lại và gợi ý dán ảnh Clipboard */}
              <div className="scanner-toolbar-row">
                <div className="scanner-toolbar-buttons">
                  <button
                    type="button"
                    className="btn-upload-scanner-img"
                    onClick={() => scannerImageInputRef.current?.click()}
                    disabled={isDecodingImage}
                    title="Tải ảnh chứa mã vạch (Code128) hoặc QR Code từ máy tính"
                  >
                    <ImageUp size={15} />
                    <span>{isDecodingImage ? 'Đang giải mã ảnh...' : 'Tải ảnh mã vạch / QR'}</span>
                  </button>
                  {imagePreviewUrl && (
                    <button
                      type="button"
                      className="btn-reset-scanner-img"
                      onClick={handleResetScannerImage}
                      title="Xóa ảnh hiện tại và đặt lại khung quét"
                    >
                      <RotateCcw size={14} />
                      <span>Đặt lại</span>
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={scannerImageInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessBarcodeImage(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                <span className="scanner-paste-hint">
                  Dán nhanh ảnh chụp màn hình bằng <kbd>Ctrl + V</kbd>
                </span>
              </div>

              {/* Ô nhập liệu mã vạch (kết nối máy quét USB/Bluetooth tự động gõ vào đây) */}
              <div className="scanner-input-group">
                <input
                  type="text"
                  autoFocus
                  className="scanner-text-field"
                  placeholder="Quét mã bằng đầu đọc hoặc gõ mã vạch rồi nhấn Enter..."
                  value={scannerInputValue}
                  onChange={(e) => setScannerInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && scannerInputValue.trim()) {
                      handleBarcodeScanLookup(scannerInputValue.trim());
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-scanner-submit"
                  onClick={() => scannerInputValue.trim() && handleBarcodeScanLookup(scannerInputValue.trim())}
                >
                  Tra cứu
                </button>
              </div>

              {/* Danh sách các mã vạch mẫu để thủ thư kiểm thử nhanh */}
              <div className="quick-test-barcodes">
                <span className="quick-test-label">Bấm mã mẫu để kiểm thử quét nhanh:</span>
                <div className="quick-chips-row">
                  {['BC000001-A', 'BC000001-B', 'BC000001-C', 'BC000002-A', 'BC000003-A'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="btn-quick-chip"
                      onClick={() => handleBarcodeScanLookup(code)}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => {
                  handleResetScannerImage();
                  setIsScannerModalOpen(false);
                }}
              >
                Hủy bỏ
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
                    <div className="form-label-with-action">
                      <label className="form-label">Thể loại *</label>
                      <button
                        type="button"
                        className="btn-quick-add-cat"
                        onClick={() => setIsAddCategoryOpen(true)}
                        title="Tạo thể loại mới"
                      >
                        <Plus size={12} />
                        <span>Thêm thể loại</span>
                      </button>
                    </div>
                    <select
                      className="form-input form-select-custom"
                      value={editingBook.categoryID || (categories.find(c => c.categoryName.toLowerCase() === (editingBook.category || '').toLowerCase())?.categoryID || '')}
                      onChange={(e) => {
                        const catId = Number(e.target.value);
                        const selectedCat = categories.find((c) => c.categoryID === catId);
                        setEditingBook({
                          ...editingBook,
                          categoryID: catId,
                          category: selectedCat ? selectedCat.categoryName : editingBook.category
                        });
                      }}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.categoryID} value={c.categoryID}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
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

      {/* ====================================================================
          MODAL 6: THÊM ĐẦU SÁCH MỚI (ADD NEW BOOK)
          ==================================================================== */}
      {isAddBookOpen && (
        <div className="catalog-modal-overlay" onClick={() => !isSavingBook && setIsAddBookOpen(false)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveNewBook}>
              <div className="modal-header">
                <div className="modal-title-box">
                  <span className="modal-code-tag" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                    Mới
                  </span>
                  <h3 className="modal-title">Thêm đầu sách mới vào thư viện</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  disabled={isSavingBook}
                  onClick={() => setIsAddBookOpen(false)}
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
                    placeholder="Nhập tên đầu sách (ví dụ: Trí Tuệ Nhân Tạo Hiện Đại)"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tác giả *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nhập tên tác giả (ví dụ: Stuart Russell)"
                      value={newBook.author}
                      onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div className="form-label-with-action">
                      <label className="form-label">Thể loại *</label>
                      <button
                        type="button"
                        className="btn-quick-add-cat"
                        onClick={() => setIsAddCategoryOpen(true)}
                        title="Tạo thể loại mới"
                      >
                        <Plus size={12} />
                        <span>Thêm thể loại</span>
                      </button>
                    </div>
                    <select
                      className="form-input form-select-custom"
                      value={newBook.categoryID}
                      onChange={(e) => setNewBook({ ...newBook, categoryID: Number(e.target.value) })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.categoryID} value={c.categoryID}>
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giá bìa niêm yết (VNĐ) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newBook.price}
                      min="1000"
                      step="1000"
                      onChange={(e) => setNewBook({ ...newBook, price: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số bản sao nhập kho ban đầu *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newBook.initialCopies}
                      min="1"
                      max="100"
                      onChange={(e) => setNewBook({ ...newBook, initialCopies: Number(e.target.value) })}
                      title="Hệ thống sẽ tự động sinh mã vạch Barcode tương ứng cho từng cuốn"
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
                      placeholder="Ví dụ: NXB Giáo Dục, NXB Trẻ..."
                      value={newBook.publisher}
                      onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã ISBN (Tùy chọn)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Mã ISBN-10 hoặc ISBN-13"
                      value={newBook.isbn}
                      onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={isSavingBook}
                  onClick={() => setIsAddBookOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={isSavingBook}
                >
                  {isSavingBook ? (
                    <>
                      <Loader2 size={16} className="spinner-rotate" />
                      <span>Đang lưu vào CSDL...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Lưu đầu sách</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 7: THÊM NHANH THỂ LOẠI MỚI (ADD CATEGORY MODAL)
          ==================================================================== */}
      {isAddCategoryOpen && (
        <div
          className="catalog-modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => !isSavingCategory && setIsAddCategoryOpen(false)}
        >
          <div
            className="catalog-modal-content small-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleCreateCategory}>
              <div className="modal-header">
                <div className="modal-title-box">
                  <span className="modal-code-tag" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>
                    <FolderPlus size={13} style={{ marginRight: 4 }} />
                    Danh mục
                  </span>
                  <h3 className="modal-title">Thêm thể loại sách mới</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  disabled={isSavingCategory}
                  onClick={() => setIsAddCategoryOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên thể loại sách *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Khoa học viễn tưởng, Kỹ năng mềm..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                    required
                  />
                  <span className="form-hint-text">
                    Thể loại mới sẽ được lưu vào cơ sở dữ liệu và hiển thị ngay trên các bộ lọc & dropdown.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={isSavingCategory}
                  onClick={() => setIsAddCategoryOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-modal-primary"
                  disabled={isSavingCategory || !newCategoryName.trim()}
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 size={16} className="spinner-rotate" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Tạo thể loại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

