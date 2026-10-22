using SmartLibAI.Core.DTOs.AI;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Interface dịch vụ suy luận AI đánh giá rủi ro độc giả mượn sách.
/// </summary>
public interface IAIPredictionService
{
    /// <summary>
    /// Cho biết mô hình ONNX đã được nạp thành công vào bộ nhớ hay chưa.
    /// Nếu false, hệ thống sẽ sử dụng Heuristic Fallback rule.
    /// </summary>
    bool IsModelLoaded { get; }

    /// <summary>
    /// Lấy chuỗi mô tả trạng thái hiện tại của mô hình AI.
    /// </summary>
    string ModelStatus { get; }

    /// <summary>
    /// Đánh giá rủi ro trễ hạn của độc giả dựa trên các đặc trưng nhân khẩu học và hành vi mượn trả.
    /// </summary>
    /// <param name="input">Thông tin đặc trưng độc giả</param>
    /// <returns>Kết quả đánh giá rủi ro (RiskScore, RiskTier, BadgeColor, SuggestedAction)</returns>
    RiskEvaluationResultDto EvaluateBorrowRisk(ReaderRiskInputDto input);
}
