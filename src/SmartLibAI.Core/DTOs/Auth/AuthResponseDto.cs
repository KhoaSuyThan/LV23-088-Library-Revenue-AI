namespace SmartLibAI.Core.DTOs.Auth;

/// <summary>
/// DTO trả về kết quả đăng nhập thành công kèm JWT Token và thông tin tài khoản cơ bản.
/// </summary>
public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public int UserID { get; set; }

    public string Username { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}
