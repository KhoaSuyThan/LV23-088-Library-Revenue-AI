using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ Quản lý độc giả & Khóa mở thẻ bạn đọc (Story LOLRA-78).
/// </summary>
public interface IReaderService
{
    /// <summary>
    /// Lấy danh sách độc giả có phân trang, tìm kiếm theo từ khóa và lọc trạng thái thẻ.
    /// </summary>
    Task<ApiResponse<PagedResult<ReaderDto>>> GetPagedReadersAsync(
        string? keyword,
        string? memberType,
        string? status,
        int pageNumber,
        int pageSize);

    /// <summary>
    /// Lấy chi tiết thông tin hồ sơ độc giả kèm thống kê sách mượn và tiền phạt.
    /// </summary>
    Task<ApiResponse<ReaderDetailDto>> GetReaderByIdAsync(int readerId);

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
    /// Khóa hoặc Mở khóa thẻ bạn đọc (Cập nhật User.IsActive).
    /// </summary>
    Task<ApiResponse<ReaderDto>> ToggleCardStatusAsync(int readerId, ToggleReaderStatusDto request);

    /// <summary>
    /// Gia hạn ngày hết hạn thẻ bạn đọc.
    /// </summary>
    Task<ApiResponse<ReaderDto>> ExtendCardAsync(int readerId, ExtendCardRequestDto request);
}
