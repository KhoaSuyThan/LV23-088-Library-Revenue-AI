namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO đại diện cho một cuốn sách mà độc giả đang mượn.
/// </summary>
public class ReaderBookDto
{
    public int DetailID { get; set; }

    public int CopyID { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public string BadgeText { get; set; } = string.Empty;

    /// <summary>
    /// remaining (còn hạn) | overdue (trễ hạn)
    /// </summary>
    public string BadgeType { get; set; } = "remaining";

    public string SubText { get; set; } = string.Empty;

    public bool IsOverdue { get; set; }

    public int OverdueDays { get; set; }

    public decimal AccruedFine { get; set; }
}
