using System.ComponentModel.DataAnnotations;

namespace SmartLibAI.Core.DTOs.Books;

/// <summary>
/// DTO cập nhật trạng thái độc lập của một bản sao (AC3).
/// </summary>
public class UpdateCopyStatusDto
{
    [Required(ErrorMessage = "Trạng thái bản sao không được để trống.")]
    [RegularExpression("^(Available|Borrowed|Damaged|Lost)$", ErrorMessage = "Trạng thái chỉ có thể là: Available, Borrowed, Damaged, hoặc Lost.")]
    public string Status { get; set; } = "Available";
}
