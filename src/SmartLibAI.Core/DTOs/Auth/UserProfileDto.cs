namespace SmartLibAI.Core.DTOs.Auth;

/// <summary>
/// DTO trả về thông tin hồ sơ người dùng hiện tại từ phiên đăng nhập JWT.
/// </summary>
public class UserProfileDto
{
    public int UserID { get; set; }

    public string Username { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}
