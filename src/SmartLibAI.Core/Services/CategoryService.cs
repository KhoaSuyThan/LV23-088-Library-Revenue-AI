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
}
