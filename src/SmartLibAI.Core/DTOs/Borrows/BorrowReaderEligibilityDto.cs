namespace SmartLibAI.Core.DTOs.Borrows;

/// <summary>
/// DTO kiểm tra tư cách mượn sách của bạn đọc (hỗ trợ hiển thị cảnh báo đỏ khi bị từ chối).
/// </summary>
public class BorrowReaderEligibilityDto
{
    public int ReaderID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public string MemberType { get; set; } = "Standard";
 
    /// <summary>
    /// Khoa / Viện của độc giả (VD: CNTT, Kinh Tế, Cơ Khí, Ngoại Ngữ).
    /// </summary>
    public string Faculty { get; set; } = "CNTT";

    /// <summary>
    /// Tên Khoa / Bộ phận thực tế hiển thị chuẩn xác trên giao diện quầy lưu thông (BUG-04).
    /// </summary>
    public string Department { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public DateTime ExpiryDate { get; set; }

    public bool IsExpired => ExpiryDate.Date < DateTime.UtcNow.Date;

    public int CurrentBorrowCount { get; set; }

    public int MaxBorrowLimit { get; set; }

    public int RemainingBorrowLimit => Math.Max(0, MaxBorrowLimit - CurrentBorrowCount);

    public bool HasUnpaidFines { get; set; }

    public decimal UnpaidFineAmount { get; set; }

    /// <summary>
    /// Ngưỡng nợ phạt tối đa cho phép trước khi bị chặn quyền mượn sách (mặc định 50.000 VNĐ theo US-08.1).
    /// </summary>
    public decimal DebtLockThreshold { get; set; } = 50000m;

    /// <summary>
    /// Cho biết độc giả có bị chặn quyền mượn do nợ vượt quá ngưỡng cho phép hay không (> DebtLockThreshold).
    /// </summary>
    public bool IsDebtBlocked => UnpaidFineAmount > DebtLockThreshold;

    /// <summary>
    /// Số ngày mượn tiêu chuẩn áp dụng cho đối tượng bạn đọc này theo cấu hình hệ thống.
    /// </summary>
    public int StandardBorrowDays { get; set; } = 14;

    /// <summary>
    /// Cho biết độc giả có đủ điều kiện tạo phiếu mượn mới hay không (US-08.1).
    /// Giữ độc lập điều kiện thẻ khóa/hết hạn; chỉ chặn do nợ khi tổng nợ phạt vượt quá ngưỡng 50.000 VNĐ.
    /// </summary>
    public bool CanBorrow => IsActive && !IsExpired && !IsDebtBlocked && RemainingBorrowLimit > 0;

    /// <summary>
    /// Điểm tín nhiệm của độc giả (0 - 100)
    /// </summary>
    public int CreditScore { get; set; } = 100;

    /// <summary>
    /// Điểm rủi ro AI dự đoán (từ 0.00 đến 1.00)
    /// </summary>
    public decimal? AiRiskScore { get; set; }

    /// <summary>
    /// Phân cấp rủi ro AI: Low, Medium, High
    /// </summary>
    public string? AiRiskTier { get; set; }

    /// <summary>
    /// Màu badge giao diện AI: success, warning, danger
    /// </summary>
    public string? AiRiskBadgeColor { get; set; }

    /// <summary>
    /// Hành động khuyến nghị từ AI
    /// </summary>
    public string? AiSuggestedAction { get; set; }

    /// <summary>
    /// Lý do từ chối nếu không đủ điều kiện.
    /// </summary>
    public string? RejectionReason { get; set; }
}
