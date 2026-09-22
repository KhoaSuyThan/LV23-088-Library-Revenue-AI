namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO tiếp nhận dữ liệu cập nhật thông tin một đầu sách hiện có.
/// </summary>
public class UpdateBookDto
{
    /// <summary>
    /// Tên đầu sách (bắt buộc).
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Tác giả sách (bắt buộc).
    /// </summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>
    /// Mã thể loại sách liên kết (bắt buộc).
    /// </summary>
    public int CategoryID { get; set; }

    /// <summary>
    /// Mã tiêu chuẩn quốc tế ISBN (tùy chọn).
    /// </summary>
    public string? ISBN { get; set; }

    /// <summary>
    /// Nhà xuất bản.
    /// </summary>
    public string? Publisher { get; set; }

    /// <summary>
    /// Giá bìa niêm yết chuẩn (VNĐ).
    /// </summary>
    public decimal BasePrice { get; set; }
}
