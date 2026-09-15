namespace SmartLibAI.Core.Entities;

/// <summary>
/// Đại diện cho vai trò người dùng trong hệ thống (Admin, Librarian, Reader, Guest).
/// </summary>
public class Role
{
    public int RoleID { get; set; }

    public string RoleName { get; set; } = string.Empty;

    // Quan hệ 1-N: Một vai trò có nhiều tài khoản người dùng
    public ICollection<User> Users { get; set; } = new List<User>();
}
