using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository nghiệp vụ quản lý độc giả, phân tích rủi ro AI, thống kê KPI và khóa thẻ (L0LRA-71 & L0LRA-78).
/// </summary>
public class ReaderRepository : GenericRepository<Reader>, IReaderRepository
{
    public ReaderRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách độc giả có lọc, tìm kiếm và phân trang tối ưu (L0LRA-78).
    /// </summary>
    public async Task<PagedResult<ReaderDto>> GetPagedReadersAsync(
        string? keyword,
        string? memberType,
        string? status,
        int pageNumber,
        int pageSize)
    {
        var now = DateTime.UtcNow;
        var query = _context.Readers
            .Include(r => r.User)
            .AsNoTracking()
            .AsQueryable();

        // 1. Tìm kiếm theo từ khóa (Mã bạn đọc, Username/MSSV, Họ tên, Email)
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var cleanKey = keyword.Trim().ToLower();
            query = query.Where(r =>
                r.ReaderCode.ToLower().Contains(cleanKey) ||
                r.User.Username.ToLower().Contains(cleanKey) ||
                r.User.FullName.ToLower().Contains(cleanKey) ||
                (r.User.Email != null && r.User.Email.ToLower().Contains(cleanKey)));
        }

        // 2. Lọc theo đối tượng bạn đọc (Student, Lecturer, Standard)
        if (!string.IsNullOrWhiteSpace(memberType))
        {
            var cleanType = memberType.Trim();
            query = query.Where(r => r.MemberType == cleanType);
        }

        // 3. Lọc theo trạng thái thẻ (Active, Locked, Expired)
        if (!string.IsNullOrWhiteSpace(status))
        {
            var cleanStatus = status.Trim().ToLower();
            if (cleanStatus == "locked")
            {
                query = query.Where(r => !r.User.IsActive);
            }
            else if (cleanStatus == "expired")
            {
                query = query.Where(r => r.User.IsActive && r.ExpiryDate < now);
            }
            else if (cleanStatus == "active")
            {
                query = query.Where(r => r.User.IsActive && r.ExpiryDate >= now);
            }
        }

        var totalRecords = await query.CountAsync();

        // 4. Phân trang và nạp dữ liệu trang hiện tại
        var readers = await query
            .OrderByDescending(r => r.ReaderID)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var readerIds = readers.Select(r => r.ReaderID).ToList();

        // 5. Tính số sách đang mượn của các độc giả trong trang (Batch query tối ưu)
        var activeBorrowCounts = await _context.BorrowingDetails
            .AsNoTracking()
            .Where(d => readerIds.Contains(d.Borrowing.ReaderID) &&
                        d.ReturnDate == null &&
                        d.ItemStatus == "Borrowed")
            .GroupBy(d => d.Borrowing.ReaderID)
            .Select(g => new { ReaderID = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ReaderID, x => x.Count);

        // 6. Tính tổng nợ phạt chưa thanh toán (Pending) của các độc giả trong trang
        var unpaidFines = await _context.FineReceipts
            .AsNoTracking()
            .Where(f => readerIds.Contains(f.Borrowing.ReaderID) && f.Status == "Pending")
            .GroupBy(f => f.Borrowing.ReaderID)
            .Select(g => new { ReaderID = g.Key, Total = g.Sum(x => x.FinalAmount) })
            .ToDictionaryAsync(x => x.ReaderID, x => x.Total);

        // 7. Ánh xạ sang danh sách ReaderDto
        var items = readers.Select(r =>
        {
            string calculatedStatus = "Active";
            if (!r.User.IsActive)
            {
                calculatedStatus = "Locked";
            }
            else if (r.ExpiryDate < now)
            {
                calculatedStatus = "Expired";
            }

            var activeCount = activeBorrowCounts.TryGetValue(r.ReaderID, out var bCount) ? bCount : 0;
            var unpaidAmount = unpaidFines.TryGetValue(r.ReaderID, out var fTotal) ? fTotal : 0m;

            return new ReaderDto
            {
                ReaderID = r.ReaderID,
                UserID = r.UserID,
                Username = r.User.Username,
                FullName = r.User.FullName,
                Email = r.User.Email,
                ReaderCode = r.ReaderCode,
                MemberType = r.MemberType,
                Faculty = r.Faculty,
                ClassGroup = r.ClassGroup,
                ExpiryDate = r.ExpiryDate,
                CreditScore = r.CreditScore,
                IsActive = r.User.IsActive,
                Status = calculatedStatus,
                ActiveBorrowCount = activeCount,
                ActiveBorrowedBooks = activeCount,
                TotalUnpaidFines = unpaidAmount,
                UnpaidFineAmount = unpaidAmount,
                RiskScore = Math.Max(0, 100 - r.CreditScore),
                RiskLevel = r.CreditScore >= 80 ? "Thấp" : (r.CreditScore >= 60 ? "Trung bình" : "Cao"),
                CreatedAt = r.User.CreatedAt
            };
        }).ToList();

        return new PagedResult<ReaderDto>(items, totalRecords, pageNumber, pageSize);
    }

    /// <summary>
    /// Lấy danh sách toàn bộ độc giả kèm quan hệ User, Borrowings, BorrowingDetails, BookCopies, Book và FineReceipts (L0LRA-71).
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
    /// Lấy thông tin độc giả kèm User theo ReaderID (L0LRA-78).
    /// </summary>
    public async Task<Reader?> GetReaderDetailByIdAsync(int readerId)
    {
        return await _context.Readers
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.ReaderID == readerId);
    }

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderID kèm toàn bộ quan hệ nghiệp vụ (L0LRA-71).
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
    /// Lấy thông tin độc giả kèm User theo ReaderCode (Mã thẻ bạn đọc) (L0LRA-78).
    /// </summary>
    public async Task<Reader?> GetReaderDetailByCodeAsync(string readerCode)
    {
        var cleanCode = readerCode.Trim();
        return await _context.Readers
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.ReaderCode == cleanCode || r.User.Username == cleanCode);
    }

    /// <summary>
    /// Lấy chi tiết một độc giả theo ReaderCode kèm đầy đủ quan hệ (L0LRA-71).
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
    /// Kiểm tra xem Username hoặc ReaderCode đã tồn tại trong CSDL chưa.
    /// </summary>
    public async Task<bool> IsUsernameOrCodeTakenAsync(string username, string readerCode, int? excludeReaderId = null)
    {
        var cleanUser = username.Trim().ToLower();
        var cleanCode = readerCode.Trim().ToLower();

        return await _context.Readers
            .Include(r => r.User)
            .AnyAsync(r =>
                (excludeReaderId == null || r.ReaderID != excludeReaderId.Value) &&
                (r.User.Username.ToLower() == cleanUser || r.ReaderCode.ToLower() == cleanCode));
    }

    /// <summary>
    /// Tạo mới tài khoản User và hồ sơ Reader trong một Transaction SQL an toàn.
    /// </summary>
    public async Task<Reader> CreateReaderWithUserAsync(User user, Reader reader)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await _context.Users.AddAsync(user);
                await _context.SaveChangesAsync();

                reader.UserID = user.UserID;
                await _context.Readers.AddAsync(reader);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                reader.User = user;
                return reader;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>
    /// Lấy danh sách các tài liệu mà độc giả hiện đang mượn chưa trả.
    /// </summary>
    public async Task<List<ReaderBorrowingItemDto>> GetActiveBorrowingsByReaderIdAsync(int readerId)
    {
        var now = DateTime.UtcNow;
        return await _context.BorrowingDetails
            .AsNoTracking()
            .Where(d => d.Borrowing.ReaderID == readerId &&
                        d.ReturnDate == null &&
                        d.ItemStatus == "Borrowed")
            .Include(d => d.BookCopy)
                .ThenInclude(c => c.Book)
            .Include(d => d.Borrowing)
            .Select(d => new ReaderBorrowingItemDto
            {
                BorrowingID = d.BorrowingID,
                BookTitle = d.BookCopy.Book != null ? d.BookCopy.Book.Title : "N/A",
                Barcode = d.BookCopy.Barcode,
                BorrowDate = d.Borrowing.BorrowDate,
                DueDate = d.Borrowing.DueDate,
                IsOverdue = now.Date > d.Borrowing.DueDate.Date,
                OverdueDays = now.Date > d.Borrowing.DueDate.Date ? (now.Date - d.Borrowing.DueDate.Date).Days : 0
            })
            .ToListAsync();
    }

    /// <summary>
    /// Tính tổng số tiền phạt chưa thanh toán của độc giả.
    /// </summary>
    public async Task<decimal> GetUnpaidFineAmountByReaderIdAsync(int readerId)
    {
        var unpaidFines = await _context.FineReceipts
            .AsNoTracking()
            .Where(f => f.Borrowing.ReaderID == readerId && f.Status == "Pending")
            .Select(f => f.FinalAmount)
            .ToListAsync();

        return unpaidFines.Sum();
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
    /// Cập nhật trạng thái IsActive của User và ghi nhận thông báo trong một Transaction an toàn nguyên tử.
    /// Nếu có bất kỳ lỗi nào phát sinh, toàn bộ thay đổi sẽ được Rollback, bảo toàn tính nguyên tử dữ liệu (BUG-028).
    /// </summary>
    public async Task<bool> UpdateUserLockStatusWithNotificationAsync(int userId, bool isActive, string message)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);
                if (user == null)
                {
                    return false;
                }

                user.IsActive = isActive;

                var notif = new Notification
                {
                    UserID = userId,
                    Title = isActive ? "Mở khóa thẻ thư viện" : "Khóa thẻ thư viện",
                    Type = "System",
                    Message = message,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Notifications.AddAsync(notif);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    /// <summary>
    /// Thêm thông báo vào bảng Notifications cho người dùng.
    /// </summary>
    public async Task AddNotificationAsync(int userId, string message)
    {
        var notif = new Notification
        {
            UserID = userId,
            Title = "Thông báo hệ thống",
            Type = "System",
            Message = message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.Notifications.AddAsync(notif);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Tính toán các chỉ số thống kê tổng quan cho 4 thẻ KPI của phân hệ độc giả từ SQL Server (L0LRA-71).
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
