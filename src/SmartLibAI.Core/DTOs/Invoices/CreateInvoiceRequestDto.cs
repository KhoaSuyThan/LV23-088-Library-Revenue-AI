namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// DTO gửi lên khi thủ thư xác nhận thu tiền phạt (POST /api/invoices).
/// </summary>
public class CreateInvoiceRequestDto
{
    /// <summary>
    /// ID khoản phạt cần thanh toán (FineReceipts.ReceiptID).
    /// </summary>
    public int ReceiptId { get; set; }

    /// <summary>
    /// Hình thức thanh toán: 'Cash' (Tiền mặt), 'Transfer' (Chuyển khoản QR).
    /// </summary>
    public string PaymentMethod { get; set; } = "Cash";

    /// <summary>
    /// ID thủ thư tiếp nhận (nếu để trống hệ thống sẽ lấy từ JWT Claims).
    /// </summary>
    public int? CashierId { get; set; }

    /// <summary>
    /// Ghi chú nghiệp vụ của thủ thư.
    /// </summary>
    public string? Note { get; set; }
}
