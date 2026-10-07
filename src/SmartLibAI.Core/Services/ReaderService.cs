using BCrypt.Net;
using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Triển khai dịch vụ nghiệp vụ Quản lý độc giả & Khóa mở thẻ bạn đọc (Story LOLRA-78).
/// </summary>
public class ReaderService : IReaderService
{
    private readonly IReaderRepository _readerRepository;

    public ReaderService(IReaderRepository readerRepository)
    {
        _readerRepository = readerRepository;
    }

    /// <summary>
    /// Lấy danh sách độc giả có lọc, tìm kiếm và phân trang.
    /// </summary>
    public async Task<ApiResponse<PagedResult<ReaderDto>>> GetPagedReadersAsync(
        string? keyword,
        string? memberType,
        string? status,
        int pageNumber,
        int pageSize)
    {
        var validPageNumber = pageNumber > 0 ? pageNumber : 1;
        var validPageSize = pageSize > 0 ? pageSize : 20;

        var result = await _readerRepository.GetPagedReadersAsync(keyword, memberType, status, validPageNumber, validPageSize);
        return ApiResponse<PagedResult<ReaderDto>>.SuccessResult(result, "Lấy danh sách độc giả thành công");
    }

    /// <summary>
    /// Lấy chi tiết thông tin hồ sơ độc giả kèm thống kê sách mượn và tiền phạt theo ID.
    /// </summary>
    public async Task<ApiResponse<ReaderDetailDto>> GetReaderByIdAsync(int readerId)
    {
        var reader = await _readerRepository.GetReaderDetailByIdAsync(readerId);
        if (reader == null)
        {
            return ApiResponse<ReaderDetailDto>.ErrorResult($"Không tìm thấy độc giả với ID {readerId}");
        }

        var detailDto = await BuildReaderDetailDtoAsync(reader);
        return ApiResponse<ReaderDetailDto>.SuccessResult(detailDto, "Lấy chi tiết hồ sơ độc giả thành công");
    }

    /// <summary>
    /// Lấy chi tiết độc giả theo mã thẻ bạn đọc (ReaderCode).
    /// </summary>
    public async Task<ApiResponse<ReaderDetailDto>> GetReaderByCodeAsync(string readerCode)
    {
        if (string.IsNullOrWhiteSpace(readerCode))
        {
            return ApiResponse<ReaderDetailDto>.ErrorResult("Mã thẻ bạn đọc không được để trống");
        }

        var reader = await _readerRepository.GetReaderDetailByCodeAsync(readerCode);
        if (reader == null)
        {
            return ApiResponse<ReaderDetailDto>.ErrorResult($"Không tìm thấy độc giả với mã thẻ '{readerCode}'");
        }

        var detailDto = await BuildReaderDetailDtoAsync(reader);
        return ApiResponse<ReaderDetailDto>.SuccessResult(detailDto, "Lấy chi tiết hồ sơ độc giả thành công");
    }

    /// <summary>
    /// Thêm mới độc giả và cấp thẻ bạn đọc (tạo tài khoản User và hồ sơ Reader).
    /// </summary>
    public async Task<ApiResponse<ReaderDto>> CreateReaderAsync(CreateReaderRequestDto request)
    {
        // 1. Kiểm tra tính trùng lặp của Username hoặc ReaderCode
        var isTaken = await _readerRepository.IsUsernameOrCodeTakenAsync(request.Username, request.ReaderCode);
        if (isTaken)
        {
            return ApiResponse<ReaderDto>.ErrorResult("Tên đăng nhập (MSSV) hoặc Mã thẻ bạn đọc đã tồn tại trong hệ thống.");
        }

        // 2. Hash mật khẩu (mặc định nếu để trống là mật khẩu 123456 hoặc theo Username)
        var rawPassword = string.IsNullOrWhiteSpace(request.Password) ? "123456" : request.Password.Trim();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(rawPassword);

        // 3. Khởi tạo đối tượng User (RoleID = 3: Reader)
        var user = new User
        {
            RoleID = 3,
            Username = request.Username.Trim(),
            FullName = request.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            PasswordHash = passwordHash,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // 4. Khởi tạo đối tượng Reader
        var expiry = request.ExpiryDate ?? DateTime.UtcNow.AddYears(1);
        var reader = new Reader
        {
            ReaderCode = request.ReaderCode.Trim(),
            MemberType = string.IsNullOrWhiteSpace(request.MemberType) ? "Student" : request.MemberType.Trim(),
            ExpiryDate = expiry,
            CreditScore = 100
        };

        // 5. Lưu vào CSDL trong Transaction an toàn
        var createdReader = await _readerRepository.CreateReaderWithUserAsync(user, reader);

        var dto = new ReaderDto
        {
            ReaderID = createdReader.ReaderID,
            UserID = user.UserID,
            Username = user.Username,
            FullName = user.FullName,
            Email = user.Email,
            ReaderCode = createdReader.ReaderCode,
            MemberType = createdReader.MemberType,
            ExpiryDate = createdReader.ExpiryDate,
            CreditScore = createdReader.CreditScore,
            IsActive = user.IsActive,
            Status = "Active",
            ActiveBorrowCount = 0,
            TotalUnpaidFines = 0m,
            CreatedAt = user.CreatedAt
        };

        return ApiResponse<ReaderDto>.SuccessResult(dto, $"Cấp thẻ bạn đọc thành công cho độc giả {dto.FullName} ({dto.ReaderCode})");
    }

    /// <summary>
    /// Cập nhật thông tin độc giả (Họ tên, email, loại độc giả, hạn thẻ).
    /// </summary>
    public async Task<ApiResponse<ReaderDto>> UpdateReaderAsync(int readerId, UpdateReaderRequestDto request)
    {
        var reader = await _readerRepository.GetReaderDetailByIdAsync(readerId);
        if (reader == null)
        {
            return ApiResponse<ReaderDto>.ErrorResult($"Không tìm thấy độc giả với ID {readerId}");
        }

        // Cập nhật thông tin User
        reader.User.FullName = request.FullName.Trim();
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            reader.User.Email = request.Email.Trim();
        }

        // Cập nhật thông tin Reader
        if (!string.IsNullOrWhiteSpace(request.MemberType))
        {
            reader.MemberType = request.MemberType.Trim();
        }

        if (request.ExpiryDate.HasValue)
        {
            reader.ExpiryDate = request.ExpiryDate.Value;
        }

        await _readerRepository.UpdateAsync(reader);

        var bCount = (await _readerRepository.GetActiveBorrowingsByReaderIdAsync(readerId)).Count;
        var fTotal = await _readerRepository.GetUnpaidFineAmountByReaderIdAsync(readerId);

        var now = DateTime.UtcNow;
        string status = !reader.User.IsActive ? "Locked" : (reader.ExpiryDate < now ? "Expired" : "Active");

        var dto = new ReaderDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            Username = reader.User.Username,
            FullName = reader.User.FullName,
            Email = reader.User.Email,
            ReaderCode = reader.ReaderCode,
            MemberType = reader.MemberType,
            ExpiryDate = reader.ExpiryDate,
            CreditScore = reader.CreditScore,
            IsActive = reader.User.IsActive,
            Status = status,
            ActiveBorrowCount = bCount,
            TotalUnpaidFines = fTotal,
            CreatedAt = reader.User.CreatedAt
        };

        return ApiResponse<ReaderDto>.SuccessResult(dto, "Cập nhật hồ sơ độc giả thành công");
    }

    /// <summary>
    /// Khóa hoặc Mở khóa thẻ bạn đọc (Cập nhật User.IsActive).
    /// </summary>
    public async Task<ApiResponse<ReaderDto>> ToggleCardStatusAsync(int readerId, ToggleReaderStatusDto request)
    {
        var reader = await _readerRepository.GetReaderDetailByIdAsync(readerId);
        if (reader == null)
        {
            return ApiResponse<ReaderDto>.ErrorResult($"Không tìm thấy độc giả với ID {readerId}");
        }

        // Cập nhật trạng thái kích hoạt tài khoản
        reader.User.IsActive = request.IsActive;
        await _readerRepository.UpdateAsync(reader);

        var bCount = (await _readerRepository.GetActiveBorrowingsByReaderIdAsync(readerId)).Count;
        var fTotal = await _readerRepository.GetUnpaidFineAmountByReaderIdAsync(readerId);

        var now = DateTime.UtcNow;
        string status = !reader.User.IsActive ? "Locked" : (reader.ExpiryDate < now ? "Expired" : "Active");

        var dto = new ReaderDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            Username = reader.User.Username,
            FullName = reader.User.FullName,
            Email = reader.User.Email,
            ReaderCode = reader.ReaderCode,
            MemberType = reader.MemberType,
            ExpiryDate = reader.ExpiryDate,
            CreditScore = reader.CreditScore,
            IsActive = reader.User.IsActive,
            Status = status,
            ActiveBorrowCount = bCount,
            TotalUnpaidFines = fTotal,
            CreatedAt = reader.User.CreatedAt
        };

        var actionText = request.IsActive ? "Mở khóa thẻ thành công" : "Khóa thẻ bạn đọc thành công";
        var note = !string.IsNullOrWhiteSpace(request.Reason) ? $" (Lý do: {request.Reason})" : string.Empty;

        return ApiResponse<ReaderDto>.SuccessResult(dto, $"{actionText}{note}. Trạng thái mới: {status}.");
    }

    /// <summary>
    /// Gia hạn ngày hết hạn thẻ bạn đọc.
    /// </summary>
    public async Task<ApiResponse<ReaderDto>> ExtendCardAsync(int readerId, ExtendCardRequestDto request)
    {
        var reader = await _readerRepository.GetReaderDetailByIdAsync(readerId);
        if (reader == null)
        {
            return ApiResponse<ReaderDto>.ErrorResult($"Không tìm thấy độc giả với ID {readerId}");
        }

        if (request.NewExpiryDate.HasValue)
        {
            reader.ExpiryDate = request.NewExpiryDate.Value;
        }
        else
        {
            var baseDate = reader.ExpiryDate > DateTime.UtcNow ? reader.ExpiryDate : DateTime.UtcNow;
            var months = request.ExtraMonths > 0 ? request.ExtraMonths : 12;
            reader.ExpiryDate = baseDate.AddMonths(months);
        }

        await _readerRepository.UpdateAsync(reader);

        var bCount = (await _readerRepository.GetActiveBorrowingsByReaderIdAsync(readerId)).Count;
        var fTotal = await _readerRepository.GetUnpaidFineAmountByReaderIdAsync(readerId);

        var now = DateTime.UtcNow;
        string status = !reader.User.IsActive ? "Locked" : (reader.ExpiryDate < now ? "Expired" : "Active");

        var dto = new ReaderDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            Username = reader.User.Username,
            FullName = reader.User.FullName,
            Email = reader.User.Email,
            ReaderCode = reader.ReaderCode,
            MemberType = reader.MemberType,
            ExpiryDate = reader.ExpiryDate,
            CreditScore = reader.CreditScore,
            IsActive = reader.User.IsActive,
            Status = status,
            ActiveBorrowCount = bCount,
            TotalUnpaidFines = fTotal,
            CreatedAt = reader.User.CreatedAt
        };

        return ApiResponse<ReaderDto>.SuccessResult(dto, $"Gia hạn thẻ thành công đến ngày {reader.ExpiryDate:dd/MM/yyyy}");
    }

    private async Task<ReaderDetailDto> BuildReaderDetailDtoAsync(Reader reader)
    {
        var borrowings = await _readerRepository.GetActiveBorrowingsByReaderIdAsync(reader.ReaderID);
        var unpaidTotal = await _readerRepository.GetUnpaidFineAmountByReaderIdAsync(reader.ReaderID);

        var now = DateTime.UtcNow;
        string status = !reader.User.IsActive ? "Locked" : (reader.ExpiryDate < now ? "Expired" : "Active");

        return new ReaderDetailDto
        {
            ReaderID = reader.ReaderID,
            UserID = reader.UserID,
            Username = reader.User.Username,
            FullName = reader.User.FullName,
            Email = reader.User.Email,
            ReaderCode = reader.ReaderCode,
            MemberType = reader.MemberType,
            ExpiryDate = reader.ExpiryDate,
            CreditScore = reader.CreditScore,
            IsActive = reader.User.IsActive,
            Status = status,
            ActiveBorrowCount = borrowings.Count,
            TotalUnpaidFines = unpaidTotal,
            CreatedAt = reader.User.CreatedAt,
            CurrentBorrowings = borrowings
        };
    }
}
