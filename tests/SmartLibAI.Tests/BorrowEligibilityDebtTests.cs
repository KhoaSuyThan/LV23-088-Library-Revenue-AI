using SmartLibAI.Core.DTOs.AI;
using SmartLibAI.Core.DTOs.Borrows;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho quy tắc chặn mượn sách theo ngưỡng nợ phạt US-08.1 (BUG-006 & Story LOLRA-16).
/// Độc giả chỉ bị từ chối mượn khi tổng nợ phạt vượt quá 50.000 VNĐ (> 50.000 VNĐ).
/// Các mức nợ dưới hoặc bằng 50.000 VNĐ (40.000đ, 49.999đ, đúng 50.000đ) vẫn được phép mượn sách.
/// </summary>
public class BorrowEligibilityDebtTests
{
    private class FakeBorrowRepository : IBorrowRepository
    {
        public Reader? CurrentReader { get; set; }
        public FineRule CurrentFineRule { get; set; } = new FineRule
        {
            RuleID = 1,
            RuleName = "Quy định chuẩn",
            DebtLockAmount = 50000m,
            StudentBorrowLimit = 5,
            LecturerBorrowLimit = 10,
            StudentBorrowDays = 14,
            LecturerBorrowDays = 30
        };
        public decimal TotalUnpaidAmount { get; set; } = 0m;
        public int ActiveBorrowCount { get; set; } = 0;
        public List<BookCopy> Copies { get; set; } = new List<BookCopy>();

        public Task<Reader?> GetReaderByCodeAsync(string readerCode) => Task.FromResult(CurrentReader);
        public Task<int> GetActiveBorrowCountByReaderIdAsync(int readerId) => Task.FromResult(ActiveBorrowCount);
        public Task<(bool HasUnpaidFines, decimal TotalUnpaidAmount)> CheckUnpaidFinesByReaderIdAsync(int readerId)
        {
            return Task.FromResult((TotalUnpaidAmount > 0, TotalUnpaidAmount));
        }
        public Task<FineRule?> GetActiveFineRuleAsync() => Task.FromResult<FineRule?>(CurrentFineRule);
        public Task<List<BookCopy>> GetCopiesByBarcodesAsync(IEnumerable<string> barcodes)
        {
            var requested = barcodes.ToHashSet(StringComparer.OrdinalIgnoreCase);
            return Task.FromResult(Copies.Where(c => requested.Contains(c.Barcode)).ToList());
        }
        public Task<Borrowing> CreateBorrowingWithTransactionAsync(Borrowing borrowing, List<int> copyIds)
        {
            borrowing.BorrowingID = 999;
            return Task.FromResult(borrowing);
        }
        public Task<Borrowing?> GetBorrowingDetailByIdAsync(int borrowingId)
        {
            return Task.FromResult<Borrowing?>(new Borrowing
            {
                BorrowingID = borrowingId,
                ReaderID = CurrentReader?.ReaderID ?? 1,
                Reader = CurrentReader!,
                BorrowDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(14),
                Status = "Active",
                BorrowingDetails = Copies.Select(c => new BorrowingDetail
                {
                    CopyID = c.CopyID,
                    BookCopy = c,
                    ItemStatus = "Borrowed"
                }).ToList()
            });
        }
        public Task<List<Borrowing>> GetRecentBorrowingsAsync(int count = 20) => Task.FromResult(new List<Borrowing>());
        public Task<int> GetOverdueHistoryCountAsync(int readerId) => Task.FromResult(0);
        public Task AddAIPredictionLogAsync(AIPredictionLog log) => Task.CompletedTask;
        public Task<Borrowing?> GetActiveBorrowingByBarcodeAsync(string barcode) => Task.FromResult<Borrowing?>(null);
        public Task UpdateBorrowingAsync(Borrowing borrowing) => Task.CompletedTask;

        // Generic repo members
        public Task<Borrowing?> GetByIdAsync(int id) => Task.FromResult<Borrowing?>(null);
        public Task<IReadOnlyList<Borrowing>> GetAllAsync() => Task.FromResult<IReadOnlyList<Borrowing>>(new List<Borrowing>());
        public Task<IReadOnlyList<Borrowing>> FindAsync(System.Linq.Expressions.Expression<Func<Borrowing, bool>> predicate) => Task.FromResult<IReadOnlyList<Borrowing>>(new List<Borrowing>());
        public Task<bool> ExistsAsync(System.Linq.Expressions.Expression<Func<Borrowing, bool>> predicate) => Task.FromResult(false);
        public Task<Borrowing> AddAsync(Borrowing entity) => Task.FromResult(entity);
        public Task UpdateAsync(Borrowing entity) => Task.CompletedTask;
        public Task DeleteAsync(Borrowing entity) => Task.CompletedTask;
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

    private static (BorrowService Service, FakeBorrowRepository Repo, Reader DemoReader) CreateFixture(
        decimal debtAmount = 0m, 
        bool isActive = true, 
        bool isExpired = false)
    {
        var repo = new FakeBorrowRepository
        {
            TotalUnpaidAmount = debtAmount
        };

        var reader = new Reader
        {
            ReaderID = 122,
            ReaderCode = "DEMO0001",
            MemberType = "Standard",
            Faculty = "CNTT",
            CreditScore = 95,
            ExpiryDate = isExpired ? DateTime.UtcNow.AddDays(-5) : DateTime.UtcNow.AddYears(1),
            User = new User
            {
                UserID = 124,
                Username = "DEMO0001",
                FullName = "Nguyễn Văn Thử Nghiệm",
                IsActive = isActive
            }
        };

        repo.CurrentReader = reader;
        repo.Copies = new List<BookCopy>
        {
            new BookCopy
            {
                CopyID = 1,
                Barcode = "BC000001-A",
                Status = "Available",
                Book = new Book
                {
                    BookID = 1,
                    Title = "Nhập môn Lập trình",
                    IsActive = true
                }
            }
        };

        var service = new BorrowService(repo, new FakeAIPredictionService());
        return (service, repo, reader);
    }

    // ==========================================
    // 1. Kiểm tra trực tiếp DTO: BorrowReaderEligibilityDto
    // ==========================================

    [Theory]
    [InlineData(0, 50000, true, false)]
    [InlineData(40000, 50000, true, false)]   // DEMO0001: 40.000đ <= 50.000đ -> Allowed
    [InlineData(49999, 50000, true, false)]   // 49.999đ <= 50.000đ -> Allowed
    [InlineData(50000, 50000, true, false)]   // DEMO0003: đúng 50.000đ <= 50.000đ -> Allowed
    [InlineData(50001, 50000, false, true)]   // Vượt ngưỡng 50.000đ -> Blocked
    [InlineData(55000, 50000, false, true)]   // DEMO0004: 55.000đ > 50.000đ -> Blocked
    [InlineData(100000, 50000, false, true)]  // 100.000đ > 50.000đ -> Blocked
    public void BorrowReaderEligibilityDto_Calculates_CanBorrow_Correctly_Based_On_DebtLockThreshold(
        decimal unpaidAmount, 
        decimal threshold, 
        bool expectedCanBorrow, 
        bool expectedIsDebtBlocked)
    {
        // Arrange
        var dto = new BorrowReaderEligibilityDto
        {
            IsActive = true,
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            CurrentBorrowCount = 0,
            MaxBorrowLimit = 5,
            HasUnpaidFines = unpaidAmount > 0,
            UnpaidFineAmount = unpaidAmount,
            DebtLockThreshold = threshold
        };

        // Assert
        Assert.Equal(expectedIsDebtBlocked, dto.IsDebtBlocked);
        Assert.Equal(expectedCanBorrow, dto.CanBorrow);
    }

    [Fact]
    public void BorrowReaderEligibilityDto_Preserves_Independent_Card_Lock_And_Expiry()
    {
        // 1. Thẻ bị khóa nhưng nợ 0đ -> Không được mượn
        var lockedDto = new BorrowReaderEligibilityDto
        {
            IsActive = false,
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            CurrentBorrowCount = 0,
            MaxBorrowLimit = 5,
            UnpaidFineAmount = 0m,
            DebtLockThreshold = 50000m
        };
        Assert.False(lockedDto.CanBorrow);

        // 2. Thẻ hết hạn nhưng nợ 40.000đ (chưa vượt ngưỡng) -> Vẫn không được mượn
        var expiredDto = new BorrowReaderEligibilityDto
        {
            IsActive = true,
            ExpiryDate = DateTime.UtcNow.AddDays(-1),
            CurrentBorrowCount = 0,
            MaxBorrowLimit = 5,
            UnpaidFineAmount = 40000m,
            DebtLockThreshold = 50000m
        };
        Assert.False(expiredDto.CanBorrow);

        // 3. Đã mượn tối đa 5 cuốn -> Không được mượn thêm
        var limitDto = new BorrowReaderEligibilityDto
        {
            IsActive = true,
            ExpiryDate = DateTime.UtcNow.AddYears(1),
            CurrentBorrowCount = 5,
            MaxBorrowLimit = 5,
            UnpaidFineAmount = 40000m,
            DebtLockThreshold = 50000m
        };
        Assert.False(limitDto.CanBorrow);
    }

    // ==========================================
    // 2. Kiểm tra BorrowService.CheckReaderEligibilityAsync
    // ==========================================

    [Theory]
    [InlineData(0)]
    [InlineData(40000)] // DEMO0001
    [InlineData(49999)]
    [InlineData(50000)] // DEMO0003
    public async Task CheckReaderEligibilityAsync_Allows_Debt_At_Or_Below_50000(decimal debt)
    {
        // Arrange
        var (service, _, _) = CreateFixture(debtAmount: debt);

        // Act
        var result = await service.CheckReaderEligibilityAsync("DEMO0001");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.True(result.Data.CanBorrow);
        Assert.False(result.Data.IsDebtBlocked);
        Assert.Null(result.Data.RejectionReason);
        Assert.Equal(debt, result.Data.UnpaidFineAmount);
        Assert.Equal(50000m, result.Data.DebtLockThreshold);
    }

    [Theory]
    [InlineData(50001)]
    [InlineData(55000)] // DEMO0004
    [InlineData(100000)]
    public async Task CheckReaderEligibilityAsync_Rejects_Debt_Above_50000(decimal debt)
    {
        // Arrange
        var (service, _, _) = CreateFixture(debtAmount: debt);

        // Act
        var result = await service.CheckReaderEligibilityAsync("DEMO0001");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.False(result.Data.CanBorrow);
        Assert.True(result.Data.IsDebtBlocked);
        Assert.NotNull(result.Data.RejectionReason);
        Assert.Contains("vượt quá ngưỡng cho phép", result.Data.RejectionReason);
    }

    // ==========================================
    // 3. Kiểm tra BorrowService.CreateBorrowAsync
    // ==========================================

    [Theory]
    [InlineData(0)]
    [InlineData(40000)] // DEMO0001
    [InlineData(49999)]
    [InlineData(50000)] // DEMO0003
    public async Task CreateBorrowAsync_Succeeds_When_Debt_Does_Not_Exceed_50000(decimal debt)
    {
        // Arrange
        var (service, _, _) = CreateFixture(debtAmount: debt);
        var request = new CreateBorrowRequestDto
        {
            ReaderCode = "DEMO0001",
            Barcodes = new List<string> { "BC000001-A" },
            DueDate = DateTime.UtcNow.AddDays(14)
        };

        // Act
        var result = await service.CreateBorrowAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(999, result.Data.BorrowingID);
    }

    [Theory]
    [InlineData(50001)]
    [InlineData(55000)] // DEMO0004
    [InlineData(80000)]
    public async Task CreateBorrowAsync_Fails_When_Debt_Exceeds_50000(decimal debt)
    {
        // Arrange
        var (service, _, _) = CreateFixture(debtAmount: debt);
        var request = new CreateBorrowRequestDto
        {
            ReaderCode = "DEMO0001",
            Barcodes = new List<string> { "BC000001-A" },
            DueDate = DateTime.UtcNow.AddDays(14)
        };

        // Act
        var result = await service.CreateBorrowAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("vượt quá ngưỡng cho phép", result.Message);
    }

    [Fact]
    public async Task CreateBorrowAsync_Rejects_Locked_Card_Independent_Of_Debt()
    {
        // Arrange: Thẻ bị khóa, nợ 0đ
        var (service, _, _) = CreateFixture(debtAmount: 0m, isActive: false);
        var request = new CreateBorrowRequestDto
        {
            ReaderCode = "DEMO0001",
            Barcodes = new List<string> { "BC000001-A" },
            DueDate = DateTime.UtcNow.AddDays(14)
        };

        // Act
        var result = await service.CreateBorrowAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("bị khóa hoặc ngừng hoạt động", result.Message);
    }

    [Fact]
    public async Task CreateBorrowAsync_Rejects_Expired_Card_Independent_Of_Debt()
    {
        // Arrange: Thẻ hết hạn, nợ 40.000đ (dưới 50k)
        var (service, _, _) = CreateFixture(debtAmount: 40000m, isActive: true, isExpired: true);
        var request = new CreateBorrowRequestDto
        {
            ReaderCode = "DEMO0001",
            Barcodes = new List<string> { "BC000001-A" },
            DueDate = DateTime.UtcNow.AddDays(14)
        };

        // Act
        var result = await service.CreateBorrowAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("hết hạn", result.Message);
    }
}
