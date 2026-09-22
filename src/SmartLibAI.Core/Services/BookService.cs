using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ tra cứu và quản lý thông tin sách trong thư viện.
/// </summary>
public class BookService : IBookService
{
    private readonly IBookRepository _bookRepository;

    public BookService(IBookRepository bookRepository)
    {
        _bookRepository = bookRepository;
    }

    /// <summary>
    /// Lấy danh sách sách có phân trang và tìm kiếm theo từ khóa/thể loại.
    /// </summary>
    public async Task<ApiResponse<PagedResult<BookDto>>> GetPagedBooksAsync(BookFilterDto filter)
    {
        var result = await _bookRepository.GetPagedBooksAsync(filter);
        return ApiResponse<PagedResult<BookDto>>.SuccessResult(result, "Lấy danh sách sách phân trang thành công");
    }

    /// <summary>
    /// Lấy toàn bộ danh sách sách trong thư viện kèm số lượng bản sao khả dụng.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<BookDto>>> GetBooksAsync()
    {
        var books = await _bookRepository.GetAllBooksWithCopiesAsync();
        return ApiResponse<IReadOnlyList<BookDto>>.SuccessResult(books, "Lấy toàn bộ danh sách sách thành công");
    }

    /// <summary>
    /// Lấy chi tiết một đầu sách theo ID.
    /// </summary>
    public async Task<ApiResponse<BookDto>> GetBookByIdAsync(int id)
    {
        var book = await _bookRepository.GetBookDetailByIdAsync(id);
        if (book == null)
        {
            return ApiResponse<BookDto>.ErrorResult($"Không tìm thấy sách với mã ID {id}");
        }

        return ApiResponse<BookDto>.SuccessResult(book, "Lấy chi tiết sách thành công");
    }

    /// <summary>
    /// Nạp danh sách sách hàng loạt từ file Stream CSV với Batch Insert và lọc ngoại lệ (US-06).
    /// </summary>
    public async Task<ApiResponse<BookImportResultDto>> ImportBooksFromCsvAsync(Stream fileStream)
    {
        var result = new BookImportResultDto();

        // 1. Tải trước các mã ISBN và CategoryID đã tồn tại để tra cứu nhanh O(1)
        var existingIsbns = await _bookRepository.GetExistingIsbnsAsync();
        var validCategoryIds = await _bookRepository.GetValidCategoryIdsAsync();
        int defaultCategoryId = validCategoryIds.Count > 0 ? validCategoryIds.First() : 1;

        var seenFileIsbns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var batchBooks = new List<SmartLibAI.Core.Entities.Book>(1000);

        using var reader = new StreamReader(fileStream, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        // 2. Đọc dòng tiêu đề (Header) để xác định vị trí các cột
        var headerLine = await reader.ReadLineAsync();
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            return ApiResponse<BookImportResultDto>.ErrorResult("Tệp CSV rỗng hoặc không đúng định dạng.");
        }

        var headers = ParseCsvRow(headerLine);
        int colTitle = -1, colAuthor = -1, colIsbn = -1, colCategory = -1, colPublisher = -1, colPrice = -1;

        for (int i = 0; i < headers.Count; i++)
        {
            var h = headers[i].ToLowerInvariant();
            if (colTitle == -1 && (h.Contains("title") || h.Contains("tên") || h.Contains("ten"))) colTitle = i;
            else if (colAuthor == -1 && (h.Contains("author") || h.Contains("tác giả") || h.Contains("tacgia"))) colAuthor = i;
            else if (colIsbn == -1 && (h.Contains("isbn13") || h.Contains("isbn") || h.Contains("mã"))) colIsbn = i;
            else if (colCategory == -1 && (h.Contains("category") || h.Contains("thể loại") || h.Contains("theloai"))) colCategory = i;
            else if (colPublisher == -1 && (h.Contains("publisher") || h.Contains("nhà xuất bản") || h.Contains("nxb"))) colPublisher = i;
            else if (colPrice == -1 && (h.Contains("price") || h.Contains("giá") || h.Contains("gia"))) colPrice = i;
        }

        // Nếu không dò được cột title, mặc định cột 3 hoặc 1 theo schema file Kaggle
        if (colTitle == -1) colTitle = headers.Count > 3 ? 3 : 0;
        if (colAuthor == -1) colAuthor = headers.Count > 4 ? 4 : 1;

        int rowNumber = 1;
        string? line;

        // 3. Đọc từng dòng dữ liệu từ Stream (tránh tràn bộ nhớ khi nạp file lớn)
        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            rowNumber++;
            result.TotalProcessed++;

            var cols = ParseCsvRow(line);

            // Bốc tách dữ liệu các cột
            string title = colTitle >= 0 && colTitle < cols.Count ? cols[colTitle] : string.Empty;
            string author = colAuthor >= 0 && colAuthor < cols.Count ? cols[colAuthor] : string.Empty;
            string isbn = colIsbn >= 0 && colIsbn < cols.Count ? cols[colIsbn] : string.Empty;
            string publisher = colPublisher >= 0 && colPublisher < cols.Count ? cols[colPublisher] : "Đang cập nhật";
            string priceStr = colPrice >= 0 && colPrice < cols.Count ? cols[colPrice] : string.Empty;
            string catStr = colCategory >= 0 && colCategory < cols.Count ? cols[colCategory] : string.Empty;

            // Xử lý giá bìa (Mặc định 50.000 VNĐ nếu bỏ trống theo Quy tắc 04.1.6 & 06.3)
            decimal basePrice = 50000m;
            if (!string.IsNullOrWhiteSpace(priceStr))
            {
                if (decimal.TryParse(priceStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var parsedPrice))
                {
                    basePrice = parsedPrice;
                }
                else if (decimal.TryParse(priceStr, out var parsedVnPrice))
                {
                    basePrice = parsedVnPrice;
                }
            }

            // Xử lý mã thể loại
            int categoryId = defaultCategoryId;
            if (!string.IsNullOrWhiteSpace(catStr) && int.TryParse(catStr, out var parsedCatId))
            {
                if (validCategoryIds.Contains(parsedCatId))
                {
                    categoryId = parsedCatId;
                }
            }

            // Kiểm duyệt lỗi: Tên sách không được để trống (Quy tắc 04.1.1 & 06.3)
            if (string.IsNullOrWhiteSpace(title))
            {
                result.FailedCount++;
                result.Errors.Add(new BookImportErrorDto
                {
                    RowNumber = rowNumber,
                    Title = "[Trống]",
                    ISBN = isbn,
                    Reason = "Tên sách không được để trống hoặc chỉ chứa khoảng trắng."
                });
                continue;
            }

            // Kiểm duyệt lỗi: Tác giả không được để trống (Quy tắc 04.1.2 & 06.3)
            if (string.IsNullOrWhiteSpace(author))
            {
                result.FailedCount++;
                result.Errors.Add(new BookImportErrorDto
                {
                    RowNumber = rowNumber,
                    Title = title,
                    ISBN = isbn,
                    Reason = "Tên tác giả không được để trống."
                });
                continue;
            }

            // Kiểm duyệt lỗi: Giá bìa không được <= 0 (Quy tắc 04.1.6)
            if (basePrice <= 0)
            {
                result.FailedCount++;
                result.Errors.Add(new BookImportErrorDto
                {
                    RowNumber = rowNumber,
                    Title = title,
                    ISBN = isbn,
                    Reason = $"Giá bìa không hợp lệ ({basePrice:N0} đ). Giá phải lớn hơn 0 đồng."
                });
                continue;
            }

            // Kiểm tra trùng lặp ISBN: Bỏ qua nếu đã có trong CSDL hoặc xuất hiện trước trong tệp (Quy tắc 06.2)
            if (!string.IsNullOrWhiteSpace(isbn))
            {
                if (seenFileIsbns.Contains(isbn))
                {
                    result.SkippedCount++;
                    continue;
                }

                if (existingIsbns.Contains(isbn))
                {
                    result.SkippedCount++;
                    continue;
                }

                seenFileIsbns.Add(isbn);
                existingIsbns.Add(isbn);
            }

            // Cắt ngắn chuỗi phù hợp với độ dài schema CSDL SQL Server
            if (title.Length > 350) title = title.Substring(0, 350);
            if (author.Length > 800) author = author.Substring(0, 800);
            if (publisher.Length > 200) publisher = publisher.Substring(0, 200);
            if (!string.IsNullOrWhiteSpace(isbn) && isbn.Length > 20) isbn = isbn.Substring(0, 20);

            var bookEntity = new SmartLibAI.Core.Entities.Book
            {
                Title = title,
                Author = author,
                Publisher = string.IsNullOrWhiteSpace(publisher) ? "Đang cập nhật" : publisher,
                ISBN = string.IsNullOrWhiteSpace(isbn) ? null : isbn,
                BasePrice = basePrice,
                CategoryID = categoryId,
                IsActive = true
            };

            batchBooks.Add(bookEntity);

            // Khi đạt 1.000 cuốn -> Ghi theo mẻ (Batch Insert)
            if (batchBooks.Count >= 1000)
            {
                var inserted = await _bookRepository.BatchInsertBooksWithCopiesAsync(batchBooks, 1);
                result.SuccessCount += inserted;
                batchBooks.Clear();
            }
        }

        // Nạp mẻ còn lại cuối cùng
        if (batchBooks.Count > 0)
        {
            var inserted = await _bookRepository.BatchInsertBooksWithCopiesAsync(batchBooks, 1);
            result.SuccessCount += inserted;
            batchBooks.Clear();
        }

        string msg = $"Hoàn tất nạp file CSV: {result.SuccessCount} cuốn thành công, bỏ qua {result.SkippedCount} cuốn trùng, {result.FailedCount} dòng lỗi.";
        return ApiResponse<BookImportResultDto>.SuccessResult(result, msg);
    }

    /// <summary>
    /// Hàm phân tích cú pháp một dòng CSV chuẩn RFC 4180 xử lý dấu phẩy trong dấu nháy kép.
    /// </summary>
    private static List<string> ParseCsvRow(string line)
    {
        var fields = new List<string>();
        if (string.IsNullOrEmpty(line)) return fields;

        var sb = new System.Text.StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    sb.Append('"');
                    i++; // Bỏ qua dấu nháy kép thoát ""
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                fields.Add(sb.ToString().Trim());
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }
        fields.Add(sb.ToString().Trim());
        return fields;
    }

    /// <summary>
    /// Xuất toàn bộ danh sách sách kèm thông tin tồn kho ra tệp nhị phân CSV (UTF-8 BOM).
    /// </summary>
    public async Task<byte[]> ExportBooksToCsvAsync()
    {
        var books = await _bookRepository.GetAllBooksWithCopiesAsync();

        var sb = new System.Text.StringBuilder();

        // Ghi UTF-8 BOM để Excel và các ứng dụng bảng tính mở không bị lỗi font tiếng Việt
        sb.Append('\uFEFF');

        // Dòng tiêu đề các cột chuẩn hóa
        sb.AppendLine("BookID,CategoryID,CategoryName,ISBN,Title,Author,Publisher,BasePrice,TotalCopies,AvailableCopies");

        foreach (var b in books)
        {
            sb.Append(b.BookID).Append(',');
            sb.Append(b.CategoryID).Append(',');
            sb.Append(EscapeCsv(b.CategoryName)).Append(',');
            sb.Append(EscapeCsv(b.ISBN ?? string.Empty)).Append(',');
            sb.Append(EscapeCsv(b.Title)).Append(',');
            sb.Append(EscapeCsv(b.Author)).Append(',');
            sb.Append(EscapeCsv(b.Publisher ?? string.Empty)).Append(',');
            sb.Append(b.BasePrice.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)).Append(',');
            sb.Append(b.TotalCopies).Append(',');
            sb.Append(b.AvailableCopies).AppendLine();
        }

        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    /// <summary>
    /// Thêm mới một đầu sách kèm số lượng bản sao vật lý ban đầu.
    /// </summary>
    public async Task<ApiResponse<BookDto>> CreateBookAsync(CreateBookDto dto)
    {
        if (dto == null)
        {
            return ApiResponse<BookDto>.ErrorResult("Dữ liệu sách không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return ApiResponse<BookDto>.ErrorResult("Tên đầu sách không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(dto.Author))
        {
            return ApiResponse<BookDto>.ErrorResult("Tên tác giả không được để trống.");
        }

        var validCatIds = await _bookRepository.GetValidCategoryIdsAsync();
        if (!validCatIds.Contains(dto.CategoryID))
        {
            return ApiResponse<BookDto>.ErrorResult("Thể loại sách đã chọn không tồn tại trong hệ thống.");
        }

        // Tự động kiểm tra trùng lặp ISBN nếu có nhập ISBN
        if (!string.IsNullOrWhiteSpace(dto.ISBN))
        {
            var existingIsbns = await _bookRepository.GetExistingIsbnsAsync();
            if (existingIsbns.Contains(dto.ISBN.Trim()))
            {
                return ApiResponse<BookDto>.ErrorResult($"Mã ISBN '{dto.ISBN.Trim()}' đã tồn tại trong thư viện.");
            }
        }

        var book = new SmartLibAI.Core.Entities.Book
        {
            Title = dto.Title.Trim(),
            Author = dto.Author.Trim(),
            CategoryID = dto.CategoryID,
            ISBN = string.IsNullOrWhiteSpace(dto.ISBN) ? null : dto.ISBN.Trim(),
            Publisher = string.IsNullOrWhiteSpace(dto.Publisher) ? "Đang cập nhật" : dto.Publisher.Trim(),
            BasePrice = dto.BasePrice > 0 ? dto.BasePrice : 50000m,
            IsActive = true
        };

        int copiesCount = Math.Clamp(dto.InitialCopies, 1, 100);
        await _bookRepository.AddBookWithCopiesAsync(book, copiesCount);

        var detail = await _bookRepository.GetBookDetailByIdAsync(book.BookID);
        if (detail == null)
        {
            return ApiResponse<BookDto>.ErrorResult("Đã tạo sách nhưng không thể lấy thông tin chi tiết.");
        }

        return ApiResponse<BookDto>.SuccessResult(detail, "Thêm đầu sách mới thành công");
    }

    /// <summary>
    /// Cập nhật thông tin đầu sách hiện có.
    /// </summary>
    public async Task<ApiResponse<BookDto>> UpdateBookAsync(int id, UpdateBookDto dto)
    {
        if (dto == null)
        {
            return ApiResponse<BookDto>.ErrorResult("Dữ liệu cập nhật không hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return ApiResponse<BookDto>.ErrorResult("Tên đầu sách không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(dto.Author))
        {
            return ApiResponse<BookDto>.ErrorResult("Tên tác giả không được để trống.");
        }

        var validCatIds = await _bookRepository.GetValidCategoryIdsAsync();
        if (!validCatIds.Contains(dto.CategoryID))
        {
            return ApiResponse<BookDto>.ErrorResult("Thể loại sách đã chọn không tồn tại trong hệ thống.");
        }

        var book = await _bookRepository.GetByIdAsync(id);
        if (book == null || !book.IsActive)
        {
            return ApiResponse<BookDto>.ErrorResult($"Không tìm thấy đầu sách với mã ID {id}.");
        }

        // Cập nhật các trường thông tin
        book.Title = dto.Title.Trim();
        book.Author = dto.Author.Trim();
        book.CategoryID = dto.CategoryID;
        book.ISBN = string.IsNullOrWhiteSpace(dto.ISBN) ? null : dto.ISBN.Trim();
        book.Publisher = string.IsNullOrWhiteSpace(dto.Publisher) ? "Đang cập nhật" : dto.Publisher.Trim();
        book.BasePrice = dto.BasePrice > 0 ? dto.BasePrice : 50000m;

        await _bookRepository.UpdateAsync(book);

        var detail = await _bookRepository.GetBookDetailByIdAsync(id);
        if (detail == null)
        {
            return ApiResponse<BookDto>.ErrorResult("Cập nhật sách thành công nhưng không thể lấy lại thông tin.");
        }

        return ApiResponse<BookDto>.SuccessResult(detail, "Cập nhật thông tin đầu sách thành công");
    }

    /// <summary>
    /// Thực hiện xóa mềm đầu sách (chuyển sang ngừng lưu thông IsActive = false).
    /// </summary>
    public async Task<ApiResponse<bool>> SoftDeleteBookAsync(int id)
    {
        var (success, message) = await _bookRepository.SoftDeleteBookAsync(id);
        if (!success)
        {
            return ApiResponse<bool>.ErrorResult(message);
        }

        return ApiResponse<bool>.SuccessResult(true, message);
    }

    /// <summary>
    /// Lấy thống kê tổng hợp 4 chỉ số KPI cho phân hệ Quản lý Sách.
    /// </summary>
    public async Task<ApiResponse<BookCatalogSummaryDto>> GetCatalogSummaryAsync()
    {
        var summary = await _bookRepository.GetCatalogSummaryAsync();
        return ApiResponse<BookCatalogSummaryDto>.SuccessResult(summary, "Lấy thống kê chỉ số danh mục sách thành công");
    }

    /// <summary>
    /// Xử lý thoát ký tự nháy kép và bao quanh dấu phẩy chuẩn RFC 4180.
    /// </summary>
    private static string EscapeCsv(string val)
    {
        if (string.IsNullOrEmpty(val)) return string.Empty;
        if (val.Contains('"') || val.Contains(',') || val.Contains('\n') || val.Contains('\r'))
        {
            return "\"" + val.Replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}

