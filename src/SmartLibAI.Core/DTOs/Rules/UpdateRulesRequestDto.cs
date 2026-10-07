namespace SmartLibAI.Core.DTOs.Rules;

/// <summary>
/// DTO tiếp nhận dữ liệu cập nhật quy định thư viện từ giao diện Settings (Story LOLRA-72).
/// </summary>
public class UpdateRulesRequestDto
{
    // Cột 1: Lưu thông & Mức phạt
    public int? BorrowDays_Student { get; set; }
    public int? BorrowDays_Teacher { get; set; }
    public int? BorrowLimit_MaxTogether { get; set; }
    public int? BorrowLimit_Student { get; set; }
    public int? BorrowLimit_Teacher { get; set; }
    public int? MaxRenewalTimes { get; set; }
    public int RenewalExtraDays { get; set; } = 7;

    public decimal? FinePerDay { get; set; }
    public decimal? DamagePenaltyPercent { get; set; }
    public decimal? CompensationBasePercent { get; set; }
    public decimal? CompensationFixedFee { get; set; }
    public bool? AutoLockDebtThreshold { get; set; }
    public decimal? DebtLockAmount { get; set; }

    // Cột 2: Cấu hình AI Early Warning
    public int? AiRiskThreshold { get; set; }
    public int? AiRemindDaysBefore { get; set; }
    public bool? AiAutoEmailReminder { get; set; }

    // Chiết khấu AI & Miễn giảm
    public decimal? MaxFineCapPercent { get; set; }
    public decimal? CompensationRatePercent { get; set; }
    public decimal? AiDiscount_90 { get; set; }
    public decimal? AiDiscount_100 { get; set; }
}
