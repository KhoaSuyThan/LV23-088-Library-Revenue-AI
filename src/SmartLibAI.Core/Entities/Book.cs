namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho đầu sách trong thư viện, ánh xạ tương thích với schema và dữ liệu books.csv.
/// </summary>
public class Book
{
    public int BookID { get; set; }

    public int CategoryID { get; set; }

    public string? ISBN { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public string? Publisher { get; set; }

    public decimal BasePrice { get; set; } = 50000m;

    // Navigation properties
    public Category Category { get; set; } = null!;

    // Danh sách các bản sao sách (cuốn cụ thể)
    public ICollection<BookCopy> BookCopies { get; set; } = new List<BookCopy>();
}
