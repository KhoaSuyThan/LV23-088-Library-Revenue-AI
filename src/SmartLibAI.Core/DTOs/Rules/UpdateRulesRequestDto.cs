using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Rules;

/// <summary>
/// DTO tiếp nhận dữ liệu cập nhật quy định thư viện từ giao diện Settings (Story LOLRA-72 / L0LRA-79).
/// </summary>
public class UpdateRulesRequestDto
{
    // Cột 1: Lưu thông & Mức phạt
    [Range(1, 365, ErrorMessage = "Thời hạn mượn của sinh viên phải từ 1 đến 365 ngày.")]
    public int? BorrowDays_Student { get; set; }

    [Range(1, 365, ErrorMessage = "Thời hạn mượn của giảng viên phải từ 1 đến 365 ngày.")]
    public int? BorrowDays_Teacher { get; set; }

    [Range(1, 50, ErrorMessage = "Số sách tối đa được mượn cùng lúc phải từ 1 đến 50 cuốn.")]
    public int? BorrowLimit_MaxTogether { get; set; }

    [Range(1, 50, ErrorMessage = "Hạn mức mượn của sinh viên phải từ 1 đến 50 cuốn.")]
    public int? BorrowLimit_Student { get; set; }

    [Range(1, 50, ErrorMessage = "Hạn mức mượn của giảng viên phải từ 1 đến 50 cuốn.")]
    public int? BorrowLimit_Teacher { get; set; }

    [Range(0, 10, ErrorMessage = "Số lần gia hạn tối đa phải từ 0 đến 10 lần.")]
    public int? MaxRenewalTimes { get; set; }

    [Range(1, 90, ErrorMessage = "Số ngày gia hạn thêm phải từ 1 đến 90 ngày.")]
    public int RenewalExtraDays { get; set; } = 7;

    [Range(0, 1000000, ErrorMessage = "Mức phí phạt trễ hạn theo ngày không được âm và tối đa 1.000.000 VNĐ.")]
    public decimal? FinePerDay { get; set; }

    [Range(0, 500, ErrorMessage = "Tỷ lệ phụ thu đền bù sách mất/hỏng phải từ 0% đến 500%.")]
    public decimal? DamagePenaltyPercent { get; set; }

    [Range(0, 500, ErrorMessage = "Tỷ lệ đền bù hư hỏng vừa phải từ 0% đến 500%.")]
    public decimal? DamageMediumPercent { get; set; }

    [Range(0, 500, ErrorMessage = "Tỷ lệ đền bù hư hỏng nặng phải từ 0% đến 500%.")]
    public decimal? DamageSeverePercent { get; set; }

    [Range(0, 500, ErrorMessage = "Tỷ lệ đền bù cơ bản phải từ 0% đến 500%.")]
    public decimal? CompensationBasePercent { get; set; }

    [Range(0, 10000000, ErrorMessage = "Phí xử lý đền bù không được âm và tối đa 10.000.000 VNĐ.")]
    public decimal? CompensationFixedFee { get; set; }

    public bool? AutoLockDebtThreshold { get; set; }

    [Range(0, 100000000, ErrorMessage = "Ngưỡng nợ phạt khóa quyền mượn không được âm và tối đa 100.000.000 VNĐ.")]
    public decimal? DebtLockAmount { get; set; }

    // Cột 2: Cấu hình AI Early Warning
    [Range(1, 100, ErrorMessage = "Ngưỡng kích hoạt rủi ro AI phải từ 1% đến 100%.")]
    public int? AiRiskThreshold { get; set; }

    [Range(1, 30, ErrorMessage = "Số ngày gửi nhắc nhở trước hạn AI phải từ 1 đến 30 ngày.")]
    public int? AiRemindDaysBefore { get; set; }

    public bool? AiAutoEmailReminder { get; set; }

    // Chiết khấu AI & Miễn giảm
    [Range(0, 500, ErrorMessage = "Mức trần tiền phạt tối đa phải từ 0% đến 500%.")]
    public decimal? MaxFineCapPercent { get; set; }

    [Range(0, 500, ErrorMessage = "Tỷ lệ bồi thường mất sách phải từ 0% đến 500%.")]
    public decimal? CompensationRatePercent { get; set; }

    [Range(0, 100, ErrorMessage = "Tỷ lệ giảm trừ điểm tín nhiệm 90 phải từ 0% đến 100%.")]
    public decimal? AiDiscount_90 { get; set; }

    [Range(0, 100, ErrorMessage = "Tỷ lệ giảm trừ điểm tín nhiệm 100 phải từ 0% đến 100%.")]
    public decimal? AiDiscount_100 { get; set; }
}
