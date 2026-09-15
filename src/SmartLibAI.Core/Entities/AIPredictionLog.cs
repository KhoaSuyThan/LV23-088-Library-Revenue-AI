namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho nhật ký phân tích rủi ro trễ hạn/mất sách do mô hình AI dự báo.
/// </summary>
public class AIPredictionLog
{
    public int LogID { get; set; }

    public int BorrowingID { get; set; }

    public decimal RiskScore { get; set; } // Thang điểm rủi ro 0.00 -> 100.00

    public string? SuggestedAction { get; set; }

    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Borrowing Borrowing { get; set; } = null!;
}
