using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository quản lý thông báo và truy vấn các phiếu mượn trễ hạn từ CSDL.
/// </summary>
public class NotificationRepository : GenericRepository<Notification>, INotificationRepository
{
    public NotificationRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách thông báo của một người dùng theo phân trang và lọc theo trạng thái đã đọc.
    /// </summary>
    public async Task<List<Notification>> GetNotificationsByUserIdAsync(int userId, bool? isRead, int page, int pageSize)
    {
        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserID == userId);

        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        return await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    /// <summary>
    /// Đếm tổng số thông báo của người dùng.
    /// </summary>
    public async Task<int> GetNotificationCountByUserIdAsync(int userId, bool? isRead)
    {
        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserID == userId);

        if (isRead.HasValue)
        {
            query = query.Where(n => n.IsRead == isRead.Value);
        }

        return await query.CountAsync();
    }

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc của người dùng.
    /// </summary>
    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _context.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserID == userId && !n.IsRead);
    }

    /// <summary>
    /// Lấy chi tiết thông báo theo ID.
    /// </summary>
    public new async Task<Notification?> GetByIdAsync(int id)
    {
        return await _context.Notifications
            .Include(n => n.User)
            .FirstOrDefaultAsync(n => n.NotificationID == id);
    }

    /// <summary>
    /// Thêm một thông báo mới vào CSDL.
    /// </summary>
    public async Task AddNotificationAsync(Notification notification)
    {
        await _context.Notifications.AddAsync(notification);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Thêm danh sách hàng loạt thông báo vào CSDL.
    /// </summary>
    public async Task AddNotificationsRangeAsync(IEnumerable<Notification> notifications)
    {
        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Đánh dấu một thông báo là đã đọc (IsRead = true).
    /// </summary>
    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.UserID == userId);

        if (notification == null)
        {
            return false;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        return true;
    }

    /// <summary>
    /// Đánh dấu toàn bộ thông báo của người dùng là đã đọc.
    /// </summary>
    public async Task<int> MarkAllAsReadAsync(int userId)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserID == userId && !n.IsRead)
            .ToListAsync();

        if (unreadNotifications.Count == 0)
        {
            return 0;
        }

        foreach (var notif in unreadNotifications)
        {
            notif.IsRead = true;
        }

        await _context.SaveChangesAsync();
        return unreadNotifications.Count;
    }

    /// <summary>
    /// Xóa một thông báo theo ID và UserID.
    /// </summary>
    public async Task<bool> DeleteAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.UserID == userId);

        if (notification == null)
        {
            return false;
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ Thủ thư đang hoạt động trong hệ thống (Role Admin hoặc Staff).
    /// </summary>
    public async Task<List<User>> GetActiveLibrariansAsync()
    {
        return await _context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Where(u => u.IsActive && (u.Role.RoleName == "Admin" || u.Role.RoleName == "Staff"))
            .ToListAsync();
    }

    /// <summary>
    /// Kiểm tra xem người dùng đã nhận thông báo trễ hạn cho phiếu mượn này gần đây chưa (chống spam trùng lặp).
    /// </summary>
    public async Task<bool> HasRecentWarningAsync(int userId, string borrowCode, DateTime since)
    {
        return await _context.Notifications
            .AsNoTracking()
            .AnyAsync(n => n.UserID == userId && 
                           n.Message.Contains(borrowCode) && 
                           n.CreatedAt >= since);
    }

    /// <summary>
    /// Lấy danh sách các phiếu mượn đang hoạt động có sách trễ hạn hoặc sắp trễ hạn trong khoảng ngày cấu hình.
    /// </summary>
    public async Task<List<Borrowing>> GetOverdueBorrowingsAsync(int? daysBeforeWindow = 0)
    {
        var now = DateTime.UtcNow;
        var thresholdDate = daysBeforeWindow.HasValue && daysBeforeWindow.Value > 0
            ? now.AddDays(daysBeforeWindow.Value)
            : now;

        return await _context.Borrowings
            .AsNoTracking()
            .Include(b => b.Reader)
                .ThenInclude(r => r.User)
            .Include(b => b.BorrowingDetails)
                .ThenInclude(bd => bd.BookCopy)
                    .ThenInclude(bc => bc.Book)
            .Include(b => b.AIPredictionLogs)
            .Where(b => b.Status != "Returned" &&
                        b.DueDate <= thresholdDate &&
                        b.BorrowingDetails.Any(bd => bd.ItemStatus == "Borrowed" && bd.ReturnDate == null))
            .OrderBy(b => b.DueDate)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy quy định phạt và cảnh báo AI hiện hành từ bảng FineRules.
    /// </summary>
    public async Task<FineRule?> GetActiveFineRuleAsync()
    {
        return await _context.FineRules
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.IsActive);
    }
}
