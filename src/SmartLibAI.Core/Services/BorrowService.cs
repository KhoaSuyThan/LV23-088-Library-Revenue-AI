using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ mượn sách, thẩm định điều kiện độc giả và kiểm soát giao dịch an toàn (Story LOLRA-16).
/// </summary>
public class BorrowService : IBorrowService
{
    private readonly IBorrowRepository _borrowRepository;

    public BorrowService(IBorrowRepository borrowRepository)
    {
        _borrowRepository = borrowRepository;
    }

    /// <summary>
    /// Xử lý tiếp nhận thẻ bạn đọc và tạo phiếu mượn sách bằng máy quét mã vạch (POST /api/borrows).
    /// </summary>
    public async Task<ApiResponse<BorrowResponseDto>> CreateBorrowAsync(CreateBorrowRequestDto request, int? librarianId = null)
    {
        // 1. Kiểm tra tính hợp lệ sơ bộ của yêu cầu
        if (string.IsNullOrWhiteSpace(request.ReaderCode))
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult("Mã thẻ bạn đọc không được để trống.");
        }

        if (request.Barcodes == null || !request.Barcodes.Any())
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult("Vui lòng quét ít nhất một mã vạch bản sao sách (Barcode Code 128).");
        }

        // Chuẩn hóa danh sách mã vạch và kiểm tra trùng lặp trong cùng một lần quét
        var cleanBarcodes = request.Barcodes
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .Select(b => b.Trim())
            .ToList();

        if (cleanBarcodes.Count == 0)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult("Danh sách mã vạch bản sao không hợp lệ.");
        }

        if (cleanBarcodes.Distinct(StringComparer.OrdinalIgnoreCase).Count() != cleanBarcodes.Count)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult("Danh sách mã vạch chứa các bản sao bị quét trùng lặp trong cùng một lượt mượn.");
        }

        // 2. Tra cứu thông tin độc giả theo mã thẻ hoặc MSSV
        var reader = await _borrowRepository.GetReaderByCodeAsync(request.ReaderCode);
        if (reader == null)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult($"Không tìm thấy thông tin bạn đọc với mã thẻ: '{request.ReaderCode}'.");
        }

        // 3. Kiểm tra trạng thái thẻ bạn đọc và tài khoản
        if (reader.User == null || !reader.User.IsActive)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult("Tài khoản thẻ thư viện của độc giả đã bị khóa hoặc ngừng hoạt động. Hệ thống từ chối mượn sách.");
        }

        if (reader.ExpiryDate.Date < DateTime.UtcNow.Date)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult($"Thẻ thư viện của độc giả đã hết hạn vào ngày {reader.ExpiryDate:dd/MM/yyyy}. Vui lòng liên hệ quầy làm thủ tục gia hạn.");
        }

        // 4. Kiểm tra nợ phạt chưa thanh toán (AC Scenario 1 & 2: không có nợ phạt chưa thanh toán)
        var unpaidFines = await _borrowRepository.CheckUnpaidFinesByReaderIdAsync(reader.ReaderID);
        if (unpaidFines.HasUnpaidFines)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult(
                $"Độc giả đang có tiền phạt chưa thanh toán ({unpaidFines.TotalUnpaidAmount:N0} VNĐ). Hệ thống từ chối tạo phiếu mượn mới cho đến khi hoàn tất đóng phạt.");
        }

        // 5. Kiểm tra hạn mức mượn tối đa của độc giả (AC: không vượt quá 5 cuốn hoặc hạn mức quy định)
        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        var isLecturer = reader.MemberType.Equals("Lecturer", StringComparison.OrdinalIgnoreCase);
        var maxLimit = fineRule != null
            ? (isLecturer ? fineRule.LecturerBorrowLimit : fineRule.StudentBorrowLimit)
            : (isLecturer ? 10 : 5);

        var currentBorrowCount = await _borrowRepository.GetActiveBorrowCountByReaderIdAsync(reader.ReaderID);
        var requestedCount = cleanBarcodes.Count;

        if (currentBorrowCount + requestedCount > maxLimit)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult(
                $"Số sách mượn vượt quá hạn mức tối đa cho phép ({maxLimit} cuốn). Bạn đọc hiện đang mượn {currentBorrowCount} cuốn, yêu cầu mượn thêm {requestedCount} cuốn.");
        }

        // 6. Kiểm tra tính tồn tại và trạng thái khả dụng của các bản sao sách
        var copies = await _borrowRepository.GetCopiesByBarcodesAsync(cleanBarcodes);

        // Kiểm tra xem có mã vạch nào không tồn tại trong kho sách
        var foundBarcodes = copies.Select(c => c.Barcode).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var missingBarcodes = cleanBarcodes.Where(b => !foundBarcodes.Contains(b)).ToList();
        if (missingBarcodes.Any())
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult(
                $"Không tìm thấy bản sao sách trong hệ thống ứng với mã vạch: {string.Join(", ", missingBarcodes)}.");
        }

        // Kiểm tra trạng thái từng bản sao: bắt buộc phải là 'Available'
        foreach (var copy in copies)
        {
            if (!copy.Status.Equals("Available", StringComparison.OrdinalIgnoreCase))
            {
                var bookTitle = copy.Book?.Title ?? "Tài liệu";
                return ApiResponse<BorrowResponseDto>.ErrorResult(
                    $"Bản sao sách '{copy.Barcode}' ({bookTitle}) hiện không khả dụng trong kho (Trạng thái hiện tại: {copy.Status}).");
            }

            if (copy.Book != null && !copy.Book.IsActive)
            {
                return ApiResponse<BorrowResponseDto>.ErrorResult(
                    $"Đầu sách '{copy.Book.Title}' (Mã vạch: {copy.Barcode}) đã ngừng lưu thông trong thư viện.");
            }
        }

        // 7. Xác định ngày hẹn trả sách (DueDate)
        DateTime dueDate;
        if (request.DueDate.HasValue && request.DueDate.Value > DateTime.UtcNow)
        {
            dueDate = request.DueDate.Value;
        }
        else
        {
            var borrowDays = fineRule != null
                ? (isLecturer ? fineRule.LecturerBorrowDays : fineRule.StudentBorrowDays)
                : (isLecturer ? 30 : 14);
            dueDate = DateTime.UtcNow.AddDays(borrowDays);
        }

        // 8. Xác định thủ thư phụ trách giao dịch
        var effectiveLibrarianId = librarianId ?? request.LibrarianID ?? 1;

        // 9. Khởi tạo đối tượng Borrowing và thực thi Transaction SQL an toàn
        var borrowing = new Borrowing
        {
            ReaderID = reader.ReaderID,
            LibrarianID = effectiveLibrarianId,
            BorrowDate = DateTime.UtcNow,
            DueDate = dueDate,
            Status = "Active"
        };

        var copyIds = copies.Select(c => c.CopyID).ToList();
        var createdBorrowing = await _borrowRepository.CreateBorrowingWithTransactionAsync(borrowing, copyIds);

        // 10. Lấy chi tiết phiếu mượn hoàn chỉnh và ánh xạ sang DTO trả về cho client
        var fullBorrowing = await _borrowRepository.GetBorrowingDetailByIdAsync(createdBorrowing.BorrowingID);
        var responseDto = MapToBorrowResponseDto(fullBorrowing ?? createdBorrowing);

        return ApiResponse<BorrowResponseDto>.SuccessResult(
            responseDto, 
            $"Tạo phiếu mượn {responseDto.BorrowCode} thành công cho độc giả {reader.User.FullName} ({cleanBarcodes.Count} cuốn).");
    }

    /// <summary>
    /// Kiểm tra tư cách mượn sách của độc giả trước khi quét sách.
    /// </summary>
    public async Task<ApiResponse<BorrowReaderEligibilityDto>> CheckReaderEligibilityAsync(string readerCode)
    {
        if (string.IsNullOrWhiteSpace(readerCode))
        {
            return ApiResponse<BorrowReaderEligibilityDto>.ErrorResult("Mã thẻ độc giả không được để trống.");
        }

        var reader = await _borrowRepository.GetReaderByCodeAsync(readerCode);
        if (reader == null)
        {
            return ApiResponse<BorrowReaderEligibilityDto>.ErrorResult($"Không tìm thấy bạn đọc với mã thẻ: '{readerCode}'.");
        }

        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        var isLecturer = reader.MemberType.Equals("Lecturer", StringComparison.OrdinalIgnoreCase);
        var maxLimit = fineRule != null
            ? (isLecturer ? fineRule.LecturerBorrowLimit : fineRule.StudentBorrowLimit)
            : (isLecturer ? 10 : 5);

        var currentBorrowCount = await _borrowRepository.GetActiveBorrowCountByReaderIdAsync(reader.ReaderID);
        var unpaidFines = await _borrowRepository.CheckUnpaidFinesByReaderIdAsync(reader.ReaderID);

        var dto = new BorrowReaderEligibilityDto
        {
            ReaderID = reader.ReaderID,
            ReaderCode = reader.ReaderCode,
            FullName = reader.User?.FullName ?? string.Empty,
            MemberType = reader.MemberType,
            IsActive = reader.User?.IsActive ?? false,
            ExpiryDate = reader.ExpiryDate,
            CurrentBorrowCount = currentBorrowCount,
            MaxBorrowLimit = maxLimit,
            HasUnpaidFines = unpaidFines.HasUnpaidFines,
            UnpaidFineAmount = unpaidFines.TotalUnpaidAmount
        };

        if (!dto.IsActive)
        {
            dto.RejectionReason = "Tài khoản thẻ thư viện đang bị khóa.";
        }
        else if (dto.IsExpired)
        {
            dto.RejectionReason = $"Thẻ thư viện đã hết hạn vào ngày {reader.ExpiryDate:dd/MM/yyyy}.";
        }
        else if (dto.HasUnpaidFines)
        {
            dto.RejectionReason = $"Độc giả đang có tiền phạt chưa đóng ({dto.UnpaidFineAmount:N0} VNĐ).";
        }
        else if (dto.RemainingBorrowLimit <= 0)
        {
            dto.RejectionReason = $"Đã đạt hạn mức mượn tối đa ({maxLimit} cuốn).";
        }

        return ApiResponse<BorrowReaderEligibilityDto>.SuccessResult(dto, "Kiểm tra tư cách mượn sách thành công.");
    }

    /// <summary>
    /// Lấy chi tiết phiếu mượn theo mã ID.
    /// </summary>
    public async Task<ApiResponse<BorrowResponseDto>> GetBorrowByIdAsync(int id)
    {
        var borrowing = await _borrowRepository.GetBorrowingDetailByIdAsync(id);
        if (borrowing == null)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult($"Không tìm thấy phiếu mượn với mã ID: {id}.");
        }

        return ApiResponse<BorrowResponseDto>.SuccessResult(MapToBorrowResponseDto(borrowing), "Lấy chi tiết phiếu mượn thành công.");
    }

    /// <summary>
    /// Lấy danh sách phiếu mượn gần nhất phục vụ hiển thị quầy lưu thông.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<BorrowResponseDto>>> GetRecentBorrowingsAsync(int count = 20)
    {
        var borrowings = await _borrowRepository.GetRecentBorrowingsAsync(count);
        var dtoList = borrowings.Select(MapToBorrowResponseDto).ToList();

        return ApiResponse<IReadOnlyList<BorrowResponseDto>>.SuccessResult(dtoList, "Lấy danh sách phiếu mượn gần nhất thành công.");
    }

    /// <summary>
    /// Hàm tiện ích ánh xạ Entity Borrowing sang BorrowResponseDto.
    /// </summary>
    private static BorrowResponseDto MapToBorrowResponseDto(Borrowing borrowing)
    {
        return new BorrowResponseDto
        {
            BorrowingID = borrowing.BorrowingID,
            ReaderID = borrowing.ReaderID,
            ReaderCode = borrowing.Reader?.ReaderCode ?? string.Empty,
            ReaderName = borrowing.Reader?.User?.FullName ?? string.Empty,
            MemberType = borrowing.Reader?.MemberType ?? "Standard",
            LibrarianID = borrowing.LibrarianID,
            LibrarianName = borrowing.Librarian?.FullName ?? string.Empty,
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            Status = borrowing.Status,
            TotalItems = borrowing.BorrowingDetails.Count,
            Items = borrowing.BorrowingDetails.Select(d => new BorrowItemDto
            {
                CopyID = d.CopyID,
                Barcode = d.BookCopy?.Barcode ?? string.Empty,
                BookID = d.BookCopy?.BookID ?? 0,
                Title = d.BookCopy?.Book?.Title ?? string.Empty,
                Author = d.BookCopy?.Book?.Author ?? string.Empty,
                CategoryName = d.BookCopy?.Book?.Category?.CategoryName ?? string.Empty,
                ItemStatus = d.ItemStatus,
                ReturnDate = d.ReturnDate
            }).ToList()
        };
    }
}
