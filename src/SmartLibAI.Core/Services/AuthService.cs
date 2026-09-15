using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SmartLibAI.Core.DTOs.Auth;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý đăng nhập, kiểm tra mật khẩu mã hóa BCrypt và khởi tạo JWT Token.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IConfiguration _configuration;

    public AuthService(
        IGenericRepository<User> userRepository,
        IGenericRepository<Role> roleRepository,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _roleRepository = roleRepository;
        _configuration = configuration;
    }

    /// <summary>
    /// Thực hiện xác thực đăng nhập người dùng bằng Username và Password.
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request)
    {
        // 1. Tìm tài khoản người dùng theo username
        var users = await _userRepository.FindAsync(u => u.Username == request.Username.Trim());
        var user = users.FirstOrDefault();

        if (user == null)
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Tài khoản hoặc mật khẩu không chính xác");
        }

        // 2. Xác thực mật khẩu thông qua thư viện BCrypt
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Tài khoản hoặc mật khẩu không chính xác");
        }

        // 3. Lấy thông tin Role để gán quyền vào claims
        var role = await _roleRepository.GetByIdAsync(user.RoleID);
        string roleName = role?.RoleName ?? "Reader";

        // 4. Sinh JWT Token có chứa Name, NameIdentifier và Role
        string token = GenerateToken(user, roleName);

        var durationInHours = Convert.ToDouble(_configuration["JwtSettings:DurationInHours"] ?? "8");
        var expiresAt = DateTime.UtcNow.AddHours(durationInHours);

        var responseData = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserID = user.UserID,
            Username = user.Username,
            FullName = user.FullName,
            Role = roleName
        };

        return ApiResponse<AuthResponseDto>.SuccessResult(responseData, "Đăng nhập thành công");
    }

    /// <summary>
    /// Khởi tạo JWT Token với secret key từ cấu hình appsettings.
    /// </summary>
    public string GenerateToken(User user, string roleName)
    {
        var secretKey = _configuration["JwtSettings:SecretKey"]
            ?? "SmartLibAI_Super_Secret_Key_For_Jwt_2026_DotNet10";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "SmartLibServer";
        var audience = _configuration["JwtSettings:Audience"] ?? "SmartLibClient";
        var durationInHours = Convert.ToDouble(_configuration["JwtSettings:DurationInHours"] ?? "8");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Khởi tạo các Claims định danh người dùng
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("FullName", user.FullName),
            new Claim(ClaimTypes.Role, roleName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrEmpty(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(durationInHours),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}
