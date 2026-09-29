namespace SmartLibAI.Core.DTOs.Borrows;

/// <summary>
/// DTO kiểm tra tư cách mượn sách của bạn đọc (hỗ trợ hiển thị cảnh báo đỏ khi bị từ chối).
/// </summary>
public class BorrowReaderEligibilityDto
{
    public int ReaderID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string MemberType { get; set; } = "Standard";

    public bool IsActive { get; set; }

    public DateTime ExpiryDate { get; set; }

    public bool IsExpired => ExpiryDate.Date < DateTime.UtcNow.Date;

    public int CurrentBorrowCount { get; set; }

    public int MaxBorrowLimit { get; set; }

    public int RemainingBorrowLimit => Math.Max(0, MaxBorrowLimit - CurrentBorrowCount);

    public bool HasUnpaidFines { get; set; }

    public decimal UnpaidFineAmount { get; set; }

    /// <summary>
    /// Cho biết độc giả có đủ điều kiện tạo phiếu mượn mới hay không.
    /// </summary>
    public bool CanBorrow => IsActive && !IsExpired && !HasUnpaidFines && RemainingBorrowLimit > 0;

    /// <summary>
    /// Lý do từ chối nếu không đủ điều kiện.
    /// </summary>
    public string? RejectionReason { get; set; }
}
