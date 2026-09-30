using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Returns;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller tiếp nhận sách trả rải rác và xử lý vi phạm bằng quét mã Barcode (Story LOLRA-17).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ReturnsController : ControllerBase
{
    private readonly IReturnService _returnService;

    public ReturnsController(IReturnService returnService)
    {
        _returnService = returnService;
    }

    /// <summary>
    /// Tra cứu thông tin chi tiết một cuốn sách đang mượn theo mã Barcode bản sao hoặc mã phiếu (Story LOLRA-17).
    /// </summary>
    /// <param name="barcodeOrCode">Mã vạch bản sao (BC000001-A) hoặc Mã phiếu (PM-0005)</param>
    /// <response code="200">Tìm thấy thông tin sách mượn, độc giả và tiền phạt dự kiến nếu có</response>
    /// <response code="404">Không tìm thấy sách đang mượn khớp với mã</response>
    [HttpGet("lookup/{barcodeOrCode}")]
    [ProducesResponseType(typeof(ApiResponse<ReturnLookupResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReturnLookupResponseDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Lookup(string barcodeOrCode)
    {
        var result = await _returnService.LookupReturnItemAsync(barcodeOrCode);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tiếp nhận hoàn trả một cuốn sách theo mã Barcode, ghi nhận tình trạng thực tế và tính phạt (Scenario 1 & 2).
    /// </summary>
    /// <param name="request">Thông tin yêu cầu hoàn trả (Mã Barcode, Condition, Ghi chú, Miễn giảm)</param>
    /// <response code="200">Hoàn tất trả sách, cập nhật CSDL và trả về kết quả chi tiết</response>
    /// <response code="400">Dữ liệu không hợp lệ hoặc sách không ở trạng thái đang mượn</response>
    [HttpPost("process-item")]
    [HttpPost] // Cho phép gọi cả POST /api/returns và POST /api/returns/process-item
    [ProducesResponseType(typeof(ApiResponse<ReturnBookResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ReturnBookResponseDto>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessReturn([FromBody] ReturnBookRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
            return BadRequest(ApiResponse<ReturnBookResponseDto>.ErrorResult("Dữ liệu hoàn trả không hợp lệ.", errors));
        }

        // Lấy UserID của thủ thư đang đăng nhập từ JWT Token
        int? currentLibrarianId = null;
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("nameid");

        if (int.TryParse(userIdStr, out int parsedUserId))
        {
            currentLibrarianId = parsedUserId;
        }

        var result = await _returnService.ProcessReturnItemAsync(request, currentLibrarianId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
