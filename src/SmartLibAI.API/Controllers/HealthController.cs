using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller kiểm tra tình trạng sống (Health Check) của hệ sinh thái SmartLib AI API.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult CheckHealth()
    {
        var healthInfo = new
        {
            Status = "Healthy",
            Project = "SmartLib AI",
            Version = "1.0.0",
            TargetPlatform = ".NET 10 (net10.0)",
            Timestamp = DateTime.UtcNow
        };

        return Ok(ApiResponse<object>.SuccessResult(healthInfo, "Hệ thống SmartLib AI Backend đang hoạt động ổn định"));
    }
}
