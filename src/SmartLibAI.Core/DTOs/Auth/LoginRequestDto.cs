using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Auth;

/// <summary>
/// DTO chứa thông tin yêu cầu đăng nhập từ phía client (hỗ trợ cả Email hoặc Username).
/// </summary>
public class LoginRequestDto : IValidatableObject
{
    /// <summary>
    /// Địa chỉ email tài khoản (dùng cho Swagger checklist hoặc client gửi email).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Tên đăng nhập của tài khoản.
    /// </summary>
    public string? Username { get; set; }

    [Required(ErrorMessage = "Mật khẩu không được để trống")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// Lấy định danh tài khoản (ưu tiên Email nếu có, fallback về Username).
    /// </summary>
    public string GetIdentifier()
    {
        if (!string.IsNullOrWhiteSpace(Email))
            return Email.Trim();
        return (Username ?? string.Empty).Trim();
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Email) && string.IsNullOrWhiteSpace(Username))
        {
            yield return new ValidationResult("Vui lòng cung cấp Email hoặc Tên đăng nhập", new[] { nameof(Email), nameof(Username) });
        }
    }
}
