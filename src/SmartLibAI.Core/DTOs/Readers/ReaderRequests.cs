using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Readers;

/// <summary>
/// DTO yêu cầu tạo mới hồ sơ độc giả & tài khoản (Story LOLRA-78).
/// </summary>
public class CreateReaderRequestDto
{
    [Required(ErrorMessage = "Tên đăng nhập / MSSV không được để trống")]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ và tên độc giả không được để trống")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
    public string? Email { get; set; }

    [Required(ErrorMessage = "Mã thẻ bạn đọc không được để trống")]
    [MaxLength(50)]
    public string ReaderCode { get; set; } = string.Empty;

    /// <summary>
    /// Loại độc giả: "Student" (Sinh viên), "Lecturer" (Giảng viên), "Standard" (Chuẩn)
    /// </summary>
    public string MemberType { get; set; } = "Student";

    /// <summary>
    /// Ngày hết hạn thẻ (Mặc định nếu để trống: 1 năm kể từ ngày tạo)
    /// </summary>
    public DateTime? ExpiryDate { get; set; }

    /// <summary>
    /// Mật khẩu đăng nhập ban đầu (Mặc định nếu để trống: 123456)
    /// </summary>
    public string? Password { get; set; }
}

/// <summary>
/// DTO cập nhật thông tin hồ sơ bạn đọc (Story LOLRA-78).
/// </summary>
public class UpdateReaderRequestDto
{
    [Required(ErrorMessage = "Họ và tên độc giả không được để trống")]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Email không đúng định dạng")]
    public string? Email { get; set; }

    public string MemberType { get; set; } = "Student";

    public DateTime? ExpiryDate { get; set; }
}

/// <summary>
/// DTO chuyển đổi trạng thái Khóa / Mở khóa thẻ bạn đọc (Story LOLRA-78).
/// </summary>
public class ToggleReaderStatusDto
{
    /// <summary>
    /// Trạng thái mong muốn: true = Kích hoạt / Mở khóa, false = Khóa thẻ
    /// </summary>
    [Required]
    public bool IsActive { get; set; }

    /// <summary>
    /// Ghi chú lý do khóa/mở thẻ
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// DTO gia hạn thời hạn thẻ bạn đọc (Story LOLRA-78).
/// </summary>
public class ExtendCardRequestDto
{
    /// <summary>
    /// Số tháng gia hạn thêm (Mặc định 12 tháng)
    /// </summary>
    public int ExtraMonths { get; set; } = 12;

    /// <summary>
    /// Hoặc ngày hết hạn cụ thể
    /// </summary>
    public DateTime? NewExpiryDate { get; set; }
}
