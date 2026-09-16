using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Auth;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller xử lý xác thực, cấp token và hồ sơ phiên đăng nhập người dùng.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Đăng nhập tài khoản hệ thống và nhận JWT Token.
    /// </summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<AuthResponseDto>.ErrorResult("Dữ liệu đầu vào không hợp lệ", errors));
        }

        var result = await _authService.LoginAsync(request);
        if (!result.Success)
        {
            // Nếu tài khoản bị khóa, trả về mã HTTP 403 Forbidden theo tiêu chí kiểm thử
            if (result.Message.Contains("khóa", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, result);
            }

            // Nếu sai tài khoản hoặc mật khẩu, trả về 401 Unauthorized
            return Unauthorized(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đăng xuất khỏi hệ thống (hủy token ở phía client).
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        // Trong kiến trúc JWT Stateless, việc hủy token chủ yếu diễn ra tại client (xóa localStorage/Cookie).
        return Ok(ApiResponse<string>.SuccessResult("Đăng xuất thành công", "Phiên làm việc đã kết thúc"));
    }

    /// <summary>
    /// Lấy thông tin cá nhân của người dùng hiện tại từ Claims trong JWT Token.
    /// </summary>
    [HttpGet("profile")]
    [Authorize]
    public IActionResult GetProfile()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
            ?? User.FindFirstValue("sub") 
            ?? User.FindFirstValue("nameid");
        int.TryParse(userIdStr, out int userId);

        var username = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("username") ?? string.Empty;
        var fullName = User.FindFirstValue("FullName") ?? string.Empty;
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email") ?? string.Empty;

        var profile = new UserProfileDto
        {
            UserID = userId,
            Username = username,
            FullName = fullName,
            Role = role,
            Email = email
        };

        return Ok(ApiResponse<UserProfileDto>.SuccessResult(profile, "Lấy thông tin tài khoản thành công"));
    }
}
