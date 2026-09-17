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
}
