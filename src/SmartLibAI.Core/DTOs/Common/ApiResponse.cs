namespace SmartLibAI.Core.DTOs.Common;

/// <summary>
/// Chuẩn hóa cấu trúc phản hồi dữ liệu API trên toàn hệ thống.
/// </summary>
/// <typeparam name="T">Kiểu dữ liệu của payload trả về</typeparam>
public class ApiResponse<T>
{
    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public T? Data { get; set; }

    public List<string>? Errors { get; set; }

    public static ApiResponse<T> SuccessResult(T data, string message = "Thao tác thành công")
    {
        return new ApiResponse<T>
        {
            Success = true,
            Message = message,
            Data = data,
            Errors = null
        };
    }

    public static ApiResponse<T> ErrorResult(string message, List<string>? errors = null)
    {
        return new ApiResponse<T>
        {
            Success = false,
            Message = message,
            Data = default,
            Errors = errors ?? new List<string>()
        };
    }
}
