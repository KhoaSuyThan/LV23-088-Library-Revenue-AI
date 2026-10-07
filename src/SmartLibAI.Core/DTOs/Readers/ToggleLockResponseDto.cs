namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO phản hồi kết quả thao tác Khóa / Mở khóa thẻ độc giả.
/// </summary>
public class ToggleLockResponseDto
{
    public int ReaderID { get; set; }

    public int UserID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public string Status => IsActive ? "active" : "locked";

    public string Message { get; set; } = string.Empty;
}
