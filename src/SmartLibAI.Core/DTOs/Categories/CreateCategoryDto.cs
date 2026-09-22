namespace SmartLibAI.Core.DTOs.Categories;

/// <summary>
/// DTO tiếp nhận dữ liệu tạo mới thể loại sách.
/// </summary>
public class CreateCategoryDto
{
    /// <summary>
    /// Tên thể loại sách mới (bắt buộc, không để trống).
    /// </summary>
    public string CategoryName { get; set; } = string.Empty;
}
