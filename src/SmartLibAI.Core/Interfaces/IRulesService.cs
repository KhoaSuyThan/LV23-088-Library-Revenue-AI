using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Rules;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ cấu hình quy định mượn trả & mức phạt (LOLRA-72).
/// </summary>
public interface IRulesService
{
    Task<ApiResponse<SystemRulesDto>> GetRulesAsync();
    Task<ApiResponse<SystemRulesDto>> UpdateRulesAsync(UpdateRulesRequestDto request, string? username = null, string? ipAddress = null);
    Task<ApiResponse<SystemRulesDto>> ResetDefaultRulesAsync(string? username = null, string? ipAddress = null);
    Task<ApiResponse<List<WaiverReasonDto>>> GetWaiverReasonsAsync();
    Task<ApiResponse<List<RuleAuditLogDto>>> GetAuditHistoryAsync();
    Task<ApiResponse<AiRetrainResponseDto>> RetrainAiModelAsync();
}
