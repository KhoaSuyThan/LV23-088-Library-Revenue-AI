namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho thông báo gửi tới người dùng trong hệ thống.
/// </summary>
public class Notification
{
    public int NotificationID { get; set; }

    public int UserID { get; set; }

    public string Title { get; set; } = "Thông báo hệ thống";

    public string Message { get; set; } = string.Empty;

    public string Type { get; set; } = "System";

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User User { get; set; } = null!;
}
