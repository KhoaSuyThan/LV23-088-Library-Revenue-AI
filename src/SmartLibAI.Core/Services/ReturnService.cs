using SmartLibAI.Core.Common;
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

        // Tính toán số ngày quá hạn tự động theo Quy tắc 10.1
        var now = DateTime.Now;
        var dueDate = borrowing!.DueDate;
        var overdueDays = 0;
        if (now.Date > dueDate.Date)
        {
            overdueDays = (now.Date - dueDate.Date).Days;
            if (overdueDays < 0) overdueDays = 0;
        }

        var rule = await _returnRepository.GetActiveFineRuleAsync();
        decimal finePerDay = rule?.FinePerDay ?? 5000m;
        decimal basePrice = book?.BasePrice ?? 50000m;

        // Quy tắc 10.1: Tiền phạt trễ hạn = Số ngày trễ hạn x Mức phạt trễ hạn quy định
        decimal rawOverdueFine = overdueDays * finePerDay;

        // Quy tắc 10.2: Ràng buộc mức trần: không bao giờ vượt quá 100% giá bìa gốc của cuốn sách
        decimal overdueFine = Math.Min(rawOverdueFine, basePrice);
        bool isFineCapped = rawOverdueFine > basePrice;

        // Làm tròn chẵn đến hàng nghìn đồng theo đúng quy tắc tài chính kế toán hiện hành của Việt Nam
        decimal roundedOverdueFine = Math.Round(overdueFine / 1000m, MidpointRounding.AwayFromZero) * 1000m;

        // Tỷ lệ giảm trừ theo điểm tín nhiệm độc giả (US ưu tiên & BUG 007):
        // 90-100: tự động giảm 20% (rule?.ConductScoreDiscountPercent ?? 20m)
        // 80-89: tự động giảm 10% (rule?.AiDiscount_90 ?? 10m)
        // < 80: tự động giảm 0%
        int creditScore = reader?.CreditScore ?? 100;
        decimal creditDiscountPercent = 0m;
        if (creditScore >= 90)
        {
            creditDiscountPercent = rule?.ConductScoreDiscountPercent ?? 20.0m;
        }
        else if (creditScore >= 80)
        {
            creditDiscountPercent = rule?.AiDiscount_90 ?? 10.0m;
        }

        decimal rawCreditDiscountAmt = (roundedOverdueFine * creditDiscountPercent) / 100m;
        decimal creditDiscountAmt = Math.Round(rawCreditDiscountAmt / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal estimatedFinalFine = Math.Max(0m, roundedOverdueFine - creditDiscountAmt);

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
            BasePrice = basePrice,
            ReaderId = reader?.ReaderID ?? 0,
            ReaderName = reader?.User?.FullName ?? "Bạn đọc",
            ReaderCode = reader?.ReaderCode ?? string.Empty,
            MemberType = reader?.MemberType ?? "Student",
            Department = DepartmentHelper.FormatDepartment(reader?.Faculty, reader?.MemberType),
            CreditScore = creditScore,
            CreditDiscountPercent = creditDiscountPercent,
            CreditDiscountAmount = creditDiscountAmt,
            EstimatedFinalFine = estimatedFinalFine,
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            OverdueDays = overdueDays,
            IsOverdue = overdueDays > 0,
            EstimatedOverdueFine = roundedOverdueFine,
            RawOverdueFine = rawOverdueFine,
            OverdueFine = roundedOverdueFine,
            OverdueFineCap = basePrice,
            IsFineCapped = isFineCapped,
            FinePerDay = finePerDay,
            DamageMultiplier = rule?.DamageMultiplier ?? 1.0m,
            DamageFeePercent = rule?.DamageFeePercent ?? 20.0m,
            DamageMediumPercent = rule?.DamageMediumPercent ?? 40.0m,
            DamageSeverePercent = rule?.DamageSeverePercent ?? 110.0m,
            CompensationBasePercent = rule?.CompensationBasePercent ?? 110.0m,
            CurrentItemStatus = detail.ItemStatus,
            TotalItemsInBorrowing = totalItems,
            ReturnedItemsCount = returnedItems,
            // Nạp danh sách tất cả các cuốn sách của phiếu mượn để xử lý trả nhiều cuốn
            Items = allDetails.Select(d =>
            {
                var itPrice = d.BookCopy?.Book?.BasePrice ?? 50000m;
                var itRawFine = overdueDays * finePerDay;
                var itCapped = Math.Min(itRawFine, itPrice);
                var itRoundedFine = overdueDays > 0 ? Math.Round(itCapped / 1000m, MidpointRounding.AwayFromZero) * 1000m : 0m;
                var isRet = d.ReturnDate != null || d.ItemStatus != "Borrowed";

                return new ReturnLookupItemDto
                {
                    DetailId = d.DetailID,
                    CopyId = d.CopyID,
                    Barcode = d.BookCopy?.Barcode ?? string.Empty,
                    BookId = d.BookCopy?.Book?.BookID ?? 0,
                    BookTitle = d.BookCopy?.Book?.Title ?? "Tài liệu thư viện",
                    Author = d.BookCopy?.Book?.Author ?? "Nhiều tác giả",
                    BasePrice = itPrice,
                    CurrentItemStatus = d.ItemStatus,
                    ReturnDate = d.ReturnDate,
                    IsReturned = isRet,
                    OverdueFine = itRoundedFine
                };
            }).ToList()
        };

        return ApiResponse<ReturnLookupResponseDto>.SuccessResult(response, "Tra cứu thông tin sách mượn thành công.");
    }

    /// <summary>
    /// Xử lý tiếp nhận trả một bản sao sách cụ thể theo Barcode, cập nhật tình trạng vật lý và tính phạt (US-10).
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

        // 2. Tính số ngày quá hạn tự động theo Quy tắc 10.1
        var overdueDays = 0;
        if (now.Date > dueDate.Date)
        {
            overdueDays = (now.Date - dueDate.Date).Days;
            if (overdueDays < 0) overdueDays = 0;
        }

        var rule = await _returnRepository.GetActiveFineRuleAsync();
        decimal finePerDay = rule?.FinePerDay ?? 5000m;
        decimal basePrice = book?.BasePrice ?? 50000m;

        // Quy tắc 10.1: Tiền phạt trễ hạn = Số ngày trễ hạn x Mức phạt trễ hạn quy định
        decimal rawOverdueFine = overdueDays * finePerDay;

        // Quy tắc 10.2: Ràng buộc mức trần tiền phạt trễ hạn: không vượt quá 100% giá bìa gốc
        decimal overdueFine = Math.Min(rawOverdueFine, basePrice);
        bool isFineCapped = rawOverdueFine > basePrice;

        // 3. Tính phụ phí theo tình trạng kiểm tra thực tế theo Quy tắc 10.3
        var condition = string.IsNullOrWhiteSpace(request.Condition) ? "Good" : request.Condition.Trim();
        decimal damageFee = 0m;
        decimal lostFee = 0m;

        if (condition.Equals("DamagedLight", StringComparison.OrdinalIgnoreCase))
        {
            // Trường hợp 1: Hư hỏng nhẹ (rách nhẹ bìa/mép trang) - mặc định 20%
            decimal lightPct = (request.DamagePercent.HasValue && request.DamagePercent.Value > 0)
                ? request.DamagePercent.Value
                : (rule?.DamageFeePercent ?? 20.0m);
            damageFee = basePrice * (lightPct / 100m);
        }
        else if (condition.Equals("DamagedMedium", StringComparison.OrdinalIgnoreCase) ||
                 condition.Equals("Damaged", StringComparison.OrdinalIgnoreCase))
        {
            // Trường hợp 2: Hư hỏng vừa (gãy gáy, vẽ bẩn một số trang) - mặc định 40%
            decimal medPct = (request.DamagePercent.HasValue && request.DamagePercent.Value > 0)
                ? request.DamagePercent.Value
                : (rule?.DamageMediumPercent ?? 40.0m);
            damageFee = basePrice * (medPct / 100m);
        }
        else if (condition.Equals("DamagedSevere", StringComparison.OrdinalIgnoreCase))
        {
            // Trường hợp 3: Hư hỏng nặng (rách nát, ngấm nước hỏng hoàn toàn) - mặc định 110%
            decimal severePct = (request.DamagePercent.HasValue && request.DamagePercent.Value > 0)
                ? request.DamagePercent.Value
                : (rule?.DamageSeverePercent ?? 110.0m);
            damageFee = basePrice * (severePct / 100m);
        }
        else if (condition.Equals("Lost", StringComparison.OrdinalIgnoreCase))
        {
            // Trường hợp 4: Thất lạc / Báo mất tài liệu - mặc định 110%
            decimal lostPct = (request.DamagePercent.HasValue && request.DamagePercent.Value > 0)
                ? request.DamagePercent.Value
                : (rule?.CompensationBasePercent ?? 110.0m);
            lostFee = basePrice * (lostPct / 100m);
        }

        // Quy tắc: Nếu sách vừa trễ hạn vừa bị mất/hỏng:
        // Tổng nghĩa vụ = Tiền phạt trễ hạn tính đến ngày trả/báo mất (có áp trần) + Tổng phí bồi thường
        decimal rawTotal = overdueFine + damageFee + lostFee;

        // 4. Áp dụng giảm trừ tự động theo điểm tín nhiệm độc giả (BUG 007 & US ưu tiên)
        int creditScore = reader?.CreditScore ?? 100;
        decimal creditDiscountPercent = 0m;
        if (creditScore >= 90)
        {
            creditDiscountPercent = rule?.ConductScoreDiscountPercent ?? 20.0m;
        }
        else if (creditScore >= 80)
        {
            creditDiscountPercent = rule?.AiDiscount_90 ?? 10.0m;
        }

        // Tách miễn giảm thủ công do thủ thư chỉ định (request.WaiverDiscountPercent)
        decimal manualWaiverPercent = Math.Clamp(request.WaiverDiscountPercent, 0m, 100m);
        decimal totalDiscountPercent = Math.Clamp(creditDiscountPercent + manualWaiverPercent, 0m, 100m);

        decimal rawCreditDiscountAmt = (rawTotal * creditDiscountPercent) / 100m;
        decimal rawManualWaiverAmt = (rawTotal * manualWaiverPercent) / 100m;
        decimal rawTotalDiscountAmt = (rawTotal * totalDiscountPercent) / 100m;

        // Làm tròn chẵn đến hàng nghìn đồng theo đúng quy tắc tài chính kế toán hiện hành của Việt Nam
        decimal roundedOverdueFine = Math.Round(overdueFine / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal roundedDamageFee = Math.Round(damageFee / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal roundedLostFee = Math.Round(lostFee / 1000m, MidpointRounding.AwayFromZero) * 1000m;

        decimal roundedCreditDiscountAmt = Math.Round(rawCreditDiscountAmt / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal roundedManualWaiverAmt = Math.Round(rawManualWaiverAmt / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal roundedDiscountAmt = Math.Min(rawTotal, Math.Round(rawTotalDiscountAmt / 1000m, MidpointRounding.AwayFromZero) * 1000m);
        decimal finalTotal = Math.Max(0m, rawTotal - roundedDiscountAmt);

        // 5. Thực thi Transaction SQL an toàn
        var result = await _returnRepository.ProcessReturnWithTransactionAsync(
            detail.DetailID,
            condition,
            request.Note,
            totalDiscountPercent,
            roundedOverdueFine,
            roundedDamageFee,
            roundedLostFee,
            librarianId
        );

        if (!result.Success)
        {
            return ApiResponse<ReturnBookResponseDto>.ErrorResult(result.Message);
        }

        var borrowCode = $"PM-{borrowing.BorrowingID:D4}";

        var isDamagedBool = condition.StartsWith("Damaged", StringComparison.OrdinalIgnoreCase);
        var isLostBool = condition.Equals("Lost", StringComparison.OrdinalIgnoreCase);

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
            Department = DepartmentHelper.FormatDepartment(reader?.Faculty, reader?.MemberType),
            BasePrice = basePrice,
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            ReturnDate = now,
            ItemStatus = isDamagedBool ? "Damaged" : (isLostBool ? "Lost" : "Returned"),
            CopyStatus = isDamagedBool ? "Damaged" : (isLostBool ? "Lost" : "Available"),
            OverdueDays = overdueDays,
            RawOverdueFine = rawOverdueFine,
            OverdueFine = roundedOverdueFine,
            IsFineCapped = isFineCapped,
            DamageFee = roundedDamageFee,
            LostFee = roundedLostFee,
            CreditScore = creditScore,
            CreditDiscountPercent = creditDiscountPercent,
            CreditDiscountAmount = roundedCreditDiscountAmt,
            WaiverDiscountPercent = manualWaiverPercent,
            WaiverDiscountAmount = roundedManualWaiverAmt,
            TotalDiscountPercent = totalDiscountPercent,
            DiscountAmount = roundedDiscountAmt,
            TotalFine = finalTotal,
            IsOverdue = overdueDays > 0,
            IsDamaged = isDamagedBool,
            IsLost = isLostBool,
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
