namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho biên lai thu tiền phạt đối với phiếu mượn vi phạm quy định.
/// </summary>
public class FineReceipt
{
    public int ReceiptID { get; set; }

    public int BorrowingID { get; set; }

    public int RuleID { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; } = 0m;

    public decimal FinalAmount { get; set; }

    public string Status { get; set; } = "Pending"; // 'Pending', 'Paid', 'Cancelled'

    // Navigation properties
    public Borrowing Borrowing { get; set; } = null!;

    public FineRule FineRule { get; set; } = null!;

    public PenaltyInvoice? PenaltyInvoice { get; set; }
}
