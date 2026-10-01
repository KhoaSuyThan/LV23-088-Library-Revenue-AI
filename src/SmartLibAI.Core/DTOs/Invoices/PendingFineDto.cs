namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// DTO đại diện cho một khoản nợ phạt đang chờ thanh toán (Status = 'Pending').
/// </summary>
public class PendingFineDto
{
    public int ReceiptId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    public string Department { get; set; } = string.Empty;

    public string BookTitle { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal FinalAmount { get; set; }

    public DateTime DueDate { get; set; }

    public int DaysOverdue { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Status { get; set; } = "Pending";
}
