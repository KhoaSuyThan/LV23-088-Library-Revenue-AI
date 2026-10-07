namespace SmartLibAI.Core.DTOs.Rules;

public class AiRetrainResponseDto
{
    public bool Success { get; set; } = true;
    public string Message { get; set; } = "Huấn luyện mô hình AI thành công.";
    public decimal Accuracy { get; set; } = 85.5m;
    public string LastTrained { get; set; } = string.Empty;
    public string ModelName { get; set; } = "Random Forest Classifier";
    public string Status { get; set; } = "Đang hoạt động";
}
