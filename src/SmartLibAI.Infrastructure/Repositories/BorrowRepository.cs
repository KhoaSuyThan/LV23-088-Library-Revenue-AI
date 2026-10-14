using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository nghiệp vụ mượn sách với SQL Transaction an toàn (Story LOLRA-16).
/// </summary>
public class BorrowRepository : GenericRepository<Borrowing>, IBorrowRepository
{
    public BorrowRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Tìm kiếm thông tin độc giả theo mã thẻ bạn đọc (ReaderCode) hoặc tên đăng nhập/MSSV.
    /// </summary>
    public async Task<Reader?> GetReaderByCodeAsync(string readerCode)
    {
        var cleanCode = readerCode.Trim();

        return await _context.Readers
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => 
                r.ReaderCode == cleanCode || 
                r.User.Username == cleanCode);
    }

    /// <summary>
    /// Đếm số cuốn sách mà độc giả đang mượn và chưa hoàn trả (ItemStatus = 'Borrowed' và ReturnDate = null).
    /// </summary>
    public async Task<int> GetActiveBorrowCountByReaderIdAsync(int readerId)
    {
        return await _context.BorrowingDetails
            .AsNoTracking()
            .CountAsync(d => 
                d.Borrowing.ReaderID == readerId && 
                d.ReturnDate == null && 
                d.ItemStatus == "Borrowed");
    }

    /// <summary>
    /// Kiểm tra các khoản tiền phạt chưa thanh toán (Status = 'Pending') của bạn đọc.
    /// </summary>
    public async Task<(bool HasUnpaidFines, decimal TotalUnpaidAmount)> CheckUnpaidFinesByReaderIdAsync(int readerId)
    {
        var unpaidFines = await _context.FineReceipts
            .AsNoTracking()
            .Where(f => f.Borrowing.ReaderID == readerId && f.Status == "Pending")
            .Select(f => f.FinalAmount)
            .ToListAsync();

        if (unpaidFines.Any())
        {
            var total = unpaidFines.Sum();
            return (true, total);
        }

        return (false, 0m);
    }

    /// <summary>
    /// Lấy quy tắc mượn và tính phạt đang có hiệu lực.
    /// </summary>
    public async Task<FineRule?> GetActiveFineRuleAsync()
    {
        return await _context.FineRules
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.IsActive == true) 
            ?? await _context.FineRules.AsNoTracking().FirstOrDefaultAsync();
    }

    /// <summary>
    /// Lấy danh sách bản sao sách (BookCopy) theo danh sách mã vạch Barcode (Code 128) kèm thông tin Book.
    /// </summary>
    public async Task<List<BookCopy>> GetCopiesByBarcodesAsync(IEnumerable<string> barcodes)
    {
        var cleanBarcodes = barcodes.Select(b => b.Trim()).Distinct().ToList();

        return await _context.BookCopies
            .Include(c => c.Book)
                .ThenInclude(b => b.Category)
            .Where(c => cleanBarcodes.Contains(c.Barcode))
            .ToListAsync();
    }

    /// <summary>
    /// Tạo phiếu mượn mới và lưu các chi tiết mượn, đồng thời cập nhật trạng thái bản sao sách trong Transaction SQL an toàn.
    /// </summary>
    public async Task<Borrowing> CreateBorrowingWithTransactionAsync(Borrowing borrowing, List<int> copyIds)
    {
        var executionStrategy = _context.Database.CreateExecutionStrategy();

        return await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Lưu bản ghi phiếu mượn chính vào bảng Borrowings
                await _dbSet.AddAsync(borrowing);
                await _context.SaveChangesAsync();

                // 2. Tải các bản sao sách để khóa và cập nhật trạng thái sang 'Borrowed'
                var copiesToUpdate = await _context.BookCopies
                    .Where(c => copyIds.Contains(c.CopyID))
                    .ToListAsync();

                var details = new List<BorrowingDetail>();
                foreach (var copy in copiesToUpdate)
                {
                    copy.Status = "Borrowed";

                    details.Add(new BorrowingDetail
                    {
                        BorrowingID = borrowing.BorrowingID,
                        CopyID = copy.CopyID,
                        ReturnDate = null,
                        ItemStatus = "Borrowed"
                    });
                }

                // 3. Lưu chi tiết phiếu mượn vào bảng BorrowingDetails
                await _context.BorrowingDetails.AddRangeAsync(details);
                await _context.SaveChangesAsync();

                // 4. Commit Transaction an toàn khi tất cả các bước thành công
                await transaction.CommitAsync();

                return borrowing;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>
    /// Lấy chi tiết phiếu mượn kèm Reader, Librarian và danh sách bản sao sách theo BorrowingID.
    /// </summary>
    public async Task<Borrowing?> GetBorrowingDetailByIdAsync(int borrowingId)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(b => b.Reader)
                .ThenInclude(r => r.User)
            .Include(b => b.Librarian)
            .Include(b => b.BorrowingDetails)
                .ThenInclude(d => d.BookCopy)
                    .ThenInclude(c => c.Book)
                        .ThenInclude(bk => bk.Category)
            .FirstOrDefaultAsync(b => b.BorrowingID == borrowingId);
    }

    /// <summary>
    /// Lấy danh sách các lượt mượn gần đây nhất để hiển thị tại bảng lưu thông.
    /// </summary>
    public async Task<List<Borrowing>> GetRecentBorrowingsAsync(int count = 20)
    {
        return await _dbSet
            .AsNoTracking()
            .OrderByDescending(b => b.BorrowingID)
            .Take(count)
            .Include(b => b.Reader)
                .ThenInclude(r => r.User)
            .Include(b => b.Librarian)
            .Include(b => b.BorrowingDetails)
                .ThenInclude(d => d.BookCopy)
                    .ThenInclude(c => c.Book)
                        .ThenInclude(bk => bk.Category)
            .ToListAsync();
    }

    /// <summary>
    /// Đếm số lần độc giả từng bị quá hạn trong lịch sử mượn trả sách.
    /// </summary>
    public async Task<int> GetOverdueHistoryCountAsync(int readerId)
    {
        return await _context.BorrowingDetails
            .AsNoTracking()
            .CountAsync(d => 
                d.Borrowing.ReaderID == readerId && 
                ((d.ReturnDate != null && d.ReturnDate > d.Borrowing.DueDate) || 
                 (d.ReturnDate == null && DateTime.UtcNow > d.Borrowing.DueDate && d.ItemStatus == "Borrowed")));
    }

    /// <summary>
    /// Lưu nhật ký dự đoán rủi ro của AI vào bảng AIPredictionLogs.
    /// </summary>
    public async Task AddAIPredictionLogAsync(AIPredictionLog log)
    {
        await _context.AIPredictionLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }
}
