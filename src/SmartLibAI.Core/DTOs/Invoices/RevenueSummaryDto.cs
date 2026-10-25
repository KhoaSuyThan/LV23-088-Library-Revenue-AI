namespace SmartLibAI.Core.DTOs.Invoices;

/// <summary>
/// DTO tổng hợp số liệu tài chính, doanh thu thu phạt và xu hướng cho Dashboard & Báo cáo thu phạt.
/// </summary>
public class RevenueSummaryDto
{
    /// <summary>
    /// Tổng tiền phạt thực tế đã thu vào ngân sách (VND).
    /// </summary>
    public decimal TotalCollectedRevenue { get; set; }

    /// <summary>
    /// Tổng tiền phạt còn nợ đọng chưa thu (Pending) (VND).
    /// </summary>
    public decimal TotalPendingArrears { get; set; }

    /// <summary>
    /// Tổng giá trị sách bị mất hoặc hư hỏng (VND).
    /// </summary>
    public decimal TotalDamageBookValue { get; set; }

    /// <summary>
    /// Doanh thu tiền phạt thu được trong ngày hôm nay (VND).
    /// </summary>
    public decimal TodayCollectedRevenue { get; set; }

    /// <summary>
    /// Tổng số lượng hóa đơn/biên lai đã thanh toán thành công.
    /// </summary>
    public int TotalInvoicesCount { get; set; }

    /// <summary>
    /// Tổng số lượt phạt đang chờ xử lý thu tiền (Pending).
    /// </summary>
    public int TotalPendingFinesCount { get; set; }

    /// <summary>
    /// Số lượt mượn sách đang bị quá hạn trong toàn hệ thống.
    /// </summary>
    public int TotalOverdueBorrowsCount { get; set; }

    /// <summary>
    /// Cơ cấu phân bổ nguồn thu phạt theo từng lý do vi phạm (Quá hạn, Hỏng sách, Mất sách...).
    /// </summary>
    public List<RevenueSourceBreakdownDto> Breakdown { get; set; } = new();

    /// <summary>
    /// Dữ liệu biểu đồ xu hướng doanh thu theo các mốc thời gian (ngày/tuần).
    /// </summary>
    public List<RevenueTrendPointDto> TrendPoints { get; set; } = new();
}

/// <summary>
/// Chi tiết cơ cấu một nguồn thu phạt.
/// </summary>
public class RevenueSourceBreakdownDto
{
    public string SourceName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public double Percentage { get; set; }
    public int CasesCount { get; set; }
}

/// <summary>
/// Tọa độ điểm trên biểu đồ xu hướng doanh thu.
/// </summary>
public class RevenueTrendPointDto
{
    public string DateLabel { get; set; } = string.Empty;
    public decimal ActualRevenue { get; set; }
    public decimal ExpectedRevenue { get; set; }
}

/// <summary>
/// DTO thống kê đầu sách có tỷ lệ vi phạm (trễ hạn / hư hỏng / mất) cao nhất (BUG-043 & US-11.3).
/// </summary>
public class TopViolatedBookDto
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public int CopyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Barcode { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int OverdueCount { get; set; }
    public int DamageCount { get; set; }
    public decimal TotalFineAmount { get; set; }
    public string TotalFine { get; set; } = string.Empty;
    public string Risk { get; set; } = string.Empty;
    public string RiskClass { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
}
