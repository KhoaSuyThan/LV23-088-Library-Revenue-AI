using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ mượn sách, xác thực điều kiện bạn đọc và kiểm tra bản sao.
/// </summary>
public interface IBorrowService
{
    /// <summary>
    /// Xử lý tạo phiếu mượn sách bằng máy quét mã vạch (POST /api/borrows).
    /// </summary>
    Task<ApiResponse<BorrowResponseDto>> CreateBorrowAsync(CreateBorrowRequestDto request, int? librarianId = null);

    /// <summary>
    /// Kiểm tra tư cách mượn sách của độc giả (kiểm tra nợ phạt, số sách đang mượn, trạng thái thẻ).
    /// </summary>
    Task<ApiResponse<BorrowReaderEligibilityDto>> CheckReaderEligibilityAsync(string readerCode);

    /// <summary>
    /// Lấy chi tiết phiếu mượn theo mã ID.
    /// </summary>
    Task<ApiResponse<BorrowResponseDto>> GetBorrowByIdAsync(int id);

    /// <summary>
    /// Lấy danh sách phiếu mượn gần nhất phục vụ hiển thị quầy lưu thông.
    /// </summary>
    Task<ApiResponse<IReadOnlyList<BorrowResponseDto>>> GetRecentBorrowingsAsync(int count = 20);
}
