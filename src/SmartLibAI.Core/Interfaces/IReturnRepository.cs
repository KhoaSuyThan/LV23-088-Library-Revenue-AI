using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository chuyên biệt cho nghiệp vụ tiếp nhận trả sách rải rác & xử lý vi phạm (Story LOLRA-17).
/// </summary>
public interface IReturnRepository : IGenericRepository<BorrowingDetail>
{
    /// <summary>
    /// Tìm kiếm chi tiết mượn đang hoạt động (ItemStatus = 'Borrowed' và ReturnDate = null) theo mã Barcode bản sao sách.
    /// </summary>
    Task<BorrowingDetail?> GetActiveDetailByBarcodeAsync(string barcode);

    /// <summary>
    /// Tìm kiếm chi tiết mượn đang hoạt động theo mã phiếu mượn (BorrowCode hoặc BorrowingID).
    /// </summary>
    Task<List<BorrowingDetail>> GetActiveDetailsByBorrowCodeAsync(string borrowCodeOrId);

    /// <summary>
    /// Lấy quy tắc tính tiền phạt và hạn mức đang có hiệu lực.
    /// </summary>
    Task<FineRule?> GetActiveFineRuleAsync();

    /// <summary>
    /// Thực thi Transaction SQL hoàn trả bản sao sách an toàn:
    /// - Cập nhật ReturnDate và ItemStatus của BorrowingDetail
    /// - Cập nhật Status của BookCopy ('Available' nếu nguyên vẹn; 'Damaged' / 'Lost' nếu có sự cố)
    /// - Tự động tạo FineReceipt nếu phát sinh tiền phạt (quá hạn, hỏng sách, mất sách)
    /// - Tự động kiểm tra và chuyển trạng thái Borrowing sang 'Returned' nếu toàn bộ sách đã được hoàn trả.
    /// </summary>
    Task<(bool Success, string Message, FineReceipt? FineReceipt, bool IsBorrowingCompleted)> ProcessReturnWithTransactionAsync(
        int detailId,
        string condition,
        string? note,
        decimal totalDiscountPercent,
        decimal overdueFine,
        decimal damageFee,
        decimal lostFee,
        int? librarianId
    );
}
