using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Interface truy xuất dữ liệu thông báo và quét các phiếu mượn trễ hạn từ CSDL.
/// </summary>
public interface INotificationRepository
{
    /// <summary>
    /// Lấy danh sách thông báo của một người dùng theo phân trang và bộ lọc đã đọc.
    /// </summary>
    Task<List<Notification>> GetNotificationsByUserIdAsync(int userId, bool? isRead, int page, int pageSize);

    /// <summary>
    /// Đếm tổng số thông báo của người dùng.
    /// </summary>
    Task<int> GetNotificationCountByUserIdAsync(int userId, bool? isRead);

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc của người dùng.
    /// </summary>
    Task<int> GetUnreadCountAsync(int userId);

    /// <summary>
    /// Lấy chi tiết một thông báo theo ID.
    /// </summary>
    Task<Notification?> GetByIdAsync(int id);

    /// <summary>
    /// Thêm một thông báo mới vào bảng Notifications.
    /// </summary>
    Task AddNotificationAsync(Notification notification);

    /// <summary>
    /// Thêm danh sách hàng loạt thông báo vào bảng Notifications.
    /// </summary>
    Task AddNotificationsRangeAsync(IEnumerable<Notification> notifications);

    /// <summary>
    /// Đánh dấu một thông báo là đã đọc (IsRead = true).
    /// </summary>
    Task<bool> MarkAsReadAsync(int notificationId, int userId);

    /// <summary>
    /// Đánh dấu tất cả thông báo của người dùng là đã đọc.
    /// </summary>
    Task<int> MarkAllAsReadAsync(int userId);

    /// <summary>
    /// Xóa một thông báo theo ID và UserID sở hữu.
    /// </summary>
    Task<bool> DeleteAsync(int notificationId, int userId);

    /// <summary>
    /// Lấy danh sách toàn bộ Thủ thư đang hoạt động trong hệ thống (Role Admin hoặc Staff).
    /// </summary>
    Task<List<User>> GetActiveLibrariansAsync();

    /// <summary>
    /// Kiểm tra xem người dùng đã nhận thông báo trễ hạn cho phiếu mượn này gần đây chưa (chống spam trùng lặp).
    /// </summary>
    Task<bool> HasRecentWarningAsync(int userId, string borrowCode, DateTime since);

    /// <summary>
    /// Lấy danh sách các phiếu mượn đang hoạt động có sách trễ hạn hoặc sắp trễ hạn trong khoảng ngày cấu hình.
    /// </summary>
    Task<List<Borrowing>> GetOverdueBorrowingsAsync(int? daysBeforeWindow = 0);

    /// <summary>
    /// Lấy quy định phạt và cảnh báo AI hiện hành từ bảng FineRules.
    /// </summary>
    Task<FineRule?> GetActiveFineRuleAsync();
}
