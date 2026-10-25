using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository nghiệp vụ tiếp nhận trả sách với SQL Transaction an toàn (Story LOLRA-17).
/// </summary>
public class ReturnRepository : GenericRepository<BorrowingDetail>, IReturnRepository
{
    public ReturnRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Tìm kiếm chi tiết mượn đang hoạt động theo mã Barcode của cuốn sách.
    /// </summary>
    public async Task<BorrowingDetail?> GetActiveDetailByBarcodeAsync(string barcode)
    {
        var cleanBarcode = barcode.Trim();

        return await _context.BorrowingDetails
            .Include(d => d.BookCopy)
                .ThenInclude(c => c.Book)
            .Include(d => d.Borrowing)
                .ThenInclude(b => b.Reader)
                    .ThenInclude(r => r.User)
            .Include(d => d.Borrowing)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .FirstOrDefaultAsync(d =>
                d.BookCopy.Barcode == cleanBarcode &&
                d.ReturnDate == null &&
                d.ItemStatus == "Borrowed");
    }

    /// <summary>
    /// Tìm kiếm chi tiết mượn đang hoạt động theo mã phiếu mượn (BorrowCode dạng PM-0005 hoặc ID số).
    /// </summary>
    public async Task<List<BorrowingDetail>> GetActiveDetailsByBorrowCodeAsync(string borrowCodeOrId)
    {
        var clean = borrowCodeOrId.Trim().ToUpperInvariant();
        int borrowingId = 0;

        if (clean.StartsWith("PM-"))
        {
            var numPart = clean.Replace("PM-", "").TrimStart('0');
            int.TryParse(numPart, out borrowingId);
        }
        else
        {
            int.TryParse(clean, out borrowingId);
        }

        return await _context.BorrowingDetails
            .Include(d => d.BookCopy)
                .ThenInclude(c => c.Book)
            .Include(d => d.Borrowing)
                .ThenInclude(b => b.Reader)
                    .ThenInclude(r => r.User)
            .Include(d => d.Borrowing)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Where(d =>
                (borrowingId > 0 && d.BorrowingID == borrowingId) &&
                d.ReturnDate == null &&
                d.ItemStatus == "Borrowed")
            .ToListAsync();
    }

    /// <summary>
    /// Lấy quy tắc tính tiền phạt và hạn mức đang có hiệu lực.
    /// </summary>
    public async Task<FineRule?> GetActiveFineRuleAsync()
    {
        return await _context.FineRules
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.IsActive);
    }

    /// <summary>
    /// Thực thi Transaction SQL hoàn trả bản sao sách an toàn và toàn vẹn dữ liệu.
    /// </summary>
    public async Task<(bool Success, string Message, FineReceipt? FineReceipt, bool IsBorrowingCompleted)> ProcessReturnWithTransactionAsync(
        int detailId,
        string condition,
        string? note,
        decimal totalDiscountPercent,
        decimal overdueFine,
        decimal damageFee,
        decimal lostFee,
        int? librarianId
    )
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Tải chi tiết mượn và khóa bản ghi
            var detail = await _context.BorrowingDetails
                .Include(d => d.BookCopy)
                .Include(d => d.Borrowing)
                    .ThenInclude(b => b.BorrowingDetails)
                .FirstOrDefaultAsync(d => d.DetailID == detailId);

            if (detail == null)
            {
                return (false, "Không tìm thấy chi tiết mượn sách tương ứng.", null, false);
            }

            if (detail.ReturnDate != null || detail.ItemStatus != "Borrowed")
            {
                return (false, $"Bản sao sách '{detail.BookCopy?.Barcode}' đã được xử lý hoàn trả trước đó.", null, false);
            }

            var now = DateTime.Now;
            var cleanCondition = string.IsNullOrWhiteSpace(condition) ? "Good" : condition.Trim();

            // 2. Cập nhật chi tiết mượn sách
            detail.ReturnDate = now;
            var isDamagedCond = cleanCondition.StartsWith("Damaged", StringComparison.OrdinalIgnoreCase);
            var isLostCond = cleanCondition.Equals("Lost", StringComparison.OrdinalIgnoreCase);

            detail.ItemStatus = isDamagedCond ? "Damaged" : (isLostCond ? "Lost" : "Returned");

            // 3. Cập nhật trạng thái bản sao sách trong kho
            var copy = detail.BookCopy;
            if (copy != null)
            {
                copy.Status = isDamagedCond ? "Damaged" : (isLostCond ? "Lost" : "Available");
            }

            // 4. Tính toán và tạo FineReceipt nếu phát sinh tiền phạt (áp dụng tổng tỷ lệ giảm trừ gồm chiết khấu điểm tín nhiệm & miễn giảm thủ công)
            var rule = await GetActiveFineRuleAsync();
            var rawTotal = Math.Round((overdueFine + damageFee + lostFee) / 1000m, MidpointRounding.AwayFromZero) * 1000m;
            FineReceipt? createdReceipt = null;

            if (rawTotal > 0 && rule != null)
            {
                var discountAmt = Math.Min(rawTotal, Math.Round(((rawTotal * totalDiscountPercent) / 100m) / 1000m, MidpointRounding.AwayFromZero) * 1000m);
                var finalAmt = Math.Max(0m, rawTotal - discountAmt);

                createdReceipt = new FineReceipt
                {
                    BorrowingID = detail.BorrowingID,
                    RuleID = rule.RuleID,
                    TotalAmount = rawTotal,
                    DiscountAmount = discountAmt,
                    FinalAmount = finalAmt,
                    Status = finalAmt == 0m ? "Paid" : "Pending"
                };

                await _context.FineReceipts.AddAsync(createdReceipt);
            }

            // 5. Kiểm tra xem toàn bộ sách trong phiếu mượn này đã được trả hết hay chưa (trả rải rác)
            var borrowing = detail.Borrowing;
            bool isAllReturned = borrowing.BorrowingDetails
                .All(d => (d.DetailID == detailId) || (d.ReturnDate != null && d.ItemStatus != "Borrowed"));

            if (isAllReturned)
            {
                borrowing.Status = "Returned";
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, "Tiếp nhận trả sách thành công.", createdReceipt, isAllReturned);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, $"Lỗi xử lý giao dịch cơ sở dữ liệu: {ex.Message}", null, false);
        }
    }
}
