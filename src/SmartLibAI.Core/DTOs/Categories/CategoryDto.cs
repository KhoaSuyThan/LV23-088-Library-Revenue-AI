namespace SmartLibAI.Core.DTOs.Categories;

/// <summary>
/// DTO biểu diễn dữ liệu danh mục thể loại kèm số lượng đầu sách.
/// </summary>
public class CategoryDto
{
    /// <summary>
    /// Mã danh mục thể loại.
    /// </summary>
    public int CategoryID { get; set; }

    /// <summary>
    /// Tên thể loại sách.
    /// </summary>
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>
    /// Tổng số lượng đầu sách thuộc danh mục này.
    /// </summary>
    public int TotalBooks { get; set; }
}
