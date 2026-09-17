using SmartLibAI.Core.DTOs.Categories;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho thao tác danh mục thể loại sách.
/// </summary>
public interface ICategoryRepository : IGenericRepository<Category>
{
    /// <summary>
    /// Lấy danh sách 10 thể loại kèm tổng số đầu sách thuộc thể loại đó.
    /// </summary>
    Task<IReadOnlyList<CategoryDto>> GetCategoriesWithBookCountAsync();
}
