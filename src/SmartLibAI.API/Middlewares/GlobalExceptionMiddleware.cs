using System.Net;
using System.Text.Json;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.API.Middlewares;

/// <summary>
/// Middleware bắt và xử lý ngoại lệ tập trung toàn cục (Unhandled Exceptions),
/// chuẩn hóa định dạng phản hồi ApiResponse trả về cho client.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi chưa được xử lý phát sinh tại yêu cầu: {Path}", context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = ApiResponse<object>.ErrorResult(
            "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
            new List<string> { exception.Message }
        );

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var json = JsonSerializer.Serialize(response, jsonOptions);
        await context.Response.WriteAsync(json);
    }
}
