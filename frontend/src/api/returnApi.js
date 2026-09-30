import { apiClient } from './authApi';

/**
 * Service API cho phân hệ Tiếp nhận trả sách & Kiểm tra vi phạm (Story LOLRA-17)
 */
export const returnApi = {
  /**
   * Tra cứu thông tin cuốn sách đang được mượn theo Barcode bản sao hoặc mã phiếu (GET /api/returns/lookup/{code})
   * @param {string} barcodeOrCode Mã vạch bản sao (BC000001-A) hoặc mã phiếu (PM-0005)
   */
  lookup: async (barcodeOrCode) => {
    const response = await apiClient.get(`/api/returns/lookup/${encodeURIComponent(barcodeOrCode)}`);
    return response.data;
  },

  /**
   * Tiếp nhận trả một cuốn sách cụ thể theo Barcode và ghi nhận tình trạng thực tế (POST /api/returns/process-item)
   * @param {{
   *   barcode: string,
   *   condition?: 'Good' | 'Damaged' | 'Lost',
   *   note?: string,
   *   waiverDiscountPercent?: number,
   *   waiverReason?: string
   * }} data
   */
  processReturn: async (data) => {
    const response = await apiClient.post('/api/returns/process-item', data);
    return response.data;
  }
};
