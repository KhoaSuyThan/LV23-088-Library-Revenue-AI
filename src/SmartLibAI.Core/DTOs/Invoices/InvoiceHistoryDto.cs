namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// DTO thể hiện một bản ghi biên lai/hóa đơn trong danh sách lịch sử thu tiền.
/// </summary>
public class InvoiceHistoryDto
{
    public int InvoiceId { get; set; }

    /// <summary>
    /// Mã biên lai chuẩn (INVxxxxxx).
    /// </summary>
    public string InvoiceCode { get; set; } = string.Empty;

    public int ReceiptId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    // Độc giả
    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = string.Empty;

    public string StudentCode { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    // Sách & Lý do vi phạm
    public string BookTitle { get; set; } = string.Empty;

    public string BookCode { get; set; } = string.Empty;

    public string FineReason { get; set; } = string.Empty;

    public string FineReasonLabel { get; set; } = string.Empty;

    // Tài chính
    public decimal AmountPaid { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public DateTime PaymentDate { get; set; }

    // Thủ thư thu tiền
    public int CashierId { get; set; }

    public string CashierName { get; set; } = string.Empty;

    public string? Note { get; set; }
}
