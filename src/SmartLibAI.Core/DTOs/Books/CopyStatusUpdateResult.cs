namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// Mã phân loại lỗi khi cập nhật trạng thái bản sao sách độc lập (P0).
/// </summary>
public enum CopyStatusUpdateError
{
    None = 0,
    NotFound = 1,
    ManualBorrowedNotAllowed = 2,
    ActiveBorrowExists = 3,
    InvalidStatus = 4
}

/// <summary>
/// Kết quả nghiệp vụ cập nhật trạng thái bản sao có kiểu lỗi rõ ràng thay vì dò chuỗi.
/// </summary>
public class CopyStatusUpdateResult
{
    public bool Success { get; set; }
    public CopyStatusUpdateError ErrorCode { get; set; } = CopyStatusUpdateError.None;
    public string? ErrorMessage { get; set; }

    public static CopyStatusUpdateResult Ok() => new() { Success = true };

    public static CopyStatusUpdateResult Fail(CopyStatusUpdateError code, string message) => new()
    {
        Success = false,
        ErrorCode = code,
        ErrorMessage = message
    };
}
