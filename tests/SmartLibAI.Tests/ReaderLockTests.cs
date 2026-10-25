using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Readers;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho chức năng Khóa / Mở khóa thẻ độc giả và tính nguyên tử dữ liệu (BUG-028 & Story L0LRA-71).
/// </summary>
public class ReaderLockTests
{
    private class FakeReaderRepository : IReaderRepository
    {
        public Reader? CurrentReader { get; set; }
        public bool UpdateResult { get; set; } = true;
        public bool ThrowOnUpdate { get; set; } = false;
        public string? LastNotificationMessage { get; set; }
        public bool? LastIsActiveRecorded { get; set; }

        public Task<Reader?> GetReaderByIdWithDetailsAsync(int readerId)
        {
            if (CurrentReader != null && CurrentReader.ReaderID == readerId)
            {
                return Task.FromResult<Reader?>(CurrentReader);
            }
            return Task.FromResult<Reader?>(null);
        }

        public Task<bool> UpdateUserLockStatusWithNotificationAsync(int userId, bool isActive, string message)
        {
            if (ThrowOnUpdate)
            {
                throw new InvalidOperationException("Mô phỏng lỗi DB ngoại lệ trong giao dịch nguyên tử.");
            }

            if (!UpdateResult)
            {
                return Task.FromResult(false);
            }

            if (CurrentReader != null && CurrentReader.UserID == userId)
            {
                CurrentReader.User.IsActive = isActive;
                LastIsActiveRecorded = isActive;
                LastNotificationMessage = message;
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }

        public Task<bool> UpdateUserActiveStatusAsync(int userId, bool isActive)
        {
            if (CurrentReader != null && CurrentReader.UserID == userId)
            {
                CurrentReader.User.IsActive = isActive;
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }

        public Task AddNotificationAsync(int userId, string message)
        {
            LastNotificationMessage = message;
            return Task.CompletedTask;
        }

        // Các phương thức không dùng trực tiếp trong test
        public Task<PagedResult<ReaderDto>> GetPagedReadersAsync(string? keyword, string? memberType, string? status, int pageNumber, int pageSize) => throw new NotImplementedException();
        public Task<List<Reader>> GetAllReadersWithDetailsAsync() => throw new NotImplementedException();
        public Task<Reader?> GetReaderDetailByIdAsync(int readerId) => Task.FromResult(CurrentReader);
        public Task<Reader?> GetReaderDetailByCodeAsync(string readerCode) => Task.FromResult(CurrentReader);
        public Task<Reader?> GetReaderByCodeWithDetailsAsync(string readerCode) => Task.FromResult(CurrentReader);
        public Task<bool> IsUsernameOrCodeTakenAsync(string username, string readerCode, int? excludeReaderId = null) => Task.FromResult(false);
        public Task<Reader> CreateReaderWithUserAsync(User user, Reader reader) => throw new NotImplementedException();
        public Task<List<ReaderBorrowingItemDto>> GetActiveBorrowingsByReaderIdAsync(int readerId) => Task.FromResult(new List<ReaderBorrowingItemDto>());
        public Task<decimal> GetUnpaidFineAmountByReaderIdAsync(int readerId) => Task.FromResult(0m);
        public Task<ReaderSummaryDto> GetReaderSummaryAsync() => Task.FromResult(new ReaderSummaryDto());
        public Task<Reader?> GetByIdAsync(int id) => Task.FromResult(CurrentReader);
        public Task<IReadOnlyList<Reader>> GetAllAsync() => Task.FromResult<IReadOnlyList<Reader>>(new List<Reader>());
        public Task<IReadOnlyList<Reader>> FindAsync(System.Linq.Expressions.Expression<Func<Reader, bool>> predicate) => Task.FromResult<IReadOnlyList<Reader>>(new List<Reader>());
        public Task<bool> ExistsAsync(System.Linq.Expressions.Expression<Func<Reader, bool>> predicate) => Task.FromResult(false);
        public Task<Reader> AddAsync(Reader entity) => Task.FromResult(entity);
        public Task UpdateAsync(Reader entity) => Task.CompletedTask;
        public Task DeleteAsync(Reader entity) => Task.CompletedTask;
    }

    private static (ReaderService Service, FakeReaderRepository Repo, Reader DemoReader) CreateFixture(bool initialIsActive = true)
    {
        var user = new User
        {
            UserID = 122,
            Username = "demo0001",
            FullName = "Độc Giả Thử Nghiệm",
            Email = "demo0001@smartlib.edu.vn",
            IsActive = initialIsActive
        };

        var reader = new Reader
        {
            ReaderID = 122,
            UserID = 122,
            ReaderCode = "DEMO0001",
            MemberType = "Standard",
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            CreditScore = 90,
            User = user,
            Borrowings = new List<Borrowing>()
        };

        var repo = new FakeReaderRepository { CurrentReader = reader };
        var service = new ReaderService(repo);

        return (service, repo, reader);
    }

    [Fact]
    public async Task SetLockStatusAsync_LockReader_SetsIsActiveFalseAndReturnsSuccess()
    {
        // Arrange
        var (service, repo, reader) = CreateFixture(initialIsActive: true);

        // Act: Đặt trạng thái khóa thẻ (isActive = false)
        var result = await service.SetLockStatusAsync(122, isActive: false);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.False(result.Data.IsActive);
        Assert.Equal("locked", result.Data.Status);
        Assert.False(reader.User.IsActive);
        Assert.False(repo.LastIsActiveRecorded);
        Assert.Contains("Đã khóa thẻ", result.Data.Message);
    }

    [Fact]
    public async Task SetLockStatusAsync_UnlockReader_SetsIsActiveTrueAndReturnsSuccess()
    {
        // Arrange
        var (service, repo, reader) = CreateFixture(initialIsActive: false);

        // Act: Đặt trạng thái mở khóa thẻ (isActive = true)
        var result = await service.SetLockStatusAsync(122, isActive: true);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.IsActive);
        Assert.Equal("active", result.Data.Status);
        Assert.True(reader.User.IsActive);
        Assert.True(repo.LastIsActiveRecorded);
        Assert.Contains("Đã mở khóa thẻ", result.Data.Message);
    }

    [Fact]
    public async Task ToggleLockAsync_TogglesActiveStateCorrectly()
    {
        // Arrange
        var (service, _, reader) = CreateFixture(initialIsActive: true);

        // Act 1: Toggle từ Active -> Locked
        var result1 = await service.ToggleLockAsync(122);
        Assert.True(result1.Success);
        Assert.False(result1.Data!.IsActive);
        Assert.Equal("locked", result1.Data.Status);
        Assert.False(reader.User.IsActive);

        // Act 2: Toggle từ Locked -> Active
        var result2 = await service.ToggleLockAsync(122);
        Assert.True(result2.Success);
        Assert.True(result2.Data!.IsActive);
        Assert.Equal("active", result2.Data.Status);
        Assert.True(reader.User.IsActive);
    }

    [Fact]
    public async Task SetLockStatusAsync_NonExistentReader_ReturnsError()
    {
        // Arrange
        var (service, _, _) = CreateFixture();

        // Act
        var result = await service.SetLockStatusAsync(999, isActive: false);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Không tìm thấy độc giả", result.Message);
    }

    [Fact]
    public async Task SetLockStatusAsync_WhenAtomicUpdateFails_ReturnsErrorResult()
    {
        // Arrange
        var (service, repo, reader) = CreateFixture(initialIsActive: true);
        repo.UpdateResult = false; // Mô phỏng thất bại khi lưu

        // Act
        var result = await service.SetLockStatusAsync(122, isActive: false);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("Không thể cập nhật", result.Message);
        Assert.True(reader.User.IsActive); // Trạng thái cũ được bảo toàn nguyên vẹn
    }

    [Fact]
    public async Task SetLockStatusAsync_WhenExceptionThrown_PropagatesWithoutClaimingSuccess()
    {
        // Arrange
        var (service, repo, reader) = CreateFixture(initialIsActive: true);
        repo.ThrowOnUpdate = true; // Mô phỏng ngoại lệ DB ném ra trong transaction

        // Act & Assert: Phải ném ngoại lệ chứ không được nuốt lỗi rồi trả về thành công giả tạo
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.SetLockStatusAsync(122, isActive: false));
        Assert.True(reader.User.IsActive); // Không bị thay đổi
    }

    [Theory]
    [InlineData(true, "active")]
    [InlineData(false, "locked")]
    public void ToggleLockResponseDto_StatusProperty_ReflectsIsActive(bool isActive, string expectedStatus)
    {
        // Arrange & Act
        var dto = new ToggleLockResponseDto
        {
            ReaderID = 1,
            UserID = 1,
            IsActive = isActive
        };

        // Assert
        Assert.Equal(expectedStatus, dto.Status);
    }
}
