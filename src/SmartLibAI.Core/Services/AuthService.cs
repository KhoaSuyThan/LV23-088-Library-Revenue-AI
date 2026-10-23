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
    /// Thực hiện xác thực đăng nhập người dùng bằng Email hoặc Username và Password.
    /// </summary>
    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request)
    {
        // 1. Tìm tài khoản người dùng theo Email hoặc Username
        var identifier = request.GetIdentifier();
        var users = await _userRepository.FindAsync(u => u.Username == identifier || (u.Email != null && u.Email == identifier));
        var user = users.FirstOrDefault();

        // Kiểm tra tài khoản tồn tại
        if (user == null)
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Email hoặc mật khẩu không chính xác");
        }

        // 2. Kiểm tra trạng thái tài khoản: IsActive = false -> Đã bị khóa
        if (!user.IsActive)
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Tài khoản đã bị khóa hoặc ngừng hoạt động");
        }

        // 3. Xác thực mật khẩu thông qua thư viện BCrypt
        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Email hoặc mật khẩu không chính xác");
        }

        // 4. Lấy thông tin Role để gán quyền vào claims
        var role = await _roleRepository.GetByIdAsync(user.RoleID);
        string roleName = role?.RoleName ?? "Reader";

        // 5. Kiểm tra phân quyền RBAC: Chặn tài khoản Độc giả (Reader) truy cập portal quản trị
        if (string.Equals(roleName, "Reader", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<AuthResponseDto>.ErrorResult("Tài khoản bạn đọc không có quyền truy cập Cổng quản trị. Vui lòng sử dụng Cổng bạn đọc.");
        }

        // 6. Sinh JWT Token có chứa đầy đủ claims (sub/nameid, email, role, exp)
        string token = GenerateToken(user, roleName);

        var durationInHours = Convert.ToDouble(
            _configuration["JwtSettings:ExpiryHours"] 
            ?? _configuration["JwtSettings:DurationInHours"] 
            ?? "8");
        var expiresAt = DateTime.UtcNow.AddHours(durationInHours);

        var responseData = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = expiresAt,
            UserID = user.UserID,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = roleName
        };

        return ApiResponse<AuthResponseDto>.SuccessResult(responseData, "Đăng nhập thành công");
    }

    /// <summary>
    /// Khởi tạo JWT Token với secret key từ cấu hình appsettings.
    /// </summary>
    public string GenerateToken(User user, string roleName)
    {
        var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
            ?? _configuration["JWT_SECRET_KEY"]
            ?? _configuration["JwtSettings:Key"]
            ?? _configuration["JwtSettings:SecretKey"]
            ?? "SmartLibAI_Super_Secret_Key_For_Jwt_2026_DotNet10";
        var issuer = _configuration["JwtSettings:Issuer"] ?? "SmartLibAI";
        var audience = _configuration["JwtSettings:Audience"] ?? "SmartLibAIUser";
        var durationInHours = Convert.ToDouble(
            _configuration["JwtSettings:ExpiryHours"] 
            ?? _configuration["JwtSettings:DurationInHours"] 
            ?? "8");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // Khởi tạo các Claims định danh chuẩn hóa theo tiêu chí kiểm tra JWT Token
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
            new Claim("nameid", user.UserID.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("username", user.Username),
            new Claim("FullName", user.FullName),
            new Claim(ClaimTypes.Role, roleName),
            new Claim("role", roleName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (!string.IsNullOrEmpty(user.Email))
        {
            claims.Add(new Claim(ClaimTypes.Email, user.Email));
            claims.Add(new Claim("email", user.Email));
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

    /// <summary>
    /// Cập nhật thông tin họ tên và mật khẩu của người dùng hiện tại (bảo toàn Email đăng nhập).
    /// </summary>
    public async Task<ApiResponse<UserProfileDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return ApiResponse<UserProfileDto>.ErrorResult("Không tìm thấy thông tin tài khoản người dùng");
        }

        // 1. Cập nhật Họ và tên nếu có
        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        // 2. Xử lý đổi mật khẩu nếu người dùng yêu cầu
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return ApiResponse<UserProfileDto>.ErrorResult("Vui lòng nhập mật khẩu hiện tại để xác thực đổi mật khẩu");
            }

            bool isCurrentValid = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash);
            if (!isCurrentValid)
            {
                return ApiResponse<UserProfileDto>.ErrorResult("Mật khẩu hiện tại không chính xác");
            }

            if (request.NewPassword.Length < 6)
            {
                return ApiResponse<UserProfileDto>.ErrorResult("Mật khẩu mới phải có ít nhất 6 ký tự");
            }

            // Mã hóa mật khẩu mới bằng BCrypt an toàn
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        }

        // 3. Lưu cập nhật vào CSDL
        await _userRepository.UpdateAsync(user);

        // Nạp thông tin vai trò
        var role = await _roleRepository.GetByIdAsync(user.RoleID);
        string roleName = role?.RoleName ?? "Staff";

        var profileDto = new UserProfileDto
        {
            UserID = user.UserID,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email ?? string.Empty,
            Role = roleName
        };

        return ApiResponse<UserProfileDto>.SuccessResult(profileDto, "Cập nhật thông tin hồ sơ cá nhân thành công");
    }
}
