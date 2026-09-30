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

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public DateTime ReturnDate { get; set; }

    public string ItemStatus { get; set; } = string.Empty;

    public string CopyStatus { get; set; } = string.Empty;

    public int OverdueDays { get; set; }

    public decimal OverdueFine { get; set; }

    public decimal DamageFee { get; set; }

    public decimal LostFee { get; set; }

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
