using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ tra cứu và quản lý thông tin sách trong thư viện.
/// </summary>
public class BookService : IBookService
{
    private readonly IBookRepository _bookRepository;

    public BookService(IBookRepository bookRepository)
    {
        _bookRepository = bookRepository;
    }

    /// <summary>
    /// Lấy danh sách sách có phân trang và tìm kiếm theo từ khóa/thể loại.
    /// </summary>
    public async Task<ApiResponse<PagedResult<BookDto>>> GetPagedBooksAsync(BookFilterDto filter)
    {
        var result = await _bookRepository.GetPagedBooksAsync(filter);
        return ApiResponse<PagedResult<BookDto>>.SuccessResult(result, "Lấy danh sách sách phân trang thành công");
    }

    /// <summary>
    /// Lấy toàn bộ danh sách sách trong thư viện kèm số lượng bản sao khả dụng.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<BookDto>>> GetBooksAsync()
    {
        var books = await _bookRepository.GetAllBooksWithCopiesAsync();
        return ApiResponse<IReadOnlyList<BookDto>>.SuccessResult(books, "Lấy toàn bộ danh sách sách thành công");
    }

    /// <summary>
    /// Lấy chi tiết một đầu sách theo ID.
    /// </summary>
    public async Task<ApiResponse<BookDto>> GetBookByIdAsync(int id)
    {
        var book = await _bookRepository.GetBookDetailByIdAsync(id);
        if (book == null)
        {
            return ApiResponse<BookDto>.ErrorResult($"Không tìm thấy sách với mã ID {id}");
        }

        return ApiResponse<BookDto>.SuccessResult(book, "Lấy chi tiết sách thành công");
    }
}
