namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO tổng hợp số liệu cho 4 thẻ KPI đầu trang Quản lý hồ sơ độc giả.
/// </summary>
public class ReaderSummaryDto
{
    /// <summary>
    /// Tổng số bạn đọc đang có trạng thái hoạt động (IsActive = true).
    /// </summary>
    public int TotalActiveReaders { get; set; }

    /// <summary>
    /// Tổng số bạn đọc toàn hệ thống.
    /// </summary>
    public int TotalReaders { get; set; }

    /// <summary>
    /// Số lượng độc giả đang có tiền phạt chưa thanh toán.
    /// </summary>
    public int DebtReadersCount { get; set; }

    /// <summary>
    /// Tổng số tiền phạt tồn đọng (VNĐ).
    /// </summary>
    public decimal TotalDebtAmount { get; set; }

    /// <summary>
    /// Số lượng độc giả có nguy cơ trễ hạn cao do AI đánh giá (RiskScore >= 70 hoặc có sách trễ hạn).
    /// </summary>
    public int HighRiskCount { get; set; }

    /// <summary>
    /// Điểm tín nhiệm trung bình toàn hệ thống (0 - 100).
    /// </summary>
    public int AverageCreditScore { get; set; }
}
