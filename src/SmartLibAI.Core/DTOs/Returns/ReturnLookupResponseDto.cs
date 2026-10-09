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
    /// Mức phạt hư hỏng nhẹ từ bảng FineRules (mặc định 20%).
    /// </summary>
    public decimal DamageFeePercent { get; set; } = 20.0m;

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

