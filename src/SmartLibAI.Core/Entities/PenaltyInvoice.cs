namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho hóa đơn kế toán thu tiền phạt bất biến (Scenario 1 Story LOLRA-19).
/// </summary>
public class PenaltyInvoice
{
    public int InvoiceID { get; set; }

    /// <summary>
    /// Mã biên lai kế toán chuẩn (VD: INV20261001001 hoặc INVxxxxxx).
    /// </summary>
    public string InvoiceCode { get; set; } = string.Empty;

    /// <summary>
    /// Khóa ngoại liên kết tới khoản phạt vi phạm tương ứng.
    /// </summary>
    public int ReceiptID { get; set; }

    /// <summary>
    /// Phương thức thanh toán: 'Cash' (Tiền mặt), 'Transfer' (Chuyển khoản QR).
    /// </summary>
    public string PaymentMethod { get; set; } = "Cash";

    /// <summary>
    /// Số tiền phạt thực tế đã thu vào quỹ thư viện.
    /// </summary>
    public decimal AmountPaid { get; set; }

    /// <summary>
    /// Thời điểm xác nhận thu tiền.
    /// </summary>
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Khóa ngoại thủ thư tiếp nhận thu tiền (UserID).
    /// </summary>
    public int CashierID { get; set; }

    /// <summary>
    /// Ghi chú nghiệp vụ (nếu có).
    /// </summary>
    public string? Note { get; set; }

    // Navigation properties
    public FineReceipt FineReceipt { get; set; } = null!;

    public User Cashier { get; set; } = null!;
}
