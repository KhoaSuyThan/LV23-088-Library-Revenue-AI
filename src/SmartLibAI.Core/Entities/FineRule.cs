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

    /// <summary>
    /// Hạn mức mượn tối đa cho Sinh viên (mặc định 5 cuốn).
    /// </summary>
    public int StudentBorrowLimit { get; set; } = 5;

    /// <summary>
    /// Thời hạn mượn tối đa cho Sinh viên (mặc định 14 ngày).
    /// </summary>
    public int StudentBorrowDays { get; set; } = 14;

    /// <summary>
    /// Hạn mức mượn tối đa cho Giảng viên (mặc định 10 cuốn).
    /// </summary>
    public int LecturerBorrowLimit { get; set; } = 10;

    /// <summary>
    /// Thời hạn mượn tối đa cho Giảng viên (mặc định 30 ngày).
    /// </summary>
    public int LecturerBorrowDays { get; set; } = 30;

    /// <summary>
    /// Mức phạt làm rách / hỏng sách nhẹ tính theo % giá bìa (mặc định 20%).
    /// </summary>
    public decimal DamageFeePercent { get; set; } = 20.0m;

    /// <summary>
    /// Mức phạt làm hỏng sách vừa tính theo % giá bìa (mặc định 40%).
    /// </summary>
    public decimal DamageMediumPercent { get; set; } = 40.0m;

    /// <summary>
    /// Mức phạt làm hỏng sách nặng tính theo % giá bìa (mặc định 110%).
    /// </summary>
    public decimal DamageSeverePercent { get; set; } = 110.0m;

    /// <summary>
    /// Tỷ lệ giảm trừ tiền phạt đối với độc giả có điểm rèn luyện tốt (mặc định 20%).
    /// </summary>
    public decimal ConductScoreDiscountPercent { get; set; } = 20.0m;

    public int MaxRenewalTimes { get; set; } = 1;

    public int RenewalExtraDays { get; set; } = 7;

    public decimal DebtLockAmount { get; set; } = 50000m;

    public bool AutoLockDebtThreshold { get; set; } = true;

    public int AiRiskThreshold { get; set; } = 80;

    public int AiRemindDaysBefore { get; set; } = 3;

    public bool AiAutoEmailReminder { get; set; } = true;

    public decimal CompensationFixedFee { get; set; } = 20000m;

    /// <summary>
    /// Tỷ lệ đền bù cơ bản tính theo % giá sách (mặc định 100%).
    /// </summary>
    public decimal CompensationBasePercent { get; set; } = 100.0m;

    /// <summary>
    /// Mức trần tiền phạt tối đa tính theo % giá sách (mặc định 100%).
    /// </summary>
    public decimal MaxFineCapPercent { get; set; } = 100.0m;

    /// <summary>
    /// Tỷ lệ bồi thường mất sách tính theo % giá sách (mặc định 200%).
    /// </summary>
    public decimal CompensationRatePercent { get; set; } = 200.0m;

    /// <summary>
    /// Tỷ lệ giảm trừ tiền phạt đối với điểm rèn luyện 90-99 (mặc định 10%).
    /// </summary>
    public decimal AiDiscount_90 { get; set; } = 10.0m;

    public decimal AiAccuracy { get; set; } = 84.5m;

    public string AiLastTrained { get; set; } = "10/09/2026";

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<FineReceipt> FineReceipts { get; set; } = new List<FineReceipt>();
}
