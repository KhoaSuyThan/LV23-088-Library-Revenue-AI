namespace SmartLibAI.Core.Common;

using SmartLibAI.Core.Entities;

/// <summary>
/// Kết quả phân tích và bóc tách cơ cấu doanh thu từ một hóa đơn thu tiền phạt (BUG-042 & US-11.3).
/// </summary>
public record InvoiceRevenueBreakdown(
    decimal OverdueAmount,
    decimal DamageAmount,
    decimal LostAmount,
    decimal OtherAmount,
    string FineReasonCode,
    string FineReasonLabel
);

/// <summary>
/// Bộ phân loại doanh thu thu phạt theo loại vi phạm thực tế được lưu trên biên lai / chi tiết phiếu mượn.
/// Khắc phục BUG-042: Khoản thu phạt trễ hạn bị cộng vào nhóm Khoản thu khác do dò từ khóa FineRule.RuleName sai.
/// </summary>
public static class InvoiceRevenueClassifier
{
    /// <summary>
    /// Phân loại số tiền AmountPaid của một hóa đơn vào 4 nhóm:
    /// 1. Phạt trễ hạn theo ngày (Overdue)
    /// 2. Bồi hoàn sách rách/hỏng (Damage)
    /// 3. Đền bù sách mất (Lost)
    /// 4. Phí cấp lại thẻ & Vi phạm khác (Other)
    /// Hỗ trợ bóc tách và phân bổ tỷ lệ sau giảm giá và làm tròn đối với trường hợp vi phạm kép.
    /// </summary>
    public static InvoiceRevenueBreakdown Classify(PenaltyInvoice invoice)
    {
        if (invoice == null || invoice.AmountPaid <= 0)
        {
            return new InvoiceRevenueBreakdown(0m, 0m, 0m, 0m, "Other", "Không phát sinh khoản thu");
        }

        var receipt = invoice.FineReceipt;
        var borrowing = receipt?.Borrowing;
        var details = borrowing?.BorrowingDetails?.ToList() ?? new List<BorrowingDetail>();
        var rule = receipt?.FineRule;
        decimal finePerDay = rule?.FinePerDay ?? 5000m;

        decimal rawOverdue = 0m;
        decimal rawDamage = 0m;
        decimal rawLost = 0m;

        // 1. Phân tích chi tiết từng cuốn sách trong phiếu mượn (BorrowingDetails)
        if (details.Count > 0)
        {
            foreach (var detail in details)
            {
                var bookPrice = detail.BookCopy?.Book?.BasePrice ?? 50000m;

                // Kiểm tra quá hạn hoàn trả sách
                var returnDate = detail.ReturnDate ?? invoice.PaymentDate;
                if (borrowing != null && returnDate.Date > borrowing.DueDate.Date)
                {
                    int overdueDays = (returnDate.Date - borrowing.DueDate.Date).Days;
                    if (overdueDays > 0)
                    {
                        rawOverdue += Math.Min(overdueDays * finePerDay, bookPrice);
                    }
                }

                // Kiểm tra hư hỏng sách
                if (!string.IsNullOrWhiteSpace(detail.ItemStatus) &&
                    (detail.ItemStatus.StartsWith("Damaged", StringComparison.OrdinalIgnoreCase) ||
                     detail.ItemStatus.Equals("Damage", StringComparison.OrdinalIgnoreCase)))
                {
                    decimal dmgPct = rule?.DamageFeePercent ?? 30.0m;
                    rawDamage += bookPrice * (dmgPct / 100m);
                }

                // Kiểm tra mất sách
                if (!string.IsNullOrWhiteSpace(detail.ItemStatus) &&
                    detail.ItemStatus.Equals("Lost", StringComparison.OrdinalIgnoreCase))
                {
                    decimal lostPct = rule?.CompensationBasePercent ?? 110.0m;
                    rawLost += bookPrice * (lostPct / 100m);
                }
            }
        }
        else if (borrowing != null)
        {
            // Trường hợp không có bản ghi chi tiết: đối chiếu ngày hết hạn và ngày thanh toán hóa đơn
            if (invoice.PaymentDate.Date > borrowing.DueDate.Date)
            {
                int overdueDays = (invoice.PaymentDate.Date - borrowing.DueDate.Date).Days;
                if (overdueDays > 0)
                {
                    rawOverdue = overdueDays * finePerDay;
                }
            }
        }

        // 2. Dự phòng dựa trên ghi chú hóa đơn (invoice.Note) nếu các chỉ số chưa xác định được từ chi tiết
        var note = (invoice.Note ?? string.Empty).ToLowerInvariant();
        bool isCardService = note.Contains("thẻ") || note.Contains("cấp lại") || note.Contains("in lại");

        if (!isCardService)
        {
            if (rawOverdue == 0 && (note.Contains("trễ") || note.Contains("quá hạn") || note.Contains("overdue")))
            {
                rawOverdue = 1m;
            }
            if (rawDamage == 0 && (note.Contains("hỏng") || note.Contains("rách") || note.Contains("damage")))
            {
                rawDamage = 1m;
            }
            if (rawLost == 0 && (note.Contains("mất") || note.Contains("lost")))
            {
                rawLost = 1m;
            }
        }

        decimal totalRaw = rawOverdue + rawDamage + rawLost;

        // 3. Nếu không thuộc nhóm trễ hạn, hỏng hoặc mất -> Xếp vào nhóm Khoản thu khác
        if (totalRaw <= 0)
        {
            var fallbackLabel = !string.IsNullOrWhiteSpace(invoice.Note)
                ? invoice.Note
                : "Phí cấp lại thẻ & Vi phạm khác";

            return new InvoiceRevenueBreakdown(0m, 0m, 0m, invoice.AmountPaid, "Other", fallbackLabel);
        }

        // Tính số ngày trễ hạn đại diện phục vụ hiển thị nhãn lý do
        int representativeDays = 0;
        if (borrowing != null && invoice.PaymentDate.Date > borrowing.DueDate.Date)
        {
            representativeDays = (invoice.PaymentDate.Date - borrowing.DueDate.Date).Days;
        }

        // 4. Trường hợp đơn lẻ (chỉ phát sinh một loại vi phạm duy nhất)
        if (rawOverdue > 0 && rawDamage == 0 && rawLost == 0)
        {
            var label = representativeDays > 0
                ? $"Phạt trễ hạn hoàn trả sách ({representativeDays} ngày)"
                : "Phạt trễ hạn hoàn trả sách";

            return new InvoiceRevenueBreakdown(invoice.AmountPaid, 0m, 0m, 0m, "Overdue", label);
        }

        if (rawDamage > 0 && rawOverdue == 0 && rawLost == 0)
        {
            return new InvoiceRevenueBreakdown(0m, invoice.AmountPaid, 0m, 0m, "Damaged", "Bồi hoàn làm hỏng/rách sách");
        }

        if (rawLost > 0 && rawOverdue == 0 && rawDamage == 0)
        {
            return new InvoiceRevenueBreakdown(0m, 0m, invoice.AmountPaid, 0m, "Lost", "Bồi thường làm mất tài liệu");
        }

        // 5. Trường hợp vi phạm kép (vừa trễ hạn vừa hỏng/mất):
        // Phân bổ tỷ lệ sau giảm và làm tròn chẵn nghìn đồng theo đúng quy định kế toán
        decimal oAlloc = Math.Round((invoice.AmountPaid * rawOverdue / totalRaw) / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal dAlloc = Math.Round((invoice.AmountPaid * rawDamage / totalRaw) / 1000m, MidpointRounding.AwayFromZero) * 1000m;
        decimal lAlloc = Math.Round((invoice.AmountPaid * rawLost / totalRaw) / 1000m, MidpointRounding.AwayFromZero) * 1000m;

        // Đảm bảo tổng các thành phần phân bổ khớp chính xác tuyệt đối 100% với AmountPaid
        decimal diff = invoice.AmountPaid - (oAlloc + dAlloc + lAlloc);
        if (diff != 0)
        {
            if (oAlloc >= dAlloc && oAlloc >= lAlloc && oAlloc > 0)
            {
                oAlloc += diff;
            }
            else if (dAlloc >= oAlloc && dAlloc >= lAlloc && dAlloc > 0)
            {
                dAlloc += diff;
            }
            else if (lAlloc > 0)
            {
                lAlloc += diff;
            }
            else
            {
                oAlloc += diff;
            }
        }

        string compoundCode;
        string compoundLabel;

        if (oAlloc > 0 && dAlloc > 0)
        {
            compoundCode = "OverdueAndDamage";
            compoundLabel = representativeDays > 0
                ? $"Phạt trễ hạn ({representativeDays} ngày) & bồi hoàn sách hỏng"
                : "Phạt trễ hạn & bồi hoàn sách hỏng";
        }
        else if (oAlloc > 0 && lAlloc > 0)
        {
            compoundCode = "OverdueAndLost";
            compoundLabel = representativeDays > 0
                ? $"Phạt trễ hạn ({representativeDays} ngày) & đền bù sách mất"
                : "Phạt trễ hạn & đền bù sách mất";
        }
        else
        {
            compoundCode = "CompoundViolation";
            compoundLabel = "Phạt vi phạm quy chế mượn trả tổng hợp";
        }

        return new InvoiceRevenueBreakdown(oAlloc, dAlloc, lAlloc, 0m, compoundCode, compoundLabel);
    }
}
