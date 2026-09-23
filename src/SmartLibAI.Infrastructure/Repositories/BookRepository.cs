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

        // 1. Lọc theo từ khóa (Mã sách, Tiêu đề, Tác giả, ISBN)
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var keyword = filter.Keyword.Trim();
            int? searchBookId = null;
            if (keyword.StartsWith("BK-", StringComparison.OrdinalIgnoreCase) && int.TryParse(keyword.Substring(3), out var parsedId))
            {
                searchBookId = parsedId;
            }
            else if (int.TryParse(keyword, out var directId))
            {
                searchBookId = directId;
            }

            query = query.Where(b =>
                b.Title.Contains(keyword) ||
                b.Author.Contains(keyword) ||
                (b.ISBN != null && b.ISBN.Contains(keyword)) ||
                (searchBookId.HasValue && b.BookID == searchBookId.Value));
        }

        // 2. Lọc theo CategoryID
        if (filter.CategoryID.HasValue && filter.CategoryID.Value > 0)
        {
            query = query.Where(b => b.CategoryID == filter.CategoryID.Value);
        }

        // 3. Lọc theo khoảng giá (MinPrice, MaxPrice)
        if (filter.MinPrice.HasValue && filter.MinPrice.Value >= 0)
        {
            query = query.Where(b => b.BasePrice >= filter.MinPrice.Value);
        }
        if (filter.MaxPrice.HasValue && filter.MaxPrice.Value > 0)
        {
            query = query.Where(b => b.BasePrice <= filter.MaxPrice.Value);
        }

        // 4. Lọc theo trạng thái tồn kho (available, out_of_stock / borrowed_all)
        if (!string.IsNullOrWhiteSpace(filter.Status) && !filter.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (filter.Status.Equals("available", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(b => b.BookCopies.Any(c => c.Status == "Available"));
            }
            else if (filter.Status.Equals("out_of_stock", StringComparison.OrdinalIgnoreCase) ||
                     filter.Status.Equals("borrowed_all", StringComparison.OrdinalIgnoreCase) ||
                     filter.Status.Equals("borrowed", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(b => !b.BookCopies.Any(c => c.Status == "Available"));
            }
        }

        // 5. Đếm tổng số bản ghi thỏa mãn điều kiện
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
                AvailableCopies = b.BookCopies.Count(c => c.Status == "Available"),
                Copies = b.BookCopies
                    .OrderBy(c => c.CopyID)
                    .Select(c => new BookCopyDto
                    {
                        CopyID = c.CopyID,
                        BookID = c.BookID,
                        Barcode = c.Barcode,
                        Status = c.Status,
                        BookTitle = b.Title,
                        ISBN = b.ISBN
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    /// <summary>
    /// Lấy tập hợp tất cả các mã ISBN hiện có trong CSDL để kiểm tra trùng lặp nhanh O(1).
    /// </summary>
    public async Task<HashSet<string>> GetExistingIsbnsAsync()
    {
        var isbns = await _dbSet.AsNoTracking()
            .Where(b => !string.IsNullOrEmpty(b.ISBN))
            .Select(b => b.ISBN!)
            .ToListAsync();
        return new HashSet<string>(isbns, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Lấy tập hợp danh sách CategoryID hợp lệ trong CSDL.
    /// </summary>
    public async Task<HashSet<int>> GetValidCategoryIdsAsync()
    {
        var catIds = await _context.Categories.AsNoTracking()
            .Select(c => c.CategoryID)
            .ToListAsync();
        return new HashSet<int>(catIds);
    }

    /// <summary>
    /// Nạp một mẻ sách và tự động sinh bản sao vật lý trong một giao dịch cơ sở dữ liệu.
    /// </summary>
    public async Task<int> BatchInsertBooksWithCopiesAsync(List<Book> books, int copiesPerBook = 1)
    {
        if (books == null || books.Count == 0) return 0;

        var executionStrategy = _context.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Thêm mẻ Books vào DbContext
                await _context.Books.AddRangeAsync(books);
                await _context.SaveChangesAsync();

                // 2. Sau khi lưu Books, BookID được SQL Server sinh tự tăng.
                // Tự động sinh bản sao vật lý kèm mã vạch chuẩn hóa (US-05)
                var copies = new List<BookCopy>();
                foreach (var book in books)
                {
                    for (int i = 1; i <= copiesPerBook; i++)
                    {
                        copies.Add(new BookCopy
                        {
                            BookID = book.BookID,
                            Barcode = $"BC{book.BookID:D6}-{i:D2}",
                            Status = "Available"
                        });
                    }
                }

                if (copies.Count > 0)
                {
                    await _context.BookCopies.AddRangeAsync(copies);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return books.Count;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>
    /// Lấy danh sách các bản sao của một đầu sách (AC1, AC3).
    /// </summary>
    public async Task<IReadOnlyList<BookCopy>> GetCopiesByBookIdAsync(int bookId)
    {
        return await _context.BookCopies
            .AsNoTracking()
            .Where(c => c.BookID == bookId)
            .OrderBy(c => c.CopyID)
            .ToListAsync();
    }

    /// <summary>
    /// Tra cứu thông tin bản sao bằng mã vạch kèm thông tin sách (AC5).
    /// </summary>
    public async Task<BookCopy?> GetCopyByBarcodeAsync(string barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return null;
        var cleanBarcode = barcode.Trim();

        return await _context.BookCopies
            .Include(c => c.Book)
            .FirstOrDefaultAsync(c => c.Barcode == cleanBarcode);
    }

    /// <summary>
    /// Thêm hàng loạt bản sao với mã vạch tự động sinh liên tiếp (AC1, AC2).
    /// </summary>
    public async Task<List<BookCopy>> BulkAddCopiesAsync(int bookId, int count, string? customPrefix = null)
    {
        if (count <= 0) return new List<BookCopy>();

        var book = await _context.Books
            .Include(b => b.BookCopies)
            .FirstOrDefaultAsync(b => b.BookID == bookId);

        if (book == null) throw new InvalidOperationException($"Không tìm thấy đầu sách với mã {bookId}");

        int currentCount = book.BookCopies.Count;
        string prefix = string.IsNullOrWhiteSpace(customPrefix)
            ? $"BC{book.BookID:D6}"
            : customPrefix.Trim();

        var newCopies = new List<BookCopy>(count);
        for (int i = 1; i <= count; i++)
        {
            int seqNumber = currentCount + i;
            newCopies.Add(new BookCopy
            {
                BookID = bookId,
                Barcode = $"{prefix}-{seqNumber:D3}",
                Status = "Available"
            });
        }

        await _context.BookCopies.AddRangeAsync(newCopies);
        await _context.SaveChangesAsync();

        return newCopies;
    }

    /// <summary>
    /// Cập nhật trạng thái độc lập của bản sao (AC3).
    /// </summary>
    public async Task<bool> UpdateCopyStatusAsync(int copyId, string status)
    {
        var copy = await _context.BookCopies.FindAsync(copyId);
        if (copy == null) return false;

        copy.Status = status;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Xóa một bản sao (nếu không đang trong trạng thái cho mượn).
    /// </summary>
    public async Task<bool> DeleteCopyAsync(int copyId)
    {
        var copy = await _context.BookCopies
            .Include(c => c.BorrowingDetails)
            .FirstOrDefaultAsync(c => c.CopyID == copyId);

        if (copy == null) return false;

        if (copy.Status == "Borrowed" || copy.BorrowingDetails.Any())
        {
            return false;
        }

        _context.BookCopies.Remove(copy);
        await _context.SaveChangesAsync();
        return true;
    }
}
