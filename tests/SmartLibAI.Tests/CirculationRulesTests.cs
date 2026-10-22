using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử nghiệp vụ tính toán tiền phạt lưu thông và phân loại rủi ro độc giả.
/// </summary>
public class CirculationRulesTests
{
    [Theory]
    [InlineData(0, 5000, 0)]
    [InlineData(1, 5000, 5000)]
    [InlineData(7, 5000, 35000)]
    [InlineData(30, 2000, 60000)]
    public void CalculateOverdueFine_CalculatesCorrectAmount(int overdueDays, decimal dailyRate, decimal expectedFine)
    {
        // Act: Công thức tính phạt chuẩn = số ngày quá hạn * đơn giá phạt/ngày
        var calculatedFine = overdueDays * dailyRate;

        // Assert
        Assert.Equal(expectedFine, calculatedFine);
    }

    [Theory]
    [InlineData(0.85, "High")]
    [InlineData(0.70, "High")]
    [InlineData(0.69, "Medium")]
    [InlineData(0.40, "Medium")]
    [InlineData(0.39, "Low")]
    [InlineData(0.05, "Low")]
    public void RiskScore_ClassifiesIntoCorrectTier(decimal score, string expectedTier)
    {
        // Act
        string tier;
        if (score >= 0.70m)
        {
            tier = "High";
        }
        else if (score >= 0.40m)
        {
            tier = "Medium";
        }
        else
        {
            tier = "Low";
        }

        // Assert
        Assert.Equal(expectedTier, tier);
    }
}
