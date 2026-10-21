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
        // Chỉ lấy các đầu sách đang lưu hành (IsActive = true)
        var query = _dbSet.AsNoTracking().Where(b => b.IsActive);

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

            var pattern = $"%{keyword}%";
            // Tối ưu hóa hiệu năng: Sử dụng LIKE trực tiếp với Collation CI của CSDL, tránh ép Collate động làm nghẽn CPU và timeout (L0LRA-115)
            query = query.Where(b =>
                EF.Functions.Like(b.Title, pattern) ||
                EF.Functions.Like(b.Author, pattern) ||
                (b.ISBN != null && EF.Functions.Like(b.ISBN, pattern)) ||
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

        // 4. Lọc theo trạng thái tồn kho (AC2: có sẵn trong kho tức là số bản sao sẵn sàng cho mượn > 0)
        if (filter.OnlyAvailable == true || (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status.Equals("available", StringComparison.OrdinalIgnoreCase)))
        {
            query = query.Where(b => b.BookCopies.Any(c => c.Status == "Available"));
        }
        else if (!string.IsNullOrWhiteSpace(filter.Status) && !filter.Status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            if (filter.Status.Equals("out_of_stock", StringComparison.OrdinalIgnoreCase) ||
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
        // Chỉ lấy các đầu sách đang lưu hành (IsActive = true)
        return await _dbSet.AsNoTracking()
            .Where(b => b.IsActive)
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

        // 1. Xác định tiền tố mã vạch chuẩn (ưu tiên tiền tố bản sao hiện có, mặc định BC + 6 chữ số BookID)
        string defaultPrefix = book.BookCopies.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.Barcode))?.Barcode.Split('-')[0]
            ?? $"BC{book.BookID:D6}";
        string prefix = string.IsNullOrWhiteSpace(customPrefix)
            ? defaultPrefix
            : customPrefix.Trim();

        // 2. Tìm số thứ tự lớn nhất hiện tại (xét cả số -001, -008 lẫn chữ cái -A, -B, -C)
        int maxSeq = book.BookCopies.Count;
        foreach (var c in book.BookCopies)
        {
            if (string.IsNullOrWhiteSpace(c.Barcode)) continue;
            var parts = c.Barcode.Split('-');
            if (parts.Length > 1)
            {
                var suffix = parts[^1].Trim();
                if (int.TryParse(suffix, out int num))
                {
                    if (num > maxSeq) maxSeq = num;
                }
                else if (suffix.Length == 1 && char.IsLetter(suffix[0]))
                {
                    int charNum = char.ToUpperInvariant(suffix[0]) - 'A' + 1;
                    if (charNum > maxSeq) maxSeq = charNum;
                }
            }
        }

        var newCopies = new List<BookCopy>(count);
        for (int i = 1; i <= count; i++)
        {
            int seqNumber = maxSeq + i;
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

    /// <summary>
    /// Thêm mới một đầu sách kèm số lượng bản sao vật lý ban đầu trong một transaction.
    /// </summary>
    public async Task<Book> AddBookWithCopiesAsync(Book book, int initialCopies)
    {
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        return await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Thêm đầu sách mới
                book.IsActive = true;
                await _dbSet.AddAsync(book);
                await _context.SaveChangesAsync();

                // 2. Tự động sinh initialCopies bản sao vật lý
                var copies = new List<BookCopy>();
                int copiesToCreate = Math.Max(1, initialCopies);
                for (int i = 1; i <= copiesToCreate; i++)
                {
                    copies.Add(new BookCopy
                    {
                        BookID = book.BookID,
                        Barcode = $"BC{book.BookID:D4}-{i:D2}",
                        Status = "Available"
                    });
                }

                await _context.BookCopies.AddRangeAsync(copies);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return book;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>
    /// Thực hiện xóa mềm đầu sách (kiểm tra chặn xóa nếu đang có sách cho mượn).
    /// </summary>
    public async Task<(bool Success, string Message)> SoftDeleteBookAsync(int id)
    {
        var book = await _context.Books
            .Include(b => b.BookCopies)
            .FirstOrDefaultAsync(b => b.BookID == id);

        if (book == null || !book.IsActive)
        {
            return (false, "Không tìm thấy đầu sách hoặc đầu sách đã ngừng lưu thông trước đó.");
        }

        // Kiểm tra xem có bản sao nào đang được độc giả mượn hay không
        var borrowedCount = book.BookCopies.Count(c => c.Status == "Borrowed");
        if (borrowedCount > 0)
        {
            return (false, $"Không thể ngừng lưu thông: Đầu sách hiện đang có {borrowedCount} bản sao được mượn chưa hoàn trả.");
        }

        // Chuyển sang trạng thái ngừng lưu thông (xóa mềm)
        book.IsActive = false;
        await _context.SaveChangesAsync();

        return (true, $"Đã chuyển đầu sách \"{book.Title}\" sang danh mục ngừng lưu thông thành công.");
    }

    /// <summary>
    /// Lấy thống kê tổng hợp số liệu 4 thẻ KPI cho phân hệ Quản lý Sách từ CSDL thực tế.
    /// </summary>
    public async Task<BookCatalogSummaryDto> GetCatalogSummaryAsync()
    {
        var now = DateTime.UtcNow;

        // 1. Tổng số đầu sách đang lưu hành
        var totalBooks = await _dbSet.AsNoTracking().CountAsync(b => b.IsActive);

        // 2. Tổng số bản sao đang mượn
        var borrowedBooks = await _context.BookCopies.AsNoTracking().CountAsync(c => c.Status == "Borrowed");

        // 3. Tổng số sách mượn đã quá hạn chưa trả
        var overdueBooks = await _context.BorrowingDetails.AsNoTracking()
            .CountAsync(d => d.ReturnDate == null && d.Borrowing.DueDate < now);

        // 4. Tổng số sách hỏng cần thanh lý
        var damagedBooks = await _context.BookCopies.AsNoTracking().CountAsync(c => c.Status == "Damaged");

        return new BookCatalogSummaryDto
        {
            TotalBooks = totalBooks,
            BorrowedBooks = borrowedBooks,
            OverdueBooks = overdueBooks,
            DamagedBooks = damagedBooks
        };
    }
}


