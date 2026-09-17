using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller cung cấp API tra cứu và quản trị sách thư viện.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly IBookService _bookService;

    public BooksController(IBookService bookService)
    {
        _bookService = bookService;
    }

    /// <summary>
    /// Lấy danh sách sách có phân trang tại Server và hỗ trợ tìm kiếm theo từ khóa / lọc theo thể loại.
    /// </summary>
    /// <param name="filter">Tham số phân trang: pageNumber, pageSize, keyword, categoryID</param>
    [HttpGet]
    public async Task<IActionResult> GetBooks([FromQuery] BookFilterDto filter)
    {
        var result = await _bookService.GetPagedBooksAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Lấy toàn bộ sách (không phân trang - phục vụ xuất báo cáo).
    /// </summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAllBooks()
    {
        var result = await _bookService.GetBooksAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết thông tin một đầu sách dựa theo BookID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBookById(int id)
    {
        var result = await _bookService.GetBookByIdAsync(id);
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }
}
