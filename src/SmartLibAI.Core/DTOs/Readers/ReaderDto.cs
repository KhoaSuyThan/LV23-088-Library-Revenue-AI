namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO đại diện thông tin hồ sơ độc giả (Story LOLRA-78).
/// </summary>
public class ReaderDto
{
    public int ReaderID { get; set; }
    public int UserID { get; set; }
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string ReaderCode { get; set; } = string.Empty;
    public string MemberType { get; set; } = "Student";
    public DateTime ExpiryDate { get; set; }
    public int CreditScore { get; set; } = 100;
    
    /// <summary>
    /// Trạng thái kích hoạt: true = Đang hoạt động, false = Bị khóa
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Trạng thái tổng hợp: "Active" (Hoạt động), "Locked" (Bị khóa), "Expired" (Hết hạn thẻ)
    /// </summary>
    public string Status { get; set; } = "Active";

    /// <summary>
    /// Số lượng cuốn sách độc giả hiện đang mượn chưa trả
    /// </summary>
    public int ActiveBorrowCount { get; set; }

    /// <summary>
    /// Tổng số tiền phạt còn nợ chưa thanh toán (VNĐ)
    /// </summary>
    public decimal TotalUnpaidFines { get; set; }

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
