namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO yêu cầu đặt trạng thái khóa thẻ cho độc giả.
/// </summary>
public class SetLockStatusRequestDto
{
    public bool IsActive { get; set; }
}
