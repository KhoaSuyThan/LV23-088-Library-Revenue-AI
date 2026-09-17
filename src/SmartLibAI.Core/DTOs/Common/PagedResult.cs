namespace SmartLibAI.Core.DTOs.Common;

/// <summary>
/// Đại diện cho kết quả phân trang dùng chung cho toàn bộ hệ thống API.
/// </summary>
/// <typeparam name="T">Kiểu dữ liệu của danh sách phần tử trong trang</typeparam>
public class PagedResult<T>
{
    /// <summary>
    /// Danh sách các phần tử thuộc trang hiện tại.
    /// </summary>
    public IReadOnlyList<T> Items { get; set; } = new List<T>();

    /// <summary>
    /// Số thứ tự trang hiện tại (1-indexed).
    /// </summary>
    public int PageNumber { get; set; }

    /// <summary>
    /// Số lượng bản ghi trên một trang.
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Tổng số trang tính theo tổng số bản ghi và kích thước trang.
    /// </summary>
    public int TotalPages { get; set; }

    /// <summary>
    /// Tổng số bản ghi thỏa mãn điều kiện lọc trong cơ sở dữ liệu.
    /// </summary>
    public int TotalRecords { get; set; }

    /// <summary>
    /// Cờ kiểm tra có trang trước đó hay không.
    /// </summary>
    public bool HasPreviousPage => PageNumber > 1;

    /// <summary>
    /// Cờ kiểm tra có trang kế tiếp hay không.
    /// </summary>
    public bool HasNextPage => PageNumber < TotalPages;

    public PagedResult()
    {
    }

    public PagedResult(IReadOnlyList<T> items, int count, int pageNumber, int pageSize)
    {
        Items = items;
        TotalRecords = count;
        PageNumber = pageNumber;
        PageSize = pageSize > 0 ? pageSize : 20;
        TotalPages = (int)Math.Ceiling(count / (double)PageSize);
    }
}
