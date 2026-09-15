namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho thể loại sách trong thư viện.
/// </summary>
public class Category
{
    public int CategoryID { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    // Quan hệ 1-N: Một thể loại chứa nhiều đầu sách
    public ICollection<Book> Books { get; set; } = new List<Book>();
}
