namespace SmartLibAI.Core.DTOs.Borrows;

/// <summary>
/// Yêu cầu gia hạn mượn sách (BUG-045 & US-08.2).
/// Cho phép gia hạn qua BorrowingId hoặc qua Barcode của cuốn sách đang mượn.
/// </summary>
public class RenewBorrowRequestDto
{
    public int? BorrowingId { get; set; }

    public string? Barcode { get; set; }

    public string? Note { get; set; }
}

/// <summary>
/// Phản hồi sau khi gia hạn mượn sách thành công.
/// </summary>
public class RenewBorrowResponseDto
{
    public int BorrowingId { get; set; }

    public string BorrowCode => $"PM-{BorrowingId:D4}";

    public string ReaderName { get; set; } = string.Empty;

    public string ReaderCode { get; set; } = string.Empty;

    public DateTime OldDueDate { get; set; }

    public DateTime NewDueDate { get; set; }

    public int ExtraDays { get; set; }

    public int RenewalCount { get; set; }

    public int MaxRenewalTimes { get; set; }

    public int RemainingRenewals => Math.Max(0, MaxRenewalTimes - RenewalCount);

    public string Message { get; set; } = string.Empty;

    public List<BorrowItemDto> Items { get; set; } = new();
}
