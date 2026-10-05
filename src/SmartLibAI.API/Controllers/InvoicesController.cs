using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Invoices;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller xử lý thu tiền phạt và xuất biên lai kế toán bất biến (Story LOLRA-19).
/// Chỉ Thủ thư / Kế toán (Admin, Staff) mới có quyền thu tiền và xuất hóa đơn.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/[controller]")]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    /// <summary>
    /// Thu tiền mặt/chuyển khoản từ độc giả vi phạm và xuất biên lai thu tiền phạt (Sub-task 1 Story LOLRA-19).
    /// Thực hiện Transaction kế toán bất biến, tạo bản ghi trong PenaltyInvoices, gắn mã INVxxxxxx,
    /// cập nhật trạng thái FineReceipt sang Paid và tự động mở khóa quyền mượn sách.
    /// </summary>
    /// <param name="request">Thông tin yêu cầu thanh toán (ReceiptId, PaymentMethod, CashierId, Note)</param>
    /// <response code="200">Xuất hóa đơn thành công và tự động mở khóa mượn sách</response>
    /// <response code="400">Dữ liệu không hợp lệ hoặc khoản phạt đã được thanh toán trước đó</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<InvoiceResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<InvoiceResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceRequestDto request)
    {
        // Trích xuất UserID của thủ thư đang đăng nhập nếu có
        var cashierId = 1; // Mặc định Admin/Librarian
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var parsedId))
        {
            cashierId = parsedId;
        }

        var result = await _invoiceService.CreateInvoiceAsync(request, cashierId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách các khoản phạt vi phạm đang chờ thanh toán (Status = 'Pending').
    /// </summary>
    /// <param name="query">Từ khóa tìm kiếm (Mã độc giả, Tên độc giả, Mã phiếu mượn)</param>
    /// <response code="200">Danh sách các khoản nợ phạt đang chờ thu</response>
    [HttpGet("pending")]
    [ProducesResponseType(typeof(ApiResponse<List<PendingFineDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPendingFines([FromQuery] string? query = null)
    {
        var result = await _invoiceService.GetPendingFinesAsync(query);
        return Ok(result);
    }

    /// <summary>
    /// Tổng hợp số liệu tài chính doanh thu thu phạt và dữ liệu biểu đồ xu hướng (Story LOLRA-17 / Sprint 5.1).
    /// </summary>
    /// <response code="200">Dữ liệu tổng hợp KPI và biểu đồ doanh thu</response>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<RevenueSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRevenueSummary()
    {
        var result = await _invoiceService.GetRevenueSummaryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách lịch sử biên lai thu tiền phạt có lọc theo từ khóa, ngày và phân trang (Story LOLRA-17 / Sprint 5.1).
    /// </summary>
    /// <param name="query">Từ khóa tìm kiếm (Mã biên lai, Họ tên độc giả, MSSV, Tên sách)</param>
    /// <param name="fromDate">Từ ngày thanh toán</param>
    /// <param name="toDate">Đến ngày thanh toán</param>
    /// <param name="pageNumber">Số trang (mặc định 1)</param>
    /// <param name="pageSize">Kích thước trang (mặc định 20)</param>
    /// <response code="200">Danh sách biên lai đã thu tiền</response>
    [HttpGet("history")]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<InvoiceHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvoiceHistory(
        [FromQuery] string? query = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _invoiceService.GetInvoiceHistoryAsync(query, fromDate, toDate, pageNumber, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Tra cứu chi tiết biên lai thu tiền phạt theo Mã biên lai (INVxxxxxx) hoặc ID hóa đơn để in lại.
    /// </summary>
    /// <param name="idOrCode">Mã biên lai dạng INV202610010001 hoặc ID số</param>
    /// <response code="200">Tìm thấy thông tin biên lai</response>
    /// <response code="404">Không tìm thấy biên lai</response>
    [HttpGet("{idOrCode}")]
    [ProducesResponseType(typeof(ApiResponse<InvoiceResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<InvoiceResponseDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInvoice(string idOrCode)
    {
        if (string.IsNullOrWhiteSpace(idOrCode))
        {
            return BadRequest(ApiResponse<InvoiceResponseDto>.ErrorResult("Vui lòng cung cấp mã hoặc ID hóa đơn."));
        }

        ApiResponse<InvoiceResponseDto> result;

        if (int.TryParse(idOrCode, out var invoiceId))
        {
            result = await _invoiceService.GetInvoiceByIdAsync(invoiceId);
        }
        else
        {
            result = await _invoiceService.GetInvoiceByCodeAsync(idOrCode);
        }

        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
