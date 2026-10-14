using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Notifications;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller xử lý cảnh báo trễ hạn và quản lý thông báo cho Thủ thư (Admin, Staff).
/// </summary>
[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    /// <summary>
    /// Quét toàn bộ hệ thống các phiếu mượn trễ hạn hoặc sắp trễ hạn và gửi cảnh báo tới các Thủ thư.
    /// </summary>
    /// <param name="request">Cấu hình quét cảnh báo (khoảng ngày, chỉ định thủ thư, bao gồm rủi ro AI)</param>
    /// <response code="200">Quét và tạo thông báo cảnh báo thành công</response>
    /// <response code="400">Lỗi khi thực hiện quét hoặc không tìm thấy dữ liệu phù hợp</response>
    [HttpPost("overdue-warnings")]
    [ProducesResponseType(typeof(ApiResponse<OverdueWarningResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<OverdueWarningResultDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendOverdueWarnings([FromBody] SendOverdueWarningRequestDto? request)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _notificationService.SendOverdueWarningsToLibrariansAsync(request, currentUserId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gửi cảnh báo trễ hạn cho một phiếu mượn cụ thể tới Thủ thư.
    /// </summary>
    /// <param name="borrowingId">ID của phiếu mượn sách cần gửi cảnh báo</param>
    [HttpPost("overdue-warnings/{borrowingId:int}")]
    [ProducesResponseType(typeof(ApiResponse<OverdueWarningResultDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<OverdueWarningResultDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendWarningForBorrowing(int borrowingId)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _notificationService.SendOverdueWarningForBorrowingAsync(borrowingId, currentUserId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách thông báo và cảnh báo của Thủ thư đang đăng nhập.
    /// </summary>
    /// <param name="isRead">Lọc theo trạng thái: true = đã đọc, false = chưa đọc, null = tất cả</param>
    /// <param name="page">Số trang (mặc định 1)</param>
    /// <param name="pageSize">Số lượng mỗi trang (mặc định 20)</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<NotificationSummaryResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] bool? isRead = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId() ?? 1; // Fallback ID 1 nếu chạy môi trường test không có token
        var result = await _notificationService.GetLibrarianNotificationsAsync(userId, isRead, page, pageSize);

        return Ok(result);
    }

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc của Thủ thư (dùng cho quả chuông thông báo trên Header).
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetCurrentUserId() ?? 1;
        var result = await _notificationService.GetUnreadCountAsync(userId);

        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu một thông báo là đã đọc (PUT /api/notifications/{id}/read).
    /// </summary>
    [HttpPut("{id:int}/read")]
    [HttpPatch("{id:int}/read")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetCurrentUserId() ?? 1;
        var result = await _notificationService.MarkAsReadAsync(id, userId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu toàn bộ thông báo của Thủ thư là đã đọc.
    /// </summary>
    [HttpPost("mark-all-read")]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetCurrentUserId() ?? 1;
        var result = await _notificationService.MarkAllAsReadAsync(userId);

        return Ok(result);
    }

    /// <summary>
    /// Xóa một thông báo theo ID.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId() ?? 1;
        var result = await _notificationService.DeleteNotificationAsync(id, userId);

        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách tóm tắt toàn bộ các ca mượn sách đang quá hạn hoặc sắp quá hạn trong hệ thống.
    /// </summary>
    /// <param name="daysBefore">Khoảng ngày trước hạn cần quét (mặc định 0 = chỉ lấy các ca đã quá hạn)</param>
    [HttpGet("overdue-summary")]
    [ProducesResponseType(typeof(ApiResponse<List<OverdueBorrowingItemDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverdueSummary([FromQuery] int daysBefore = 0)
    {
        var result = await _notificationService.GetOverdueBorrowingsSummaryAsync(daysBefore);
        return Ok(result);
    }

    /// <summary>
    /// Lấy ID của người dùng đang đăng nhập từ JWT Claims.
    /// </summary>
    private int? GetCurrentUserId()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.FindFirstValue("sub") 
            ?? User.FindFirstValue("nameid");

        if (int.TryParse(userIdStr, out int userId))
        {
            return userId;
        }

        return null;
    }
}
