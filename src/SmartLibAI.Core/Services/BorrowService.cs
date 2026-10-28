using SmartLibAI.Core.Common;
using SmartLibAI.Core.DTOs.AI;
using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ mượn sách, thẩm định điều kiện độc giả và kiểm soát giao dịch an toàn (Story LOLRA-16).
/// Tích hợp mô hình AI ONNX Runtime đánh giá rủi ro trễ hạn theo thời gian thực (Story LOLRA-88).
/// </summary>
public class BorrowService : IBorrowService
{
    private readonly IBorrowRepository _borrowRepository;
    private readonly IAIPredictionService _aiPredictionService;

    public BorrowService(IBorrowRepository borrowRepository, IAIPredictionService aiPredictionService)
    {
        _borrowRepository = borrowRepository;
        _aiPredictionService = aiPredictionService;
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

        // 4. Lấy quy định lưu thông hiện hành để xác định hạn mức mượn và ngưỡng nợ phạt (Story LOLRA-72, US-08.1)
        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        var debtThreshold = fineRule?.DebtLockAmount ?? 50000m;

        // 5. Kiểm tra nợ phạt chưa thanh toán (US-08.1: chỉ từ chối mượn khi tổng nợ vượt quá 50.000 VNĐ hoặc ngưỡng quy định)
        var unpaidFines = await _borrowRepository.CheckUnpaidFinesByReaderIdAsync(reader.ReaderID);
        if (unpaidFines.TotalUnpaidAmount > debtThreshold)
        {
            return ApiResponse<BorrowResponseDto>.ErrorResult(
                $"Độc giả đang có tiền phạt chưa thanh toán ({unpaidFines.TotalUnpaidAmount:N0} VNĐ) vượt quá ngưỡng cho phép ({debtThreshold:N0} VNĐ). Hệ thống từ chối tạo phiếu mượn mới cho đến khi hoàn tất đóng phạt.");
        }

        // 6. Kiểm tra hạn mức mượn tối đa của độc giả (AC: không vượt quá 5 cuốn hoặc hạn mức quy định)
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

        // 7. Xác định ngày hẹn trả sách (DueDate) và ràng buộc theo quy định FineRules
        var standardBorrowDays = fineRule != null
            ? (isLecturer ? fineRule.LecturerBorrowDays : fineRule.StudentBorrowDays)
            : (isLecturer ? 30 : 14);

        DateTime dueDate;
        if (request.DueDate.HasValue && request.DueDate.Value > DateTime.UtcNow)
        {
            // Kiểm tra ràng buộc: ngày hẹn trả không được vượt quá số ngày mượn tiêu chuẩn cấu hình
            var maxAllowedDate = DateTime.UtcNow.Date.AddDays(standardBorrowDays);
            if (request.DueDate.Value.Date > maxAllowedDate)
            {
                var roleName = isLecturer ? "Cán bộ & Giảng viên" : "Bạn đọc Sinh viên";
                return ApiResponse<BorrowResponseDto>.ErrorResult(
                    $"Hạn trả dự kiến ({request.DueDate.Value:dd/MM/yyyy}) vượt quá số ngày mượn tiêu chuẩn quy định cho {roleName} ({standardBorrowDays} ngày). Vui lòng điều chỉnh lại.");
            }
            dueDate = request.DueDate.Value;
        }
        else
        {
            dueDate = DateTime.UtcNow.AddDays(standardBorrowDays);
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
        Borrowing createdBorrowing;
        try
        {
            createdBorrowing = await _borrowRepository.CreateBorrowingWithTransactionAsync(borrowing, copyIds);
        }
        catch (InvalidOperationException ex)
        {
            // Trả về lỗi nghiệp vụ khi phát sinh tranh chấp hoặc bản sao không còn khả dụng
            return ApiResponse<BorrowResponseDto>.ErrorResult(ex.Message);
        }

        // 10. AI Risk Assessment & Logging (Ghi nhận dự báo rủi ro vào AIPredictionLogs)
        try
        {
            var historicalOverdueCount = await _borrowRepository.GetOverdueHistoryCountAsync(reader.ReaderID);
            var durationDays = (int)Math.Max(1, (dueDate.Date - DateTime.UtcNow.Date).TotalDays);

            var riskInput = new ReaderRiskInputDto
            {
                Faculty = reader.Faculty ?? "CNTT",
                MemberType = reader.MemberType,
                CreditScore = reader.CreditScore,
                CurrentHoldingBooks = currentBorrowCount + requestedCount,
                HistoricalOverdueCount = historicalOverdueCount,
                BorrowDurationDays = durationDays,
                TotalCurrentDebt = unpaidFines.TotalUnpaidAmount,
                IsExamSeason = IsExamSeasonNow()
            };

            var aiResult = _aiPredictionService.EvaluateBorrowRisk(riskInput);

            var aiLog = new AIPredictionLog
            {
                BorrowingID = createdBorrowing.BorrowingID,
                RiskScore = Math.Round(aiResult.RiskScore * 100m, 2), // Lưu thang điểm 0 - 100 theo schema decimal(5,2)
                SuggestedAction = aiResult.SuggestedAction,
                EvaluatedAt = DateTime.UtcNow
            };

            await _borrowRepository.AddAIPredictionLogAsync(aiLog);
        }
        catch
        {
            // Ghi nhật ký AI chạy bảo vệ, không làm gián đoạn transaction mượn sách thành công
        }

        // 11. Lấy chi tiết phiếu mượn hoàn chỉnh và ánh xạ sang DTO trả về cho client
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
        var standardBorrowDays = fineRule != null
            ? (isLecturer ? fineRule.LecturerBorrowDays : fineRule.StudentBorrowDays)
            : (isLecturer ? 30 : 14);
        var debtThreshold = fineRule?.DebtLockAmount ?? 50000m;

        var currentBorrowCount = await _borrowRepository.GetActiveBorrowCountByReaderIdAsync(reader.ReaderID);
        var unpaidFines = await _borrowRepository.CheckUnpaidFinesByReaderIdAsync(reader.ReaderID);
        var historicalOverdueCount = await _borrowRepository.GetOverdueHistoryCountAsync(reader.ReaderID);

        // Gọi mô hình AI ONNX Runtime đánh giá rủi ro trễ hạn theo thời gian thực (Story LOLRA-88)
        var riskInput = new ReaderRiskInputDto
        {
            Faculty = reader.Faculty ?? "CNTT",
            MemberType = reader.MemberType,
            CreditScore = reader.CreditScore,
            CurrentHoldingBooks = currentBorrowCount,
            HistoricalOverdueCount = historicalOverdueCount,
            BorrowDurationDays = standardBorrowDays,
            TotalCurrentDebt = unpaidFines.TotalUnpaidAmount,
            IsExamSeason = IsExamSeasonNow()
        };

        var aiEvaluation = _aiPredictionService.EvaluateBorrowRisk(riskInput);

        var dto = new BorrowReaderEligibilityDto
        {
            ReaderID = reader.ReaderID,
            ReaderCode = reader.ReaderCode,
            FullName = reader.User?.FullName ?? string.Empty,
            MemberType = reader.MemberType,
            Faculty = reader.Faculty ?? "CNTT",
            Department = DepartmentHelper.FormatDepartment(reader.Faculty, reader.MemberType),
            IsActive = reader.User?.IsActive ?? false,
            ExpiryDate = reader.ExpiryDate,
            CurrentBorrowCount = currentBorrowCount,
            MaxBorrowLimit = maxLimit,
            StandardBorrowDays = standardBorrowDays,
            HasUnpaidFines = unpaidFines.HasUnpaidFines,
            UnpaidFineAmount = unpaidFines.TotalUnpaidAmount,
            DebtLockThreshold = debtThreshold,
            CreditScore = reader.CreditScore,
            AiRiskScore = aiEvaluation.RiskScore,
            AiRiskTier = aiEvaluation.RiskTier,
            AiRiskBadgeColor = aiEvaluation.BadgeColor,
            AiSuggestedAction = aiEvaluation.SuggestedAction
        };

        if (!dto.IsActive)
        {
            dto.RejectionReason = "Tài khoản thẻ thư viện đang bị khóa.";
        }
        else if (dto.IsExpired)
        {
            dto.RejectionReason = $"Thẻ thư viện đã hết hạn vào ngày {reader.ExpiryDate:dd/MM/yyyy}.";
        }
        else if (dto.IsDebtBlocked)
        {
            dto.RejectionReason = $"Độc giả đang có tiền phạt chưa đóng ({dto.UnpaidFineAmount:N0} VNĐ) vượt quá ngưỡng cho phép ({dto.DebtLockThreshold:N0} VNĐ).";
        }
        else if (dto.RemainingBorrowLimit <= 0)
        {
            dto.RejectionReason = $"Đã đạt hạn mức mượn tối đa ({maxLimit} cuốn).";
        }

        return ApiResponse<BorrowReaderEligibilityDto>.SuccessResult(dto, "Kiểm tra tư cách mượn sách thành công.");
    }

    /// <summary>
    /// Kiểm tra thời điểm hiện tại có thuộc mùa thi cử cao điểm hay không (tháng 5 hoặc tháng 11).
    /// </summary>
    private static bool IsExamSeasonNow()
    {
        var month = DateTime.UtcNow.Month;
        return month == 5 || month == 11;
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

        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        return ApiResponse<BorrowResponseDto>.SuccessResult(MapToBorrowResponseDto(borrowing, fineRule), "Lấy chi tiết phiếu mượn thành công.");
    }

    /// <summary>
    /// Lấy danh sách phiếu mượn gần nhất phục vụ hiển thị quầy lưu thông.
    /// </summary>
    public async Task<ApiResponse<IReadOnlyList<BorrowResponseDto>>> GetRecentBorrowingsAsync(int count = 20)
    {
        var borrowings = await _borrowRepository.GetRecentBorrowingsAsync(count);
        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        var dtoList = borrowings.Select(b => MapToBorrowResponseDto(b, fineRule)).ToList();

        return ApiResponse<IReadOnlyList<BorrowResponseDto>>.SuccessResult(dtoList, "Lấy danh sách phiếu mượn gần nhất thành công.");
    }

    /// <summary>
    /// Xử lý gia hạn mượn sách theo ID phiếu mượn hoặc mã vạch bản sao (BUG-045 & US-08.2).
    /// </summary>
    public async Task<ApiResponse<RenewBorrowResponseDto>> RenewBorrowingAsync(RenewBorrowRequestDto request, int? librarianId = null)
    {
        Borrowing? borrowing = null;

        if (request.BorrowingId.HasValue && request.BorrowingId.Value > 0)
        {
            borrowing = await _borrowRepository.GetBorrowingDetailByIdAsync(request.BorrowingId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.Barcode))
        {
            borrowing = await _borrowRepository.GetActiveBorrowingByBarcodeAsync(request.Barcode.Trim());
        }

        if (borrowing == null)
        {
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult("Không tìm thấy phiếu mượn hợp lệ để thực hiện gia hạn.");
        }

        if (!string.Equals(borrowing.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult($"Phiếu mượn không ở trạng thái hoạt động (Trạng thái hiện tại: {borrowing.Status}).");
        }

        // Kiểm tra xem tất cả các cuốn sách trong phiếu đã được trả hay chưa
        var unreturnedItems = borrowing.BorrowingDetails
            .Where(d => d.ItemStatus == "Borrowed" && d.ReturnDate == null)
            .ToList();

        if (unreturnedItems.Count == 0)
        {
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult("Tất cả sách trong phiếu mượn này đã được hoàn trả, không thể gia hạn.");
        }

        // Lấy quy tắc hiện hành từ FineRule
        var fineRule = await _borrowRepository.GetActiveFineRuleAsync();
        var maxRenewalTimes = fineRule?.MaxRenewalTimes ?? 1;
        var renewalExtraDays = fineRule?.RenewalExtraDays ?? 7;

        // Quy tắc: Không cho phép gia hạn khi sách đã bị quá hạn
        var now = DateTime.UtcNow;
        if (now.Date > borrowing.DueDate.Date)
        {
            var overdueDays = (now.Date - borrowing.DueDate.Date).Days;
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult(
                $"Sách đã quá hạn {overdueDays} ngày (Hạn trả: {borrowing.DueDate:dd/MM/yyyy}). Theo quy định thư viện, không thể gia hạn sách đã quá hạn. Vui lòng làm thủ tục trả sách và nộp phạt nếu có.");
        }

        // Quy tắc: Không vượt quá số lần gia hạn tối đa
        if (borrowing.RenewalCount >= maxRenewalTimes)
        {
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult(
                $"Phiếu mượn đã đạt số lần gia hạn tối đa ({borrowing.RenewalCount}/{maxRenewalTimes} lần). Hệ thống không cho phép gia hạn thêm.");
        }

        // Quy tắc: Độc giả phải còn hiệu lực và không bị khóa nợ
        if (borrowing.Reader?.User != null && !borrowing.Reader.User.IsActive)
        {
            return ApiResponse<RenewBorrowResponseDto>.ErrorResult("Tài khoản thẻ thư viện của bạn đọc đang bị khóa. Không thể thực hiện gia hạn.");
        }

        if (borrowing.Reader != null)
        {
            var unpaidFines = await _borrowRepository.CheckUnpaidFinesByReaderIdAsync(borrowing.ReaderID);
            var debtThreshold = fineRule?.DebtLockAmount ?? 50000m;
            if (unpaidFines.TotalUnpaidAmount > debtThreshold)
            {
                return ApiResponse<RenewBorrowResponseDto>.ErrorResult(
                    $"Bạn đọc đang có tiền phạt chưa thanh toán ({unpaidFines.TotalUnpaidAmount:N0} VNĐ) vượt quá ngưỡng cho phép ({debtThreshold:N0} VNĐ). Vui lòng thanh toán nợ phạt trước khi gia hạn.");
            }
        }

        // Tiến hành gia hạn: Tăng số lần gia hạn và cộng thêm ngày vào hạn trả
        var oldDueDate = borrowing.DueDate;
        var newDueDate = borrowing.DueDate.AddDays(renewalExtraDays);

        borrowing.DueDate = newDueDate;
        borrowing.RenewalCount += 1;

        await _borrowRepository.UpdateBorrowingAsync(borrowing);

        var responseDto = new RenewBorrowResponseDto
        {
            BorrowingId = borrowing.BorrowingID,
            ReaderName = borrowing.Reader?.User?.FullName ?? "Bạn đọc",
            ReaderCode = borrowing.Reader?.ReaderCode ?? string.Empty,
            OldDueDate = oldDueDate,
            NewDueDate = newDueDate,
            ExtraDays = renewalExtraDays,
            RenewalCount = borrowing.RenewalCount,
            MaxRenewalTimes = maxRenewalTimes,
            Message = $"Gia hạn mượn thành công thêm {renewalExtraDays} ngày. Hạn trả mới: {newDueDate:dd/MM/yyyy}.",
            Items = borrowing.BorrowingDetails.Select(d => new BorrowItemDto
            {
                CopyID = d.CopyID,
                Barcode = d.BookCopy?.Barcode ?? string.Empty,
                BookID = d.BookCopy?.BookID ?? 0,
                Title = d.BookCopy?.Book?.Title ?? string.Empty,
                Author = d.BookCopy?.Book?.Author ?? string.Empty,
                CategoryName = d.BookCopy?.Book?.Category?.CategoryName ?? string.Empty,
                BasePrice = d.BookCopy?.Book?.BasePrice ?? 0m,
                ItemStatus = d.ItemStatus,
                ReturnDate = d.ReturnDate
            }).ToList()
        };

        return ApiResponse<RenewBorrowResponseDto>.SuccessResult(responseDto, $"Gia hạn phiếu mượn PM-{borrowing.BorrowingID:D4} thành công.");
    }

    /// <summary>
    /// Hàm tiện ích ánh xạ Entity Borrowing sang BorrowResponseDto.
    /// </summary>
    private static BorrowResponseDto MapToBorrowResponseDto(Borrowing borrowing, FineRule? fineRule = null)
    {
        var maxRenew = fineRule?.MaxRenewalTimes ?? 1;
        var extraDays = fineRule?.RenewalExtraDays ?? 7;
        var isOverdue = DateTime.UtcNow.Date > borrowing.DueDate.Date;
        var canRenew = string.Equals(borrowing.Status, "Active", StringComparison.OrdinalIgnoreCase)
                       && !isOverdue
                       && borrowing.RenewalCount < maxRenew;

        return new BorrowResponseDto
        {
            BorrowingID = borrowing.BorrowingID,
            ReaderID = borrowing.ReaderID,
            ReaderCode = borrowing.Reader?.ReaderCode ?? string.Empty,
            ReaderName = borrowing.Reader?.User?.FullName ?? string.Empty,
            MemberType = borrowing.Reader?.MemberType ?? "Standard",
            Department = DepartmentHelper.FormatDepartment(borrowing.Reader?.Faculty, borrowing.Reader?.MemberType),
            LibrarianID = borrowing.LibrarianID,
            LibrarianName = borrowing.Librarian?.FullName ?? string.Empty,
            BorrowDate = borrowing.BorrowDate,
            DueDate = borrowing.DueDate,
            Status = borrowing.Status,
            RenewalCount = borrowing.RenewalCount,
            MaxRenewalTimes = maxRenew,
            RenewalExtraDays = extraDays,
            CanRenew = canRenew,
            TotalItems = borrowing.BorrowingDetails.Count,
            Items = borrowing.BorrowingDetails.Select(d => new BorrowItemDto
            {
                CopyID = d.CopyID,
                Barcode = d.BookCopy?.Barcode ?? string.Empty,
                BookID = d.BookCopy?.BookID ?? 0,
                Title = d.BookCopy?.Book?.Title ?? string.Empty,
                Author = d.BookCopy?.Book?.Author ?? string.Empty,
                CategoryName = d.BookCopy?.Book?.Category?.CategoryName ?? string.Empty,
                BasePrice = d.BookCopy?.Book?.BasePrice ?? 0m,
                ItemStatus = d.ItemStatus,
                ReturnDate = d.ReturnDate
            }).ToList()
        };
    }
}
