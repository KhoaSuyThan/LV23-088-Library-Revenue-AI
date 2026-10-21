import { apiClient } from './authApi';

/**
/// Service API cho phân hệ Hóa đơn thu tiền phạt và Biên lai kế toán (Story LOLRA-19)
 */
export const invoiceApi = {
  /**
   * Tạo hóa đơn kế toán thu tiền phạt bất biến và mở khóa mượn sách (POST /api/invoices)
   * @param {{ receiptId: number, paymentMethod: 'Cash' | 'Transfer', note?: string, cashierId?: number }} data
   */
  createInvoice: async (data) => {
    const response = await apiClient.post('/api/invoices', data);
    return response.data;
  },

  /**
   * Lấy danh sách các khoản phạt vi phạm đang chờ thu tiền (Status = 'Pending')
   * @param {string} [query] Từ khóa tìm kiếm (Mã độc giả, tên, mã phiếu)
   */
  getPendingFines: async (query = '') => {
    const params = query ? `?query=${encodeURIComponent(query)}` : '';
    const response = await apiClient.get(`/api/invoices/pending${params}`);
    return response.data;
  },

  /**
   * Tra cứu chi tiết biên lai thu tiền phạt theo Mã biên lai (INVxxxxxx) hoặc ID
   * @param {string | number} idOrCode
   */
  getInvoice: async (idOrCode) => {
    const response = await apiClient.get(`/api/invoices/${encodeURIComponent(idOrCode)}`);
    return response.data;
  },

  /**
   * Lấy tổng hợp số liệu tài chính doanh thu thu phạt và dữ liệu biểu đồ (Story LOLRA-17)
   */
  getRevenueSummary: async () => {
    const response = await apiClient.get('/api/invoices/summary');
    return response.data;
  },

  /**
   * Lấy danh sách lịch sử các biên lai đã thu tiền có phân trang và lọc theo ngày/từ khóa
   * @param {{ query?: string, fromDate?: string, toDate?: string, pageNumber?: number, pageSize?: number }} [params]
   */
  getInvoiceHistory: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('query', params.query);
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.pageNumber) queryParams.append('pageNumber', params.pageNumber);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get(`/api/invoices/history${queryString}`);
    return response.data;
  },

  /**
   * Lấy danh sách độc giả có nguy cơ trễ hạn cao do AI đánh giá (phục vụ Tab AI Dự báo)
   */
  getAiForecastReaders: async () => {
    const response = await apiClient.get('/api/invoices/ai-forecast-readers');
    return response.data;
  }
};
