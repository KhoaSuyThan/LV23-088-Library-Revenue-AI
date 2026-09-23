namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO chứa thông tin bản sao sách vật lý và mã vạch (AC1, AC3).
/// </summary>
public class BookCopyDto
{
    public int CopyID { get; set; }

    public int BookID { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public string Status { get; set; } = "Available"; // 'Available', 'Borrowed', 'Damaged', 'Lost'

    public string BookTitle { get; set; } = string.Empty;

    public string? ISBN { get; set; }
}
