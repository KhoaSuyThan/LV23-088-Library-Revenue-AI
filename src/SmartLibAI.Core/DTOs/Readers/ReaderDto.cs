namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO đại diện cho thông tin hồ sơ độc giả hiển thị trên bảng dữ liệu SQL Server.
/// </summary>
public class ReaderDto
{
    public int ReaderID { get; set; }

    public int UserID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string Faculty { get; set; } = "CNTT";

    public string ClassGroup { get; set; } = "K21-CC";

    public string MemberType { get; set; } = "Standard";

    /// <summary>
    /// Trạng thái tài khoản người dùng: true = Hoạt động, false = Bị khóa thẻ
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Chuỗi trạng thái: "active" (Đang hoạt động) | "locked" (Đã khóa thẻ)
    /// </summary>
    public string Status => IsActive ? "active" : "locked";

    public DateTime ExpiryDate { get; set; }

    public bool IsExpired => ExpiryDate.Date < DateTime.UtcNow.Date;

    /// <summary>
    /// Điểm tín nhiệm bạn đọc (0 - 100)
    /// </summary>
    public int CreditScore { get; set; } = 100;

    /// <summary>
    /// Xếp hạng tín nhiệm: "Tốt" (>=80), "Khá" (>=60), "Yếu" (<60)
    /// </summary>
    public string CreditRating
    {
        get
        {
            if (CreditScore >= 80) return "Tốt";
            if (CreditScore >= 60) return "Khá";
            return "Yếu";
        }
    }

    /// <summary>
    /// Tổng tiền phạt tồn đọng chưa thanh toán (Status = Pending)
    /// </summary>
    public decimal FineDebtRaw { get; set; }

    public string FineDebt => $"{FineDebtRaw:N0} VNĐ";

    /// <summary>
    /// Số lượng sách đang mượn hiện tại
    /// </summary>
    public int ActiveBorrowCount { get; set; }

    /// <summary>
    /// Chuỗi tóm tắt các sách đang mượn
    /// </summary>
    public string CurrentBooksSummary { get; set; } = "• None (Không mượn)";

    /// <summary>
    /// Điểm rủi ro AI (0 - 100)
    /// </summary>
    public int RiskScore { get; set; }

    /// <summary>
    /// Mức độ rủi ro: "high", "medium", "low"
    /// </summary>
    public string RiskType { get; set; } = "low";

    /// <summary>
    /// Chuỗi hiển thị mức độ rủi ro: "Cao (High)", "Vừa (Medium)", "Thấp (Low)"
    /// </summary>
    public string RiskLevelText { get; set; } = "Thấp (Low)";

    /// <summary>
    /// Chẩn đoán của trợ lý AI đối với bạn đọc
    /// </summary>
    public string AiDiagnosis { get; set; } = string.Empty;

    public string Avatar { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách chi tiết các cuốn sách đang mượn
    /// </summary>
    public List<ReaderBookDto> Books { get; set; } = new();
}
