using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho quản lý độc giả, hồ sơ bạn đọc, khóa thẻ và cảnh báo (L0LRA-71 & L0LRA-78).
/// </summary>
public interface IReaderRepository : IGenericRepository<Reader>
{
    /// <summary>
    /// Lấy danh sách độc giả có lọc, tìm kiếm và phân trang tối ưu.
    /// </summary>
    Task<PagedResult<ReaderDto>> GetPagedReadersAsync(
        string? keyword,
        string? memberType,
        string? status,
        int pageNumber,
        int pageSize);

    /// <summary>
    /// Lấy danh sách toàn bộ độc giả kèm thông tin User, Borrowings, BorrowingDetails, BookCopies, Book và FineReceipts.
    /// </summary>
    Task<List<Reader>> GetAllReadersWithDetailsAsync();

    /// <summary>
    /// Lấy thông tin độc giả kèm User theo ReaderID.
    /// </summary>
    Task<Reader?> GetReaderDetailByIdAsync(int readerId);

    /// <summary>
    /// Lấy thông tin độc giả kèm User theo ReaderCode (Mã thẻ bạn đọc).
    /// </summary>
    Task<Reader?> GetReaderDetailByCodeAsync(string readerCode);

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderID kèm quan hệ chi tiết mượn trả và phạt.
    /// </summary>
    Task<Reader?> GetReaderByIdWithDetailsAsync(int readerId);

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderCode kèm quan hệ chi tiết mượn trả và phạt.
    /// </summary>
    Task<Reader?> GetReaderByCodeWithDetailsAsync(string readerCode);

    /// <summary>
    /// Kiểm tra xem Username hoặc ReaderCode đã tồn tại trong CSDL chưa.
    /// </summary>
    Task<bool> IsUsernameOrCodeTakenAsync(string username, string readerCode, int? excludeReaderId = null);

    /// <summary>
    /// Tạo mới tài khoản User và hồ sơ Reader trong một Transaction an toàn.
    /// </summary>
    Task<Reader> CreateReaderWithUserAsync(User user, Reader reader);

    /// <summary>
    /// Lấy danh sách các tài liệu mà độc giả hiện đang mượn chưa trả.
    /// </summary>
    Task<List<ReaderBorrowingItemDto>> GetActiveBorrowingsByReaderIdAsync(int readerId);

    /// <summary>
    /// Tính tổng số tiền phạt chưa thanh toán của độc giả.
    /// </summary>
    Task<decimal> GetUnpaidFineAmountByReaderIdAsync(int readerId);

    /// <summary>
    /// Cập nhật trực tiếp trạng thái IsActive của tài khoản User gắn với độc giả trong SQL Server.
    /// </summary>
    Task<bool> UpdateUserActiveStatusAsync(int userId, bool isActive);

    /// <summary>
    /// Cập nhật trạng thái IsActive của User và ghi nhận thông báo đồng thời trong một giao dịch nguyên tử.
    /// </summary>
    Task<bool> UpdateUserLockStatusWithNotificationAsync(int userId, bool isActive, string message);

    /// <summary>
    /// Thêm thông báo vào bảng Notifications cho người dùng.
    /// </summary>
    Task AddNotificationAsync(int userId, string message);

    /// <summary>
    /// Lấy số liệu thống kê tổng quan cho 4 thẻ KPI của phân hệ độc giả.
    /// </summary>
    Task<ReaderSummaryDto> GetReaderSummaryAsync();
}
