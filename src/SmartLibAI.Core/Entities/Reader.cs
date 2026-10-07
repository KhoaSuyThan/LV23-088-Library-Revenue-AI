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
 
    /// <summary>
    /// Điểm tín nhiệm bạn đọc (0 - 100, mặc định 100 điểm).
    /// </summary>
    public int CreditScore { get; set; } = 100;

    /// <summary>
    /// Khoa / Viện của độc giả (VD: CNTT, Kinh Tế, Cơ Khí, Ngoại Ngữ).
    /// </summary>
    public string Faculty { get; set; } = "CNTT";

    /// <summary>
    /// Lớp / Niên khóa của độc giả (VD: K21-CC, K22-KT).
    /// </summary>
    public string ClassGroup { get; set; } = "K21-CC";

    // Navigation properties
    public User User { get; set; } = null!;

    // Danh sách phiếu mượn của độc giả
    public ICollection<Borrowing> Borrowings { get; set; } = new List<Borrowing>();
}
