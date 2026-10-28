using SmartLibAI.Core.Common;
using SmartLibAI.Core.Entities;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử đơn vị cho việc phân loại và bóc tách cơ cấu nguồn thu hóa đơn (BUG-042 & US-11.3).
/// Kiểm thử các ca: trễ hạn, hỏng, mất, vi phạm kép (phân bổ sau giảm và làm tròn), và khoản thu khác.
/// </summary>
public class InvoiceRevenueBreakdownTests
{
    private FineRule CreateStandardFineRule()
    {
        return new FineRule
        {
            RuleID = 1,
            RuleName = "Quy định Thư viện Tiêu chuẩn",
            FinePerDay = 5000m,
            DamageFeePercent = 30.0m,
            DamageMediumPercent = 40.0m,
            DamageSeverePercent = 110.0m,
            CompensationBasePercent = 110.0m,
            ConductScoreDiscountPercent = 20.0m,
            AiDiscount_90 = 10.0m
        };
    }

    [Fact]
    public void Classify_OverdueOnlyInvoice_ClassifiedAsOverdue_OtherIsZero()
    {
        // Giả lập ca DEMO0006, Receipt68: phạt trễ hạn 16 ngày, thu 65.000đ
        // Kết quả mong đợi: Overdue = 65.000đ, Other = 0đ, Code = Overdue, Label = "Phạt trễ hạn hoàn trả sách (16 ngày)"
        var rule = CreateStandardFineRule();
        var borrowDate = new DateTime(2026, 9, 1, 10, 0, 0, DateTimeKind.Utc);
        var dueDate = new DateTime(2026, 9, 15, 10, 0, 0, DateTimeKind.Utc);
        var paymentDate = dueDate.AddDays(16); // Trễ 16 ngày

        var book = new Book { BookID = 1, Title = "Giáo trình CSDL", BasePrice = 120000m };
        var copy = new BookCopy { CopyID = 1, Book = book, Barcode = "BC-CSDL-01" };

        var borrowing = new Borrowing
        {
            BorrowingID = 68,
            BorrowDate = borrowDate,
            DueDate = dueDate,
            BorrowingDetails = new List<BorrowingDetail>
            {
                new BorrowingDetail
                {
                    DetailID = 101,
                    BorrowingID = 68,
                    BookCopy = copy,
                    ReturnDate = paymentDate,
                    ItemStatus = "Returned"
                }
            }
        };

        var receipt = new FineReceipt
        {
            ReceiptID = 68,
            BorrowingID = 68,
            Borrowing = borrowing,
            RuleID = 1,
            FineRule = rule,
            TotalAmount = 65000m,
            DiscountAmount = 0m,
            FinalAmount = 65000m,
            Status = "Paid"
        };

        var invoice = new PenaltyInvoice
        {
            InvoiceID = 1,
            InvoiceCode = "INV202610240001",
            ReceiptID = 68,
            FineReceipt = receipt,
            AmountPaid = 65000m,
            PaymentDate = paymentDate,
            Note = "Thu tiền phạt trễ hạn hoàn trả sách (16 ngày)"
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(65000m, breakdown.OverdueAmount);
        Assert.Equal(0m, breakdown.DamageAmount);
        Assert.Equal(0m, breakdown.LostAmount);
        Assert.Equal(0m, breakdown.OtherAmount);
        Assert.Equal("Overdue", breakdown.FineReasonCode);
        Assert.Contains("16 ngày", breakdown.FineReasonLabel);
    }

    [Fact]
    public void Classify_DamageOnlyInvoice_ClassifiedAsDamage_OtherIsZero()
    {
        // Ca trả đúng hạn nhưng sách bị hỏng nhẹ: thu phí bồi hoàn 75.000đ (30% sách 250.000đ)
        var rule = CreateStandardFineRule();
        var borrowDate = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc);
        var dueDate = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc);
        var paymentDate = new DateTime(2026, 10, 10, 10, 0, 0, DateTimeKind.Utc); // Đúng hạn

        var book = new Book { BookID = 2, Title = "Trí tuệ nhân tạo", BasePrice = 250000m };
        var copy = new BookCopy { CopyID = 2, Book = book, Barcode = "BC-AI-01" };

        var borrowing = new Borrowing
        {
            BorrowingID = 114,
            BorrowDate = borrowDate,
            DueDate = dueDate,
            BorrowingDetails = new List<BorrowingDetail>
            {
                new BorrowingDetail
                {
                    DetailID = 201,
                    BorrowingID = 114,
                    BookCopy = copy,
                    ReturnDate = paymentDate,
                    ItemStatus = "Damaged"
                }
            }
        };

        var receipt = new FineReceipt
        {
            ReceiptID = 114,
            BorrowingID = 114,
            Borrowing = borrowing,
            RuleID = 1,
            FineRule = rule,
            TotalAmount = 75000m,
            FinalAmount = 75000m
        };

        var invoice = new PenaltyInvoice
        {
            InvoiceID = 2,
            InvoiceCode = "INV202610240002",
            ReceiptID = 114,
            FineReceipt = receipt,
            AmountPaid = 75000m,
            PaymentDate = paymentDate,
            Note = "Bồi hoàn làm hỏng/rách sách"
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(0m, breakdown.OverdueAmount);
        Assert.Equal(75000m, breakdown.DamageAmount);
        Assert.Equal(0m, breakdown.LostAmount);
        Assert.Equal(0m, breakdown.OtherAmount);
        Assert.Equal("Damaged", breakdown.FineReasonCode);
        Assert.Equal("Bồi hoàn làm hỏng/rách sách", breakdown.FineReasonLabel);
    }

    [Fact]
    public void Classify_LostOnlyInvoice_ClassifiedAsLost_OtherIsZero()
    {
        // Ca báo mất sách: thu 110.000đ
        var rule = CreateStandardFineRule();
        var borrowDate = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc);
        var dueDate = new DateTime(2026, 10, 15, 10, 0, 0, DateTimeKind.Utc);
        var paymentDate = new DateTime(2026, 10, 12, 10, 0, 0, DateTimeKind.Utc);

        var book = new Book { BookID = 3, Title = "Lập trình C#", BasePrice = 100000m };
        var copy = new BookCopy { CopyID = 3, Book = book, Barcode = "BC-CS-01" };

        var borrowing = new Borrowing
        {
            BorrowingID = 115,
            BorrowDate = borrowDate,
            DueDate = dueDate,
            BorrowingDetails = new List<BorrowingDetail>
            {
                new BorrowingDetail
                {
                    DetailID = 202,
                    BorrowingID = 115,
                    BookCopy = copy,
                    ReturnDate = paymentDate,
                    ItemStatus = "Lost"
                }
            }
        };

        var receipt = new FineReceipt
        {
            ReceiptID = 115,
            BorrowingID = 115,
            Borrowing = borrowing,
            RuleID = 1,
            FineRule = rule,
            TotalAmount = 110000m,
            FinalAmount = 110000m
        };

        var invoice = new PenaltyInvoice
        {
            InvoiceID = 3,
            InvoiceCode = "INV202610240003",
            ReceiptID = 115,
            FineReceipt = receipt,
            AmountPaid = 110000m,
            PaymentDate = paymentDate
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(0m, breakdown.OverdueAmount);
        Assert.Equal(0m, breakdown.DamageAmount);
        Assert.Equal(110000m, breakdown.LostAmount);
        Assert.Equal(0m, breakdown.OtherAmount);
        Assert.Equal("Lost", breakdown.FineReasonCode);
        Assert.Equal("Bồi thường làm mất tài liệu", breakdown.FineReasonLabel);
    }

    [Fact]
    public void Classify_CompoundViolation_OverdueAndDamaged_AllocatesProportionatelyAndRoundsToThousands()
    {
        // Ca vi phạm kép (PM-0114): Sách 250.000đ, trễ hạn 11 ngày (55.000đ), hỏng nhẹ 30% (75.000đ).
        // Tổng tiền gốc = 130.000đ. Độc giả điểm 86 được giảm 10% (13.000đ).
        // Thực thu AmountPaid = 117.000đ.
        // Phân bổ tỷ lệ:
        // Overdue = Round(117.000 * 55.000 / 130.000) = Round(49.500) = 50.000đ.
        // Damage = Round(117.000 * 75.000 / 130.000) = Round(67.500) = 68.000đ.
        // Diff = 117.000 - (50.000 + 68.000) = -1.000đ -> Điều chỉnh Damage = 67.000đ.
        // Tổng phân bổ: 50.000đ + 67.000đ = 117.000đ (Khớp 100% AmountPaid).
        var rule = CreateStandardFineRule();
        var borrowDate = new DateTime(2026, 9, 10, 10, 0, 0, DateTimeKind.Utc);
        var dueDate = new DateTime(2026, 9, 24, 10, 0, 0, DateTimeKind.Utc);
        var paymentDate = dueDate.AddDays(11); // Trễ 11 ngày

        var book = new Book { BookID = 4, Title = "Nhập môn AI", BasePrice = 250000m };
        var copy = new BookCopy { CopyID = 4, Book = book, Barcode = "BC000001-A" };

        var borrowing = new Borrowing
        {
            BorrowingID = 114,
            BorrowDate = borrowDate,
            DueDate = dueDate,
            BorrowingDetails = new List<BorrowingDetail>
            {
                new BorrowingDetail
                {
                    DetailID = 203,
                    BorrowingID = 114,
                    BookCopy = copy,
                    ReturnDate = paymentDate,
                    ItemStatus = "Damaged"
                }
            }
        };

        var receipt = new FineReceipt
        {
            ReceiptID = 114,
            BorrowingID = 114,
            Borrowing = borrowing,
            RuleID = 1,
            FineRule = rule,
            TotalAmount = 130000m,
            DiscountAmount = 13000m,
            FinalAmount = 117000m
        };

        var invoice = new PenaltyInvoice
        {
            InvoiceID = 4,
            InvoiceCode = "INV202610240004",
            ReceiptID = 114,
            FineReceipt = receipt,
            AmountPaid = 117000m,
            PaymentDate = paymentDate,
            Note = "Thu tiền phạt vi phạm kép (PM-0114)"
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(50000m, breakdown.OverdueAmount);
        Assert.Equal(67000m, breakdown.DamageAmount);
        Assert.Equal(0m, breakdown.LostAmount);
        Assert.Equal(0m, breakdown.OtherAmount);
        Assert.Equal(117000m, breakdown.OverdueAmount + breakdown.DamageAmount + breakdown.LostAmount + breakdown.OtherAmount);
        Assert.Equal("OverdueAndDamage", breakdown.FineReasonCode);
        Assert.Contains("Phạt trễ hạn", breakdown.FineReasonLabel);
        Assert.Contains("bồi hoàn sách hỏng", breakdown.FineReasonLabel);
    }

    [Fact]
    public void Classify_CardFeeOrAdminFine_ClassifiedAsOther()
    {
        // Ca thu phí cấp lại thẻ độc giả / vi phạm nội quy: 50.000đ
        var invoice = new PenaltyInvoice
        {
            InvoiceID = 5,
            InvoiceCode = "INV202610240005",
            AmountPaid = 50000m,
            PaymentDate = DateTime.UtcNow,
            Note = "Lệ phí in lại thẻ từ bạn đọc bị mất",
            FineReceipt = null!
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(0m, breakdown.OverdueAmount);
        Assert.Equal(0m, breakdown.DamageAmount);
        Assert.Equal(0m, breakdown.LostAmount);
        Assert.Equal(50000m, breakdown.OtherAmount);
        Assert.Equal("Other", breakdown.FineReasonCode);
        Assert.Equal("Lệ phí in lại thẻ từ bạn đọc bị mất", breakdown.FineReasonLabel);
    }

    [Fact]
    public void Classify_FallbackWithNoteKeyword_ClassifiesCorrectlyWhenDetailsMissing()
    {
        // Khi không có bản ghi chi tiết mượn sách, fallback theo từ khóa trong note
        var invoice = new PenaltyInvoice
        {
            InvoiceID = 6,
            InvoiceCode = "INV202610240006",
            AmountPaid = 40000m,
            PaymentDate = DateTime.UtcNow,
            Note = "Thu tiền phạt trễ hạn nộp sách",
            FineReceipt = null!
        };

        // Act
        var breakdown = InvoiceRevenueClassifier.Classify(invoice);

        // Assert
        Assert.Equal(40000m, breakdown.OverdueAmount);
        Assert.Equal(0m, breakdown.DamageAmount);
        Assert.Equal(0m, breakdown.LostAmount);
        Assert.Equal(0m, breakdown.OtherAmount);
        Assert.Equal("Overdue", breakdown.FineReasonCode);
    }
}
