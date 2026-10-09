namespace SmartLibAI.Core.DTOs.Borrows;

/// <summary>
/// DTO thông tin từng cuốn sách/bản sao cụ thể trong phiếu mượn.
/// </summary>
public class BorrowItemDto
{
    public int CopyID { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public int BookID { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public string ItemStatus { get; set; } = "Borrowed";

    public DateTime? ReturnDate { get; set; }
}

/// <summary>
/// DTO phản hồi chi tiết phiếu mượn sách sau khi tạo hoặc truy vấn.
/// </summary>
public class BorrowResponseDto
{
    public int BorrowingID { get; set; }

    /// <summary>
    /// Mã phiếu hiển thị thân thiện (Ví dụ: 'PM-9920' hoặc 'PM-0001').
    /// </summary>
    public string BorrowCode => $"PM-{BorrowingID:D4}";

    public int ReaderID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string ReaderName { get; set; } = string.Empty;

    public string MemberType { get; set; } = string.Empty;

    /// <summary>
    /// Khoa / Bộ phận thực tế của độc giả (BUG-04).
    /// </summary>
    public string Department { get; set; } = string.Empty;

    public int LibrarianID { get; set; }

    public string LibrarianName { get; set; } = string.Empty;

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public string Status { get; set; } = "Active";

    public int TotalItems { get; set; }

    public List<BorrowItemDto> Items { get; set; } = new();
}
