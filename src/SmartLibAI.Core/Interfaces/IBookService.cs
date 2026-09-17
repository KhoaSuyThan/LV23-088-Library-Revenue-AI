using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện xử lý nghiệp vụ tra cứu và quản lý thông tin sách.
/// </summary>
public interface IBookService
{
    Task<ApiResponse<IReadOnlyList<BookDto>>> GetBooksAsync();

    Task<ApiResponse<PagedResult<BookDto>>> GetPagedBooksAsync(BookFilterDto filter);

    Task<ApiResponse<BookDto>> GetBookByIdAsync(int id);
}
