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
    /// Mức phụ thu đền bù sách mất/hỏng tính theo % giá bìa (mặc định 10%).
    /// </summary>
    public decimal DamageFeePercent { get; set; } = 10.0m;

    /// <summary>
    /// Tỷ lệ giảm trừ tiền phạt đối với độc giả có điểm rèn luyện tốt (mặc định 20%).
    /// </summary>
    public decimal ConductScoreDiscountPercent { get; set; } = 20.0m;

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public ICollection<FineReceipt> FineReceipts { get; set; } = new List<FineReceipt>();
}
