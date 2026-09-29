using SmartLibAI.Core.Entities;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Repository quản lý dữ liệu mượn/trả sách, kiểm tra độc giả và xử lý Transaction an toàn.
/// </summary>
public interface IBorrowRepository : IGenericRepository<Borrowing>
{
    /// <summary>
    /// Tìm kiếm thông tin độc giả theo mã thẻ bạn đọc (ReaderCode) hoặc tên đăng nhập/MSSV.
    /// </summary>
    Task<Reader?> GetReaderByCodeAsync(string readerCode);

    /// <summary>
    /// Đếm số cuốn sách mà độc giả đang mượn và chưa hoàn trả.
    /// </summary>
    Task<int> GetActiveBorrowCountByReaderIdAsync(int readerId);

    /// <summary>
    /// Kiểm tra xem độc giả có tiền phạt quá hạn hoặc các khoản phạt chưa thanh toán (Status = Pending) hay không.
    /// </summary>
    Task<(bool HasUnpaidFines, decimal TotalUnpaidAmount)> CheckUnpaidFinesByReaderIdAsync(int readerId);

    /// <summary>
    /// Lấy quy tắc mượn và tính phạt đang có hiệu lực.
    /// </summary>
    Task<FineRule?> GetActiveFineRuleAsync();

    /// <summary>
    /// Lấy danh sách bản sao sách (BookCopy) theo danh sách mã vạch Barcode (Code 128) kèm thông tin Book.
    /// </summary>
    Task<List<BookCopy>> GetCopiesByBarcodesAsync(IEnumerable<string> barcodes);

    /// <summary>
    /// Tạo phiếu mượn mới và lưu các chi tiết mượn, đồng thời cập nhật trạng thái bản sao sách trong Transaction SQL an toàn.
    /// </summary>
    Task<Borrowing> CreateBorrowingWithTransactionAsync(Borrowing borrowing, List<int> copyIds);

    /// <summary>
    /// Lấy chi tiết phiếu mượn kèm Reader, Librarian và danh sách bản sao sách theo BorrowingID.
    /// </summary>
    Task<Borrowing?> GetBorrowingDetailByIdAsync(int borrowingId);

    /// <summary>
    /// Lấy danh sách các lượt mượn gần đây nhất để hiển thị tại bảng lưu thông.
    /// </summary>
    Task<List<Borrowing>> GetRecentBorrowingsAsync(int count = 20);
}
