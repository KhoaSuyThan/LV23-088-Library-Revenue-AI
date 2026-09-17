using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Categories;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai CategoryRepository truy vấn danh mục thể loại sách.
/// </summary>
public class CategoryRepository : GenericRepository<Category>, ICategoryRepository
{
    public CategoryRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy danh sách 10 thể loại sách sắp xếp theo ID kèm số lượng đầu sách.
    /// </summary>
    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesWithBookCountAsync()
    {
        return await _dbSet.AsNoTracking()
            .OrderBy(c => c.CategoryID)
            .Select(c => new CategoryDto
            {
                CategoryID = c.CategoryID,
                CategoryName = c.CategoryName,
                TotalBooks = c.Books.Count
            })
            .ToListAsync();
    }
}
