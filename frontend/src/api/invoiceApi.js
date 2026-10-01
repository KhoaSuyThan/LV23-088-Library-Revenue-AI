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
  }
};
