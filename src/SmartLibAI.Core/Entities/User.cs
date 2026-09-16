namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho tài khoản người dùng đăng nhập hệ thống.
/// </summary>
public class User
{
    public int UserID { get; set; }

    public int RoleID { get; set; }

    public string Username { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string? Email { get; set; }

    /// <summary>
    /// Trạng thái kích hoạt: true = Đang hoạt động, false = Đã bị khóa
    /// </summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Role Role { get; set; } = null!;

    public Reader? Reader { get; set; }

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    // Danh sách phiếu mượn do thủ thư này xử lý
    public ICollection<Borrowing> BorrowingsHandled { get; set; } = new List<Borrowing>();
}
