namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// DTO trả về sau khi xuất hóa đơn thu phạt thành công (Story LOLRA-19).
/// Chứa đầy đủ dữ liệu phục vụ in biên lai chuẩn K80 / A5.
/// </summary>
public class InvoiceResponseDto
{
    public int InvoiceId { get; set; }

    /// <summary>
    /// Mã biên lai kế toán chuẩn (INVxxxxxx).
    /// </summary>
    public string InvoiceCode { get; set; } = string.Empty;

    public int ReceiptId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    // Thông tin độc giả nộp phạt
    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    public string BookTitle { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    // Chi tiết tài chính
    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public DateTime PaymentDate { get; set; }

    // Người tiếp nhận
    public int CashierId { get; set; }

    public string CashierName { get; set; } = string.Empty;

    public string? Note { get; set; }

    /// <summary>
    /// Xác nhận quyền mượn sách đã được tự động mở lại cho độc giả.
    /// </summary>
    public bool CanBorrowAgain { get; set; } = true;
}
