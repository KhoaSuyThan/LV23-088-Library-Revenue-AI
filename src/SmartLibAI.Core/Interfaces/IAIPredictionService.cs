using SmartLibAI.Core.DTOs.AI;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Interface dịch vụ suy luận AI đánh giá rủi ro độc giả mượn sách.
/// </summary>
public interface IAIPredictionService
{
    /// <summary>
    /// Đánh giá rủi ro trễ hạn của độc giả dựa trên các đặc trưng nhân khẩu học và hành vi mượn trả.
    /// </summary>
    /// <param name="input">Thông tin đặc trưng độc giả</param>
    /// <returns>Kết quả đánh giá rủi ro (RiskScore, RiskTier, BadgeColor, SuggestedAction)</returns>
    RiskEvaluationResultDto EvaluateBorrowRisk(ReaderRiskInputDto input);
}
