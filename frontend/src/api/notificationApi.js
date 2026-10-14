import { apiClient } from './authApi';

/**
 * Service API cho phân hệ Quản lý Thông báo và Cảnh báo trễ hạn cho Thủ thư
 */
export const notificationApi = {
  /**
   * Quét toàn bộ hệ thống các phiếu mượn trễ hạn hoặc sắp trễ hạn và gửi cảnh báo tới Thủ thư
   * @param {{ daysBefore?: number, specificLibrarianId?: number, includeAiAtRisk?: boolean, specificBorrowingId?: number }} params
   */
  sendOverdueWarnings: async (params = {}) => {
    const response = await apiClient.post('/api/notifications/overdue-warnings', params);
    return response.data;
  },

  /**
   * Gửi cảnh báo trễ hạn cho một phiếu mượn cụ thể tới Thủ thư
   * @param {number} borrowingId Mã ID phiếu mượn sách
   */
  sendWarningForBorrowing: async (borrowingId) => {
    const response = await apiClient.post(`/api/notifications/overdue-warnings/${borrowingId}`);
    return response.data;
  },

  /**
   * Lấy danh sách thông báo phân trang của Thủ thư đang đăng nhập
   * @param {{ isRead?: boolean, page?: number, pageSize?: number }} params
   */
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.isRead !== undefined && params.isRead !== null) {
      query.append('isRead', params.isRead);
    }
    if (params.page) {
      query.append('page', params.page);
    }
    if (params.pageSize) {
      query.append('pageSize', params.pageSize);
    }

    const qs = query.toString();
    const url = qs ? `/api/notifications?${qs}` : '/api/notifications';
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Lấy số lượng thông báo chưa đọc của Thủ thư (cho Badge chuông thông báo)
   */
  getUnreadCount: async () => {
    const response = await apiClient.get('/api/notifications/unread-count');
    return response.data;
  },

  /**
   * Đánh dấu một thông báo là đã đọc
   * @param {number} id ID thông báo
   */
  markAsRead: async (id) => {
    const response = await apiClient.patch(`/api/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Đánh dấu toàn bộ thông báo của Thủ thư là đã đọc
   */
  markAllAsRead: async () => {
    const response = await apiClient.post('/api/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Xóa một thông báo
   * @param {number} id ID thông báo
   */
  deleteNotification: async (id) => {
    const response = await apiClient.delete(`/api/notifications/${id}`);
    return response.data;
  },

  /**
   * Lấy danh sách tóm tắt toàn bộ các ca mượn sách đang quá hạn hoặc sắp quá hạn
   * @param {number} daysBefore Số ngày trước hạn cần quét (mặc định 0)
   */
  getOverdueSummary: async (daysBefore = 0) => {
    const response = await apiClient.get(`/api/notifications/overdue-summary?daysBefore=${daysBefore}`);
    return response.data;
  }
};
