using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller quản lý bản sao sách vật lý, sinh mã vạch và tra cứu máy quét (AC1 - AC5).
/// Chỉ Thủ thư (Admin, Staff) mới có quyền quản trị bản sao và quét mã kiểm kê.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/[controller]")]
public class BookCopiesController : ControllerBase
{
    private readonly IBookService _bookService;

    public BookCopiesController(IBookService bookService)
    {
        _bookService = bookService;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ bản sao của một đầu sách (AC1, AC3).
    /// </summary>
    [HttpGet("/api/books/{bookId:int}/copies")]
    public async Task<IActionResult> GetBookCopies(int bookId)
    {
        var result = await _bookService.GetBookCopiesAsync(bookId);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Thêm hàng loạt bản sao cho một đầu sách với mã vạch tự động sinh liên tiếp (AC1, AC2).
    /// </summary>
    [HttpPost("/api/books/{bookId:int}/copies/bulk")]
    public async Task<IActionResult> BulkAddCopies(int bookId, [FromBody] BulkAddCopiesRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<IReadOnlyList<BookCopyDto>>.ErrorResult("Dữ liệu yêu cầu không hợp lệ."));
        }

        var result = await _bookService.BulkAddCopiesAsync(bookId, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tra cứu chi tiết một bản sao bằng máy quét mã vạch (AC5).
    /// </summary>
    [HttpGet("lookup")]
    public async Task<IActionResult> LookupByBarcode([FromQuery] string barcode)
    {
        var result = await _bookService.GetCopyByBarcodeAsync(barcode);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái độc lập của bản sao (AC3): Available, Borrowed, Damaged, Lost.
    /// </summary>
    [HttpPatch("{copyId:int}/status")]
    public async Task<IActionResult> UpdateCopyStatus(int copyId, [FromBody] UpdateCopyStatusDto request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ApiResponse<bool>.ErrorResult("Trạng thái bản sao không hợp lệ."));
        }

        var result = await _bookService.UpdateCopyStatusAsync(copyId, request);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Xóa một bản sao (nếu không trong trạng thái mượn).
    /// </summary>
    [HttpDelete("{copyId:int}")]
    public async Task<IActionResult> DeleteCopy(int copyId)
    {
        var result = await _bookService.DeleteCopyAsync(copyId);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
