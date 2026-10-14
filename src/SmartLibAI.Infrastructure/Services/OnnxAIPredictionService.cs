using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SmartLibAI.Core.DTOs.AI;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Infrastructure.Services;

/// <summary>
/// Dịch vụ nhúng mô hình AI ONNX Runtime trực tiếp trong tiến trình (In-Process) để đánh giá rủi ro mượn sách.
/// Tối ưu độ trễ thấp (<1ms) không qua HTTP API trung gian (Story LOLRA-88).
/// </summary>
public class OnnxAIPredictionService : IAIPredictionService, IDisposable
{
    private readonly ILogger<OnnxAIPredictionService> _logger;
    private readonly InferenceSession? _session;
    private readonly bool _isModelLoaded;

    public OnnxAIPredictionService(IConfiguration configuration, ILogger<OnnxAIPredictionService> logger)
    {
        _logger = logger;

        try
        {
            var configPath = configuration["AI:ModelPath"] ?? "data/smartlib_risk_model.onnx";
            var resolvedPath = ResolveModelPath(configPath);

            if (File.Exists(resolvedPath))
            {
                var sessionOptions = new SessionOptions
                {
                    GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
                    ExecutionMode = ExecutionMode.ORT_SEQUENTIAL
                };

                _session = new InferenceSession(resolvedPath, sessionOptions);
                _isModelLoaded = true;
                _logger.LogInformation("SmartLib AI ONNX Model loaded successfully from {Path}", resolvedPath);
            }
            else
            {
                _logger.LogWarning("ONNX model file not found at {ResolvedPath}. Fallback heuristic rule will be used.", resolvedPath);
                _isModelLoaded = false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize ONNX InferenceSession. AI fallback rule will be used.");
            _isModelLoaded = false;
        }
    }

    /// <summary>
    /// Đánh giá rủi ro trễ hạn của độc giả dựa trên 8 đặc trưng.
    /// </summary>
    public RiskEvaluationResultDto EvaluateBorrowRisk(ReaderRiskInputDto input)
    {
        if (!_isModelLoaded || _session == null)
        {
            return FallbackRiskEvaluation(input);
        }

        try
        {
            // Mã hóa 8 đặc trưng theo đúng thứ tự Feature Order trong data/model_metadata.json
            // 0: Faculty, 1: MemberType, 2: CreditScore, 3: CurrentHoldingBooks,
            // 4: HistoricalOverdueCount, 5: BorrowDurationDays, 6: TotalCurrentDebt, 7: IsExamSeason
            var inputTensor = new DenseTensor<float>(new[] { 1, 8 });

            inputTensor[0, 0] = EncodeFaculty(input.Faculty);
            inputTensor[0, 1] = EncodeMemberType(input.MemberType);
            inputTensor[0, 2] = (float)input.CreditScore;
            inputTensor[0, 3] = (float)input.CurrentHoldingBooks;
            inputTensor[0, 4] = (float)input.HistoricalOverdueCount;
            inputTensor[0, 5] = (float)input.BorrowDurationDays;
            inputTensor[0, 6] = (float)input.TotalCurrentDebt;
            inputTensor[0, 7] = input.IsExamSeason ? 1.0f : 0.0f;

            var inputs = new List<NamedOnnxValue>
            {
                NamedOnnxValue.CreateFromTensor("float_input", inputTensor)
            };

            using var results = _session.Run(inputs);

            // Đọc xác suất rủi ro (lớp 1 - quá hạn) từ output_probability: shape [1, 2]
            var probOutput = results.FirstOrDefault(r => r.Name == "output_probability");
            float overdueProbability = 0.0f;

            if (probOutput != null)
            {
                var probTensor = probOutput.AsTensor<float>();
                overdueProbability = probTensor[0, 1]; // Lớp 1: quá hạn
            }
            else
            {
                // Fallback nếu output tên khác
                var firstTensor = results.First().AsTensor<float>();
                overdueProbability = firstTensor.Length >= 2 ? firstTensor.GetValue(1) : 0.0f;
            }

            var riskScoreDecimal = (decimal)Math.Round(overdueProbability, 4);

            return BuildResultDto(riskScoreDecimal);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing ONNX inference. Utilizing heuristic fallback.");
            return FallbackRiskEvaluation(input);
        }
    }

    private static RiskEvaluationResultDto BuildResultDto(decimal riskScore)
    {
        string tier;
        string badgeColor;
        string action;

        if (riskScore >= 0.70m)
        {
            tier = "High";
            badgeColor = "danger";
            action = "Cảnh báo cao: Khóa mượn tài liệu quý/giáo trình hot, yêu cầu thủ thư xét duyệt trực tiếp.";
        }
        else if (riskScore >= 0.40m)
        {
            tier = "Medium";
            badgeColor = "warning";
            action = "Cảnh báo vừa: Cho phép mượn nhưng thủ thư nhắc nhở hạn trả và gửi email cảnh báo sớm.";
        }
        else
        {
            tier = "Low";
            badgeColor = "success";
            action = "An toàn: Độc giả có điểm tín nhiệm tốt, cho phép mượn sách nhanh tự động.";
        }

        return new RiskEvaluationResultDto
        {
            RiskScore = riskScore,
            RiskTier = tier,
            BadgeColor = badgeColor,
            SuggestedAction = action,
            EvaluatedAt = DateTime.UtcNow
        };
    }

    private static float EncodeFaculty(string? faculty)
    {
        if (string.IsNullOrWhiteSpace(faculty)) return 0.0f;
        var clean = faculty.Trim().ToLowerInvariant();

        if (clean.Contains("cntt") || clean.Contains("công nghệ thông tin") || clean.Contains("it")) return 0.0f;
        if (clean.Contains("cơ khí") || clean.Contains("cokhi") || clean.Contains("chế tạo")) return 1.0f;
        if (clean.Contains("kinh tế") || clean.Contains("kinhte") || clean.Contains("quản trị")) return 2.0f;
        if (clean.Contains("luật") || clean.Contains("luat")) return 3.0f;
        if (clean.Contains("ngoại ngữ") || clean.Contains("ngoaingu") || clean.Contains("tiếng anh")) return 4.0f;
        if (clean.Contains("y") || clean.Contains("dược") || clean.Contains("yduoc")) return 5.0f;

        return 0.0f;
    }

    private static float EncodeMemberType(string? memberType)
    {
        if (string.IsNullOrWhiteSpace(memberType)) return 2.0f;
        var clean = memberType.Trim().ToLowerInvariant();

        if (clean.Contains("giảng viên") || clean.Contains("lecturer") || clean.Contains("teacher")) return 0.0f;
        if (clean.Contains("cao học") || clean.Contains("thạc sĩ") || clean.Contains("graduate") || clean.Contains("sđh")) return 1.0f;
        return 2.0f; // Student mặc định
    }

    private RiskEvaluationResultDto FallbackRiskEvaluation(ReaderRiskInputDto input)
    {
        // Heuristic fallback khi chưa tải được model
        decimal fallbackScore = 0.10m;
        if (input.CreditScore < 50 || input.HistoricalOverdueCount >= 3)
        {
            fallbackScore = 0.75m;
        }
        else if (input.CreditScore < 75 || input.HistoricalOverdueCount >= 1 || input.TotalCurrentDebt > 0)
        {
            fallbackScore = 0.45m;
        }

        return BuildResultDto(fallbackScore);
    }

    private static string ResolveModelPath(string relativePath)
    {
        if (Path.IsPathRooted(relativePath) && File.Exists(relativePath))
        {
            return relativePath;
        }

        // Tìm từ AppContext.BaseDirectory
        var baseDir = AppContext.BaseDirectory;
        var candidate1 = Path.GetFullPath(Path.Combine(baseDir, relativePath));
        if (File.Exists(candidate1)) return candidate1;

        // Tìm từ thư mục thực thi hiện tại (Current Directory)
        var currentDir = Directory.GetCurrentDirectory();
        var candidate2 = Path.GetFullPath(Path.Combine(currentDir, relativePath));
        if (File.Exists(candidate2)) return candidate2;

        // Thử tìm lùi về thư mục gốc của repository (nếu đang ở bin/Debug/net10.0)
        var dirInfo = new DirectoryInfo(baseDir);
        for (int i = 0; i < 5 && dirInfo.Parent != null; i++)
        {
            dirInfo = dirInfo.Parent;
            var checkPath = Path.Combine(dirInfo.FullName, relativePath);
            if (File.Exists(checkPath)) return checkPath;
        }

        return candidate2;
    }

    public void Dispose()
    {
        _session?.Dispose();
    }
}
