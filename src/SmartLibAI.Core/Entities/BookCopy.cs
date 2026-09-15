namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho từng bản sao (bản vật lý) cụ thể của một đầu sách có mã vạch riêng.
/// </summary>
public class BookCopy
{
    public int CopyID { get; set; }

    public int BookID { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public string Status { get; set; } = "Available"; // 'Available', 'Borrowed', 'Lost', 'Damaged'

    // Navigation properties
    public Book Book { get; set; } = null!;

    public ICollection<BorrowingDetail> BorrowingDetails { get; set; } = new List<BorrowingDetail>();
}
