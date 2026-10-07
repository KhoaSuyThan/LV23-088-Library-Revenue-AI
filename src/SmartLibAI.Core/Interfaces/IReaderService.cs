using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ quản trị hồ sơ độc giả, phân tích rủi ro AI và khóa/mở khóa thẻ thư viện.
/// </summary>
public interface IReaderService
{
    /// <summary>
    /// Lấy danh sách hồ sơ độc giả từ SQL Server có hỗ trợ lọc theo Khoa, Trạng thái, Rủi ro AI và Từ khóa tìm kiếm.
    /// </summary>
    Task<ApiResponse<List<ReaderDto>>> GetReadersAsync(string? faculty, string? status, string? risk, string? search);

    /// <summary>
    /// Lấy chi tiết hồ sơ một độc giả theo ReaderID.
    /// </summary>
    Task<ApiResponse<ReaderDto>> GetReaderByIdAsync(int id);

    /// <summary>
    /// Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong SQL Server (đổi IsActive của User).
    /// </summary>
    Task<ApiResponse<ToggleLockResponseDto>> ToggleLockAsync(int readerId);

    /// <summary>
    /// Đặt trạng thái khóa thẻ độc giả theo giá trị chỉ định.
    /// </summary>
    Task<ApiResponse<ToggleLockResponseDto>> SetLockStatusAsync(int readerId, bool isActive);

    /// <summary>
    /// Lấy dữ liệu thống kê tổng hợp cho 4 thẻ KPI hồ sơ độc giả.
    /// </summary>
    Task<ApiResponse<ReaderSummaryDto>> GetReaderSummaryAsync();

    /// <summary>
    /// Gửi thông báo cảnh báo trễ hạn đến độc giả.
    /// </summary>
    Task<ApiResponse<bool>> SendWarningNotificationAsync(int readerId);
}
