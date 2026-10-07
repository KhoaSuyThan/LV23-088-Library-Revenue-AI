import { apiClient } from './authApi';

/**
 * Service API cho phân hệ Quản trị Hồ sơ Độc giả (Reader Profiles) kết nối SQL Server
 */
export const readerApi = {
  /**
   * Lấy danh sách hồ sơ độc giả từ SQL Server có hỗ trợ lọc và tìm kiếm
   * @param {{ faculty?: string, status?: string, risk?: string, search?: string }} params
   */
  getReaders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.faculty && params.faculty !== 'all') query.append('faculty', params.faculty);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.risk && params.risk !== 'all') query.append('risk', params.risk);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());

    const qs = query.toString();
    const url = qs ? `/api/readers?${qs}` : '/api/readers';
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Lấy số liệu thống kê tổng quan cho 4 thẻ KPI đầu trang
   */
  getSummary: async () => {
    const response = await apiClient.get('/api/readers/summary');
    return response.data;
  },

  /**
   * Lấy chi tiết thông tin hồ sơ một độc giả theo ID
   * @param {number} id ReaderID
   */
  getReaderById: async (id) => {
    const response = await apiClient.get(`/api/readers/${id}`);
    return response.data;
  },

  /**
   * Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong CSDL SQL Server (đổi IsActive của User).
   * Khi bị khóa, độc giả sẽ bị chặn mượn sách ngay lập tức tại quầy lưu thông.
   * @param {number} id ReaderID
   */
  toggleLock: async (id) => {
    const response = await apiClient.put(`/api/readers/${id}/toggle-lock`);
    return response.data;
  },

  /**
   * Đặt trạng thái khóa thẻ cụ thể cho độc giả
   * @param {number} id ReaderID
   * @param {boolean} isActive
   */
  setStatus: async (id, isActive) => {
    const response = await apiClient.put(`/api/readers/${id}/status`, { isActive });
    return response.data;
  },

  /**
   * Gửi cảnh báo trễ hạn qua Email / Thông báo hệ thống cho độc giả
   * @param {number} id ReaderID
   */
  sendWarning: async (id) => {
    const response = await apiClient.post(`/api/readers/${id}/send-warning`);
    return response.data;
  }
};
