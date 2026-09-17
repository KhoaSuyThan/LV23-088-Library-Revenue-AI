using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai BookRepository sử dụng Entity Framework Core 10 với các truy vấn LINQ tối ưu tại SQL Server.
/// </summary>
public class BookRepository : GenericRepository<Book>, IBookRepository
{
    public BookRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách sách có phân trang và tìm kiếm theo từ khóa/thể loại bằng Skip/Take tại SQL Server.
    /// </summary>
    public async Task<PagedResult<BookDto>> GetPagedBooksAsync(BookFilterDto filter)
    {
        var query = _dbSet.AsNoTracking();

        // 1. Lọc theo từ khóa (Title, Author, ISBN)
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            query = query.Where(b =>
                b.Title.Contains(keyword) ||
                b.Author.Contains(keyword) ||
                (b.ISBN != null && b.ISBN.Contains(keyword)));
        }

        // 2. Lọc theo CategoryID
        if (filter.CategoryID.HasValue && filter.CategoryID.Value > 0)
        {
            query = query.Where(b => b.CategoryID == filter.CategoryID.Value);
        }

        // 3. Đếm tổng số bản ghi thỏa mãn điều kiện
        var totalRecords = await query.CountAsync();

        // 4. Phân trang Server-side bằng Skip().Take()
        var pagedBooks = await query
            .OrderBy(b => b.BookID)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(b => new BookDto
            {
                BookID = b.BookID,
                CategoryID = b.CategoryID,
                CategoryName = b.Category.CategoryName,
                ISBN = b.ISBN,
                Title = b.Title,
                Author = b.Author,
                Publisher = b.Publisher,
                BasePrice = b.BasePrice,
                TotalCopies = b.BookCopies.Count,
                AvailableCopies = b.BookCopies.Count(c => c.Status == "Available")
            })
            .ToListAsync();

        return new PagedResult<BookDto>(pagedBooks, totalRecords, filter.PageNumber, filter.PageSize);
    }

    /// <summary>
    /// Lấy toàn bộ sách kèm số lượng bản sao khả dụng.
    /// </summary>
    public async Task<IReadOnlyList<BookDto>> GetAllBooksWithCopiesAsync()
    {
        return await _dbSet.AsNoTracking()
            .OrderBy(b => b.BookID)
            .Select(b => new BookDto
            {
                BookID = b.BookID,
                CategoryID = b.CategoryID,
                CategoryName = b.Category.CategoryName,
                ISBN = b.ISBN,
                Title = b.Title,
                Author = b.Author,
                Publisher = b.Publisher,
                BasePrice = b.BasePrice,
                TotalCopies = b.BookCopies.Count,
                AvailableCopies = b.BookCopies.Count(c => c.Status == "Available")
            })
            .ToListAsync();
    }

    /// <summary>
    /// Lấy chi tiết sách theo BookID kèm số lượng bản sao.
    /// </summary>
    public async Task<BookDto?> GetBookDetailByIdAsync(int id)
    {
        return await _dbSet.AsNoTracking()
            .Where(b => b.BookID == id)
            .Select(b => new BookDto
            {
                BookID = b.BookID,
                CategoryID = b.CategoryID,
                CategoryName = b.Category.CategoryName,
                ISBN = b.ISBN,
                Title = b.Title,
                Author = b.Author,
                Publisher = b.Publisher,
                BasePrice = b.BasePrice,
                TotalCopies = b.BookCopies.Count,
                AvailableCopies = b.BookCopies.Count(c => c.Status == "Available")
            })
            .FirstOrDefaultAsync();
    }
}
