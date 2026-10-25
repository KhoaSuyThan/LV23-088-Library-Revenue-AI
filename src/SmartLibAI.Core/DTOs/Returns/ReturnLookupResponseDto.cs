namespace SmartLibAI.Core.DTOs.Returns;

/// <summary>
/// DTO thông tin tra cứu khi thủ thư quét mã vạch Barcode để chuẩn bị tiếp nhận trả sách (Story LOLRA-17).
/// </summary>
public class ReturnLookupResponseDto
{
    public int DetailId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    public int CopyId { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public int BookId { get; set; }

    public string BookTitle { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    public string MemberType { get; set; } = string.Empty;

    /// <summary>
    /// Khoa / Bộ phận thực tế của độc giả (BUG-04).
    /// </summary>
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// Điểm tín nhiệm của độc giả (0 - 100).
    /// </summary>
    public int CreditScore { get; set; } = 100;

    /// <summary>
    /// Tỷ lệ chiết khấu tự động theo điểm tín nhiệm độc giả (80-89: 10%; 90-100: 20%).
    /// </summary>
    public decimal CreditDiscountPercent { get; set; } = 0m;

    /// <summary>
    /// Số tiền được giảm trừ tự động theo điểm tín nhiệm.
    /// </summary>
    public decimal CreditDiscountAmount { get; set; } = 0m;

    /// <summary>
    /// Tiền phạt ước tính sau khi trừ chiết khấu tín nhiệm tự động.
    /// </summary>
    public decimal EstimatedFinalFine { get; set; } = 0m;

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public int OverdueDays { get; set; }

    public bool IsOverdue { get; set; }

    public decimal EstimatedOverdueFine { get; set; }

    /// <summary>
    /// Tiền phạt trễ hạn tính theo ngày trước khi áp trần (OverdueDays * FinePerDay) - Quy tắc 10.1.
    /// </summary>
    public decimal RawOverdueFine { get; set; }

    /// <summary>
    /// Tiền phạt trễ hạn thực tế sau khi áp trần không quá 100% giá bìa gốc và làm tròn đến 1.000đ - Quy tắc 10.2.
    /// </summary>
    public decimal OverdueFine { get; set; }

    /// <summary>
    /// Mức trần tiền phạt trễ hạn (100% giá bìa gốc cuốn sách) - Quy tắc 10.2.
    /// </summary>
    public decimal OverdueFineCap { get; set; }

    /// <summary>
    /// Cho biết tiền phạt trễ hạn có vượt quá giá bìa gốc và phải áp trần hay không.
    /// </summary>
    public bool IsFineCapped { get; set; }

    public decimal FinePerDay { get; set; } = 5000m;

    /// <summary>
    /// Hệ số đền bù sách mất từ bảng FineRules (mặc định 1.0).
    /// </summary>
    public decimal DamageMultiplier { get; set; } = 1.0m;

    /// <summary>
    /// Mức phạt hư hỏng nhẹ từ bảng FineRules (chuẩn US-10.3 mặc định 30%).
    /// </summary>
    public decimal DamageFeePercent { get; set; } = 30.0m;

    /// <summary>
    /// Mức phạt hư hỏng vừa từ bảng FineRules (mặc định 40%).
    /// </summary>
    public decimal DamageMediumPercent { get; set; } = 40.0m;

    /// <summary>
    /// Mức phạt hư hỏng nặng từ bảng FineRules (mặc định 110%).
    /// </summary>
    public decimal DamageSeverePercent { get; set; } = 110.0m;

    /// <summary>
    /// Mức đền bù mất sách từ bảng FineRules (mặc định 110%).
    /// </summary>
    public decimal CompensationBasePercent { get; set; } = 110.0m;

    public string CurrentItemStatus { get; set; } = "Borrowed";

    public int TotalItemsInBorrowing { get; set; }

    public int ReturnedItemsCount { get; set; }

    /// <summary>
    /// Số lần phiếu mượn này đã được gia hạn (BUG-045 & US-08.2).
    /// </summary>
    public int RenewalCount { get; set; } = 0;

    /// <summary>
    /// Số lần gia hạn tối đa được cấu hình theo FineRules (mặc định 1).
    /// </summary>
    public int MaxRenewalTimes { get; set; } = 1;

    /// <summary>
    /// Số ngày gia hạn thêm mỗi lần theo cấu hình FineRules (mặc định 7).
    /// </summary>
    public int RenewalExtraDays { get; set; } = 7;

    /// <summary>
    /// Cho biết phiếu mượn này có đủ điều kiện gia hạn hay không.
    /// </summary>
    public bool CanRenew { get; set; } = true;

    /// <summary>
    /// Lý do không thể gia hạn nếu CanRenew = false.
    /// </summary>
    public string? RenewalBlockReason { get; set; }

    /// <summary>
    /// Danh sách chi tiết toàn bộ các cuốn sách thuộc phiếu mượn này (phục vụ trả sách nhiều cuốn).
    /// </summary>
    public List<ReturnLookupItemDto> Items { get; set; } = new();
}

/// <summary>
/// DTO biểu diễn một cuốn sách cụ thể trong phiếu mượn khi tra cứu hoàn trả.
/// </summary>
public class ReturnLookupItemDto
{
    public int DetailId { get; set; }

    public int CopyId { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public int BookId { get; set; }

    public string BookTitle { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public string CurrentItemStatus { get; set; } = "Borrowed";

    public DateTime? ReturnDate { get; set; }

    public bool IsReturned { get; set; }

    public decimal OverdueFine { get; set; }
}

