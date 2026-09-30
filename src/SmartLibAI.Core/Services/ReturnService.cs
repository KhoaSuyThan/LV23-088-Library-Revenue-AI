using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Returns;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý tiếp nhận sách trả rải rác & ghi nhận vi phạm hư hỏng, trễ hạn (Story LOLRA-17).
/// </summary>
public class ReturnService : IReturnService
{
    private readonly IReturnRepository _returnRepository;

    public ReturnService(IReturnRepository returnRepository)
    {
        _returnRepository = returnRepository;
    }

    /// <summary>
    /// Tra cứu thông tin cuốn sách đang được mượn dựa trên Barcode của bản sao hoặc mã phiếu mượn.
    /// </summary>
    public async Task<ApiResponse<ReturnLookupResponseDto>> LookupReturnItemAsync(string barcodeOrCode)
    {
        if (string.IsNullOrWhiteSpace(barcodeOrCode))
        {
            return ApiResponse<ReturnLookupResponseDto>.ErrorResult("Vui lòng nhập Mã vạch bản sao hoặc Mã phiếu mượn.");
        }

        var clean = barcodeOrCode.Trim();

        // 1. Thử tra cứu theo mã vạch bản sao (Barcode)
        var detail = await _returnRepository.GetActiveDetailByBarcodeAsync(clean);

        // 2. Nếu không thấy và là mã phiếu (PM-XXXX hoặc ID số), lấy cuốn đầu tiên chưa trả
        if (detail == null)
        {
            var detailsByCode = await _returnRepository.GetActiveDetailsByBorrowCodeAsync(clean);
            if (detailsByCode.Any())
            {
                detail = detailsByCode.First();
            }
        }

        if (detail == null)
        {
            return ApiResponse<ReturnLookupResponseDto>.ErrorResult(
                $"Không tìm thấy sách đang mượn khớp với mã: '{clean}'. Có thể sách đã được trả hoặc mã không tồn tại.");
        }

        var copy = detail.BookCopy;
        var book = copy?.Book;
        var borrowing = detail.Borrowing;
        var reader = borrowing?.Reader;

        // Tính toán số ngày quá hạn
        var now = DateTime.Now;
        var dueDate = borrowing!.DueDate;
        var overdueDays = 0;
        if (now > dueDate)
        {
            overdueDays = (now.Date - dueDate.Date).Days;
            if (overdueDays < 0) overdueDays = 0;
        }

        var rule = await _returnRepository.GetActiveFineRuleAsync();
        decimal finePerDay = rule?.FinePerDay ?? 5000m;
        decimal estimatedFine = overdueDays * finePerDay;

        var allDetails = borrowing.BorrowingDetails ?? new List<Entities.BorrowingDetail>();
        var totalItems = allDetails.Count;
        var returnedItems = allDetails.Count(d => d.ReturnDate != null && d.ItemStatus != "Borrowed");

        var response = new ReturnLookupResponseDto
        {
            DetailId = detail.DetailID,
            BorrowingId = borrowing.BorrowingID,
            BorrowCode = $"PM-{borrowing.BorrowingID:D4}",
            CopyId = detail.CopyID,
            Barcode = copy?.Barcode ?? clean,
            BookId = book?.BookID ?? 0,
            BookTitle = book?.Title ?? "Tài liệu thư viện",
            Author = book?.Author ?? "Nhiều tác giả",
            BasePrice = book?.BasePrice ?? 50000m,
            ReaderId = reader?.ReaderID ?? 0,
            ReaderName = reader?.User?.FullName ?? "Bạn đọc",
            ReaderCode = reader?.ReaderCode ?? string.Empty,
            MemberType = reader?.MemberType ?? "Student",
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            OverdueDays = overdueDays,
            IsOverdue = overdueDays > 0,
            EstimatedOverdueFine = estimatedFine,
            FinePerDay = finePerDay,
            CurrentItemStatus = detail.ItemStatus,
            TotalItemsInBorrowing = totalItems,
            ReturnedItemsCount = returnedItems
        };

        return ApiResponse<ReturnLookupResponseDto>.SuccessResult(response, "Tra cứu thông tin sách mượn thành công.");
    }

    /// <summary>
    /// Xử lý tiếp nhận trả một bản sao sách cụ thể theo Barcode, cập nhật tình trạng vật lý và tính phạt.
    /// </summary>
    public async Task<ApiResponse<ReturnBookResponseDto>> ProcessReturnItemAsync(ReturnBookRequestDto request, int? librarianId = null)
    {
        if (string.IsNullOrWhiteSpace(request.Barcode))
        {
            return ApiResponse<ReturnBookResponseDto>.ErrorResult("Mã vạch bản sao sách không được để trống.");
        }

        // 1. Tra cứu chi tiết mượn đang active theo mã vạch
        var detail = await _returnRepository.GetActiveDetailByBarcodeAsync(request.Barcode.Trim());
        if (detail == null)
        {
            return ApiResponse<ReturnBookResponseDto>.ErrorResult(
                $"Bản sao sách '{request.Barcode}' hiện không ở trạng thái đang mượn hoặc đã được hoàn trả trước đó.");
        }

        var copy = detail.BookCopy;
        var book = copy?.Book;
        var borrowing = detail.Borrowing;
        var reader = borrowing?.Reader;

        var now = DateTime.Now;
        var dueDate = borrowing!.DueDate;

        // 2. Tính số ngày quá hạn và tiền phạt quá hạn
        var overdueDays = 0;
        if (now > dueDate)
        {
            overdueDays = (now.Date - dueDate.Date).Days;
            if (overdueDays < 0) overdueDays = 0;
        }

        var rule = await _returnRepository.GetActiveFineRuleAsync();
        decimal finePerDay = rule?.FinePerDay ?? 5000m;
        decimal overdueFine = overdueDays * finePerDay;

        // 3. Tính phụ phí theo tình trạng kiểm tra thực tế (Scenario 2: Hư hỏng / Mất sách)
        var condition = string.IsNullOrWhiteSpace(request.Condition) ? "Good" : request.Condition.Trim();
        decimal damageFee = 0m;
        decimal lostFee = 0m;
        decimal basePrice = book?.BasePrice ?? 50000m;

        if (condition.Equals("Damaged", StringComparison.OrdinalIgnoreCase))
        {
            // Phụ phí hỏng bìa/rách sách: tối thiểu 20.000đ hoặc tỷ lệ quy định
            damageFee = Math.Max(20000m, basePrice * (rule?.DamageMultiplier ?? 0.4m));
        }
        else if (condition.Equals("Lost", StringComparison.OrdinalIgnoreCase))
        {
            // Đền bù 100% giá sách gốc + phụ thu đền bù theo quy định
            var damagePct = rule?.DamageFeePercent ?? 10m;
            lostFee = basePrice + (basePrice * damagePct / 100m);
        }

        // 4. Thực thi Transaction SQL an toàn
        var result = await _returnRepository.ProcessReturnWithTransactionAsync(
            detail.DetailID,
            condition,
            request.Note,
            request.WaiverDiscountPercent,
            overdueFine,
            damageFee,
            lostFee,
            librarianId
        );

        if (!result.Success)
        {
            return ApiResponse<ReturnBookResponseDto>.ErrorResult(result.Message);
        }

        var rawTotal = overdueFine + damageFee + lostFee;
        var discountAmt = Math.Round((rawTotal * request.WaiverDiscountPercent) / 100m, 2);
        var finalTotal = Math.Max(0m, rawTotal - discountAmt);

        var borrowCode = $"PM-{borrowing.BorrowingID:D4}";

        var response = new ReturnBookResponseDto
        {
            DetailId = detail.DetailID,
            BorrowingId = borrowing.BorrowingID,
            BorrowCode = borrowCode,
            CopyId = copy?.CopyID ?? 0,
            Barcode = copy?.Barcode ?? request.Barcode,
            BookTitle = book?.Title ?? "Tài liệu",
            ReaderName = reader?.User?.FullName ?? "Độc giả",
            ReaderCode = reader?.ReaderCode ?? string.Empty,
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            ReturnDate = now,
            ItemStatus = condition switch
            {
                "Damaged" => "Damaged",
                "Lost" => "Lost",
                _ => "Returned"
            },
            CopyStatus = condition switch
            {
                "Damaged" => "Damaged",
                "Lost" => "Lost",
                _ => "Available"
            },
            OverdueDays = overdueDays,
            OverdueFine = overdueFine,
            DamageFee = damageFee,
            LostFee = lostFee,
            DiscountAmount = discountAmt,
            TotalFine = finalTotal,
            IsOverdue = overdueDays > 0,
            IsDamaged = condition.Equals("Damaged", StringComparison.OrdinalIgnoreCase),
            IsLost = condition.Equals("Lost", StringComparison.OrdinalIgnoreCase),
            IsOnTime = overdueDays == 0 && condition.Equals("Good", StringComparison.OrdinalIgnoreCase),
            IsBorrowingCompleted = result.IsBorrowingCompleted,
            ReceiptId = result.FineReceipt?.ReceiptID,
            Message = result.IsBorrowingCompleted
                ? $"Đã hoàn tất trả toàn bộ sách trong phiếu {borrowCode}."
                : $"Đã tiếp nhận trả cuốn sách [{request.Barcode}] thành công (Phiếu {borrowCode} vẫn còn tài liệu đang mượn)."
        };

        return ApiResponse<ReturnBookResponseDto>.SuccessResult(response, response.Message);
    }
}
