namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// Yếu tố giải thích nguy cơ trễ hạn từ mô hình AI hoặc lịch sử mượn trả.
/// </summary>
public class AiRiskFactorDto
{
    public string Label { get; set; } = string.Empty;
    public string Weight { get; set; } = string.Empty;
}

/// <summary>
/// DTO đại diện cho một độc giả có nguy cơ trễ hạn cao do AI đánh giá (phục vụ Tab AI Dự báo trên màn hình Thu phạt).
/// </summary>
public class AiForecastReaderDto
{
    public int BorrowingId { get; set; }

    /// <summary>
    /// Mã phiếu mượn chuẩn hóa (ví dụ: PM-0001).
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Họ tên độc giả.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Mã bạn đọc / MSSV (ví dụ: DEMO0001).
    /// </summary>
    public string StudentCode { get; set; } = string.Empty;

    /// <summary>
    /// Khoa / Viện của độc giả.
    /// </summary>
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// Tên cuốn sách đang mượn.
    /// </summary>
    public string BookTitle { get; set; } = string.Empty;

    /// <summary>
    /// Mã vạch Barcode của cuốn sách.
    /// </summary>
    public string BookCode { get; set; } = string.Empty;

    /// <summary>
    /// Ngày đến hạn trả sách (định dạng dd/MM/yyyy).
    /// </summary>
    public string DueDate { get; set; } = string.Empty;

    /// <summary>
    /// Điểm rủi ro AI (0 - 100).
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Màu sắc thanh trạng thái rủi ro.
    /// </summary>
    public string ScoreColor { get; set; } = "#ef4444";

    /// <summary>
    /// Phân loại rủi ro ('very_high', 'high', 'medium', 'low').
    /// </summary>
    public string RiskLevel { get; set; } = "very_high";

    /// <summary>
    /// Nhãn hiển thị cấp độ rủi ro.
    /// </summary>
    public string RiskLabel { get; set; } = "Nguy cơ rất cao";

    /// <summary>
    /// Đề xuất hành động từ AI.
    /// </summary>
    public string SuggestedAction { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách yếu tố giải thích điểm rủi ro AI.
    /// </summary>
    public List<AiRiskFactorDto> Factors { get; set; } = new();

    /// <summary>
    /// Trạng thái đã gửi thông báo nhắc nhở hay chưa.
    /// </summary>
    public bool ReminderSent { get; set; } = false;

    /// <summary>
    /// Mức phạt ước tính mỗi ngày trễ hạn.
    /// </summary>
    public string EstimatedDailyFine { get; set; } = "5.000 đ/ngày";
}
