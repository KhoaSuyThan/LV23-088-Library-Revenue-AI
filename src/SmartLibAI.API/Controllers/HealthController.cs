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

        var healthInfo = new
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

        if (!dbHealthy)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, 
                ApiResponse<object>.ErrorResult("Cơ sở dữ liệu thư viện tạm thời mất kết nối.", new List<string> { "Database connection failed" }));
        }

        return Ok(ApiResponse<object>.SuccessResult(healthInfo, $"Hệ thống SmartLib AI Backend đang hoạt động ({overallStatus})"));
    }
}
