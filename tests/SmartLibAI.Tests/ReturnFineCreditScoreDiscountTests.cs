using SmartLibAI.Core.DTOs.Returns;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using System.Linq.Expressions;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho tính năng tự động chiết khấu tiền phạt trả sách theo điểm tín nhiệm độc giả (BUG-007 & US Ưu tiên).
/// - Điểm tín nhiệm 90-100: Tự động giảm 20% tiền phạt (FineRule.ConductScoreDiscountPercent)
/// - Điểm tín nhiệm 80-89: Tự động giảm 10% tiền phạt (FineRule.AiDiscount_90)
/// - Điểm tín nhiệm < 80: Không tự động giảm (0%)
/// - Tách bạch rõ ràng chiết khấu tín nhiệm và miễn giảm thủ công do thủ thư nhập (WaiverDiscountPercent)
/// </summary>
public class ReturnFineCreditScoreDiscountTests
{
    private class FakeReturnRepository : IReturnRepository
    {
        public BorrowingDetail? ActiveDetail { get; set; }
        public FineRule CurrentFineRule { get; set; } = new FineRule
        {
            RuleID = 1,
            RuleName = "Quy định thư viện chuẩn",
            FinePerDay = 5000m,
            ConductScoreDiscountPercent = 20.0m, // 90-100 điểm: 20%
            AiDiscount_90 = 10.0m,              // 80-89 điểm: 10%
            DamageFeePercent = 20.0m,
            DamageMediumPercent = 40.0m,
            DamageSeverePercent = 110.0m,
            CompensationBasePercent = 110.0m,
            DamageMultiplier = 1.0m
        };

        public decimal CapturedTotalDiscountPercent { get; private set; }
        public decimal CapturedOverdueFine { get; private set; }
        public decimal CapturedDamageFee { get; private set; }
        public decimal CapturedLostFee { get; private set; }

        public Task<BorrowingDetail?> GetActiveDetailByBarcodeAsync(string barcode)
        {
            if (ActiveDetail != null && string.Equals(ActiveDetail.BookCopy?.Barcode, barcode, StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult<BorrowingDetail?>(ActiveDetail);
            }
            return Task.FromResult<BorrowingDetail?>(null);
        }

        public Task<List<BorrowingDetail>> GetActiveDetailsByBorrowCodeAsync(string borrowCodeOrId)
        {
            var list = new List<BorrowingDetail>();
            if (ActiveDetail != null)
            {
                list.Add(ActiveDetail);
            }
            return Task.FromResult(list);
        }

        public Task<FineRule?> GetActiveFineRuleAsync() => Task.FromResult<FineRule?>(CurrentFineRule);

        public Task<(bool Success, string Message, FineReceipt? FineReceipt, bool IsBorrowingCompleted)> ProcessReturnWithTransactionAsync(
            int detailId,
            string condition,
            string? note,
            decimal totalDiscountPercent,
            decimal overdueFine,
            decimal damageFee,
            decimal lostFee,
            int? librarianId)
        {
            CapturedTotalDiscountPercent = totalDiscountPercent;
            CapturedOverdueFine = overdueFine;
            CapturedDamageFee = damageFee;
            CapturedLostFee = lostFee;

            var rawTotal = overdueFine + damageFee + lostFee;
            var discountAmt = Math.Min(rawTotal, Math.Round(((rawTotal * totalDiscountPercent) / 100m) / 1000m, MidpointRounding.AwayFromZero) * 1000m);
            var finalAmt = Math.Max(0m, rawTotal - discountAmt);

            FineReceipt? receipt = null;
            if (rawTotal > 0)
            {
                receipt = new FineReceipt
                {
                    ReceiptID = 888,
                    BorrowingID = ActiveDetail?.BorrowingID ?? 1,
                    TotalAmount = rawTotal,
                    DiscountAmount = discountAmt,
                    FinalAmount = finalAmt,
                    Status = "Pending"
                };
            }

            return Task.FromResult((true, "Hoàn trả thành công", receipt, true));
        }

        public Task<IReadOnlyList<BorrowingDetail>> GetAllAsync() => Task.FromResult<IReadOnlyList<BorrowingDetail>>(new List<BorrowingDetail>());
        public Task<BorrowingDetail?> GetByIdAsync(int id) => Task.FromResult(ActiveDetail);
        public Task<IReadOnlyList<BorrowingDetail>> FindAsync(Expression<Func<BorrowingDetail, bool>> predicate) => Task.FromResult<IReadOnlyList<BorrowingDetail>>(new List<BorrowingDetail>());
        public Task<BorrowingDetail> AddAsync(BorrowingDetail entity) => Task.FromResult(entity);
        public Task UpdateAsync(BorrowingDetail entity) => Task.CompletedTask;
        public Task DeleteAsync(BorrowingDetail entity) => Task.CompletedTask;
        public Task<bool> ExistsAsync(Expression<Func<BorrowingDetail, bool>> predicate) => Task.FromResult(false);
    }

    private static (BorrowingDetail detail, Reader reader, Book book) CreateTestContext(int creditScore, int overdueDays, decimal basePrice = 100000m)
    {
        var user = new User
        {
            UserID = 122,
            Username = "reader_test",
            FullName = "Nguyễn Văn Độc Giả"
        };

        var reader = new Reader
        {
            ReaderID = 122,
            ReaderCode = "DG00122",
            CreditScore = creditScore,
            MemberType = "Student",
            Faculty = "CNTT",
            User = user
        };

        var book = new Book
        {
            BookID = 10,
            Title = "Kỹ thuật lập trình nâng cao",
            Author = "GS. Nguyễn Văn A",
            BasePrice = basePrice
        };

        var copy = new BookCopy
        {
            CopyID = 101,
            BookID = 10,
            Barcode = "BC000001-004",
            Book = book,
            Status = "Borrowed"
        };

        var now = DateTime.UtcNow;
        var borrowing = new Borrowing
        {
            BorrowingID = 114,
            ReaderID = 122,
            Reader = reader,
            BorrowDate = now.AddDays(-(overdueDays + 14)),
            DueDate = now.AddDays(-overdueDays),
            Status = "Active",
            BorrowingDetails = new List<BorrowingDetail>()
        };

        var detail = new BorrowingDetail
        {
            DetailID = 205,
            BorrowingID = 114,
            CopyID = 101,
            ItemStatus = "Borrowed",
            BookCopy = copy,
            Borrowing = borrowing
        };

        borrowing.BorrowingDetails.Add(detail);

        return (detail, reader, book);
    }

    [Fact]
    public async Task ProcessReturnItemAsync_CreditScore95_Applies20PercentDiscountAutomatically()
    {
        // Arrange: Độc giả điểm tín nhiệm 95, trễ 10 ngày (5.000đ/ngày -> phạt gốc 50.000đ), sách giá 100.000đ.
        // Không khai miễn giảm thủ công (WaiverDiscountPercent = 0).
        var repo = new FakeReturnRepository();
        var (detail, reader, _) = CreateTestContext(creditScore: 95, overdueDays: 10, basePrice: 100000m);
        repo.ActiveDetail = detail;

        var service = new ReturnService(repo);

        var request = new ReturnBookRequestDto
        {
            Barcode = "BC000001-004",
            Condition = "Good",
            WaiverDiscountPercent = 0m,
            Note = "Trả sách bình thường"
        };

        // Act
        var result = await service.ProcessReturnItemAsync(request, librarianId: 1);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);

        var data = result.Data!;
        // Phạt gốc 50.000đ
        Assert.Equal(50000m, data.OverdueFine);
        // Điểm tín nhiệm 95 -> Giảm 20%
        Assert.Equal(95, data.CreditScore);
        Assert.Equal(20.0m, data.CreditDiscountPercent);
        Assert.Equal(10000m, data.CreditDiscountAmount);

        // Miễn giảm thủ công = 0%
        Assert.Equal(0m, data.WaiverDiscountPercent);
        Assert.Equal(0m, data.WaiverDiscountAmount);

        // Tổng chiết khấu = 20%, số tiền giảm = 10.000đ, phải nộp = 40.000đ
        Assert.Equal(20.0m, data.TotalDiscountPercent);
        Assert.Equal(10000m, data.DiscountAmount);
        Assert.Equal(40000m, data.TotalFine);

        // Kiểm tra dữ liệu chuyển xuống Repository
        Assert.Equal(20.0m, repo.CapturedTotalDiscountPercent);
        Assert.Equal(50000m, repo.CapturedOverdueFine);
    }

    [Fact]
    public async Task ProcessReturnItemAsync_CreditScore86_PM0114Case_Applies10PercentDiscountAutomatically()
    {
        // Arrange: Độc giả điểm tín nhiệm 86 (ca PM0114), trễ 11 ngày (5.000đ/ngày -> phạt gốc 55.000đ).
        var repo = new FakeReturnRepository();
        var (detail, _, _) = CreateTestContext(creditScore: 86, overdueDays: 11, basePrice: 100000m);
        repo.ActiveDetail = detail;

        var service = new ReturnService(repo);

        var request = new ReturnBookRequestDto
        {
            Barcode = "BC000001-004",
            Condition = "Good",
            WaiverDiscountPercent = 0m
        };

        // Act
        var result = await service.ProcessReturnItemAsync(request, librarianId: 1);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);

        var data = result.Data!;
        // Phạt gốc 55.000đ
        Assert.Equal(55000m, data.OverdueFine);
        // Điểm tín nhiệm 86 (nhóm 80-89) -> Giảm 10%
        Assert.Equal(86, data.CreditScore);
        Assert.Equal(10.0m, data.CreditDiscountPercent);
        // 55.000 * 10% = 5.500đ -> làm tròn hàng nghìn AwayFromZero là 6.000đ
        Assert.Equal(6000m, data.CreditDiscountAmount);
        Assert.Equal(6000m, data.DiscountAmount);
        // Số tiền thực thu = 55.000 - 6.000 = 49.000đ
        Assert.Equal(49000m, data.TotalFine);
    }

    [Theory]
    [InlineData(100, 20.0, 10000, 40000)] // Mốc 100: giảm 20%
    [InlineData(90, 20.0, 10000, 40000)]  // Mốc 90: giảm 20%
    [InlineData(89, 10.0, 5000, 45000)]   // Mốc 89: giảm 10%
    [InlineData(80, 10.0, 5000, 45000)]   // Mốc 80: giảm 10%
    [InlineData(79, 0.0, 0, 50000)]       // Mốc 79: giảm 0%
    [InlineData(50, 0.0, 0, 50000)]       // Mốc 50: giảm 0%
    public async Task ProcessReturnItemAsync_CreditScoreBoundaryTesting(
        int creditScore,
        decimal expectedDiscountPercent,
        decimal expectedDiscountAmount,
        decimal expectedFinalFine)
    {
        // Arrange: 10 ngày trễ hạn x 5.000đ = 50.000đ
        var repo = new FakeReturnRepository();
        var (detail, _, _) = CreateTestContext(creditScore: creditScore, overdueDays: 10, basePrice: 100000m);
        repo.ActiveDetail = detail;

        var service = new ReturnService(repo);

        var request = new ReturnBookRequestDto
        {
            Barcode = "BC000001-004",
            Condition = "Good",
            WaiverDiscountPercent = 0m
        };

        // Act
        var result = await service.ProcessReturnItemAsync(request);

        // Assert
        Assert.True(result.Success);
        var data = result.Data!;
        Assert.Equal(creditScore, data.CreditScore);
        Assert.Equal(expectedDiscountPercent, data.CreditDiscountPercent);
        Assert.Equal(expectedDiscountAmount, data.CreditDiscountAmount);
        Assert.Equal(expectedDiscountAmount, data.DiscountAmount);
        Assert.Equal(expectedFinalFine, data.TotalFine);
    }

    [Fact]
    public async Task ProcessReturnItemAsync_CombinesCreditDiscountWithManualWaiver()
    {
        // Arrange: Điểm tín nhiệm 95 (tự giảm 20%) + Thủ thư miễn giảm thêm 30% = Tổng 50%
        var repo = new FakeReturnRepository();
        var (detail, _, _) = CreateTestContext(creditScore: 95, overdueDays: 10, basePrice: 100000m);
        repo.ActiveDetail = detail;

        var service = new ReturnService(repo);

        var request = new ReturnBookRequestDto
        {
            Barcode = "BC000001-004",
            Condition = "Good",
            WaiverDiscountPercent = 30m, // Miễn giảm thủ công 30%
            Note = "Độc giả hoàn cảnh khó khăn"
        };

        // Act
        var result = await service.ProcessReturnItemAsync(request);

        // Assert
        Assert.True(result.Success);
        var data = result.Data!;

        Assert.Equal(50000m, data.OverdueFine);
        Assert.Equal(20.0m, data.CreditDiscountPercent);
        Assert.Equal(10000m, data.CreditDiscountAmount);

        Assert.Equal(30.0m, data.WaiverDiscountPercent);
        Assert.Equal(15000m, data.WaiverDiscountAmount);

        Assert.Equal(50.0m, data.TotalDiscountPercent);
        Assert.Equal(25000m, data.DiscountAmount);
        Assert.Equal(25000m, data.TotalFine);

        Assert.Equal(50.0m, repo.CapturedTotalDiscountPercent);
    }

    [Fact]
    public async Task LookupReturnItemAsync_ReturnsCreditScoreDiscountPreview()
    {
        // Arrange: Kiểm tra màn hình xem trước / tra cứu sách trả
        var repo = new FakeReturnRepository();
        var (detail, _, _) = CreateTestContext(creditScore: 95, overdueDays: 10, basePrice: 100000m);
        repo.ActiveDetail = detail;

        var service = new ReturnService(repo);

        // Act
        var result = await service.LookupReturnItemAsync("BC000001-004");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);

        var preview = result.Data!;
        Assert.Equal(95, preview.CreditScore);
        Assert.Equal(20.0m, preview.CreditDiscountPercent);
        Assert.Equal(10000m, preview.CreditDiscountAmount);
        Assert.Equal(50000m, preview.OverdueFine);
        Assert.Equal(40000m, preview.EstimatedFinalFine);
    }
}
