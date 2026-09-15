namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho phiếu mượn sách giữa độc giả và thư viện do thủ thư quản lý.
/// </summary>
public class Borrowing
{
    public int BorrowingID { get; set; }

    public int ReaderID { get; set; }

    public int LibrarianID { get; set; }

    public DateTime BorrowDate { get; set; } = DateTime.UtcNow;

    public DateTime DueDate { get; set; }

    public string Status { get; set; } = "Active"; // 'Active', 'Returned', 'Overdue'

    // Navigation properties
    public Reader Reader { get; set; } = null!;

    public User Librarian { get; set; } = null!;

    public ICollection<BorrowingDetail> BorrowingDetails { get; set; } = new List<BorrowingDetail>();

    public ICollection<FineReceipt> FineReceipts { get; set; } = new List<FineReceipt>();

    public ICollection<AIPredictionLog> AIPredictionLogs { get; set; } = new List<AIPredictionLog>();
}
