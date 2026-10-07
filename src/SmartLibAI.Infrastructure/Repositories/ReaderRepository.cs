using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository nghiệp vụ quản lý độc giả và khóa thẻ (Story LOLRA-78).
/// </summary>
public class ReaderRepository : GenericRepository<Reader>, IReaderRepository
{
    public ReaderRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách độc giả có lọc, tìm kiếm và phân trang tối ưu.
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

            return new ReaderDto
            {
                ReaderID = r.ReaderID,
                UserID = r.UserID,
                Username = r.User.Username,
                FullName = r.User.FullName,
                Email = r.User.Email,
                ReaderCode = r.ReaderCode,
                MemberType = r.MemberType,
                ExpiryDate = r.ExpiryDate,
                CreditScore = r.CreditScore,
                IsActive = r.User.IsActive,
                Status = calculatedStatus,
                ActiveBorrowCount = activeBorrowCounts.TryGetValue(r.ReaderID, out var bCount) ? bCount : 0,
                TotalUnpaidFines = unpaidFines.TryGetValue(r.ReaderID, out var fTotal) ? fTotal : 0m,
                CreatedAt = r.User.CreatedAt
            };
        }).ToList();

        return new PagedResult<ReaderDto>(items, totalRecords, pageNumber, pageSize);
    }

    /// <summary>
    /// Lấy thông tin độc giả kèm User theo ReaderID.
    /// </summary>
    public async Task<Reader?> GetReaderDetailByIdAsync(int readerId)
    {
        return await _context.Readers
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.ReaderID == readerId);
    }

    /// <summary>
    /// Lấy thông tin độc giả kèm User theo ReaderCode (Mã thẻ bạn đọc).
    /// </summary>
    public async Task<Reader?> GetReaderDetailByCodeAsync(string readerCode)
    {
        var cleanCode = readerCode.Trim();
        return await _context.Readers
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.ReaderCode == cleanCode || r.User.Username == cleanCode);
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
}
