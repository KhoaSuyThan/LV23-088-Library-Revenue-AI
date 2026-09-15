using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý tra cứu và hiển thị danh sách đầu sách trong thư viện.
/// </summary>
public class BookService : IBookService
{
    private readonly IGenericRepository<Book> _bookRepository;
    private readonly IGenericRepository<Category> _categoryRepository;
    private readonly IGenericRepository<BookCopy> _copyRepository;

    public BookService(
        IGenericRepository<Book> bookRepository,
        IGenericRepository<Category> categoryRepository,
        IGenericRepository<BookCopy> copyRepository)
    {
        _bookRepository = bookRepository;
        _categoryRepository = categoryRepository;
        _copyRepository = copyRepository;
    }

    /// <summary>
    /// Lấy toàn bộ danh sách sách trong thư viện kèm số lượng bản sao khả dụng.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<BookDto>>> GetBooksAsync()
    {
        var books = await _bookRepository.GetAllAsync();
        var categories = await _categoryRepository.GetAllAsync();
        var categoryMap = categories.ToDictionary(c => c.CategoryID, c => c.CategoryName);

        var allCopies = await _copyRepository.GetAllAsync();

        var bookDtos = books.Select(b =>
        {
            var copies = allCopies.Where(c => c.BookID == b.BookID).ToList();
            return new BookDto
            {
                BookID = b.BookID,
                CategoryID = b.CategoryID,
                CategoryName = categoryMap.TryGetValue(b.CategoryID, out var name) ? name : "Chưa phân loại",
                ISBN = b.ISBN,
                Title = b.Title,
                Author = b.Author,
                Publisher = b.Publisher,
                BasePrice = b.BasePrice,
                TotalCopies = copies.Count,
                AvailableCopies = copies.Count(c => c.Status.Equals("Available", StringComparison.OrdinalIgnoreCase))
            };
        }).ToList();

        return ApiResponse<IReadOnlyList<BookDto>>.SuccessResult(bookDtos, "Lấy danh sách sách thành công");
    }

    /// <summary>
    /// Lấy chi tiết một đầu sách theo ID.
    /// </summary>
    public async Task<ApiResponse<BookDto>> GetBookByIdAsync(int id)
    {
        var book = await _bookRepository.GetByIdAsync(id);
        if (book == null)
        {
            return ApiResponse<BookDto>.ErrorResult($"Không tìm thấy sách với mã ID {id}");
        }

        var category = await _categoryRepository.GetByIdAsync(book.CategoryID);
        var copies = await _copyRepository.FindAsync(c => c.BookID == id);

        var bookDto = new BookDto
        {
            BookID = book.BookID,
            CategoryID = book.CategoryID,
            CategoryName = category?.CategoryName ?? "Chưa phân loại",
            ISBN = book.ISBN,
            Title = book.Title,
            Author = book.Author,
            Publisher = book.Publisher,
            BasePrice = book.BasePrice,
            TotalCopies = copies.Count,
            AvailableCopies = copies.Count(c => c.Status.Equals("Available", StringComparison.OrdinalIgnoreCase))
        };

        return ApiResponse<BookDto>.SuccessResult(bookDto, "Lấy chi tiết sách thành công");
    }
}
