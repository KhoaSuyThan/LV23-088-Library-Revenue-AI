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
    /// Thêm mới một đầu sách kèm số lượng bản sao vật lý ban đầu.
    /// </summary>
    Task<Book> AddBookWithCopiesAsync(Book book, int initialCopies);

    /// <summary>
    /// Thực hiện xóa mềm đầu sách (chặn nếu đang có sách cho mượn).
    /// </summary>
    Task<(bool Success, string Message)> SoftDeleteBookAsync(int id);
}
