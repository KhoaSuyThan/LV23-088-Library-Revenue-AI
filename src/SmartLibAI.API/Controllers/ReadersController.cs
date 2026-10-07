using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller quản lý hồ sơ độc giả, tra cứu dữ liệu SQL Server và khóa/mở khóa thẻ thư viện.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReadersController : ControllerBase
{
    private readonly IReaderService _readerService;

    public ReadersController(IReaderService readerService)
    {
        _readerService = readerService;
    }

    /// <summary>
    /// Lấy danh sách hồ sơ độc giả từ CSDL SQL Server với bộ lọc và tìm kiếm.
    /// </summary>
    /// <param name="faculty">Bộ lọc Khoa/Viện (all, CNTT, Kinh Tế, Cơ Khí, Ngoại Ngữ...)</param>
    /// <param name="status">Bộ lọc trạng thái (all, active, locked)</param>
    /// <param name="risk">Bộ lọc mức độ rủi ro AI (all, high, medium, low)</param>
    /// <param name="search">Từ khóa tìm kiếm nhanh (MSSV, Họ tên, Email, Khoa)</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<ReaderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReaders(
        [FromQuery] string? faculty = null,
        [FromQuery] string? status = null,
        [FromQuery] string? risk = null,
        [FromQuery] string? search = null)
    {
        var result = await _readerService.GetReadersAsync(faculty, status, risk, search);
        return Ok(result);
    }

    /// <summary>
    /// Lấy các chỉ số thống kê tổng hợp cho 4 thẻ KPI đầu trang.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(ApiResponse<ReaderSummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary()
    {
        var result = await _readerService.GetReaderSummaryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một độc giả theo ReaderID.
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
    /// Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong SQL Server (đổi IsActive của User).
    /// Khi bị khóa, độc giả sẽ bị chặn mượn sách ngay lập tức tại quầy lưu thông.
    /// </summary>
    /// <param name="id">Mã định danh ReaderID</param>
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
    /// Đặt trạng thái thẻ độc giả cụ thể (Hoạt động / Đã khóa).
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
    /// Gửi thông báo / email cảnh báo trễ hạn đến độc giả.
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
