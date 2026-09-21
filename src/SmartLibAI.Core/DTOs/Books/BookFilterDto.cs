namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO chứa các tham số truy vấn tìm kiếm, lọc và phân trang cho danh sách sách.
/// </summary>
public class BookFilterDto
{
    private int _pageNumber = 1;
    private int _pageSize = 20;

    /// <summary>
    /// Số thứ tự trang muốn lấy (mặc định: 1).
    /// </summary>
    public int PageNumber
    {
        get => _pageNumber;
        set => _pageNumber = value > 0 ? value : 1;
    }

    /// <summary>
    /// Số lượng bản ghi trên một trang (mặc định: 20, tối đa: 100).
    /// </summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value switch
        {
            <= 0 => 20,
            > 100 => 100,
            _ => value
        };
    }

    /// <summary>
    /// Từ khóa tìm kiếm (tìm kiếm trong Tiêu đề, Tác giả hoặc mã ISBN).
    /// </summary>
    public string? Keyword { get; set; }

    /// <summary>
    /// Lọc theo mã danh mục CategoryID (nếu có).
    /// </summary>
    public int? CategoryID { get; set; }

    /// <summary>
    /// Giá tối thiểu (Min Price).
    /// </summary>
    public decimal? MinPrice { get; set; }

    /// <summary>
    /// Giá tối đa (Max Price).
    /// </summary>
    public decimal? MaxPrice { get; set; }

    /// <summary>
    /// Trạng thái sách: 'available' (sẵn sàng/còn sách) hoặc 'out_of_stock' (hết sách/đang mượn hết).
    /// </summary>
    public string? Status { get; set; }
}
