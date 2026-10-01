using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho nghiệp vụ hóa đơn thu phạt kế toán bất biến (Story LOLRA-19).
/// </summary>
public interface IInvoiceRepository : IGenericRepository<PenaltyInvoice>
{
    /// <summary>
    /// Lấy bản ghi khoản phạt vi phạm theo ReceiptID kèm các quan hệ liên quan.
    /// </summary>
    Task<FineReceipt?> GetFineReceiptByIdAsync(int receiptId);

    /// <summary>
    /// Lấy danh sách các khoản phạt vi phạm đang chờ thanh toán (Status = 'Pending').
    /// Hỗ trợ lọc theo mã độc giả / tên độc giả / mã phiếu mượn.
    /// </summary>
    Task<List<FineReceipt>> GetPendingFineReceiptsAsync(string? query = null);

    /// <summary>
    /// Lấy thông tin hóa đơn thu phạt theo mã biên lai INVxxxxxx.
    /// </summary>
    Task<PenaltyInvoice?> GetInvoiceByCodeAsync(string invoiceCode);

    /// <summary>
    /// Lấy thông tin hóa đơn thu phạt theo ID.
    /// </summary>
    Task<PenaltyInvoice?> GetInvoiceByIdAsync(int invoiceId);

    /// <summary>
    /// Thực thi Database Transaction kế toán bất biến:
    /// 1. Kiểm tra FineReceipt tồn tại và Status == 'Pending' (chống thanh toán trùng lặp).
    /// 2. Sinh mã biên lai INVxxxxxx duy nhất.
    /// 3. Lưu bản ghi hóa đơn PenaltyInvoice.
    /// 4. Đổi trạng thái FineReceipt.Status = 'Paid'.
    /// 5. Commit transaction an toàn.
    /// </summary>
    Task<(bool Success, string Message, PenaltyInvoice? Invoice)> CreateInvoiceWithTransactionAsync(
        int receiptId,
        string paymentMethod,
        int cashierId,
        string? note);
}
