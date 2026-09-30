using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Returns;

/// <summary>
/// DTO gửi lên khi thủ thư tiếp nhận trả một bản sao sách (Story LOLRA-17).
/// </summary>
public class ReturnBookRequestDto
{
    /// <summary>
    /// Mã vạch Barcode của cuốn sách hoàn trả (Code128, ví dụ: BC000001-A).
    /// </summary>
    [Required(ErrorMessage = "Mã Barcode của cuốn sách không được để trống.")]
    public string Barcode { get; set; } = string.Empty;

    /// <summary>
    /// Tình trạng vật lý thực tế khi kiểm tra sách:
    /// 'Good' (Nguyên vẹn/Bình thường), 'Damaged' (Hỏng bìa/rách sách), 'Lost' (Mất sách).
    /// </summary>
    public string Condition { get; set; } = "Good";

    /// <summary>
    /// Ghi chú bổ sung của thủ thư về tình trạng sách hoặc sự cố vi phạm.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Tỷ lệ miễn giảm phạt được thủ thư duyệt (0 đến 100%).
    /// </summary>
    [Range(0, 100, ErrorMessage = "Tỷ lệ miễn giảm phải từ 0% đến 100%.")]
    public decimal WaiverDiscountPercent { get; set; } = 0;

    /// <summary>
    /// Lý do miễn giảm phạt (nếu có).
    /// </summary>
    public string? WaiverReason { get; set; }
}
