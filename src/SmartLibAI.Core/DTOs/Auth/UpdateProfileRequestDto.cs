namespace SmartLibAI.Core.DTOs.Auth;

/// <summary>
/// DTO chứa thông tin cập nhật hồ sơ cá nhân và đổi mật khẩu từ người dùng.
/// </summary>
public class UpdateProfileRequestDto
{
    /// <summary>
    /// Họ và tên mới của người dùng (bắt buộc).
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Mật khẩu hiện tại (chỉ bắt buộc nếu người dùng muốn đổi mật khẩu mới).
    /// </summary>
    public string? CurrentPassword { get; set; }

    /// <summary>
    /// Mật khẩu mới cần thiết lập.
    /// </summary>
    public string? NewPassword { get; set; }
}
