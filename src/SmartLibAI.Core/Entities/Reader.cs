namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho hồ sơ độc giả gắn liền với một tài khoản người dùng.
/// </summary>
public class Reader
{
    public int ReaderID { get; set; }

    public int UserID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string MemberType { get; set; } = "Standard";

    public DateTime ExpiryDate { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    // Danh sách phiếu mượn của độc giả
    public ICollection<Borrowing> Borrowings { get; set; } = new List<Borrowing>();
}
