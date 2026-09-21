namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO chi tiết thông tin dòng dữ liệu bị lỗi khi nạp CSV.
/// </summary>
public class BookImportErrorDto
{
    /// <summary>
    /// Số thứ tự dòng trong file CSV (bắt đầu từ dòng 2 sau tiêu đề).
    /// </summary>
    public int RowNumber { get; set; }

    /// <summary>
    /// Tiêu đề sách (nếu đọc được).
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Mã ISBN của dòng sách.
    /// </summary>
    public string? ISBN { get; set; }

    /// <summary>
    /// Lý do cụ thể từ chối nạp dòng.
    /// </summary>
    public string Reason { get; set; } = string.Empty;
}

/// <summary>
/// DTO tổng hợp kết quả tiến trình nạp sách hàng loạt từ file CSV.
/// </summary>
public class BookImportResultDto
{
    /// <summary>
    /// Tổng số dòng dữ liệu đọc được từ tệp.
    /// </summary>
    public int TotalProcessed { get; set; }

    /// <summary>
    /// Số lượng đầu sách nạp thành công vào CSDL.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Số lượng dòng bị bỏ qua (do trùng mã ISBN).
    /// </summary>
    public int SkippedCount { get; set; }

    /// <summary>
    /// Số lượng dòng bị lỗi vi phạm quy tắc dữ liệu.
    /// </summary>
    public int FailedCount { get; set; }

    /// <summary>
    /// Danh sách chi tiết các dòng bị lỗi để cán bộ tải về hoặc đối soát.
    /// </summary>
    public List<BookImportErrorDto> Errors { get; set; } = new();
}
