using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho thao tác dữ liệu đầu sách và phân trang.
/// </summary>
public interface IBookRepository : IGenericRepository<Book>
{
    /// <summary>
    /// Lấy danh sách sách có phân trang và tìm kiếm theo từ khóa/thể loại tại SQL Server.
    /// </summary>
    Task<PagedResult<BookDto>> GetPagedBooksAsync(BookFilterDto filter);

    /// <summary>
    /// Lấy toàn bộ sách kèm số lượng bản sao.
    /// </summary>
    Task<IReadOnlyList<BookDto>> GetAllBooksWithCopiesAsync();

    /// <summary>
    /// Lấy chi tiết sách theo BookID kèm số lượng bản sao.
    /// </summary>
    Task<BookDto?> GetBookDetailByIdAsync(int id);

    /// <summary>
    /// Lấy tập hợp tất cả các mã ISBN hiện có trong CSDL để kiểm tra trùng lặp nhanh O(1).
    /// </summary>
    Task<HashSet<string>> GetExistingIsbnsAsync();

    /// <summary>
    /// Lấy tập hợp danh sách CategoryID hợp lệ trong CSDL.
    /// </summary>
    Task<HashSet<int>> GetValidCategoryIdsAsync();

    /// <summary>
    /// Nạp một mẻ sách và tự động sinh bản sao vật lý trong một giao dịch cơ sở dữ liệu.
    /// </summary>
    Task<int> BatchInsertBooksWithCopiesAsync(List<Book> books, int copiesPerBook = 1);

    /// <summary>
    /// Lấy danh sách các bản sao của một đầu sách (AC1, AC3).
    /// </summary>
    Task<IReadOnlyList<BookCopy>> GetCopiesByBookIdAsync(int bookId);

    /// <summary>
    /// Tra cứu thông tin bản sao bằng mã vạch kèm thông tin sách (AC5).
    /// </summary>
    Task<BookCopy?> GetCopyByBarcodeAsync(string barcode);

    /// <summary>
    /// Thêm hàng loạt bản sao với mã vạch tự động sinh liên tiếp (AC1, AC2).
    /// </summary>
    Task<List<BookCopy>> BulkAddCopiesAsync(int bookId, int count, string? customPrefix = null);

    /// <summary>
    /// Cập nhật trạng thái độc lập của bản sao (AC3).
    /// </summary>
    Task<bool> UpdateCopyStatusAsync(int copyId, string status);

    /// <summary>
    /// Xóa một bản sao (nếu không đang trong trạng thái cho mượn).
    /// </summary>
    Task<bool> DeleteCopyAsync(int copyId);
    /// Thêm mới một đầu sách kèm số lượng bản sao vật lý ban đầu.
    /// </summary>
    Task<Book> AddBookWithCopiesAsync(Book book, int initialCopies);

    /// <summary>
    /// Thực hiện xóa mềm đầu sách (chặn nếu đang có sách cho mượn).
    /// </summary>
    Task<(bool Success, string Message)> SoftDeleteBookAsync(int id);

    /// <summary>
    /// Lấy thống kê tổng hợp số liệu 4 thẻ KPI cho phân hệ Quản lý Sách.
    /// </summary>
    Task<BookCatalogSummaryDto> GetCatalogSummaryAsync();
}
