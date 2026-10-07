namespace SmartLibAI.Core.DTOs.Rules;

public class RuleAuditLogDto
{
    public int Id { get; set; }
    public string RuleKey { get; set; } = string.Empty;
    public string RuleName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public string ChangedAt { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
}
