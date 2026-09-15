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
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var username = User.FindFirstValue(ClaimTypes.Name);
        var fullName = User.FindFirstValue("FullName");
        var role = User.FindFirstValue(ClaimTypes.Role);
        var email = User.FindFirstValue(ClaimTypes.Email);

        var profile = new
        {
            UserID = userId,
            Username = username,
            FullName = fullName,
            Role = role,
            Email = email
        };

        return Ok(ApiResponse<object>.SuccessResult(profile, "Lấy thông tin tài khoản thành công"));
    }
}
