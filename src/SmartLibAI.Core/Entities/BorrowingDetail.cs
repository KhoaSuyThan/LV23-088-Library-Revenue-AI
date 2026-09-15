namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho từng đầu sách/cuốn sách cụ thể trong một phiếu mượn.
/// </summary>
public class BorrowingDetail
{
    public int DetailID { get; set; }

    public int BorrowingID { get; set; }

    public int CopyID { get; set; }

    public DateTime? ReturnDate { get; set; }

    public string ItemStatus { get; set; } = "Borrowed"; // 'Borrowed', 'Returned', 'Damaged', 'Lost'

    // Navigation properties
    public Borrowing Borrowing { get; set; } = null!;

    public BookCopy BookCopy { get; set; } = null!;
}
