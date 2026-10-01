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
}
