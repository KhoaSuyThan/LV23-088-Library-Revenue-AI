using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Returns;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Service xử lý nghiệp vụ tiếp nhận sách trả rải rác & ghi nhận vi phạm (Story LOLRA-17).
/// </summary>
public interface IReturnService
{
    /// <summary>
    /// Tra cứu thông tin cuốn sách đang được mượn dựa trên Barcode của bản sao hoặc mã phiếu.
    /// </summary>
    Task<ApiResponse<ReturnLookupResponseDto>> LookupReturnItemAsync(string barcodeOrCode);

    /// <summary>
    /// Xử lý tiếp nhận trả một bản sao sách cụ thể theo Barcode, cập nhật tình trạng vật lý và tính phạt.
    /// </summary>
    Task<ApiResponse<ReturnBookResponseDto>> ProcessReturnItemAsync(ReturnBookRequestDto request, int? librarianId = null);
}
