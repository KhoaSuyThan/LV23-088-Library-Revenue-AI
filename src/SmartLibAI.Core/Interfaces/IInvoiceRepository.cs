using SmartLibAI.Core.DTOs.Invoices;
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

    /// <summary>
    /// Tính toán tổng hợp số liệu tài chính doanh thu thu phạt và mảng dữ liệu biểu đồ.
    /// </summary>
    Task<RevenueSummaryDto> GetRevenueSummaryAsync();

    /// <summary>
    /// Lấy danh sách lịch sử biên lai thu tiền phạt có lọc theo từ khóa, khoảng ngày và phân trang.
    /// </summary>
    Task<(List<InvoiceHistoryDto> Items, int TotalCount)> GetInvoiceHistoryAsync(
        string? query = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 20);

    /// <summary>
    /// Lấy danh sách độc giả có nguy cơ trễ hạn cao do AI đánh giá.
    /// </summary>
    Task<List<AiForecastReaderDto>> GetAiForecastReadersAsync();

    /// <summary>
    /// Thống kê danh sách các đầu sách có tỷ lệ vi phạm (quá hạn, hư hỏng, mất) cao nhất từ dữ liệu thực tế (BUG-043 & US-11.3).
    /// </summary>
    Task<List<TopViolatedBookDto>> GetTopViolatedBooksAsync(
        string? timeRange = null,
        DateTime? fromDate = null,
        DateTime? toDate = null);
}
