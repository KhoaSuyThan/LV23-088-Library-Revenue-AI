namespace SmartLibAI.Core.DTOs.Rules;

/// <summary>
/// DTO chứa toàn bộ cấu hình quy định thư viện và tham số AI phục vụ màn hình Settings.
/// </summary>
public class SystemRulesDto
{
    // Quy định lưu thông
    public int BorrowDays_Student { get; set; } = 14;
    public int BorrowDays_Teacher { get; set; } = 30;
    public int BorrowLimit_MaxTogether { get; set; } = 5;
    public int BorrowLimit_Student { get; set; } = 5;
    public int BorrowLimit_Teacher { get; set; } = 10;
    public int MaxRenewalTimes { get; set; } = 1;
    public int RenewalExtraDays { get; set; } = 7;

    // Biểu phí phạt vi phạm
    public decimal FinePerDay { get; set; } = 2000m;
    public decimal DamagePenaltyPercent { get; set; } = 30m;
    public decimal DamageMediumPercent { get; set; } = 40m;
    public decimal DamageSeverePercent { get; set; } = 110m;
    public decimal CompensationBasePercent { get; set; } = 110m;
    public decimal CompensationFixedFee { get; set; } = 0m;
    public bool AutoLockDebtThreshold { get; set; } = true;
    public decimal DebtLockAmount { get; set; } = 50000m;

    // Tham số AI Early Warning
    public int AiRiskThreshold { get; set; } = 80;
    public int AiRemindDaysBefore { get; set; } = 3;
    public bool AiAutoEmailReminder { get; set; } = true;

    // Thông tin mô hình AI
    public string AiModelName { get; set; } = "Random Forest Classifier";
    public decimal AiAccuracy { get; set; } = 84.5m;
    public string AiLastTrained { get; set; } = "10/09/2026";
    public bool AiModelActive { get; set; } = true;

    // Chiết khấu AI & Miễn giảm
    public decimal MaxFineCapPercent { get; set; } = 100m;
    public decimal CompensationRatePercent { get; set; } = 200m;
    public decimal AiDiscount_90 { get; set; } = 10m;
    public decimal AiDiscount_100 { get; set; } = 20m;
}
