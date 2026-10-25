using System.Text.RegularExpressions;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Notifications;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ nghiệp vụ quét, gửi và quản lý cảnh báo trễ hạn cho Thủ thư (Admin & Staff).
/// </summary>
public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;

    public NotificationService(INotificationRepository notificationRepository)
    {
        _notificationRepository = notificationRepository;
    }

    /// <summary>
    /// Quét toàn bộ hệ thống các phiếu mượn trễ hạn / sắp trễ hạn và gửi cảnh báo tới các Thủ thư.
    /// </summary>
    public async Task<ApiResponse<OverdueWarningResultDto>> SendOverdueWarningsToLibrariansAsync(
        SendOverdueWarningRequestDto? request, 
        int? currentUserId)
    {
        var fineRule = await _notificationRepository.GetActiveFineRuleAsync();
        var finePerDay = fineRule?.FinePerDay ?? 5000m;
        var aiRiskThreshold = fineRule?.AiRiskThreshold ?? 80;
        var daysBeforeWindow = request?.DaysBefore ?? fineRule?.AiRemindDaysBefore ?? 3;

        // 1. Lấy danh sách Thủ thư cần nhận cảnh báo
        var librarians = await _notificationRepository.GetActiveLibrariansAsync();
        if (request?.SpecificLibrarianId.HasValue == true)
        {
            librarians = librarians.Where(u => u.UserID == request.SpecificLibrarianId.Value).ToList();
        }

        if (librarians.Count == 0)
        {
            return ApiResponse<OverdueWarningResultDto>.ErrorResult("Không tìm thấy Thủ thư nào đang hoạt động để nhận cảnh báo.");
        }

        // 2. Lấy danh sách các phiếu mượn quá hạn hoặc sắp đến hạn trong khoảng ngày cấu hình
        var borrowings = await _notificationRepository.GetOverdueBorrowingsAsync(daysBeforeWindow);

        // Nếu có yêu cầu quét riêng cho 1 phiếu mượn cụ thể
        if (request?.SpecificBorrowingId.HasValue == true)
        {
            borrowings = borrowings.Where(b => b.BorrowingID == request.SpecificBorrowingId.Value).ToList();
        }

        var now = DateTime.UtcNow;
        var twentyFourHoursAgo = now.AddHours(-24);

        var notificationsToCreate = new List<Notification>();
        var processedItems = new List<OverdueBorrowingItemDto>();
        int overdueCount = 0;
        int dueSoonCount = 0;
        int aiAtRiskCount = 0;

        foreach (var b in borrowings)
        {
            // Lấy danh sách các sách chưa trả trong phiếu
            var unreturnedDetails = b.BorrowingDetails
                .Where(bd => bd.ItemStatus == "Borrowed" && bd.ReturnDate == null)
                .ToList();

            if (unreturnedDetails.Count == 0) continue;

            var bookTitlesList = unreturnedDetails
                .Select(bd => bd.BookCopy?.Book?.Title ?? bd.BookCopy?.Barcode ?? "Tài liệu")
                .Distinct()
                .ToList();
            var bookTitles = string.Join(", ", bookTitlesList);
            var borrowCode = $"PM-{b.BorrowingID:D4}";

            var isOverdue = now.Date > b.DueDate.Date;
            var overdueDays = isOverdue ? (int)(now.Date - b.DueDate.Date).TotalDays : 0;
            var remainingDays = !isOverdue ? Math.Max(0, (int)(b.DueDate.Date - now.Date).TotalDays) : 0;
            var estimatedFine = overdueDays * finePerDay * unreturnedDetails.Count;

            // Đánh giá AI Risk từ Log gần nhất
            var latestAiLog = b.AIPredictionLogs?.OrderByDescending(l => l.EvaluatedAt).FirstOrDefault();
            var aiScore = latestAiLog?.RiskScore ?? 0m;
            var aiTier = aiScore >= 70 ? "High" : (aiScore >= 40 ? "Medium" : "Low");

            if (isOverdue) overdueCount++;
            else if (remainingDays <= daysBeforeWindow) dueSoonCount++;
            if (aiScore >= aiRiskThreshold) aiAtRiskCount++;

            var itemDto = new OverdueBorrowingItemDto
            {
                BorrowingID = b.BorrowingID,
                ReaderID = b.ReaderID,
                ReaderCode = b.Reader?.ReaderCode ?? string.Empty,
                ReaderName = b.Reader?.User?.FullName ?? "Độc giả",
                Faculty = b.Reader?.Faculty ?? "CNTT",
                MemberType = b.Reader?.MemberType ?? "Student",
                BookTitles = bookTitles,
                BookCount = unreturnedDetails.Count,
                BorrowDate = b.BorrowDate,
                DueDate = b.DueDate,
                IsOverdue = isOverdue,
                OverdueDays = overdueDays,
                RemainingDays = remainingDays,
                EstimatedFine = estimatedFine,
                AIRiskScore = aiScore,
                AIRiskTier = aiTier
            };
            processedItems.Add(itemDto);

            // Xây dựng thông điệp cảnh báo tiêu chuẩn
            string message;
            if (isOverdue)
            {
                message = $"[CẢNH BÁO TRỄ HẠN] Độc giả {itemDto.ReaderName} ({itemDto.ReaderCode} - Khoa {itemDto.Faculty}) mượn {itemDto.BookCount} cuốn ('{bookTitles}') theo phiếu #{borrowCode} đã QUÁ HẠN {overdueDays} ngày (Hạn trả: {b.DueDate:dd/MM/yyyy}). Tiền phạt ước tính: {estimatedFine:N0} VNĐ. Khuyến nghị: Thủ thư chủ động liên hệ thu hồi sách.";
            }
            else if (remainingDays <= daysBeforeWindow)
            {
                message = $"[NHẮC NHỞ SẮP ĐẾN HẠN] Độc giả {itemDto.ReaderName} ({itemDto.ReaderCode} - Khoa {itemDto.Faculty}) mượn {itemDto.BookCount} cuốn ('{bookTitles}') theo phiếu #{borrowCode} sắp đến hạn trong {remainingDays} ngày (Hạn trả: {b.DueDate:dd/MM/yyyy}). Khuyến nghị: Thủ thư lưu ý nhắc nhở độc giả khi đến thư viện.";
            }
            else if (request?.IncludeAiAtRisk == true && aiScore >= aiRiskThreshold)
            {
                message = $"[CẢNH BÁO RỦI RO AI] Độc giả {itemDto.ReaderName} ({itemDto.ReaderCode}) mượn '{bookTitles}' theo phiếu #{borrowCode} có nguy cơ trễ hạn cao ({aiScore}%). Khuyến nghị: Thủ thư theo dõi sát sao.";
            }
            else
            {
                continue;
            }

            // Gửi thông báo đến danh sách Thủ thư (có cơ chế chống spam trùng lặp trong 24h)
            foreach (var librarian in librarians)
            {
                var alreadyNotified = await _notificationRepository.HasRecentWarningAsync(
                    librarian.UserID, 
                    borrowCode, 
                    twentyFourHoursAgo);

                if (!alreadyNotified)
                {
                    notificationsToCreate.Add(new Notification
                    {
                        UserID = librarian.UserID,
                        Title = "Cảnh báo mượn sách trễ hạn",
                        Type = isOverdue ? "Overdue" : (remainingDays <= daysBeforeWindow ? "DueSoon" : "AIRisk"),
                        Message = message,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
        }

        // Lưu toàn bộ thông báo mới vào CSDL
        if (notificationsToCreate.Count > 0)
        {
            await _notificationRepository.AddNotificationsRangeAsync(notificationsToCreate);
        }

        var resultDto = new OverdueWarningResultDto
        {
            TotalOverdueFound = overdueCount,
            TotalDueSoonFound = dueSoonCount,
            TotalAiAtRiskFound = aiAtRiskCount,
            NotificationsCreated = notificationsToCreate.Count,
            LibrariansNotifiedCount = librarians.Count,
            NotifiedLibrarianNames = librarians.Select(l => $"{l.FullName} ({l.Username})").ToList(),
            ProcessedItems = processedItems,
            SummaryMessage = notificationsToCreate.Count > 0
                ? $"Đã quét thành công {borrowings.Count} phiếu mượn và tạo {notificationsToCreate.Count} thông báo cảnh báo trễ hạn gửi tới {librarians.Count} Thủ thư."
                : $"Đã quét {borrowings.Count} phiếu mượn. Toàn bộ các cảnh báo gần đây đã được gửi trong 24 giờ qua (không tạo thêm thông báo trùng lặp)."
        };

        return ApiResponse<OverdueWarningResultDto>.SuccessResult(resultDto, resultDto.SummaryMessage);
    }

    /// <summary>
    /// Gửi cảnh báo trễ hạn cho một phiếu mượn cụ thể tới Thủ thư.
    /// </summary>
    public async Task<ApiResponse<OverdueWarningResultDto>> SendOverdueWarningForBorrowingAsync(
        int borrowingId, 
        int? currentUserId)
    {
        var request = new SendOverdueWarningRequestDto
        {
            SpecificBorrowingId = borrowingId,
            DaysBefore = 30, // Cho phép quét cả khi phiếu sắp đến hạn
            IncludeAiAtRisk = true
        };

        return await SendOverdueWarningsToLibrariansAsync(request, currentUserId);
    }

    /// <summary>
    /// Lấy danh sách thông báo và cảnh báo của Thủ thư kèm phân trang và thống kê chưa đọc.
    /// </summary>
    public async Task<ApiResponse<NotificationSummaryResponseDto>> GetLibrarianNotificationsAsync(
        int userId, 
        bool? isRead, 
        int page, 
        int pageSize)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var notifications = await _notificationRepository.GetNotificationsByUserIdAsync(userId, isRead, page, pageSize);
        var totalCount = await _notificationRepository.GetNotificationCountByUserIdAsync(userId, isRead);
        var unreadCount = await _notificationRepository.GetUnreadCountAsync(userId);

        var now = DateTime.UtcNow;
        var items = notifications.Select(n => MapToNotificationDto(n, now)).ToList();

        var response = new NotificationSummaryResponseDto
        {
            TotalCount = totalCount,
            UnreadCount = unreadCount,
            Page = page,
            PageSize = pageSize,
            Items = items
        };

        return ApiResponse<NotificationSummaryResponseDto>.SuccessResult(response, "Lấy danh sách thông báo thành công.");
    }

    /// <summary>
    /// Lấy số lượng thông báo chưa đọc của Thủ thư (dùng cho Badge trên thanh Header).
    /// </summary>
    public async Task<ApiResponse<int>> GetUnreadCountAsync(int userId)
    {
        var unreadCount = await _notificationRepository.GetUnreadCountAsync(userId);
        return ApiResponse<int>.SuccessResult(unreadCount, "Lấy số lượng thông báo chưa đọc thành công.");
    }

    /// <summary>
    /// Đánh dấu một thông báo là đã đọc.
    /// </summary>
    public async Task<ApiResponse<bool>> MarkAsReadAsync(int notificationId, int userId)
    {
        var success = await _notificationRepository.MarkAsReadAsync(notificationId, userId);
        if (!success)
        {
            return ApiResponse<bool>.ErrorResult("Không tìm thấy thông báo hoặc bạn không có quyền cập nhật thông báo này.");
        }

        return ApiResponse<bool>.SuccessResult(true, "Đánh dấu thông báo đã đọc thành công.");
    }

    /// <summary>
    /// Đánh dấu toàn bộ thông báo của Thủ thư là đã đọc.
    /// </summary>
    public async Task<ApiResponse<int>> MarkAllAsReadAsync(int userId)
    {
        var updatedCount = await _notificationRepository.MarkAllAsReadAsync(userId);
        return ApiResponse<int>.SuccessResult(updatedCount, $"Đã đánh dấu {updatedCount} thông báo là đã đọc.");
    }

    /// <summary>
    /// Xóa một thông báo.
    /// </summary>
    public async Task<ApiResponse<bool>> DeleteNotificationAsync(int notificationId, int userId)
    {
        var success = await _notificationRepository.DeleteAsync(notificationId, userId);
        if (!success)
        {
            return ApiResponse<bool>.ErrorResult("Không tìm thấy thông báo hoặc bạn không có quyền xóa thông báo này.");
        }

        return ApiResponse<bool>.SuccessResult(true, "Xóa thông báo thành công.");
    }

    /// <summary>
    /// Lấy danh sách tóm tắt toàn bộ các ca mượn sách đang quá hạn hoặc sắp quá hạn trong hệ thống.
    /// </summary>
    public async Task<ApiResponse<List<OverdueBorrowingItemDto>>> GetOverdueBorrowingsSummaryAsync(int? daysBeforeWindow = 0)
    {
        var fineRule = await _notificationRepository.GetActiveFineRuleAsync();
        var finePerDay = fineRule?.FinePerDay ?? 5000m;
        var borrowings = await _notificationRepository.GetOverdueBorrowingsAsync(daysBeforeWindow);
        var now = DateTime.UtcNow;

        var items = borrowings.Select(b =>
        {
            var unreturnedDetails = b.BorrowingDetails
                .Where(bd => bd.ItemStatus == "Borrowed" && bd.ReturnDate == null)
                .ToList();

            var bookTitles = string.Join(", ", unreturnedDetails
                .Select(bd => bd.BookCopy?.Book?.Title ?? bd.BookCopy?.Barcode ?? "Tài liệu")
                .Distinct());

            var isOverdue = now.Date > b.DueDate.Date;
            var overdueDays = isOverdue ? (int)(now.Date - b.DueDate.Date).TotalDays : 0;
            var remainingDays = !isOverdue ? Math.Max(0, (int)(b.DueDate.Date - now.Date).TotalDays) : 0;
            var estimatedFine = overdueDays * finePerDay * unreturnedDetails.Count;

            var latestAiLog = b.AIPredictionLogs?.OrderByDescending(l => l.EvaluatedAt).FirstOrDefault();
            var aiScore = latestAiLog?.RiskScore ?? 0m;
            var aiTier = aiScore >= 70 ? "High" : (aiScore >= 40 ? "Medium" : "Low");

            return new OverdueBorrowingItemDto
            {
                BorrowingID = b.BorrowingID,
                ReaderID = b.ReaderID,
                ReaderCode = b.Reader?.ReaderCode ?? string.Empty,
                ReaderName = b.Reader?.User?.FullName ?? "Độc giả",
                Faculty = b.Reader?.Faculty ?? "CNTT",
                MemberType = b.Reader?.MemberType ?? "Student",
                BookTitles = bookTitles,
                BookCount = unreturnedDetails.Count,
                BorrowDate = b.BorrowDate,
                DueDate = b.DueDate,
                IsOverdue = isOverdue,
                OverdueDays = overdueDays,
                RemainingDays = remainingDays,
                EstimatedFine = estimatedFine,
                AIRiskScore = aiScore,
                AIRiskTier = aiTier
            };
        }).ToList();

        return ApiResponse<List<OverdueBorrowingItemDto>>.SuccessResult(items, $"Lấy danh sách {items.Count} ca mượn quá hạn / sắp đến hạn thành công.");
    }

    /// <summary>
    /// Ánh xạ đối tượng Notification sang NotificationDto và bóc tách các trường ngữ nghĩa.
    /// </summary>
    private static NotificationDto MapToNotificationDto(Notification n, DateTime now)
    {
        var msg = n.Message;
        string type = "General";
        string severity = "info";

        if (msg.Contains("[CẢNH BÁO TRỄ HẠN]", StringComparison.OrdinalIgnoreCase))
        {
            type = "Overdue";
            severity = "danger";
        }
        else if (msg.Contains("[NHẮC NHỞ SẮP ĐẾN HẠN]", StringComparison.OrdinalIgnoreCase))
        {
            type = "DueSoon";
            severity = "warning";
        }
        else if (msg.Contains("[CẢNH BÁO RỦI RO AI]", StringComparison.OrdinalIgnoreCase))
        {
            type = "AIRisk";
            severity = "warning";
        }

        // Bóc tách mã phiếu mượn (Ví dụ: #PM-0001 hoặc PM-0001)
        string? borrowCode = null;
        int? borrowingId = null;
        var codeMatch = Regex.Match(msg, @"#(PM-\d+)");
        if (!codeMatch.Success)
        {
            codeMatch = Regex.Match(msg, @"(PM-\d+)");
        }
        if (codeMatch.Success)
        {
            borrowCode = codeMatch.Groups[1].Value;
            var idPart = borrowCode.Replace("PM-", "");
            if (int.TryParse(idPart, out int parsedId))
            {
                borrowingId = parsedId;
            }
        }

        // Bóc tách số ngày quá hạn (Ví dụ: QUÁ HẠN 5 ngày)
        int? overdueDays = null;
        var overdueMatch = Regex.Match(msg, @"QUÁ HẠN\s+(\d+)\s+ngày", RegexOptions.IgnoreCase);
        if (overdueMatch.Success && int.TryParse(overdueMatch.Groups[1].Value, out int days))
        {
            overdueDays = days;
        }

        return new NotificationDto
        {
            NotificationID = n.NotificationID,
            UserID = n.UserID,
            Message = n.Message,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
            TimeAgo = FormatTimeAgo(n.CreatedAt, now),
            Type = type,
            Severity = severity,
            BorrowCode = borrowCode,
            BorrowingID = borrowingId,
            OverdueDays = overdueDays
        };
    }

    /// <summary>
    /// Định dạng thời gian trôi qua thân thiện bằng tiếng Việt.
    /// </summary>
    private static string FormatTimeAgo(DateTime createdAt, DateTime now)
    {
        var diff = now - createdAt;
        if (diff.TotalMinutes < 1) return "Vừa xong";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} phút trước";
        if (diff.TotalHours < 24) return $"{(int)diff.TotalHours} giờ trước";
        if (diff.TotalDays < 2) return "Hôm qua";
        if (diff.TotalDays < 7) return $"{(int)diff.TotalDays} ngày trước";
        return createdAt.ToString("dd/MM/yyyy HH:mm");
    }
}
