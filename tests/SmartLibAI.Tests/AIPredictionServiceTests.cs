using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SmartLibAI.Core.DTOs.AI;
using SmartLibAI.Infrastructure.Services;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử tự động cho dịch vụ suy luận AI đánh giá rủi ro mượn sách.
/// </summary>
public class AIPredictionServiceTests
{
    [Fact]
    public void FallbackEvaluation_HighRiskReader_ReturnsHighRiskTierAndFallbackSource()
    {
        // Arrange: Cấu hình trỏ tới đường dẫn file model không tồn tại để ép kích hoạt nhánh Heuristic Fallback
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "AI:ModelPath", "non_existent_model_for_test.onnx" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        using var service = new OnnxAIPredictionService(configuration, NullLogger<OnnxAIPredictionService>.Instance);

        var highRiskInput = new ReaderRiskInputDto
        {
            Faculty = "CNTT",
            MemberType = "Student",
            CreditScore = 40, // Dưới 50 điểm tín nhiệm
            HistoricalOverdueCount = 4, // Đã từng trễ hạn 4 lần
            TotalCurrentDebt = 150000m
        };

        // Act
        var result = service.EvaluateBorrowRisk(highRiskInput);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0.75m, result.RiskScore);
        Assert.Equal("High", result.RiskTier);
        Assert.Equal("danger", result.BadgeColor);
        Assert.True(result.IsHeuristicFallback);
        Assert.Equal("Heuristic_Fallback", result.PredictionSource);
        Assert.False(service.IsModelLoaded);
        Assert.Equal("Heuristic Fallback Rule", service.ModelStatus);
    }

    [Fact]
    public void FallbackEvaluation_SafeReader_ReturnsLowRiskTier()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "AI:ModelPath", "non_existent_model_for_test.onnx" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        using var service = new OnnxAIPredictionService(configuration, NullLogger<OnnxAIPredictionService>.Instance);

        var safeInput = new ReaderRiskInputDto
        {
            Faculty = "Kinh tế",
            MemberType = "Student",
            CreditScore = 95,
            HistoricalOverdueCount = 0,
            TotalCurrentDebt = 0m,
            CurrentHoldingBooks = 1
        };

        // Act
        var result = service.EvaluateBorrowRisk(safeInput);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0.10m, result.RiskScore);
        Assert.Equal("Low", result.RiskTier);
        Assert.Equal("success", result.BadgeColor);
        Assert.True(result.IsHeuristicFallback);
    }

    [Fact]
    public void FallbackEvaluation_MediumRiskReader_ReturnsMediumRiskTier()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "AI:ModelPath", "non_existent_model_for_test.onnx" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        using var service = new OnnxAIPredictionService(configuration, NullLogger<OnnxAIPredictionService>.Instance);

        var mediumInput = new ReaderRiskInputDto
        {
            Faculty = "Luật",
            MemberType = "Student",
            CreditScore = 70, // Dưới 75
            HistoricalOverdueCount = 1,
            TotalCurrentDebt = 20000m
        };

        // Act
        var result = service.EvaluateBorrowRisk(mediumInput);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0.45m, result.RiskScore);
        Assert.Equal("Medium", result.RiskTier);
        Assert.Equal("warning", result.BadgeColor);
    }
}
