using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Invoices;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ thu tiền phạt và xuất hóa đơn kế toán bất biến (Story LOLRA-19).
/// </summary>
public class InvoiceService : IInvoiceService
{
    private readonly IInvoiceRepository _invoiceRepository;

    public InvoiceService(IInvoiceRepository invoiceRepository)
    {
        _invoiceRepository = invoiceRepository;
    }

    /// <summary>
    /// Xử lý thu tiền phạt, ghi nhận hóa đơn PenaltyInvoice bất biến và mở khóa quyền mượn sách.
    /// </summary>
    public async Task<ApiResponse<InvoiceResponseDto>> CreateInvoiceAsync(CreateInvoiceRequestDto request, int cashierId)
    {
        if (request.ReceiptId <= 0)
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult("Mã khoản phạt (ReceiptId) không hợp lệ.");
        }

        var effectiveCashierId = request.CashierId.HasValue && request.CashierId.Value > 0
            ? request.CashierId.Value
            : cashierId;

        var result = await _invoiceRepository.CreateInvoiceWithTransactionAsync(
            request.ReceiptId,
            request.PaymentMethod,
            effectiveCashierId,
            request.Note);

        if (!result.Success || result.Invoice == null)
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult(result.Message);
        }

        var dto = MapToInvoiceResponseDto(result.Invoice);
        return ApiResponse<InvoiceResponseDto>.SuccessResult(dto, result.Message);
    }

    /// <summary>
    /// Lấy danh sách các khoản phạt vi phạm đang chờ thanh toán (Status = 'Pending').
    /// </summary>
    public async Task<ApiResponse<List<PendingFineDto>>> GetPendingFinesAsync(string? query = null)
    {
        var receipts = await _invoiceRepository.GetPendingFineReceiptsAsync(query);

        var list = receipts.Select(r =>
        {
            var borrowing = r.Borrowing;
            var reader = borrowing?.Reader;
            var user = reader?.User;
            var bookTitles = borrowing?.BorrowingDetails
                .Select(bd => bd.BookCopy?.Book?.Title)
                .Where(t => !string.IsNullOrEmpty(t))
                .ToList() ?? new List<string?>();

            var bookTitle = bookTitles.Any() ? string.Join(", ", bookTitles) : "Tài liệu thư viện";
            var now = DateTime.UtcNow;
            var daysOverdue = borrowing != null && now > borrowing.DueDate
                ? (int)(now - borrowing.DueDate).TotalDays
                : 0;

            var reason = daysOverdue > 0
                ? $"Quá hạn {daysOverdue} ngày"
                : r.FineRule?.RuleName ?? "Vi phạm quy định mượn trả";

            return new PendingFineDto
            {
                ReceiptId = r.ReceiptID,
                BorrowingId = r.BorrowingID,
                BorrowCode = $"PM-{r.BorrowingID:D4}",
                ReaderId = reader?.ReaderID ?? 0,
                ReaderName = user?.FullName ?? "Bạn đọc",
                ReaderCode = reader?.ReaderCode ?? user?.Username ?? "N/A",
                Department = reader?.MemberType ?? "Thành viên",
                BookTitle = bookTitle,
                TotalAmount = r.TotalAmount,
                DiscountAmount = r.DiscountAmount,
                FinalAmount = r.FinalAmount,
                DueDate = borrowing?.DueDate ?? DateTime.UtcNow,
                DaysOverdue = daysOverdue,
                Reason = reason,
                Status = r.Status
            };
        }).ToList();

        return ApiResponse<List<PendingFineDto>>.SuccessResult(list, $"Tìm thấy {list.Count} khoản phạt đang chờ thanh toán.");
    }

    /// <summary>
    /// Tra cứu chi tiết biên lai thu tiền phạt theo mã hóa đơn INVxxxxxx để in lại.
    /// </summary>
    public async Task<ApiResponse<InvoiceResponseDto>> GetInvoiceByCodeAsync(string invoiceCode)
    {
        if (string.IsNullOrWhiteSpace(invoiceCode))
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult("Vui lòng cung cấp mã hóa đơn biên lai.");
        }

        var invoice = await _invoiceRepository.GetInvoiceByCodeAsync(invoiceCode);
        if (invoice == null)
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult($"Không tìm thấy biên lai với mã: {invoiceCode}");
        }

        var dto = MapToInvoiceResponseDto(invoice);
        return ApiResponse<InvoiceResponseDto>.SuccessResult(dto, "Lấy thông tin biên lai thành công.");
    }

    /// <summary>
    /// Tra cứu chi tiết biên lai thu tiền phạt theo ID hóa đơn.
    /// </summary>
    public async Task<ApiResponse<InvoiceResponseDto>> GetInvoiceByIdAsync(int invoiceId)
    {
        if (invoiceId <= 0)
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult("Mã ID hóa đơn không hợp lệ.");
        }

        var invoice = await _invoiceRepository.GetInvoiceByIdAsync(invoiceId);
        if (invoice == null)
        {
            return ApiResponse<InvoiceResponseDto>.ErrorResult($"Không tìm thấy biên lai với ID: {invoiceId}");
        }

        var dto = MapToInvoiceResponseDto(invoice);
        return ApiResponse<InvoiceResponseDto>.SuccessResult(dto, "Lấy thông tin biên lai thành công.");
    }

    /// <summary>
    /// Hàm ánh xạ Entity PenaltyInvoice sang InvoiceResponseDto chuẩn hóa.
    /// </summary>
    private static InvoiceResponseDto MapToInvoiceResponseDto(PenaltyInvoice invoice)
    {
        var receipt = invoice.FineReceipt;
        var borrowing = receipt?.Borrowing;
        var reader = borrowing?.Reader;
        var user = reader?.User;
        var cashier = invoice.Cashier;

        var bookTitles = borrowing?.BorrowingDetails
            .Select(bd => bd.BookCopy?.Book?.Title)
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList() ?? new List<string?>();

        var bookTitle = bookTitles.Any() ? string.Join(", ", bookTitles) : "Tài liệu thư viện";
        var borrowCode = borrowing != null ? $"PM-{borrowing.BorrowingID:D4}" : "PM-0000";

        var daysOverdue = 0;
        if (borrowing != null && invoice.PaymentDate > borrowing.DueDate)
        {
            daysOverdue = (int)(invoice.PaymentDate - borrowing.DueDate).TotalDays;
        }

        var reason = daysOverdue > 0
            ? $"Phạt trễ hạn hoàn trả sách ({daysOverdue} ngày)"
            : receipt?.FineRule?.RuleName ?? "Xử phạt vi phạm quy định thư viện";

        return new InvoiceResponseDto
        {
            InvoiceId = invoice.InvoiceID,
            InvoiceCode = invoice.InvoiceCode,
            ReceiptId = invoice.ReceiptID,
            BorrowingId = borrowing?.BorrowingID ?? 0,
            BorrowCode = borrowCode,
            ReaderId = reader?.ReaderID ?? 0,
            ReaderName = user?.FullName ?? "Bạn đọc",
            ReaderCode = reader?.ReaderCode ?? user?.Username ?? "N/A",
            Department = reader?.MemberType ?? "Thành viên",
            BookTitle = bookTitle,
            Reason = reason,
            TotalAmount = receipt?.TotalAmount ?? invoice.AmountPaid,
            DiscountAmount = receipt?.DiscountAmount ?? 0m,
            AmountPaid = invoice.AmountPaid,
            PaymentMethod = invoice.PaymentMethod,
            PaymentDate = invoice.PaymentDate,
            CashierId = invoice.CashierID,
            CashierName = cashier?.FullName ?? "Thủ thư tiếp nhận",
            Note = invoice.Note,
            CanBorrowAgain = true
        };
    }

    /// <summary>
    /// Lấy tổng hợp số liệu tài chính doanh thu thu phạt và dữ liệu biểu đồ.
    /// </summary>
    public async Task<ApiResponse<RevenueSummaryDto>> GetRevenueSummaryAsync()
    {
        try
        {
            var summary = await _invoiceRepository.GetRevenueSummaryAsync();
            return ApiResponse<RevenueSummaryDto>.SuccessResult(summary, "Tổng hợp số liệu doanh thu thu phạt thành công.");
        }
        catch (Exception ex)
        {
            return ApiResponse<RevenueSummaryDto>.ErrorResult($"Lỗi truy vấn tổng hợp doanh thu: {ex.Message}");
        }
    }

    /// <summary>
    /// Lấy danh sách lịch sử biên lai thu tiền phạt có lọc và phân trang.
    /// </summary>
    public async Task<ApiResponse<PagedResult<InvoiceHistoryDto>>> GetInvoiceHistoryAsync(
        string? query = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        int pageNumber = 1,
        int pageSize = 20)
    {
        try
        {
            var (items, totalCount) = await _invoiceRepository.GetInvoiceHistoryAsync(
                query,
                fromDate,
                toDate,
                pageNumber,
                pageSize);

            var pagedResult = new PagedResult<InvoiceHistoryDto>(items, totalCount, pageNumber, pageSize);

            return ApiResponse<PagedResult<InvoiceHistoryDto>>.SuccessResult(
                pagedResult,
                $"Lấy danh sách biên lai thành công ({items.Count}/{totalCount} biên lai).");
        }
        catch (Exception ex)
        {
            return ApiResponse<PagedResult<InvoiceHistoryDto>>.ErrorResult($"Lỗi truy vấn danh sách biên lai: {ex.Message}");
        }
    }
}

