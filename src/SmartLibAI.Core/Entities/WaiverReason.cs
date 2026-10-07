namespace SmartLibAI.Core.Entities;

/// <summary>
/// Danh mục lý do miễn giảm thủ công tiền phạt vi phạm.
/// </summary>
public class WaiverReason
{
    public int Id { get; set; }

    public string ReasonCode { get; set; } = string.Empty;

    public string ReasonName { get; set; } = string.Empty;

    public decimal DefaultDiscountPercent { get; set; } = 100m;

    public bool IsActive { get; set; } = true;
}
