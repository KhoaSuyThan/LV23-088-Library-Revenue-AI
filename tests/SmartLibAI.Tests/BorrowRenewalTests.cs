using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SmartLibAI.Core.DTOs.AI;
using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho tính năng Gia hạn mượn sách (BUG-045 & US-08.2).
/// Kiểm tra các quy tắc: tăng hạn trả theo FineRule.RenewalExtraDays, giới hạn MaxRenewalTimes,
/// chặn khi sách đã quá hạn, chặn khi thẻ độc giả bị khóa hoặc nợ quá 50.000đ.
/// </summary>
public class BorrowRenewalTests
{
    private class FakeBorrowRepository : IBorrowRepository
    {
        public Borrowing? Borrowing { get; set; }
        public FineRule ActiveRule { get; set; } = new()
        {
            MaxRenewalTimes = 1,
            RenewalExtraDays = 7,
            DebtLockAmount = 50000m
        };
        public decimal UnpaidDebt { get; set; } = 0m;
        public bool UpdatedCalled { get; set; } = false;

        public Task<Borrowing?> GetBorrowingDetailByIdAsync(int borrowingId)
        {
            if (Borrowing != null && Borrowing.BorrowingID == borrowingId)
            {
                return Task.FromResult<Borrowing?>(Borrowing);
            }
            return Task.FromResult<Borrowing?>(null);
        }

        public Task<Borrowing?> GetActiveBorrowingByBarcodeAsync(string barcode)
        {
            if (Borrowing != null && Borrowing.BorrowingDetails.Any(d => d.BookCopy?.Barcode == barcode))
            {
                return Task.FromResult<Borrowing?>(Borrowing);
            }
            return Task.FromResult<Borrowing?>(null);
        }

        public Task<FineRule?> GetActiveFineRuleAsync()
        {
            return Task.FromResult<FineRule?>(ActiveRule);
        }

        public Task<(bool HasUnpaidFines, decimal TotalUnpaidAmount)> CheckUnpaidFinesByReaderIdAsync(int readerId)
        {
            return Task.FromResult((UnpaidDebt > 0, UnpaidDebt));
        }

        public Task UpdateBorrowingAsync(Borrowing borrowing)
        {
            UpdatedCalled = true;
            Borrowing = borrowing;
            return Task.CompletedTask;
        }

        // Unused interface stubs
        public Task<Borrowing?> GetByIdAsync(int id) => Task.FromResult(Borrowing);
        public Task<IReadOnlyList<Borrowing>> GetAllAsync() => Task.FromResult<IReadOnlyList<Borrowing>>(new List<Borrowing>());
        public Task<IReadOnlyList<Borrowing>> FindAsync(System.Linq.Expressions.Expression<Func<Borrowing, bool>> predicate) => Task.FromResult<IReadOnlyList<Borrowing>>(new List<Borrowing>());
        public Task<bool> ExistsAsync(System.Linq.Expressions.Expression<Func<Borrowing, bool>> predicate) => Task.FromResult(false);
        public Task<Borrowing> AddAsync(Borrowing entity) => Task.FromResult(entity);
        public Task UpdateAsync(Borrowing entity) => Task.CompletedTask;
        public Task DeleteAsync(Borrowing entity) => Task.CompletedTask;
        public Task<Reader?> GetReaderByCodeAsync(string readerCode) => Task.FromResult<Reader?>(null);
        public Task<int> GetActiveBorrowCountByReaderIdAsync(int readerId) => Task.FromResult(0);
        public Task<List<BookCopy>> GetCopiesByBarcodesAsync(IEnumerable<string> barcodes) => Task.FromResult(new List<BookCopy>());
        public Task<Borrowing> CreateBorrowingWithTransactionAsync(Borrowing borrowing, List<int> copyIds) => Task.FromResult(borrowing);
        public Task<List<Borrowing>> GetRecentBorrowingsAsync(int count = 20) => Task.FromResult(new List<Borrowing>());
        public Task<int> GetOverdueHistoryCountAsync(int readerId) => Task.FromResult(0);
        public Task AddAIPredictionLogAsync(AIPredictionLog log) => Task.CompletedTask;
    }

    private class FakeAIPredictionService : IAIPredictionService
    {
        public bool IsModelLoaded => true;
        public string ModelStatus => "Mock Model Ready";
        public RiskEvaluationResultDto EvaluateBorrowRisk(ReaderRiskInputDto input)
        {
            return new RiskEvaluationResultDto
            {
                RiskScore = 0.15m,
                RiskTier = "Low",
                BadgeColor = "success",
                SuggestedAction = "An toàn - Cho phép mượn sách"
            };
        }
    }

    private static Borrowing CreateValidActiveBorrowing(DateTime dueDate, int renewalCount = 0)
    {
        return new Borrowing
        {
            BorrowingID = 10,
            BorrowDate = DateTime.UtcNow.AddDays(-5),
            DueDate = dueDate,
            Status = "Active",
            RenewalCount = renewalCount,
            ReaderID = 1,
            Reader = new Reader
            {
                ReaderID = 1,
                ReaderCode = "SV2026001",
                MemberType = "Student",
                User = new User
                {
                    UserID = 1,
                    FullName = "Nguyễn Văn A",
                    IsActive = true
                }
            },
            BorrowingDetails = new List<BorrowingDetail>
            {
                new()
                {
                    DetailID = 1,
                    BorrowingID = 10,
                    CopyID = 101,
                    ItemStatus = "Borrowed",
                    ReturnDate = null,
                    BookCopy = new BookCopy
                    {
                        CopyID = 101,
                        Barcode = "BC000001-A",
                        Book = new Book
                        {
                            BookID = 5,
                            Title = "Nhập môn Cơ sở dữ liệu",
                            Author = "Đỗ Phúc",
                            BasePrice = 85000m
                        }
                    }
                }
            }
        };
    }

    [Fact]
    public async Task RenewBorrowing_Success_AddsExtraDaysAndIncrementsRenewalCount()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        var initialDueDate = DateTime.UtcNow.AddDays(3);
        fakeRepo.Borrowing = CreateValidActiveBorrowing(initialDueDate, renewalCount: 0);

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { BorrowingId = 10 };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(1, result.Data.RenewalCount);
        Assert.Equal(initialDueDate.AddDays(7).Date, result.Data.NewDueDate.Date);
        Assert.Equal(initialDueDate.Date, result.Data.OldDueDate.Date);
        Assert.True(fakeRepo.UpdatedCalled);
    }

    [Fact]
    public async Task RenewBorrowing_Success_ByBarcode()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        var initialDueDate = DateTime.UtcNow.AddDays(2);
        fakeRepo.Borrowing = CreateValidActiveBorrowing(initialDueDate, renewalCount: 0);

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { Barcode = "BC000001-A" };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.Equal(10, result.Data!.BorrowingId);
        Assert.Equal(1, result.Data.RenewalCount);
    }

    [Fact]
    public async Task RenewBorrowing_Fails_WhenOverdue()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        var overdueDueDate = DateTime.UtcNow.AddDays(-2); // Quá hạn 2 ngày
        fakeRepo.Borrowing = CreateValidActiveBorrowing(overdueDueDate, renewalCount: 0);

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { BorrowingId = 10 };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("quá hạn", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(fakeRepo.UpdatedCalled);
    }

    [Fact]
    public async Task RenewBorrowing_Fails_WhenMaxRenewalTimesExceeded()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        fakeRepo.ActiveRule.MaxRenewalTimes = 1;
        fakeRepo.Borrowing = CreateValidActiveBorrowing(DateTime.UtcNow.AddDays(3), renewalCount: 1); // Đã gia hạn 1 lần

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { BorrowingId = 10 };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("tối đa", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(fakeRepo.UpdatedCalled);
    }

    [Fact]
    public async Task RenewBorrowing_Fails_WhenReaderLocked()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        fakeRepo.Borrowing = CreateValidActiveBorrowing(DateTime.UtcNow.AddDays(3), renewalCount: 0);
        fakeRepo.Borrowing.Reader!.User.IsActive = false; // Thẻ bị khóa

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { BorrowingId = 10 };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("khóa", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.False(fakeRepo.UpdatedCalled);
    }

    [Fact]
    public async Task RenewBorrowing_Fails_WhenDebtExceedsThreshold()
    {
        // Arrange
        var fakeRepo = new FakeBorrowRepository();
        fakeRepo.Borrowing = CreateValidActiveBorrowing(DateTime.UtcNow.AddDays(3), renewalCount: 0);
        fakeRepo.UnpaidDebt = 55000m; // Vượt ngưỡng 50.000đ

        var service = new BorrowService(fakeRepo, new FakeAIPredictionService());

        // Act
        var request = new RenewBorrowRequestDto { BorrowingId = 10 };
        var result = await service.RenewBorrowingAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("55,000", result.Message);
        Assert.False(fakeRepo.UpdatedCalled);
    }
}
