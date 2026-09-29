import { apiClient } from './authApi';

/**
 * Service API cho phân hệ Quầy lưu thông (Circulation Desk) và Mượn/Trả sách
 */
export const borrowApi = {
  /**
   * Tạo phiếu mượn sách mới bằng máy quét mã vạch (POST /api/borrows)
   * @param {{ readerCode: string, barcodes: string[], dueDate?: string, librarianId?: number }} data
   */
  createBorrow: async (data) => {
    const response = await apiClient.post('/api/borrows', data);
    return response.data;
  },

  /**
   * Lấy danh sách các phiếu mượn gần nhất tại quầy lưu thông
   * @param {number} count Số lượng giao dịch gần nhất
   */
  getRecentBorrows: async (count = 20) => {
    const response = await apiClient.get(`/api/borrows/recent?count=${count}`);
    return response.data;
  },

  /**
   * Kiểm tra điều kiện mượn sách của độc giả (nợ phạt, hạn mức, trạng thái thẻ)
   * @param {string} readerCode Mã thẻ độc giả hoặc MSSV
   */
  checkEligibility: async (readerCode) => {
    const response = await apiClient.get(`/api/borrows/eligibility/${encodeURIComponent(readerCode)}`);
    return response.data;
  },

  /**
   * Lấy chi tiết thông tin phiếu mượn theo ID
   * @param {number} id
   */
  getBorrowById: async (id) => {
    const response = await apiClient.get(`/api/borrows/${id}`);
    return response.data;
  },

  /**
   * Tra cứu thông tin bản sao bằng máy quét mã vạch Barcode
   * @param {string} barcode Mã vạch bản sao sách
   */
  lookupBarcode: async (barcode) => {
    const response = await apiClient.get(`/api/BookCopies/lookup?barcode=${encodeURIComponent(barcode)}`);
    return response.data;
  }
};
