using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller kiểm tra tình trạng sống (Health Check) của hệ sinh thái SmartLib AI API.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly SmartLibDbContext _dbContext;
    private readonly IAIPredictionService _aiService;

    public HealthController(SmartLibDbContext dbContext, IAIPredictionService aiService)
    {
        _dbContext = dbContext;
        _aiService = aiService;
    }

    [HttpGet]
    public async Task<IActionResult> CheckHealth()
    {
        bool dbHealthy = false;
        try
        {
            dbHealthy = await _dbContext.Database.CanConnectAsync();
        }
        catch
        {
            dbHealthy = false;
        }

        var isAiLoaded = _aiService.IsModelLoaded;
        var overallStatus = (!dbHealthy) ? "Unhealthy" : (isAiLoaded ? "Healthy" : "Degraded");

        if (!dbHealthy)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, 
                ApiResponse<object>.ErrorResult("Dịch vụ tạm thời không khả dụng.", new List<string> { "Service unavailable" }));
        }

        // Nếu là Thủ thư/Admin đã đăng nhập: Cung cấp đầy đủ báo cáo chẩn đoán CSDL và AI
        if (User.Identity?.IsAuthenticated == true && (User.IsInRole("Admin") || User.IsInRole("Staff")))
        {
            var diagnosticInfo = new
            {
                Status = overallStatus,
                Project = "SmartLib AI",
                Version = "1.0.0",
                TargetPlatform = ".NET 10 (net10.0)",
                Database = new
                {
                    Connected = dbHealthy,
                    Status = dbHealthy ? "Online" : "Disconnected"
                },
                AI = new
                {
                    ModelLoaded = isAiLoaded,
                    InferenceEngine = _aiService.ModelStatus,
                    Mode = isAiLoaded ? "Machine Learning (ONNX Runtime)" : "Heuristic Rule Fallback"
                },
                Timestamp = DateTime.UtcNow
            };
            return Ok(ApiResponse<object>.SuccessResult(diagnosticInfo, $"Báo cáo chẩn đoán hệ thống ({overallStatus})"));
        }

        // Đối với probe công khai không có token: Chỉ trả về trạng thái tối thiểu, không lộ thông tin hạ tầng
        var minimalInfo = new
        {
            Status = overallStatus,
            Timestamp = DateTime.UtcNow
        };
        return Ok(ApiResponse<object>.SuccessResult(minimalInfo, "SmartLib AI API is active"));
    }
}
