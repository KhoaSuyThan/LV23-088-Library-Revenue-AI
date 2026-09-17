using SmartLibAI.Core.DTOs.Categories;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện xử lý nghiệp vụ danh mục thể loại sách.
/// </summary>
public interface ICategoryService
{
    /// <summary>
    /// Lấy toàn bộ danh sách 10 thể loại sách kèm tổng số lượng đầu sách tương ứng.
    /// </summary>
    Task<ApiResponse<IReadOnlyList<CategoryDto>>> GetCategoriesAsync();
}
