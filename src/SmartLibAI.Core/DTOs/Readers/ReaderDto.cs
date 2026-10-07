namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO đại diện cho thông tin hồ sơ độc giả trên toàn hệ thống (Story L0LRA-71 & L0LRA-78).
/// </summary>
public class ReaderDto
{
    public int ReaderID { get; set; }
    public int UserID { get; set; }
    public string ReaderCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string Faculty { get; set; } = "CNTT";
    public string ClassGroup { get; set; } = "K21-CC";
    public string MemberType { get; set; } = "Student";

    /// <summary>
    /// Trạng thái kích hoạt: true = Đang hoạt động, false = Bị khóa
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Trạng thái tổng hợp: "Active" (Hoạt động), "Locked" (Bị khóa), "Expired" (Hết hạn thẻ)
    /// </summary>
    public string Status { get; set; } = "Active";

    public DateTime ExpiryDate { get; set; }
    public bool IsExpired => ExpiryDate.Date < DateTime.UtcNow.Date;

    /// <summary>
    /// Điểm tín nhiệm bạn đọc (0 - 100, mặc định 100)
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
    /// Số lượng cuốn sách độc giả hiện đang mượn chưa trả
    /// </summary>
    public int ActiveBorrowCount { get; set; }
    public int ActiveBorrowedBooks
    {
        get => ActiveBorrowCount;
        set => ActiveBorrowCount = value;
    }

    /// <summary>
    /// Tổng số tiền phạt còn nợ chưa thanh toán (VNĐ)
    /// </summary>
    public decimal TotalUnpaidFines { get; set; }
    public decimal UnpaidFineAmount
    {
        get => TotalUnpaidFines;
        set => TotalUnpaidFines = value;
    }

    public decimal FineDebtRaw { get; set; }
    public string FineDebt => $"{FineDebtRaw:N0} VNĐ";

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
    public string RiskLevel
    {
        get => RiskLevelText;
        set => RiskLevelText = value;
    }

    /// <summary>
    /// Chẩn đoán của trợ lý AI đối với bạn đọc
    /// </summary>
    public string AiDiagnosis { get; set; } = string.Empty;

    public string Avatar { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách chi tiết các cuốn sách đang mượn
    /// </summary>
    public List<ReaderBookDto> Books { get; set; } = new();

    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO chi tiết độc giả bao gồm các tài liệu đang mượn
/// </summary>
public class ReaderDetailDto : ReaderDto
{
    public List<ReaderBorrowingItemDto> CurrentBorrowings { get; set; } = new();
}

public class ReaderBorrowingItemDto
{
    public int BorrowingID { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public DateTime BorrowDate { get; set; }
    public DateTime DueDate { get; set; }
    public bool IsOverdue { get; set; }
    public int OverdueDays { get; set; }
}
