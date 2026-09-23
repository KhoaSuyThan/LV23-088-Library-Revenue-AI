namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO chứa thông tin chi tiết đầu sách phục vụ hiển thị trên giao diện.
/// </summary>
public class BookDto
{
    public int BookID { get; set; }

    public int CategoryID { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string? ISBN { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public string? Publisher { get; set; }

    public decimal BasePrice { get; set; }

    public int TotalCopies { get; set; }

    public int AvailableCopies { get; set; }

    /// <summary>
    /// Danh sách các bản sao vật lý kèm mã vạch của đầu sách.
    /// </summary>
    public List<BookCopyDto> Copies { get; set; } = new();
}
