using SmartLibAI.Core.DTOs.Auth;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện xử lý nghiệp vụ xác thực người dùng và cấp phát JWT Token.
/// </summary>
public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request);

    string GenerateToken(User user, string roleName);
}
