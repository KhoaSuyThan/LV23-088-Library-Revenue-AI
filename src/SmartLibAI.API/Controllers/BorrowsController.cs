using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller tiếp nhận thẻ bạn đọc và tạo phiếu mượn sách bằng quét mã vạch Barcode (Story LOLRA-16).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BorrowsController : ControllerBase
{
    private readonly IBorrowService _borrowService;

    public BorrowsController(IBorrowService borrowService)
    {
        _borrowService = borrowService;
    }

    /// <summary>
    /// Tiếp nhận thẻ bạn đọc và tạo phiếu mượn sách bằng quét mã vạch Barcode (AC1 & AC2).
    /// </summary>
    /// <param name="request">Thông tin yêu cầu tạo phiếu mượn (Mã thẻ độc giả, danh sách Barcode, Hạn trả)</param>
    /// <response code="201">Tạo phiếu mượn thành công qua Transaction an toàn, trả về chi tiết phiếu mượn</response>
    /// <response code="400">Từ chối mượn sách do vi phạm điều kiện (nợ phạt, vượt hạn mức, sách không khả dụng...)</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BorrowResponseDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ApiResponse<BorrowResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBorrow([FromBody] CreateBorrowRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<BorrowResponseDto>.ErrorResult("Dữ liệu tạo phiếu mượn không hợp lệ.", errors));
        }

        // Lấy thông tin UserID của thủ thư đang đăng nhập từ JWT Token nếu có
        int? currentLibrarianId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.FindFirstValue("sub") 
            ?? User.FindFirstValue("nameid");

        if (int.TryParse(userIdStr, out int parsedUserId))
        {
            currentLibrarianId = parsedUserId;
        }

        var result = await _borrowService.CreateBorrowAsync(request, currentLibrarianId);
        if (!result.Success)
        {
            // Trả về HTTP 400 Bad Request kèm cảnh báo đỏ theo đúng Scenario 2
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.BorrowingID }, result);
    }

    /// <summary>
    /// Kiểm tra nhanh điều kiện và tư cách mượn sách của độc giả bằng mã thẻ bạn đọc.
    /// </summary>
    [HttpGet("eligibility/{readerCode}")]
    [ProducesResponseType(typeof(ApiResponse<BorrowReaderEligibilityDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<BorrowReaderEligibilityDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CheckEligibility(string readerCode)
    {
        var result = await _borrowService.CheckReaderEligibilityAsync(readerCode);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết thông tin một phiếu mượn sách theo mã ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ApiResponse<BorrowResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<BorrowResponseDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _borrowService.GetBorrowByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách các phiếu mượn mới nhất trong ngày tại quầy lưu thông.
    /// </summary>
    [HttpGet("recent")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<BorrowResponseDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecent([FromQuery] int count = 20)
    {
        var result = await _borrowService.GetRecentBorrowingsAsync(count);
        return Ok(result);
    }
}
