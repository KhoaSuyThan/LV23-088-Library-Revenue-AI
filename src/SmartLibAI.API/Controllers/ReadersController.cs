using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller Quản lý hồ sơ độc giả & Khóa mở thẻ bạn đọc (Story LOLRA-78).
/// Chỉ Thủ thư (Admin, Staff) mới có quyền truy cập.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/[controller]")]
public class ReadersController : ControllerBase
{
    private readonly IReaderService _readerService;

    public ReadersController(IReaderService readerService)
    {
        _readerService = readerService;
    }

    /// <summary>
    /// Lấy danh sách độc giả có lọc, tìm kiếm và phân trang (GET /api/readers).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ReaderDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReaders(
        [FromQuery] string? keyword,
        [FromQuery] string? memberType,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _readerService.GetPagedReadersAsync(keyword, memberType, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Lấy thông tin chi tiết một độc giả theo ID (GET /api/readers/{id}).
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReaderDetailDto>), StatusCodes.Status404NotFound)]
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
    /// Thêm mới độc giả và cấp thẻ bạn đọc (POST /api/readers).
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
    /// Cập nhật thông tin hồ sơ độc giả (PUT /api/readers/{id}).
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
    /// Khóa hoặc Mở khóa thẻ bạn đọc (PATCH /api/readers/{id}/status).
    /// Chuyển đổi trạng thái IsActive để kiểm soát quyền mượn sách.
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
    /// Gia hạn ngày hết hạn thẻ bạn đọc (POST /api/readers/{id}/extend).
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
}
