using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Dịch vụ xử lý nghiệp vụ quản trị hồ sơ độc giả, phân tích rủi ro AI và khóa/mở khóa thẻ thư viện.
/// </summary>
public class ReaderService : IReaderService
{
    private readonly IReaderRepository _readerRepository;

    // Danh sách avatar mẫu đại diện để hiển thị UI đẹp mắt
    private static readonly string[] SampleAvatars = new[]
    {
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
    };

    public ReaderService(IReaderRepository readerRepository)
    {
        _readerRepository = readerRepository;
    }

    /// <summary>
    /// Lấy danh sách hồ sơ độc giả từ SQL Server có hỗ trợ lọc và tìm kiếm.
    /// </summary>
    public async Task<ApiResponse<List<ReaderDto>>> GetReadersAsync(string? faculty, string? status, string? risk, string? search)
    {
        var rawReaders = await _readerRepository.GetAllReadersWithDetailsAsync();
        var dtoList = rawReaders.Select(MapToReaderDto).ToList();

        // 1. Lọc theo Khoa/Viện
        if (!string.IsNullOrWhiteSpace(faculty) && !faculty.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            dtoList = dtoList.Where(r => r.Faculty.Equals(faculty, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        // 2. Lọc theo trạng thái Thẻ (active / locked)
        if (!string.IsNullOrWhiteSpace(status) && !status.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            dtoList = dtoList.Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        // 3. Lọc theo mức độ rủi ro AI (high / medium / low)
        if (!string.IsNullOrWhiteSpace(risk) && !risk.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            dtoList = dtoList.Where(r => r.RiskType.Equals(risk, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        // 4. Lọc theo từ khóa tìm kiếm (Mã thẻ / Họ tên / Email / Khoa)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            dtoList = dtoList.Where(r =>
                r.ReaderCode.ToLower().Contains(kw) ||
                r.FullName.ToLower().Contains(kw) ||
                (r.Email != null && r.Email.ToLower().Contains(kw)) ||
                r.Faculty.ToLower().Contains(kw) ||
                r.ClassGroup.ToLower().Contains(kw)
            ).ToList();
        }

        return ApiResponse<List<ReaderDto>>.SuccessResult(dtoList, "Lấy danh sách độc giả từ SQL Server thành công.");
    }

    /// <summary>
    /// Lấy chi tiết hồ sơ một độc giả theo ReaderID.
    /// </summary>
    public async Task<ApiResponse<ReaderDto>> GetReaderByIdAsync(int id)
    {
        var reader = await _readerRepository.GetReaderByIdWithDetailsAsync(id);
        if (reader == null)
        {
            return ApiResponse<ReaderDto>.ErrorResult($"Không tìm thấy thông tin bạn đọc với mã ID: {id}.");
        }

        return ApiResponse<ReaderDto>.SuccessResult(MapToReaderDto(reader), "Lấy chi tiết hồ sơ độc giả thành công.");
    }

    /// <summary>
    /// Thao tác Khóa / Mở khóa thẻ độc giả ngay lập tức trong SQL Server (đổi IsActive của User).
    /// </summary>
    public async Task<ApiResponse<ToggleLockResponseDto>> ToggleLockAsync(int readerId)
    {
        var reader = await _readerRepository.GetReaderByIdWithDetailsAsync(readerId);
        if (reader == null || reader.User == null)
        {
            return ApiResponse<ToggleLockResponseDto>.ErrorResult($"Không tìm thấy độc giả với ID: {readerId}.");
        }

        var newIsActive = !reader.User.IsActive;
        var updated = await _readerRepository.UpdateUserActiveStatusAsync(reader.UserID, newIsActive);
        if (!updated)
        {
            return ApiResponse<ToggleLockResponseDto>.ErrorResult("Không thể cập nhật trạng thái thẻ độc giả.");
        }

        // Ghi thông báo hệ thống nếu bị khóa thẻ
        var msg = newIsActive
            ? $"Đã mở khóa thẻ thư viện cho độc giả {reader.User.FullName} ({reader.ReaderCode}). Độc giả đã có thể tiếp tục mượn sách."
            : $"Đã khóa thẻ thư viện của độc giả {reader.User.FullName} ({reader.ReaderCode}). Độc giả bị chặn mượn sách tại quầy lưu thông.";

        await _readerRepository.AddNotificationAsync(reader.UserID, msg);

        var responseDto = new ToggleLockResponseDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            ReaderCode = reader.ReaderCode,
            FullName = reader.User.FullName,
            IsActive = newIsActive,
            Message = msg
        };

        return ApiResponse<ToggleLockResponseDto>.SuccessResult(responseDto, msg);
    }

    /// <summary>
    /// Đặt trạng thái khóa thẻ độc giả theo giá trị chỉ định.
    /// </summary>
    public async Task<ApiResponse<ToggleLockResponseDto>> SetLockStatusAsync(int readerId, bool isActive)
    {
        var reader = await _readerRepository.GetReaderByIdWithDetailsAsync(readerId);
        if (reader == null || reader.User == null)
        {
            return ApiResponse<ToggleLockResponseDto>.ErrorResult($"Không tìm thấy độc giả với ID: {readerId}.");
        }

        var updated = await _readerRepository.UpdateUserActiveStatusAsync(reader.UserID, isActive);
        if (!updated)
        {
            return ApiResponse<ToggleLockResponseDto>.ErrorResult("Không thể cập nhật trạng thái thẻ độc giả.");
        }

        var msg = isActive
            ? $"Đã mở khóa thẻ thư viện cho độc giả {reader.User.FullName} ({reader.ReaderCode})."
            : $"Đã khóa thẻ thư viện của độc giả {reader.User.FullName} ({reader.ReaderCode}).";

        await _readerRepository.AddNotificationAsync(reader.UserID, msg);

        var responseDto = new ToggleLockResponseDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            ReaderCode = reader.ReaderCode,
            FullName = reader.User.FullName,
            IsActive = isActive,
            Message = msg
        };

        return ApiResponse<ToggleLockResponseDto>.SuccessResult(responseDto, msg);
    }

    /// <summary>
    /// Lấy dữ liệu thống kê tổng hợp cho 4 thẻ KPI hồ sơ độc giả.
    /// </summary>
    public async Task<ApiResponse<ReaderSummaryDto>> GetReaderSummaryAsync()
    {
        var summary = await _readerRepository.GetReaderSummaryAsync();
        return ApiResponse<ReaderSummaryDto>.SuccessResult(summary, "Lấy thống kê hồ sơ độc giả thành công.");
    }

    /// <summary>
    /// Gửi thông báo cảnh báo trễ hạn đến độc giả.
    /// </summary>
    public async Task<ApiResponse<bool>> SendWarningNotificationAsync(int readerId)
    {
        var reader = await _readerRepository.GetReaderByIdWithDetailsAsync(readerId);
        if (reader == null || reader.User == null)
        {
            return ApiResponse<bool>.ErrorResult($"Không tìm thấy độc giả với ID: {readerId}.");
        }

        var message = $"[SmartLib AI - Cảnh báo] Bạn có sách mượn sắp đến hạn hoặc nợ phạt chưa thanh toán. Vui lòng kiểm tra và xử lý tại quầy lưu thông.";
        await _readerRepository.AddNotificationAsync(reader.UserID, message);

        return ApiResponse<bool>.SuccessResult(true, $"Đã gửi cảnh báo thành công đến độc giả {reader.User.FullName} ({reader.User.Email ?? reader.ReaderCode}).");
    }

    /// <summary>
    /// Hàm ánh xạ Entity Reader sang ReaderDto kèm chi tiết mượn và đánh giá rủi ro AI.
    /// </summary>
    private static ReaderDto MapToReaderDto(Reader reader)
    {
        var user = reader.User;
        var now = DateTime.UtcNow;

        // 1. Danh sách các sách đang mượn thực tế
        var activeBorrowings = reader.Borrowings
            .Where(b => b.Status != "Returned" && b.Status != "Completed")
            .ToList();

        var borrowedBooks = new List<ReaderBookDto>();
        foreach (var b in activeBorrowings)
        {
            foreach (var d in b.BorrowingDetails.Where(d => d.ItemStatus == "Borrowed" && d.ReturnDate == null))
            {
                var isOverdue = now.Date > b.DueDate.Date;
                var overdueDays = isOverdue ? (int)(now.Date - b.DueDate.Date).TotalDays : 0;
                var remainingDays = !isOverdue ? Math.Max(0, (int)(b.DueDate.Date - now.Date).TotalDays) : 0;
                var finePerDay = 5000m;
                var accruedFine = isOverdue ? overdueDays * finePerDay : 0m;

                borrowedBooks.Add(new ReaderBookDto
                {
                    DetailID = d.DetailID,
                    CopyID = d.CopyID,
                    Barcode = d.BookCopy?.Barcode ?? string.Empty,
                    Title = d.BookCopy?.Book?.Title ?? "Tài liệu thư viện",
                    BorrowDate = b.BorrowDate,
                    DueDate = b.DueDate,
                    IsOverdue = isOverdue,
                    OverdueDays = overdueDays,
                    AccruedFine = accruedFine,
                    BadgeType = isOverdue ? "overdue" : "remaining",
                    BadgeText = isOverdue ? $"Trễ {overdueDays} ngày" : $"Còn {remainingDays} ngày",
                    SubText = isOverdue
                        ? $"Phí phạt tích lũy: {accruedFine:N0} đ"
                        : $"Hạn trả: {b.DueDate:dd/MM/yyyy}"
                });
            }
        }

        // 2. Tóm tắt sách đang mượn
        string summaryText;
        if (borrowedBooks.Count == 0)
        {
            summaryText = "• None (Không mượn)";
        }
        else
        {
            var titles = borrowedBooks.Select(b => b.Title).Take(2).ToList();
            summaryText = string.Join(", ", titles);
            if (borrowedBooks.Count > 2)
            {
                summaryText += $" (+{borrowedBooks.Count - 2} cuốn)";
            }
        }

        // 3. Tiền phạt tồn đọng (FineReceipts Status = 'Pending')
        var unpaidFines = reader.Borrowings
            .SelectMany(b => b.FineReceipts)
            .Where(f => f.Status == "Pending")
            .Select(f => f.FinalAmount)
            .ToList();
        var fineDebtRaw = unpaidFines.Sum();

        // 4. Đánh giá rủi ro AI (RiskScore: 0 - 100)
        // Heuristic: Dựa trên Điểm tín nhiệm, Sách quá hạn, và Nợ phạt
        int riskScore = 10;
        var hasOverdue = borrowedBooks.Any(b => b.IsOverdue);
        var maxOverdueDays = borrowedBooks.Any() ? borrowedBooks.Max(b => b.OverdueDays) : 0;

        if (hasOverdue)
        {
            riskScore = Math.Min(95, 60 + maxOverdueDays * 5);
        }
        else if (fineDebtRaw > 0)
        {
            riskScore = 55;
        }
        else if (reader.CreditScore < 60)
        {
            riskScore = 70;
        }
        else if (reader.CreditScore < 80)
        {
            riskScore = 40;
        }
        else
        {
            riskScore = Math.Max(5, 100 - reader.CreditScore);
        }

        string riskType;
        string riskLevelText;
        string aiDiagnosis;

        if (riskScore >= 70)
        {
            riskType = "high";
            riskLevelText = "Cao (High)";
            aiDiagnosis = "* AI nhận diện: Thường trễ sách hoặc có nợ phạt chưa hoàn tất. Điểm tín nhiệm hệ thống bị sụt giảm.";
        }
        else if (riskScore >= 40)
        {
            riskType = "medium";
            riskLevelText = "Vừa (Medium)";
            aiDiagnosis = "* AI nhận diện: Có nguy cơ phát sinh trễ hạn 1-2 ngày ở giai đoạn thi đồ án. Cần hệ thống gửi email nhắc nhở sớm.";
        }
        else
        {
            riskType = "low";
            riskLevelText = "Thấp (Low)";
            aiDiagnosis = "* AI nhận diện: Độc giả hiện không nợ sách hay phí phạt. Lịch sử mượn trả luôn chuẩn xác trước hạn.";
        }

        // 5. Chọn avatar theo ReaderID
        var avatarIndex = Math.Abs(reader.ReaderID - 1) % SampleAvatars.Length;
        var avatarUrl = SampleAvatars[avatarIndex];

        return new ReaderDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            ReaderCode = reader.ReaderCode,
            FullName = user?.FullName ?? string.Empty,
            Username = user?.Username ?? string.Empty,
            Email = user?.Email ?? $"{reader.ReaderCode.ToLower()}@smartlib.edu.vn",
            Faculty = reader.Faculty ?? "CNTT",
            ClassGroup = reader.ClassGroup ?? "K21-CC",
            MemberType = reader.MemberType,
            IsActive = user?.IsActive ?? true,
            ExpiryDate = reader.ExpiryDate,
            CreditScore = reader.CreditScore,
            FineDebtRaw = fineDebtRaw,
            ActiveBorrowCount = borrowedBooks.Count,
            CurrentBooksSummary = summaryText,
            RiskScore = riskScore,
            RiskType = riskType,
            RiskLevelText = riskLevelText,
            AiDiagnosis = aiDiagnosis,
            Avatar = avatarUrl,
            Books = borrowedBooks
        };
    }
}
