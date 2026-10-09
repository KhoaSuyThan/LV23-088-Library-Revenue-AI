namespace SmartLibAI.Core.Common;

/// <summary>
/// Tiện ích chuẩn hóa tên Khoa / Bộ phận thực tế của độc giả phục vụ hiển thị trên phiếu mượn/trả và hóa đơn (BUG-04).
/// </summary>
public static class DepartmentHelper
{
    /// <summary>
    /// Chuyển đổi mã hoặc tên Khoa (Faculty) và đối tượng (MemberType) thành tên Khoa/Bộ phận hiển thị đầy đủ.
    /// </summary>
    public static string FormatDepartment(string? faculty, string? memberType)
    {
        // Giảng viên / Cán bộ nhà trường
        if (string.Equals(memberType, "Lecturer", StringComparison.OrdinalIgnoreCase))
        {
            return "Cán bộ / Giảng viên";
        }

        // Trường hợp mặc định hoặc chưa cập nhật
        if (string.IsNullOrWhiteSpace(faculty) || string.Equals(faculty, "Standard", StringComparison.OrdinalIgnoreCase))
        {
            return "Khoa Công nghệ Thông tin";
        }

        var clean = faculty.Trim();

        return clean switch
        {
            "CNTT" => "Khoa Công nghệ Thông tin",
            "Kinh Tế" or "Kinh te" or "KT" => "Khoa Kinh tế - Quản trị",
            "Cơ Khí" or "Co khi" or "CK" => "Khoa Kỹ thuật Cơ khí",
            "Ngoại Ngữ" or "Ngoai ngu" or "NN" => "Khoa Ngôn ngữ Anh",
            _ => clean.StartsWith("Khoa", StringComparison.OrdinalIgnoreCase) ? clean : $"Khoa {clean}"
        };
    }
}
