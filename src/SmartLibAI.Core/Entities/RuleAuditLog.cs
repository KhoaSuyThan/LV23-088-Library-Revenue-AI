namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho nhật ký kiểm toán ghi nhận mọi thay đổi cấu hình quy định thư viện.
/// </summary>
public class RuleAuditLog
{
    public int Id { get; set; }

    public string RuleKey { get; set; } = string.Empty;

    public string RuleName { get; set; } = string.Empty;

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    public string ChangedBy { get; set; } = "Thủ thư (Admin)";

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public string? IpAddress { get; set; }
}
