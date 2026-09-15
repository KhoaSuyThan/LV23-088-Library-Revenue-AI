namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho quy định phạt do trễ hạn hoặc làm hỏng/mất sách.
/// </summary>
public class FineRule
{
    public int RuleID { get; set; }

    public string RuleName { get; set; } = string.Empty;

    public decimal FinePerDay { get; set; } = 5000m;

    public decimal DamageMultiplier { get; set; } = 1.0m;

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<FineReceipt> FineReceipts { get; set; } = new List<FineReceipt>();
}
