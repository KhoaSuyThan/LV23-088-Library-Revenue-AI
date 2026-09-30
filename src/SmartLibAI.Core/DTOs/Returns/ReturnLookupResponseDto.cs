namespace SmartLibAI.Core.DTOs.Returns;

/// <summary>
/// DTO thông tin tra cứu khi thủ thư quét mã vạch Barcode để chuẩn bị tiếp nhận trả sách (Story LOLRA-17).
/// </summary>
public class ReturnLookupResponseDto
{
    public int DetailId { get; set; }

    public int BorrowingId { get; set; }

    public string BorrowCode { get; set; } = string.Empty;

    public int CopyId { get; set; }

    public string Barcode { get; set; } = string.Empty;

    public int BookId { get; set; }

    public string BookTitle { get; set; } = string.Empty;

    public string Author { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public int ReaderId { get; set; }

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    public string MemberType { get; set; } = string.Empty;

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public int OverdueDays { get; set; }

    public bool IsOverdue { get; set; }

    public decimal EstimatedOverdueFine { get; set; }

    public decimal FinePerDay { get; set; } = 5000m;

    public string CurrentItemStatus { get; set; } = "Borrowed";

    public int TotalItemsInBorrowing { get; set; }

    public int ReturnedItemsCount { get; set; }
}
