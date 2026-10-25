using SmartLibAI.Core.DTOs.Rules;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho việc cấu hình, kiểm tra tính hợp lệ và ghi nhật ký kiểm toán
/// cho chính sách chiết khấu theo điểm tín nhiệm bạn đọc chuẩn US-10.4 (BUG-036).
/// - Điểm tín nhiệm 90-100: Giảm 20% (aiDiscount_100 / ConductScoreDiscountPercent)
/// - Điểm tín nhiệm 80-89: Giảm 10% (aiDiscount_90)
/// - Điểm tín nhiệm < 80: Giảm 0%
/// </summary>
public class RulesCreditScoreTierTests
{
    private class FakeRulesRepository : IRulesRepository
    {
        public FineRule CurrentRule { get; set; } = new FineRule
        {
            RuleID = 1,
            RuleName = "Quy định thư viện chuẩn",
            AiDiscount_90 = 10.0m,
            ConductScoreDiscountPercent = 20.0m,
            FinePerDay = 5000m,
            IsActive = true
        };

        public List<RuleAuditLog> RecordedLogs { get; } = new();

        public Task<FineRule?> GetActiveFineRuleAsync() => Task.FromResult<FineRule?>(CurrentRule);

        public Task<FineRule> UpdateFineRuleAsync(FineRule fineRule)
        {
            CurrentRule = fineRule;
            return Task.FromResult(fineRule);
        }

        public Task<List<WaiverReason>> GetWaiverReasonsAsync() => Task.FromResult(new List<WaiverReason>());

        public Task<WaiverReason> AddWaiverReasonAsync(WaiverReason reason) => Task.FromResult(reason);

        public Task<List<RuleAuditLog>> GetAuditLogsAsync() => Task.FromResult(RecordedLogs);

        public Task AddAuditLogAsync(RuleAuditLog log)
        {
            RecordedLogs.Add(log);
            return Task.CompletedTask;
        }

        public Task AddAuditLogsAsync(IEnumerable<RuleAuditLog> logs)
        {
            RecordedLogs.AddRange(logs);
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task GetRulesAsync_ReturnsUS104CompliantDiscounts()
    {
        // Arrange
        var repo = new FakeRulesRepository();
        var service = new RulesService(repo);

        // Act
        var res = await service.GetRulesAsync();

        // Assert
        Assert.True(res.Success);
        Assert.NotNull(res.Data);
        Assert.Equal(10.0m, res.Data!.AiDiscount_90);
        Assert.Equal(20.0m, res.Data.AiDiscount_100);
    }

    [Fact]
    public async Task UpdateRulesAsync_WithValidTiers_UpdatesFineRuleAndLogsAuditTrail()
    {
        // Arrange
        var repo = new FakeRulesRepository();
        var service = new RulesService(repo);

        var request = new UpdateRulesRequestDto
        {
            AiDiscount_90 = 12.0m,
            AiDiscount_100 = 25.0m
        };

        // Act
        var res = await service.UpdateRulesAsync(request, "Thủ thư (Admin)", "127.0.0.1");

        // Assert
        Assert.True(res.Success);
        Assert.Equal(12.0m, repo.CurrentRule.AiDiscount_90);
        Assert.Equal(25.0m, repo.CurrentRule.ConductScoreDiscountPercent);

        // Kiểm tra audit logs có đúng tên quy định chuẩn US-10.4
        var log90 = repo.RecordedLogs.FirstOrDefault(l => l.RuleKey == "aiDiscount_90");
        Assert.NotNull(log90);
        Assert.Equal("Chiết khấu tín nhiệm tốt (80-89 điểm)", log90!.RuleName);
        Assert.Equal("10.0%", log90.OldValue);
        Assert.Equal("12.0%", log90.NewValue);

        var log100 = repo.RecordedLogs.FirstOrDefault(l => l.RuleKey == "aiDiscount_100");
        Assert.NotNull(log100);
        Assert.Equal("Chiết khấu tín nhiệm xuất sắc (90-100 điểm)", log100!.RuleName);
        Assert.Equal("20.0%", log100.OldValue);
        Assert.Equal("25.0%", log100.NewValue);
    }

    [Theory]
    [InlineData(-5, 20)]
    [InlineData(105, 20)]
    [InlineData(10, -1)]
    [InlineData(10, 101)]
    public async Task UpdateRulesAsync_WithOutOfRangeDiscounts_ReturnsError(decimal discount90, decimal discount100)
    {
        // Arrange
        var repo = new FakeRulesRepository();
        var service = new RulesService(repo);

        var request = new UpdateRulesRequestDto
        {
            AiDiscount_90 = discount90,
            AiDiscount_100 = discount100
        };

        // Act
        var res = await service.UpdateRulesAsync(request, "Thủ thư (Admin)");

        // Assert
        Assert.False(res.Success);
        Assert.Contains("phải từ 0% đến 100%", res.Message);
    }

    [Fact]
    public async Task ResetDefaultRulesAsync_RestoresDiscountsToUS104Defaults()
    {
        // Arrange: Sửa cấu hình sang giá trị khác
        var repo = new FakeRulesRepository();
        repo.CurrentRule.AiDiscount_90 = 15.0m;
        repo.CurrentRule.ConductScoreDiscountPercent = 30.0m;

        var service = new RulesService(repo);

        // Act
        var res = await service.ResetDefaultRulesAsync("Thủ thư (Admin)");

        // Assert
        Assert.True(res.Success);
        Assert.Equal(10.0m, repo.CurrentRule.AiDiscount_90);
        Assert.Equal(20.0m, repo.CurrentRule.ConductScoreDiscountPercent);
    }
}
