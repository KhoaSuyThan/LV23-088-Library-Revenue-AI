using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện xử lý nghiệp vụ tra cứu và quản lý thông tin sách.
/// </summary>
public interface IBookService
{
    Task<ApiResponse<IReadOnlyList<BookDto>>> GetBooksAsync();

    Task<ApiResponse<PagedResult<BookDto>>> GetPagedBooksAsync(BookFilterDto filter);

    Task<ApiResponse<BookDto>> GetBookByIdAsync(int id);

    /// <summary>
    /// Nạp danh sách sách hàng loạt từ file Stream CSV với Batch Insert và lọc ngoại lệ.
    /// </summary>
    Task<ApiResponse<BookImportResultDto>> ImportBooksFromCsvAsync(Stream fileStream);

    /// <summary>
    /// Xuất toàn bộ danh sách sách kèm thông tin tồn kho ra tệp nhị phân CSV (UTF-8 BOM có chỉ thị sep=,).
    /// </summary>
    Task<byte[]> ExportBooksToCsvAsync();

    /// <summary>
    /// Xuất toàn bộ danh sách sách ra tệp bảng tính Excel (.xls SpreadsheetML) với định dạng hàng cột, kẻ viền và màu sắc.
    /// </summary>
    Task<byte[]> ExportBooksToExcelXmlAsync();

    /// <summary>
    /// Lấy danh sách bản sao của một đầu sách (AC1, AC3).
    /// </summary>
    Task<ApiResponse<IReadOnlyList<BookCopyDto>>> GetBookCopiesAsync(int bookId);

    /// <summary>
    /// Tra cứu bản sao bằng mã vạch (AC5).
    /// </summary>
    Task<ApiResponse<BookCopyDto>> GetCopyByBarcodeAsync(string barcode);

    /// <summary>
    /// Thêm hàng loạt bản sao cho một đầu sách với mã vạch tự động sinh (AC1, AC2).
    /// </summary>
    Task<ApiResponse<IReadOnlyList<BookCopyDto>>> BulkAddCopiesAsync(int bookId, BulkAddCopiesRequestDto request);

    /// <summary>
    /// Cập nhật trạng thái độc lập của một bản sao (AC3).
    /// </summary>
    Task<CopyStatusUpdateResult> UpdateCopyStatusAsync(int copyId, UpdateCopyStatusDto request);

    /// <summary>
    /// Xóa một bản sao nếu không trong trạng thái cho mượn.
    /// </summary>
    Task<ApiResponse<bool>> DeleteCopyAsync(int copyId);
    /// Thêm mới một đầu sách kèm số lượng bản sao vật lý ban đầu.
    /// </summary>
    Task<ApiResponse<BookDto>> CreateBookAsync(CreateBookDto dto);

    /// <summary>
    /// Cập nhật thông tin đầu sách hiện có.
    /// </summary>
    Task<ApiResponse<BookDto>> UpdateBookAsync(int id, UpdateBookDto dto);

    /// <summary>
    /// Thực hiện xóa mềm đầu sách (ngừng lưu thông).
    /// </summary>
    Task<ApiResponse<bool>> SoftDeleteBookAsync(int id);

    /// <summary>
    /// Lấy thống kê tổng hợp 4 chỉ số KPI cho phân hệ Quản lý Sách.
    /// </summary>
    Task<ApiResponse<BookCatalogSummaryDto>> GetCatalogSummaryAsync();
}
