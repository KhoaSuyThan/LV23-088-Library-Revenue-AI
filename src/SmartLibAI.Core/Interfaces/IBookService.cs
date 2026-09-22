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
    /// Xuất toàn bộ danh sách sách kèm thông tin tồn kho ra tệp nhị phân CSV (UTF-8 BOM).
    /// </summary>
    Task<byte[]> ExportBooksToCsvAsync();

    /// <summary>
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
}
