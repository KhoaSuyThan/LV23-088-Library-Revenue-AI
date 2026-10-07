using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ quản lý độc giả, hồ sơ bạn đọc, phân tích rủi ro AI và khóa/mở thẻ (L0LRA-71 & L0LRA-78).
/// </summary>
public interface IReaderService
{
    /// <summary>
    /// Lấy danh sách độc giả có phân trang, tìm kiếm theo từ khóa và lọc trạng thái thẻ (L0LRA-78).
    /// </summary>
    Task<ApiResponse<PagedResult<ReaderDto>>> GetPagedReadersAsync(
        string? keyword,
        string? memberType,
        string? status,
        int pageNumber,
        int pageSize);

    /// <summary>
    /// Lấy danh sách hồ sơ độc giả từ SQL Server có hỗ trợ lọc theo Khoa, Trạng thái, Rủi ro AI và Từ khóa tìm kiếm (L0LRA-71).
    /// </summary>
    Task<ApiResponse<List<ReaderDto>>> GetReadersAsync(string? faculty, string? status, string? risk, string? search);

    /// <summary>
    /// Lấy chi tiết hồ sơ một độc giả theo ReaderID (ReaderDto - L0LRA-71).
    /// </summary>
    Task<ApiResponse<ReaderDto>> GetReaderByIdAsync(int id);

    /// <summary>
    /// Lấy chi tiết thông tin hồ sơ độc giả kèm thống kê sách mượn và tiền phạt (ReaderDetailDto - L0LRA-78).
    /// </summary>
    Task<ApiResponse<ReaderDetailDto>> GetReaderDetailByIdAsync(int readerId);

    /// <summary>
    /// Lấy chi tiết độc giả theo mã thẻ bạn đọc (ReaderCode).
    /// </summary>
    Task<ApiResponse<ReaderDetailDto>> GetReaderByCodeAsync(string readerCode);

    /// <summary>
    /// Thêm mới độc giả và cấp thẻ bạn đọc.
    /// </summary>
    Task<ApiResponse<ReaderDto>> CreateReaderAsync(CreateReaderRequestDto request);

    /// <summary>
    /// Cập nhật thông tin độc giả.
    /// </summary>
    Task<ApiResponse<ReaderDto>> UpdateReaderAsync(int readerId, UpdateReaderRequestDto request);

    /// <summary>
    /// Khóa hoặc Mở khóa thẻ bạn đọc (Cập nhật User.IsActive theo ToggleReaderStatusDto - L0LRA-78).
    /// </summary>
    Task<ApiResponse<ReaderDto>> ToggleCardStatusAsync(int readerId, ToggleReaderStatusDto request);

    /// <summary>
    /// Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong SQL Server (đổi IsActive của User - L0LRA-71).
    /// </summary>
    Task<ApiResponse<ToggleLockResponseDto>> ToggleLockAsync(int readerId);

    /// <summary>
    /// Đặt trạng thái khóa thẻ độc giả theo giá trị chỉ định (L0LRA-71).
    /// </summary>
    Task<ApiResponse<ToggleLockResponseDto>> SetLockStatusAsync(int readerId, bool isActive);

    /// <summary>
    /// Gia hạn ngày hết hạn thẻ bạn đọc.
    /// </summary>
    Task<ApiResponse<ReaderDto>> ExtendCardAsync(int readerId, ExtendCardRequestDto request);

    /// <summary>
    /// Lấy dữ liệu thống kê tổng hợp cho 4 thẻ KPI hồ sơ độc giả (L0LRA-71).
    /// </summary>
    Task<ApiResponse<ReaderSummaryDto>> GetReaderSummaryAsync();

    /// <summary>
    /// Gửi thông báo cảnh báo trễ hạn đến độc giả (L0LRA-71).
    /// </summary>
    Task<ApiResponse<bool>> SendWarningNotificationAsync(int readerId);
}
