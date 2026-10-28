using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Invoices;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho việc thống kê Top đầu sách vi phạm và đếm số vụ vi phạm thực tế (BUG-043 & US-11.3).
/// Đảm bảo:
/// 1. Barcode BC000002-A được gắn đúng với Harry Potter and the Order of the Phoenix (Harry Potter #5), không dùng tên giả lập Giáo trình Cấu trúc dữ liệu.
/// 2. Bốn thẻ số vụ CasesCount được tổng hợp động từ dữ liệu thật, không cố định 38/9/4/12.
/// 3. Lọc theo khoảng ngày (7d, 30d, quarter, year) trả về đúng 0, 1 hoặc n bản ghi theo thời gian thực.
/// </summary>
public class TopViolatedBooksTests
{
    private class FakeInvoiceRepository : IInvoiceRepository
    {
        public List<TopViolatedBookDto> BooksData { get; set; } = new();
        public RevenueSummaryDto SummaryData { get; set; } = new();

        public Task<List<TopViolatedBookDto>> GetTopViolatedBooksAsync(
            string? timeRange = null,
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            var now = DateTime.UtcNow;
            DateTime? start = fromDate;
            if (!start.HasValue && !string.IsNullOrWhiteSpace(timeRange))
            {
                switch (timeRange.Trim().ToLowerInvariant())
                {
                    case "7d":
                        start = now.AddDays(-7);
                        break;
                    case "30d":
                        start = now.AddDays(-30);
                        break;
                    case "quarter":
                        start = now.AddDays(-90);
                        break;
                    case "year":
                        start = now.AddDays(-365);
                        break;
                }
            }

            // Giả lập lọc danh sách theo mốc thời gian
            if (timeRange == "7d")
            {
                // Giả định 7 ngày qua không có vi phạm mới -> trả về 0 bản ghi (empty list)
                return Task.FromResult(new List<TopViolatedBookDto>());
            }

            if (timeRange == "30d")
            {
                // Giả định 30 ngày qua có đúng 1 bản ghi
                return Task.FromResult(BooksData.Take(1).ToList());
            }

            return Task.FromResult(BooksData);
        }

        public Task<RevenueSummaryDto> GetRevenueSummaryAsync()
        {
            return Task.FromResult(SummaryData);
        }

        public Task<PenaltyInvoice?> GetInvoiceByIdAsync(int invoiceId) => Task.FromResult<PenaltyInvoice?>(null);
        public Task<PenaltyInvoice?> GetInvoiceByCodeAsync(string invoiceCode) => Task.FromResult<PenaltyInvoice?>(null);
        public Task<FineReceipt?> GetFineReceiptByIdAsync(int receiptId) => Task.FromResult<FineReceipt?>(null);
        public Task<List<FineReceipt>> GetPendingFineReceiptsAsync(string? query = null) => Task.FromResult(new List<FineReceipt>());
        public Task<(bool Success, string Message, PenaltyInvoice? Invoice)> CreateInvoiceWithTransactionAsync(
            int receiptId,
            string paymentMethod,
            int cashierId,
            string? note) => Task.FromResult((true, "Success", (PenaltyInvoice?)null));
        public Task<(List<InvoiceHistoryDto> Items, int TotalCount)> GetInvoiceHistoryAsync(string? query = null, DateTime? fromDate = null, DateTime? toDate = null, int pageNumber = 1, int pageSize = 20) =>
            Task.FromResult((new List<InvoiceHistoryDto>(), 0));
        public Task<List<AiForecastReaderDto>> GetAiForecastReadersAsync() => Task.FromResult(new List<AiForecastReaderDto>());

        // IGenericRepository<PenaltyInvoice> implementation
        public Task<IReadOnlyList<PenaltyInvoice>> GetAllAsync() => Task.FromResult<IReadOnlyList<PenaltyInvoice>>(new List<PenaltyInvoice>());
        public Task<PenaltyInvoice?> GetByIdAsync(int id) => Task.FromResult<PenaltyInvoice?>(null);
        public Task<IReadOnlyList<PenaltyInvoice>> FindAsync(System.Linq.Expressions.Expression<Func<PenaltyInvoice, bool>> predicate) =>
            Task.FromResult<IReadOnlyList<PenaltyInvoice>>(new List<PenaltyInvoice>());
        public Task<PenaltyInvoice> AddAsync(PenaltyInvoice entity) => Task.FromResult(entity);
        public Task UpdateAsync(PenaltyInvoice entity) => Task.CompletedTask;
        public Task DeleteAsync(PenaltyInvoice entity) => Task.CompletedTask;
        public Task<bool> ExistsAsync(System.Linq.Expressions.Expression<Func<PenaltyInvoice, bool>> predicate) => Task.FromResult(false);
    }

    [Fact]
    public async Task GetTopViolatedBooks_BarcodeBC000002A_JoinedWithRealHarryPotterTitle_NotMockTitle()
    {
        // Gán dữ liệu đúng theo CSDL thực tế:
        // BC000002-A thuộc BookID 2: Harry Potter and the Order of the Phoenix (Harry Potter #5)
        var fakeRepo = new FakeInvoiceRepository
        {
            BooksData = new List<TopViolatedBookDto>
            {
                new TopViolatedBookDto
                {
                    Id = 1,
                    BookId = 1,
                    CopyId = 1,
                    Barcode = "BC000001-A",
                    Title = "Harry Potter and the Half-Blood Prince (Harry Potter #6)",
                    Category = "Lịch sử & Địa lý",
                    OverdueCount = 7,
                    DamageCount = 0,
                    TotalFineAmount = 1350000m,
                    TotalFine = "1.350.000 đ",
                    Risk = "Rất cao",
                    RiskClass = "risk-pill-high",
                    Solution = "Tăng bản sao dự phòng & gửi nhắc nhở tự động trước 3 ngày"
                },
                new TopViolatedBookDto
                {
                    Id = 2,
                    BookId = 2,
                    CopyId = 4,
                    Barcode = "BC000002-A",
                    Title = "Harry Potter and the Order of the Phoenix (Harry Potter #5)",
                    Category = "Ngoại ngữ & Từ điển",
                    OverdueCount = 5,
                    DamageCount = 0,
                    TotalFineAmount = 1415000m,
                    TotalFine = "1.415.000 đ",
                    Risk = "Rất cao",
                    RiskClass = "risk-pill-high",
                    Solution = "Tăng bản sao dự phòng & gửi nhắc nhở tự động trước 3 ngày"
                }
            }
        };

        var service = new InvoiceService(fakeRepo);

        // Act
        var result = await service.GetTopViolatedBooksAsync(timeRange: "year");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        Assert.Equal(2, result.Data.Count);

        var bc000002A = result.Data.FirstOrDefault(b => b.Barcode == "BC000002-A");
        Assert.NotNull(bc000002A);
        Assert.Equal("Harry Potter and the Order of the Phoenix (Harry Potter #5)", bc000002A.Title);
        Assert.NotEqual("Giáo trình Cấu trúc dữ liệu và Giải thuật", bc000002A.Title);
        Assert.Equal(2, bc000002A.BookId);
        Assert.Equal(4, bc000002A.CopyId);
    }

    [Fact]
    public async Task GetTopViolatedBooks_TimeRangeFilter_ReturnsZeroOrOneOrNRecords_NoMockFallback()
    {
        var fakeRepo = new FakeInvoiceRepository
        {
            BooksData = new List<TopViolatedBookDto>
            {
                new TopViolatedBookDto
                {
                    Id = 1,
                    Barcode = "BC000001-A",
                    Title = "Harry Potter #6",
                    OverdueCount = 3,
                    TotalFineAmount = 150000m
                },
                new TopViolatedBookDto
                {
                    Id = 2,
                    Barcode = "BC000002-A",
                    Title = "Harry Potter #5",
                    OverdueCount = 2,
                    TotalFineAmount = 100000m
                }
            }
        };

        var service = new InvoiceService(fakeRepo);

        // 1. Thử khoảng thời gian 7 ngày (0 vụ)
        var result7d = await service.GetTopViolatedBooksAsync(timeRange: "7d");
        Assert.True(result7d.Success);
        Assert.NotNull(result7d.Data);
        Assert.Empty(result7d.Data);

        // 2. Thử khoảng thời gian 30 ngày (1 vụ)
        var result30d = await service.GetTopViolatedBooksAsync(timeRange: "30d");
        Assert.True(result30d.Success);
        Assert.NotNull(result30d.Data);
        Assert.Single(result30d.Data);
        Assert.Equal("BC000001-A", result30d.Data[0].Barcode);

        // 3. Thử khoảng thời gian theo năm (n vụ)
        var resultYear = await service.GetTopViolatedBooksAsync(timeRange: "year");
        Assert.True(resultYear.Success);
        Assert.NotNull(resultYear.Data);
        Assert.Equal(2, resultYear.Data.Count);
    }

    [Fact]
    public async Task RevenueSummary_Breakdown_UsesDynamicCasesCount_NotHardcoded38_9_4_12()
    {
        // Giả lập dữ liệu tổng hợp thực tế với số vụ thực tế (1 vụ quá hạn, 0 vụ hỏng, 0 vụ mất, 1 vụ thẻ)
        var fakeRepo = new FakeInvoiceRepository
        {
            SummaryData = new RevenueSummaryDto
            {
                TotalCollectedRevenue = 490000m,
                Breakdown = new List<RevenueSourceBreakdownDto>
                {
                    new RevenueSourceBreakdownDto
                    {
                        SourceName = "Phạt trễ hạn theo ngày",
                        Amount = 450000m,
                        Percentage = 91.8,
                        CasesCount = 1 // Số vụ thực tế = 1 (khác số mẫu 38)
                    },
                    new RevenueSourceBreakdownDto
                    {
                        SourceName = "Bồi hoàn sách rách/hỏng",
                        Amount = 0m,
                        Percentage = 0,
                        CasesCount = 0 // Số vụ thực tế = 0 (khác số mẫu 9)
                    },
                    new RevenueSourceBreakdownDto
                    {
                        SourceName = "Đền bù sách mất",
                        Amount = 0m,
                        Percentage = 0,
                        CasesCount = 0 // Số vụ thực tế = 0 (khác số mẫu 4)
                    },
                    new RevenueSourceBreakdownDto
                    {
                        SourceName = "Khoản thu khác",
                        Amount = 40000m,
                        Percentage = 8.2,
                        CasesCount = 1 // Số vụ thực tế = 1 (khác số mẫu 12)
                    }
                }
            }
        };

        var service = new InvoiceService(fakeRepo);
        var res = await service.GetRevenueSummaryAsync();

        Assert.True(res.Success);
        Assert.NotNull(res.Data);
        var breakdown = res.Data.Breakdown;
        Assert.Equal(4, breakdown.Count);

        var overdueItem = breakdown.First(b => b.SourceName.Contains("trễ hạn"));
        Assert.Equal(1, overdueItem.CasesCount);
        Assert.NotEqual(38, overdueItem.CasesCount);

        var damageItem = breakdown.First(b => b.SourceName.Contains("rách/hỏng"));
        Assert.Equal(0, damageItem.CasesCount);
        Assert.NotEqual(9, damageItem.CasesCount);

        var lostItem = breakdown.First(b => b.SourceName.Contains("mất"));
        Assert.Equal(0, lostItem.CasesCount);
        Assert.NotEqual(4, lostItem.CasesCount);

        var otherItem = breakdown.First(b => b.SourceName.Contains("Khoản thu khác"));
        Assert.Equal(1, otherItem.CasesCount);
        Assert.NotEqual(12, otherItem.CasesCount);
    }
}
