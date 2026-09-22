using SmartLibAI.Core.DTOs.Categories;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý danh mục thể loại sách trong hệ thống SmartLibAI.
/// </summary>
public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _categoryRepository;

    public CategoryService(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    /// <summary>
    /// Lấy toàn bộ danh sách danh mục thể loại kèm số lượng đầu sách tương ứng.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetCategoriesAsync()
    {
        var categories = await _categoryRepository.GetCategoriesWithBookCountAsync();
        return ApiResponse<IReadOnlyList<CategoryDto>>.SuccessResult(categories, "Lấy danh sách thể loại thành công");
    }

    /// <summary>
    /// Tạo mới một thể loại sách vào cơ sở dữ liệu với kiểm tra trùng lặp.
    /// </summary>
    public async Task<ApiResponse<CategoryDto>> CreateCategoryAsync(CreateCategoryDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.CategoryName))
        {
            return ApiResponse<CategoryDto>.ErrorResult("Tên thể loại không được để trống.");
        }

        var trimmedName = dto.CategoryName.Trim();
        if (trimmedName.Length > 100)
        {
            return ApiResponse<CategoryDto>.ErrorResult("Tên thể loại không được vượt quá 100 ký tự.");
        }

        // Kiểm tra xem tên thể loại đã tồn tại chưa (không phân biệt chữ hoa/thường)
        var exists = await _categoryRepository.ExistsAsync(c => c.CategoryName.ToLower() == trimmedName.ToLower());
        if (exists)
        {
            return ApiResponse<CategoryDto>.ErrorResult($"Thể loại '{trimmedName}' đã tồn tại trong hệ thống.");
        }

        var newCategory = new SmartLibAI.Core.Entities.Category
        {
            CategoryName = trimmedName
        };

        var created = await _categoryRepository.AddAsync(newCategory);

        var resultDto = new CategoryDto
        {
            CategoryID = created.CategoryID,
            CategoryName = created.CategoryName,
            TotalBooks = 0
        };

        return ApiResponse<CategoryDto>.SuccessResult(resultDto, "Thêm thể loại sách mới thành công");
    }
}
