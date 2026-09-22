using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller cung cấp API tra cứu danh mục thể loại sách.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Lấy danh sách toàn bộ các thể loại sách trong thư viện kèm số lượng đầu sách.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _categoryService.GetCategoriesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới một thể loại sách trong thư viện.
    /// </summary>
    /// <param name="dto">Dữ liệu thể loại gồm CategoryName</param>
    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] SmartLibAI.Core.DTOs.Categories.CreateCategoryDto dto)
    {
        var result = await _categoryService.CreateCategoryAsync(dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }
}
