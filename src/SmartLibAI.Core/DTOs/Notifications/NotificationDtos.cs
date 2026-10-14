namespace SmartLibAI.Core.DTOs.Notifications;

/// <summary>
/// DTO thông tin chi tiết một thông báo / cảnh báo gửi tới người dùng.
/// </summary>
public class NotificationDto
{
    public int NotificationID { get; set; }

    public int UserID { get; set; }

    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Thời gian tương đối hiển thị trên giao diện (ví dụ: "5 phút trước", "Hôm qua").
    /// </summary>
    public string TimeAgo { get; set; } = string.Empty;

    /// <summary>
    /// Phân loại thông báo: 'Overdue' (Trễ hạn), 'DueSoon' (Sắp đến hạn), 'AIRisk' (Rủi ro AI), 'General' (Chung).
    /// </summary>
    public string Type { get; set; } = "Overdue";

    /// <summary>
    /// Mức độ cảnh báo: 'danger' (Đỏ - Trễ hạn), 'warning' (Vàng - Sắp đến hạn / Rủi ro cao), 'info' (Xanh dương).
    /// </summary>
    public string Severity { get; set; } = "danger";

    /// <summary>
    /// Mã phiếu mượn liên kết (nếu có, ví dụ 'PM-0001').
    /// </summary>
    public string? BorrowCode { get; set; }

    /// <summary>
    /// ID phiếu mượn tương ứng (nếu có).
    /// </summary>
    public int? BorrowingID { get; set; }

    /// <summary>
    /// Họ tên độc giả liên quan đến cảnh báo.
    /// </summary>
    public string? ReaderName { get; set; }

    /// <summary>
    /// Mã thẻ độc giả.
    /// </summary>
    public string? ReaderCode { get; set; }

    /// <summary>
    /// Tiêu đề sách mượn.
    /// </summary>
    public string? BookTitle { get; set; }

    /// <summary>
    /// Số ngày quá hạn thực tế (nếu đã trễ hạn).
    /// </summary>
    public int? OverdueDays { get; set; }

    /// <summary>
    /// Tiền phạt ước tính tính đến thời điểm hiện tại (VNĐ).
    /// </summary>
    public decimal? EstimatedFine { get; set; }
}

/// <summary>
/// DTO yêu cầu gửi cảnh báo trễ hạn đến các Thủ thư trong hệ thống.
/// </summary>
public class SendOverdueWarningRequestDto
{
    /// <summary>
    /// Số ngày trước hạn trả để quét cảnh báo sớm (Mặc định 0 = chỉ quét các ca đã quá hạn; > 0 quét cả ca sắp đến hạn).
    /// </summary>
    public int? DaysBefore { get; set; } = 0;

    /// <summary>
    /// ID thủ thư cụ thể cần nhận cảnh báo (nếu null: gửi đến toàn bộ Thủ thư Admin và Staff đang hoạt động).
    /// </summary>
    public int? SpecificLibrarianId { get; set; }

    /// <summary>
    /// Cho phép bao gồm cả các ca có điểm rủi ro AI cao (RiskScore >= Ngưỡng cấu hình) dù chưa đến hạn trả.
    /// </summary>
    public bool IncludeAiAtRisk { get; set; } = true;

    /// <summary>
    /// Chỉ gửi cảnh báo cho 1 phiếu mượn cụ thể (nếu có).
    /// </summary>
    public int? SpecificBorrowingId { get; set; }
}

/// <summary>
/// DTO biểu diễn một bản ghi mượn sách đang quá hạn hoặc có nguy cơ cần cảnh báo.
/// </summary>
public class OverdueBorrowingItemDto
{
    public int BorrowingID { get; set; }

    public string BorrowCode => $"PM-{BorrowingID:D4}";

    public int ReaderID { get; set; }

    public string ReaderCode { get; set; } = string.Empty;

    public string ReaderName { get; set; } = string.Empty;

    public string Faculty { get; set; } = string.Empty;

    public string MemberType { get; set; } = string.Empty;

    public string BookTitles { get; set; } = string.Empty;

    public int BookCount { get; set; }

    public DateTime BorrowDate { get; set; }

    public DateTime DueDate { get; set; }

    public bool IsOverdue { get; set; }

    public int OverdueDays { get; set; }

    public int RemainingDays { get; set; }

    public decimal EstimatedFine { get; set; }

    public decimal AIRiskScore { get; set; }

    public string AIRiskTier { get; set; } = "Low";
}

/// <summary>
/// DTO kết quả sau khi thực thi tiến trình quét và gửi cảnh báo trễ hạn cho Thủ thư.
/// </summary>
public class OverdueWarningResultDto
{
    public int TotalOverdueFound { get; set; }

    public int TotalDueSoonFound { get; set; }

    public int TotalAiAtRiskFound { get; set; }

    public int NotificationsCreated { get; set; }

    public int LibrariansNotifiedCount { get; set; }

    public List<string> NotifiedLibrarianNames { get; set; } = new();

    public List<OverdueBorrowingItemDto> ProcessedItems { get; set; } = new();

    public string SummaryMessage { get; set; } = string.Empty;
}

/// <summary>
/// DTO phản hồi danh sách thông báo phân trang của Thủ thư.
/// </summary>
public class NotificationSummaryResponseDto
{
    public int TotalCount { get; set; }

    public int UnreadCount { get; set; }

    public int Page { get; set; }

    public int PageSize { get; set; }

    public List<NotificationDto> Items { get; set; } = new();
}
