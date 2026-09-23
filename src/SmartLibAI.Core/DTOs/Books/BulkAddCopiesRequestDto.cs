using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO yêu cầu thêm hàng loạt bản sao cho một đầu sách (AC2).
/// </summary>
public class BulkAddCopiesRequestDto
{
    [Range(1, 100, ErrorMessage = "Số lượng bản sao cần thêm phải từ 1 đến 100 cuốn mỗi lần.")]
    public int Count { get; set; } = 1;

    /// <summary>
    /// Tiền tố tùy chỉnh cho mã vạch (Tùy chọn, mặc định sinh theo BC{BookID:D6}-{seq:D3})
    /// </summary>
    public string? CustomPrefix { get; set; }
}
