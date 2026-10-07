namespace SmartLibAI.Core.DTOs.Rules;

public class WaiverReasonDto
{
    public int Id { get; set; }
    public string ReasonCode { get; set; } = string.Empty;
    public string ReasonName { get; set; } = string.Empty;
    public decimal DefaultDiscountPercent { get; set; } = 100m;
    public bool IsActive { get; set; } = true;
}
