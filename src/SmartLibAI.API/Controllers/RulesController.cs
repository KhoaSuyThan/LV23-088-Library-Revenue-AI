using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Rules;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.API.Controllers;

/// <summary>
/// Controller quản lý cấu hình quy định thư viện & tham số mô hình AI (Story LOLRA-72 / L0LRA-79 - US-03).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class RulesController : ControllerBase
{
    private readonly IRulesService _rulesService;

    public RulesController(IRulesService rulesService)
    {
        _rulesService = rulesService;
    }

    /// <summary>
    /// Lấy toàn bộ cấu hình quy định hiện hành của thư viện và AI (GET /api/rules).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<SystemRulesDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRules()
    {
        var result = await _rulesService.GetRulesAsync();
        return Ok(result);
    }

    /// <summary>
    /// Cập nhật cấu hình quy định mượn trả & biểu phí phạt (PUT /api/rules hoặc POST /api/rules).
    /// Áp dụng ngay cho toàn bộ các giao dịch mượn/trả tiếp theo trên hệ thống.
    /// </summary>
    [HttpPut]
    [HttpPost]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(ApiResponse<SystemRulesDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<SystemRulesDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> UpdateRules([FromBody] UpdateRulesRequestDto request)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<SystemRulesDto>.ErrorResult("Dữ liệu cấu hình không hợp lệ", errors));
        }

        var username = User.FindFirst("FullName")?.Value 
            ?? User.Identity?.Name 
            ?? User.FindFirst(ClaimTypes.Name)?.Value 
            ?? User.FindFirst("unique_name")?.Value 
            ?? User.FindFirst(ClaimTypes.Email)?.Value
            ?? "Thủ thư (Admin)";

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrWhiteSpace(ipAddress) || ipAddress == "::1")
        {
            ipAddress = "127.0.0.1";
        }

        var result = await _rulesService.UpdateRulesAsync(request, username, ipAddress);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Khôi phục toàn bộ cấu hình quy định về mặc định chuẩn của hệ thống (POST /api/rules/reset-defaults).
    /// </summary>
    [HttpPost("reset-defaults")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(ApiResponse<SystemRulesDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ResetDefaultRules()
    {
        var username = User.FindFirst("FullName")?.Value 
            ?? User.Identity?.Name 
            ?? User.FindFirst(ClaimTypes.Name)?.Value 
            ?? "Thủ thư (Admin)";

        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrWhiteSpace(ipAddress) || ipAddress == "::1")
        {
            ipAddress = "127.0.0.1";
        }

        var result = await _rulesService.ResetDefaultRulesAsync(username, ipAddress);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh mục các lý do miễn giảm tiền phạt thủ công (GET /api/rules/waivers).
    /// </summary>
    [HttpGet("waivers")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<WaiverReasonDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWaiverReasons()
    {
        var result = await _rulesService.GetWaiverReasonsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Thêm lý do miễn giảm tiền phạt thủ công mới (POST /api/rules/waivers - Ảnh 22).
    /// </summary>
    [HttpPost("waivers")]
    [ProducesResponseType(typeof(ApiResponse<WaiverReasonDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> AddWaiverReason([FromBody] WaiverReasonDto dto)
    {
        var result = await _rulesService.AddWaiverReasonAsync(dto);
        if (!result.Success)
        {
            return BadRequest(result);
        }
        return Ok(result);
    }

    /// <summary>
    /// Lấy nhật ký kiểm toán ghi nhận lịch sử thay đổi cấu hình quy định (GET /api/rules/history).
    /// </summary>
    [HttpGet("history")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<RuleAuditLogDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditHistory()
    {
        var result = await _rulesService.GetAuditHistoryAsync();
        return Ok(result);
    }

    /// <summary>
    /// Kích hoạt tiến trình huấn luyện lại mô hình AI dự báo rủi ro trễ hạn (POST /api/ai/retrain).
    /// </summary>
    [HttpPost("/api/ai/retrain")]
    [Authorize(Roles = "Admin,Staff")]
    [ProducesResponseType(typeof(ApiResponse<AiRetrainResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> RetrainAiModel()
    {
        var result = await _rulesService.RetrainAiModelAsync();
        return Ok(result);
    }
}
