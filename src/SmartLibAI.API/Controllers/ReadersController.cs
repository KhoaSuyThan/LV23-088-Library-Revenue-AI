using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller Quản lý hồ sơ độc giả, phân tích rủi ro AI, thống kê KPI và Khóa/Mở thẻ bạn đọc (L0LRA-71 & L0LRA-78).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class ReadersController : ControllerBase
{
    private readonly IReaderService _readerService;

    public ReadersController(IReaderService readerService)
    {
        _readerService = readerService;
    }

    /// <summary>
    /// Lấy danh sách hồ sơ độc giả từ CSDL SQL Server (Hỗ trợ cả lọc thường theo UI và phân trang).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ReaderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReaders(
        [FromQuery] string? faculty = null,
        [FromQuery] string? status = null,
        [FromQuery] string? risk = null,
        [FromQuery] string? search = null,
        [FromQuery] string? keyword = null,
        [FromQuery] string? memberType = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        // Nếu có tham số phân trang, trả về PagedResult (L0LRA-78)
        if (page.HasValue || pageSize.HasValue)
        {
            var p = page ?? 1;
            var ps = pageSize ?? 20;
            var kw = !string.IsNullOrWhiteSpace(keyword) ? keyword : search;
            var pagedResult = await _readerService.GetPagedReadersAsync(kw, memberType, status, p, ps);
            return Ok(pagedResult);
        }

        // Mặc định trả về danh sách đầy đủ cho UI Profiles (L0LRA-71)
        var result = await _readerService.GetReadersAsync(faculty, status, risk, search ?? keyword);
        return Ok(result);
    }

    /// <summary>
    /// Lấy các chỉ số thống kê tổng hợp cho 4 thẻ KPI đầu trang (L0LRA-71).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<ReaderSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _readerService.GetReaderSummaryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một độc giả theo ReaderID (ReaderDto - L0LRA-71).
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _readerService.GetReaderByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết hồ sơ độc giả kèm thống kê sách mượn và nợ phạt (ReaderDetailDto - L0LRA-78).
    /// </summary>
    [HttpGet("{id:int}/detail")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDetailById(int id)
    {
        var result = await _readerService.GetReaderDetailByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin độc giả theo Mã thẻ bạn đọc hoặc MSSV (GET /api/readers/code/{readerCode}).
    /// </summary>
    [HttpGet("code/{readerCode}")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByCode(string readerCode)
    {
        var result = await _readerService.GetReaderByCodeAsync(readerCode);
        if (!result.Success)
        {
            return NotFound(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong SQL Server (đổi IsActive của User - L0LRA-71).
    /// Khi bị khóa, độc giả sẽ bị chặn mượn sách ngay lập tức tại quầy lưu thông.
    /// </summary>
    [HttpPut("{id:int}/toggle-lock")]
    [ProducesResponseType(typeof(ApiResponse<ToggleLockResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ToggleLockResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ToggleLock(int id)
    {
        var result = await _readerService.ToggleLockAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Đặt trạng thái thẻ độc giả cụ thể (Hoạt động / Đã khóa - L0LRA-71).
    /// </summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<ToggleLockResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ToggleLockResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetStatus(int id, [FromBody] SetLockStatusRequestDto request)
    {
        var result = await _readerService.SetLockStatusAsync(id, request.IsActive);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Khóa hoặc Mở khóa thẻ bạn đọc (PATCH /api/readers/{id}/status - L0LRA-78).
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleCardStatus(int id, [FromBody] ToggleReaderStatusDto request)
    {
        var result = await _readerService.ToggleCardStatusAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Thêm mới độc giả và cấp thẻ bạn đọc (POST /api/readers - L0LRA-78).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateReader([FromBody] CreateReaderRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<ReaderDto>.ErrorResult("Dữ liệu tạo độc giả không hợp lệ", errors));
        }

        var result = await _readerService.CreateReaderAsync(request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.ReaderID }, result);
    }

    /// <summary>
    /// Cập nhật thông tin hồ sơ độc giả (PUT /api/readers/{id} - L0LRA-78).
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateReader(int id, [FromBody] UpdateReaderRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<ReaderDto>.ErrorResult("Dữ liệu cập nhật không hợp lệ", errors));
        }

        var result = await _readerService.UpdateReaderAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gia hạn ngày hết hạn thẻ bạn đọc (POST /api/readers/{id}/extend - L0LRA-78).
    /// </summary>
    [HttpPost("{id:int}/extend")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ExtendCard(int id, [FromBody] ExtendCardRequestDto request)
    {
        var result = await _readerService.ExtendCardAsync(id, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Gửi thông báo / email cảnh báo trễ hạn đến độc giả (POST /api/readers/{id}/send-warning - L0LRA-71).
    /// </summary>
    [HttpPost("{id:int}/send-warning")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendWarning(int id)
    {
        var result = await _readerService.SendWarningNotificationAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
