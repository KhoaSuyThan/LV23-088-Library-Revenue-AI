namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO tiếp nhận dữ liệu thêm mới một đầu sách vào thư viện.
/// </summary>
public class CreateBookDto
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
    /// Giá bìa niêm yết chuẩn (mặc định: 50.000 VNĐ).
    /// </summary>
    public decimal BasePrice { get; set; } = 50000m;

    /// <summary>
    /// Số lượng bản sao vật lý nhập kho ban đầu (tự động sinh mã vạch tương ứng, tối thiểu 1).
    /// </summary>
    public int InitialCopies { get; set; } = 1;
}
