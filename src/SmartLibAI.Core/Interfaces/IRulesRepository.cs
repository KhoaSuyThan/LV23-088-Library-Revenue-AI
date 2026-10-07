using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository truy xuất và cập nhật quy định thư viện, lý do miễn giảm và nhật ký kiểm toán.
/// </summary>
public interface IRulesRepository
{
    Task<FineRule?> GetActiveFineRuleAsync();
    Task<FineRule> UpdateFineRuleAsync(FineRule fineRule);
    Task<List<WaiverReason>> GetWaiverReasonsAsync();
    Task<List<RuleAuditLog>> GetAuditLogsAsync();
    Task AddAuditLogAsync(RuleAuditLog log);
}
