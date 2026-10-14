using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Notifications;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Interface dịch vụ nghiệp vụ gửi và quản lý cảnh báo trễ hạn cho Thủ thư.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Quét toàn bộ hệ thống các phiếu mượn trễ hạn / sắp trễ hạn và gửi cảnh báo tới các Thủ thư.
    /// </summary>
    Task<ApiResponse<OverdueWarningResultDto>> SendOverdueWarningsToLibrariansAsync(
        SendOverdueWarningRequestDto? request, 
        int? currentUserId);

    /// <summary>
    /// Gửi cảnh báo trễ hạn cho một phiếu mượn cụ thể tới Thủ thư.
    /// </summary>
    Task<ApiResponse<OverdueWarningResultDto>> SendOverdueWarningForBorrowingAsync(
        int borrowingId, 
        int? currentUserId);

    /// <summary>
    /// Lấy danh sách thông báo và cảnh báo của Thủ thư kèm phân trang và thống kê chưa đọc.
    /// </summary>
    Task<ApiResponse<NotificationSummaryResponseDto>> GetLibrarianNotificationsAsync(
        int userId, 
        bool? isRead, 
        int page, 
        int pageSize);

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc của Thủ thư (dùng cho Badge trên thanh Header).
    /// </summary>
    Task<ApiResponse<int>> GetUnreadCountAsync(int userId);

    /// <summary>
    /// Đánh dấu một thông báo là đã đọc.
    /// </summary>
    Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId, int userId);

    /// <summary>
    /// Đánh dấu toàn bộ thông báo của Thủ thư là đã đọc.
    /// </summary>
    Task<ApiResponse<int>> MarkAllAsReadAsync(int userId);

    /// <summary>
    /// Xóa một thông báo.
    /// </summary>
    Task<ApiResponse<bool>> DeleteNotificationAsync(int notificationId, int userId);

    /// <summary>
    /// Lấy danh sách tóm tắt toàn bộ các ca mượn sách đang quá hạn hoặc sắp quá hạn trong hệ thống.
    /// </summary>
    Task<ApiResponse<List<OverdueBorrowingItemDto>>> GetOverdueBorrowingsSummaryAsync(int? daysBeforeWindow = 0);
}
