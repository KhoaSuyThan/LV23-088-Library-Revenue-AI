namespace SmartLibAI.Core.DTOs.Returns;

/// <summary>
/// DTO kết quả sau khi hệ thống xử lý hoàn tất trả một bản sao sách (Story LOLRA-17).
/// </summary>
public class ReturnBookResponseDto
{
    public int DetailId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    public int CopyId { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public string BookTitle { get; set; } = string.Empty;

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    /// <summary>
    /// Khoa / Bộ phận thực tế của độc giả (BUG-04).
    /// </summary>
    public string Department { get; set; } = string.Empty;

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public DateTime ReturnDate { get; set; }

    public string ItemStatus { get; set; } = string.Empty;

    public string CopyStatus { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public int OverdueDays { get; set; }

    /// <summary>
    /// Tiền phạt trễ hạn tính theo ngày trước khi áp trần.
    /// </summary>
    public decimal RawOverdueFine { get; set; }

    /// <summary>
    /// Tiền phạt trễ hạn thực tế sau khi áp trần không quá 100% giá bìa (Quy tắc 10.2).
    /// </summary>
    public decimal OverdueFine { get; set; }

    /// <summary>
    /// Cho biết tiền phạt trễ hạn có chạm mức trần 100% giá bìa hay không.
    /// </summary>
    public bool IsFineCapped { get; set; }

    public decimal DamageFee { get; set; }

    public decimal LostFee { get; set; }

    /// <summary>
    /// Điểm tín nhiệm của độc giả (0 - 100).
    /// </summary>
    public int CreditScore { get; set; } = 100;

    /// <summary>
    /// Tỷ lệ giảm trừ tự động theo điểm tín nhiệm độc giả (80-89: 10%; 90-100: 20%).
    /// </summary>
    public decimal CreditDiscountPercent { get; set; } = 0m;

    /// <summary>
    /// Số tiền giảm trừ theo điểm tín nhiệm độc giả.
    /// </summary>
    public decimal CreditDiscountAmount { get; set; } = 0m;

    /// <summary>
    /// Tỷ lệ miễn giảm thủ công do thủ thư duyệt (0 - 100%).
    /// </summary>
    public decimal WaiverDiscountPercent { get; set; } = 0m;

    /// <summary>
    /// Số tiền miễn giảm thủ công do thủ thư duyệt.
    /// </summary>
    public decimal WaiverDiscountAmount { get; set; } = 0m;

    /// <summary>
    /// Tổng tỷ lệ giảm trừ (CreditDiscountPercent + WaiverDiscountPercent, tối đa 100%).
    /// </summary>
    public decimal TotalDiscountPercent { get; set; } = 0m;

    /// <summary>
    /// Tổng số tiền giảm trừ (= CreditDiscountAmount + WaiverDiscountAmount).
    /// </summary>
    public decimal DiscountAmount { get; set; }

    public decimal TotalFine { get; set; }

    public bool IsOverdue { get; set; }

    public bool IsDamaged { get; set; }

    public bool IsLost { get; set; }

    public bool IsOnTime { get; set; }

    /// <summary>
    /// Cho biết toàn bộ các cuốn sách trong phiếu mượn này đã được hoàn trả hết hay chưa.
    /// </summary>
    public bool IsBorrowingCompleted { get; set; }

    public int? ReceiptId { get; set; }

    public string Message { get; set; } = string.Empty;
}
