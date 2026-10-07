using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository quản lý truy vấn dữ liệu độc giả và trạng thái thẻ khóa trong CSDL SQL Server.
/// </summary>
public class ReaderRepository : GenericRepository<Reader>, IReaderRepository
{
    public ReaderRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách toàn bộ độc giả kèm quan hệ User, Borrowings, BorrowingDetails, BookCopies, Book và FineReceipts.
    /// </summary>
    public async Task<List<Reader>> GetAllReadersWithDetailsAsync()
    {
        return await _context.Readers
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.FineReceipts)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.AIPredictionLogs)
            .OrderBy(r => r.ReaderID)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderID kèm toàn bộ quan hệ nghiệp vụ.
    /// </summary>
    public async Task<Reader?> GetReaderByIdWithDetailsAsync(int readerId)
    {
        return await _context.Readers
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.FineReceipts)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.AIPredictionLogs)
            .FirstOrDefaultAsync(r => r.ReaderID == readerId);
    }

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderCode.
    /// </summary>
    public async Task<Reader?> GetReaderByCodeWithDetailsAsync(string readerCode)
    {
        var clean = readerCode.Trim();
        return await _context.Readers
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.FineReceipts)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.AIPredictionLogs)
            .FirstOrDefaultAsync(r => r.ReaderCode == clean || r.User.Username == clean);
    }

    /// <summary>
    /// Cập nhật trực tiếp trạng thái IsActive của User gắn với thẻ độc giả trong SQL Server.
    /// </summary>
    public async Task<bool> UpdateUserActiveStatusAsync(int userId, bool isActive)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);
        if (user == null)
        {
            return false;
        }

        user.IsActive = isActive;
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Thêm thông báo vào bảng Notifications cho người dùng.
    /// </summary>
    public async Task AddNotificationAsync(int userId, string message)
    {
        var notif = new Notification
        {
            UserID = userId,
            Message = message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notif);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Tính toán các chỉ số thống kê tổng quan cho 4 thẻ KPI của phân hệ độc giả từ SQL Server.
    /// </summary>
    public async Task<ReaderSummaryDto> GetReaderSummaryAsync()
    {
        var readers = await _context.Readers
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.FineReceipts)
            .Include(r => r.Borrowings)
                .ThenInclude(b => b.BorrowingDetails)
            .ToListAsync();

        var totalReaders = readers.Count;
        var totalActive = readers.Count(r => r.User != null && r.User.IsActive);
        
        // Thống kê nợ phạt tồn đọng (FineReceipts Status = 'Pending')
        var debtReaders = readers.Where(r => r.Borrowings
            .SelectMany(b => b.FineReceipts)
            .Any(f => f.Status == "Pending")).ToList();

        var totalDebt = readers
            .SelectMany(r => r.Borrowings)
            .SelectMany(b => b.FineReceipts)
            .Where(f => f.Status == "Pending")
            .Sum(f => f.FinalAmount);

        // Độc giả nguy cơ cao: có sách trễ hạn hoặc nợ phạt hoặc CreditScore < 60
        var now = DateTime.UtcNow;
        var highRiskCount = readers.Count(r => 
            r.CreditScore < 60 ||
            r.Borrowings.Any(b => b.Status == "Overdue" || 
                (b.DueDate.Date < now.Date && b.BorrowingDetails.Any(bd => bd.ItemStatus == "Borrowed" && bd.ReturnDate == null))));

        // Điểm tín nhiệm trung bình
        var avgCredit = totalReaders > 0 ? (int)Math.Round(readers.Average(r => r.CreditScore)) : 100;

        return new ReaderSummaryDto
        {
            TotalReaders = totalReaders,
            TotalActiveReaders = totalActive,
            DebtReadersCount = debtReaders.Count,
            TotalDebtAmount = totalDebt,
            HighRiskCount = highRiskCount,
            AverageCreditScore = avgCredit
        };
    }
}
