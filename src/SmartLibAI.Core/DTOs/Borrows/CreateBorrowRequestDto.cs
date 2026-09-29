using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Borrows;

/// <summary>
/// DTO tiếp nhận yêu cầu tạo phiếu mượn sách từ quầy lưu thông bằng máy quét mã vạch (Story LOLRA-16).
/// </summary>
public class CreateBorrowRequestDto
{
    /// <summary>
    /// Mã thẻ độc giả hoặc MSSV được quét từ thẻ bạn đọc (Ví dụ: 'RD20260001', '102220184').
    /// </summary>
    [Required(ErrorMessage = "Mã thẻ độc giả không được để trống")]
    [StringLength(50, ErrorMessage = "Mã thẻ độc giả tối đa 50 ký tự")]
    public string ReaderCode { get; set; } = string.Empty;

    /// <summary>
    /// Danh sách mã vạch bản sao sách vật lý (Barcode Code 128) quét từ đầu đọc mã vạch.
    /// </summary>
    [Required(ErrorMessage = "Danh sách mã vạch bản sao không được để trống")]
    [MinLength(1, ErrorMessage = "Cần quét ít nhất 1 mã vạch bản sao sách")]
    public List<string> Barcodes { get; set; } = new();

    /// <summary>
    /// Hạn trả dự kiến do thủ thư chọn hoặc hệ thống tự tính toán (nếu null sẽ tự tính theo quy định).
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// Mã định danh của thủ thư xử lý giao dịch tại quầy (tùy chọn, nếu không gửi sẽ lấy từ phiên đăng nhập).
    /// </summary>
    public int? LibrarianID { get; set; }
}
