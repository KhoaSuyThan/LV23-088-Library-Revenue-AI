using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Auth;

/// <summary>
/// DTO chứa thông tin yêu cầu đăng nhập từ phía client.
/// </summary>
public class LoginRequestDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    public string Password { get; set; } = string.Empty;
}
