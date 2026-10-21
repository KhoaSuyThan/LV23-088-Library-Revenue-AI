using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Invoices;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ thu tiền phạt và xuất hóa đơn kế toán bất biến (Story LOLRA-19).
/// </summary>
public interface IInvoiceService
{
    /// <summary>
    /// Xử lý thu tiền phạt, ghi nhận hóa đơn PenaltyInvoice bất biến và mở khóa quyền mượn sách.
    /// </summary>
    Task<ApiResponse<InvoiceResponseDto>> CreateInvoiceAsync(CreateInvoiceRequestDto request, int cashierId);

    /// <summary>
    /// Lấy danh sách các khoản phạt vi phạm đang chờ thanh toán (Status = 'Pending').
    /// </summary>
    Task<ApiResponse<List<PendingFineDto>>> GetPendingFinesAsync(string? query = null);

    /// <summary>
    /// Tra cứu chi tiết biên lai thu tiền phạt theo mã hóa đơn INVxxxxxx để in lại.
    /// </summary>
    Task<ApiResponse<InvoiceResponseDto>> GetInvoiceByCodeAsync(string invoiceCode);

    /// <summary>
    /// Tra cứu chi tiết biên lai thu tiền phạt theo ID hóa đơn.
    /// </summary>
    Task<ApiResponse<InvoiceResponseDto>> GetInvoiceByIdAsync(int invoiceId);

    /// <summary>
    /// Lấy tổng hợp số liệu tài chính doanh thu thu phạt và dữ liệu biểu đồ.
    /// </summary>
    Task<ApiResponse<RevenueSummaryDto>> GetRevenueSummaryAsync();

    /// <summary>
    /// Lấy danh sách lịch sử biên lai thu tiền phạt có lọc và phân trang.
    /// </summary>
    Task<ApiResponse<PagedResult<InvoiceHistoryDto>>> GetInvoiceHistoryAsync(
        string? query = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 20);

    /// <summary>
    /// Lấy danh sách độc giả có nguy cơ trễ hạn cao do AI đánh giá (phục vụ Tab AI Dự báo trên màn hình Thu phạt).
    /// </summary>
    Task<ApiResponse<List<AiForecastReaderDto>>> GetAiForecastReadersAsync();
}

