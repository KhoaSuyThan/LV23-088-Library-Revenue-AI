using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller cung cấp API tra cứu và quản trị sách thư viện.
/// Chỉ Thủ thư (Admin, Staff) mới có quyền truy cập và quản lý danh mục sách.
/// </summary>
[ApiController]
[Authorize(Roles = "Admin,Staff")]
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
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetAllBooks()
    {
        var result = await _bookService.GetBooksAsync();
        return Ok(result);
    }

    /// <summary>
    /// Lấy dữ liệu thống kê tổng hợp cho 4 thẻ KPI của phân hệ Quản lý Sách.
    /// </summary>
    [HttpGet("summary")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetCatalogSummary()
    {
        var result = await _bookService.GetCatalogSummaryAsync();
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

    /// <summary>
    /// Nạp danh mục sách hàng loạt từ file CSV vào hệ thống (US-06 / LOLRA-14).
    /// </summary>
    /// <param name="file">Tệp bảng tính .csv (tối đa 15MB)</param>
    [HttpPost("import-csv")]
    [Authorize(Roles = "Admin,Staff")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportBooksFromCsv([FromForm] BookImportCsvUploadDto dto)
    {
        var file = dto?.File;
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<BookImportResultDto>.ErrorResult("Vui lòng chọn tệp CSV để nạp vào hệ thống."));
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
        {
            return BadRequest(ApiResponse<BookImportResultDto>.ErrorResult("Hệ thống chỉ chấp nhận tệp định dạng .csv."));
        }

        // Giới hạn 15MB (khoảng 30.000 dòng dữ liệu)
        if (file.Length > 15 * 1024 * 1024)
        {
            return BadRequest(ApiResponse<BookImportResultDto>.ErrorResult("Dung lượng tệp vượt quá giới hạn 15MB."));
        }

        using var stream = file.OpenReadStream();
        var result = await _bookService.ImportBooksFromCsvAsync(stream);

        return Ok(result);
    }

    /// <summary>
    /// Xuất toàn bộ danh sách sách trong thư viện ra tệp CSV (UTF-8 BOM có chỉ thị sep=,).
    /// </summary>
    [HttpGet("export-csv")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> ExportBooksCsv()
    {
        var csvBytes = await _bookService.ExportBooksToCsvAsync();
        return File(csvBytes, "text/csv; charset=utf-8", "smartlib_books_catalog.csv");
    }

    /// <summary>
    /// Xuất toàn bộ danh sách sách trong thư viện ra tệp bảng tính Excel (.xls SpreadsheetML) có kẻ ô, định dạng thẩm mỹ.
    /// </summary>
    [HttpGet("export-excel")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> ExportBooksExcel()
    {
        var excelBytes = await _bookService.ExportBooksToExcelXmlAsync();
        return File(excelBytes, "application/vnd.ms-excel; charset=utf-8", "smartlib_books_catalog.xls");
    }

    /// <summary>
    /// Thêm mới một đầu sách vào thư viện (kèm tự động sinh bản sao vật lý ban đầu).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> CreateBook([FromBody] CreateBookDto dto)
    {
        var result = await _bookService.CreateBookAsync(dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetBookById), new { id = result.Data!.BookID }, result);
    }

    /// <summary>
    /// Cập nhật thông tin chi tiết một đầu sách hiện có.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> UpdateBook(int id, [FromBody] UpdateBookDto dto)
    {
        var result = await _bookService.UpdateBookAsync(id, dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Ngừng lưu thông đầu sách (xóa mềm - IsActive = 0, chặn nếu đang có sách cho mượn).
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> SoftDeleteBook(int id)
    {
        var result = await _bookService.SoftDeleteBookAsync(id);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}

/// <summary>
/// DTO chứa file upload cho Swagger multipart/form-data
/// </summary>
public class BookImportCsvUploadDto
{
    public IFormFile? File { get; set; }
}
