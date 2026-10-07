using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository truy vấn dữ liệu hồ sơ độc giả, chi tiết mượn sách và trạng thái thẻ khóa.
/// </summary>
public interface IReaderRepository : IGenericRepository<Reader>
{
    /// <summary>
    /// Lấy danh sách toàn bộ độc giả kèm thông tin User, Borrowings, BorrowingDetails, BookCopies, Book và FineReceipts.
    /// </summary>
    Task<List<Reader>> GetAllReadersWithDetailsAsync();

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderID kèm quan hệ.
    /// </summary>
    Task<Reader?> GetReaderByIdWithDetailsAsync(int readerId);

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderCode.
    /// </summary>
    Task<Reader?> GetReaderByCodeWithDetailsAsync(string readerCode);

    /// <summary>
    /// Cập nhật trực tiếp trạng thái IsActive của tài khoản User gắn với độc giả trong SQL Server.
    /// </summary>
    Task<bool> UpdateUserActiveStatusAsync(int userId, bool isActive);

    /// <summary>
    /// Thêm thông báo vào bảng Notifications cho người dùng.
    /// </summary>
    Task AddNotificationAsync(int userId, string message);

    /// <summary>
    /// Lấy số liệu thống kê tổng quan cho 4 thẻ KPI của phân hệ độc giả.
    /// </summary>
    Task<ReaderSummaryDto> GetReaderSummaryAsync();
}
