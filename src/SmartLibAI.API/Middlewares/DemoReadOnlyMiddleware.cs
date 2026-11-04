using System.Text.Json;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.API.Middlewares;

/// <summary>
/// Middleware bảo vệ hệ thống ở Chế độ Demo (Read-only Demo Mode).
/// Chặn tất cả các thao tác thay đổi dữ liệu (POST, PUT, DELETE, PATCH) từ tài khoản demo,
/// đảm bảo dữ liệu mẫu của thư viện không bị sửa xóa khi người lạ vào trải nghiệm.
/// </summary>
public class DemoReadOnlyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<DemoReadOnlyMiddleware> _logger;

    public DemoReadOnlyMiddleware(RequestDelegate next, ILogger<DemoReadOnlyMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 1. Kiểm tra người dùng đã xác thực JWT hợp lệ chưa
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var username = context.User.Identity.Name 
                ?? context.User.FindFirst("username")?.Value 
                ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;

            // 2. Nhận diện tài khoản Demo
            if (string.Equals(username, "demo", StringComparison.OrdinalIgnoreCase))
            {
                var method = context.Request.Method;
                var isModifyingMethod = HttpMethods.IsPost(method) ||
                                        HttpMethods.IsPut(method) ||
                                        HttpMethods.IsDelete(method) ||
                                        HttpMethods.IsPatch(method);

                if (isModifyingMethod)
                {
                    var path = context.Request.Path.Value?.ToLowerInvariant() ?? string.Empty;

                    // Ngoại lệ: Cho phép Logout và Login thông thường
                    var isWhitelisted = path.EndsWith("/api/auth/logout") || path.EndsWith("/api/auth/login");

                    if (!isWhitelisted)
                    {
                        _logger.LogWarning("SmartLib AI: Chặn thao tác ghi dữ liệu từ tài khoản Demo: {Method} {Path}", method, context.Request.Path);

                        context.Response.ContentType = "application/json; charset=utf-8";
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;

                        var response = ApiResponse<object>.ErrorResult(
                            "Chế độ Demo chỉ hỗ trợ xem và trải nghiệm tính năng. Các thao tác thêm, sửa hoặc xóa dữ liệu đã bị khóa an toàn để bảo vệ hệ thống.",
                            new List<string> { "Tài khoản Demo đang ở chế độ Chỉ đọc (Read-only)." }
                        );

                        var jsonOptions = new JsonSerializerOptions
                        {
                            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                        };

                        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
                        return;
                    }
                }
            }
        }

        await _next(context);
    }
}
