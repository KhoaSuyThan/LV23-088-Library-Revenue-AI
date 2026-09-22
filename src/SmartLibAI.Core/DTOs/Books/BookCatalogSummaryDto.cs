namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO chứa các chỉ số thống kê nhanh (KPI) hiển thị đầu trang Quản lý Sách.
/// </summary>
public class BookCatalogSummaryDto
{
    /// <summary>
    /// Tổng số lượng đầu sách đang lưu hành trong thư viện.
    /// </summary>
    public int TotalBooks { get; set; }

    /// <summary>
    /// Tổng số bản sao sách vật lý đang được độc giả mượn.
    /// </summary>
    public int BorrowedBooks { get; set; }

    /// <summary>
    /// Tổng số cuốn sách đang mượn đã bị quá hạn chưa hoàn trả.
    /// </summary>
    public int OverdueBooks { get; set; }

    /// <summary>
    /// Tổng số cuốn sách vật lý đang trong tình trạng hư hỏng cần xử lý/thanh lý.
    /// </summary>
    public int DamagedBooks { get; set; }
}
