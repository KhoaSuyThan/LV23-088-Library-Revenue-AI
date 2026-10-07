using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho quản lý độc giả và khóa thẻ (Story LOLRA-78).
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
    /// Lấy thông tin độc giả kèm User theo ReaderID.
    /// </summary>
    Task<Reader?> GetReaderDetailByIdAsync(int readerId);

    /// <summary>
    /// Lấy thông tin độc giả kèm User theo ReaderCode (Mã thẻ bạn đọc).
    /// </summary>
    Task<Reader?> GetReaderDetailByCodeAsync(string readerCode);

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
}
