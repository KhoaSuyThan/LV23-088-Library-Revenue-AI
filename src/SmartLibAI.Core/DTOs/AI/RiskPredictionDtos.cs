namespace SmartLibAI.Core.DTOs.AI;

/// <summary>
/// DTO chứa các thông tin đặc trưng đầu vào để mô hình AI đánh giá rủi ro mượn sách.
/// </summary>
public class ReaderRiskInputDto
{
    public string Faculty { get; set; } = string.Empty;
    public string MemberType { get; set; } = string.Empty;
    public int CreditScore { get; set; } = 100;
    public int CurrentHoldingBooks { get; set; }
    public int HistoricalOverdueCount { get; set; }
    public int BorrowDurationDays { get; set; } = 14;
    public decimal TotalCurrentDebt { get; set; }
    public bool IsExamSeason { get; set; }
}

/// <summary>
/// DTO kết quả đánh giá rủi ro từ mô hình AI ONNX.
/// </summary>
public class RiskEvaluationResultDto
{
    /// <summary>
    /// Điểm rủi ro từ 0.00 đến 1.00 (xác suất trễ hạn)
    /// </summary>
    public decimal RiskScore { get; set; }

    /// <summary>
    /// Phân loại cấp độ rủi ro: Low, Medium, High
    /// </summary>
    public string RiskTier { get; set; } = "Low";

    /// <summary>
    /// Màu badge giao diện: success, warning, danger
    /// </summary>
    public string BadgeColor { get; set; } = "success";

    /// <summary>
    /// Hành động khuyến nghị cho thủ thư
    /// </summary>
    public string SuggestedAction { get; set; } = string.Empty;

    /// <summary>
    /// Cờ đánh dấu kết quả được suy luận từ Heuristic Fallback (true) hay từ Mô hình máy học ONNX (false).
    /// </summary>
    public bool IsHeuristicFallback { get; set; }

    /// <summary>
    /// Nguồn suy luận dự báo: "ONNX_Model" hoặc "Heuristic_Fallback".
    /// </summary>
    public string PredictionSource { get; set; } = "ONNX_Model";

    /// <summary>
    /// Thời điểm dự đoán
    /// </summary>
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
}
