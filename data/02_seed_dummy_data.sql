-- =============================================
-- File: 02_seed_dummy_data.sql
-- Database: SmartLibAI
-- Description: Chèn dữ liệu mẫu ban đầu & 200 lượt mượn trả phục vụ Dashboard + AI
-- Chú ý: Chạy file 01_schema_smartlib_ai.sql trước khi chạy file này!
-- =============================================

USE SmartLibAI;
GO

-- 1. DỮ LIỆU CƠ BẢN: VAI TRÒ, DANH MỤC, QUY ĐỊNH PHẠT
INSERT INTO Roles (RoleName) VALUES ('Admin'), ('Staff'), ('Reader');

INSERT INTO Categories (CategoryName) 
VALUES 
    (N'Công nghệ thông tin'), 
    (N'Khoa học dữ liệu & AI'), 
    (N'Khoa học tự nhiên & Kỹ thuật'), 
    (N'Kinh tế & Quản trị'), 
    (N'Lịch sử & Địa lý'), 
    (N'Ngoại ngữ & Từ điển'), 
    (N'Tâm lý & Kỹ năng sống'), 
    (N'Triết học & Khoa học xã hội'), 
    (N'Văn học & Nghệ thuật'), 
    (N'Y học & Sức khỏe');

INSERT INTO FineRules (RuleName, FinePerDay, DamageMultiplier, StudentBorrowLimit, StudentBorrowDays, LecturerBorrowLimit, LecturerBorrowDays, DamageFeePercent, DamageMediumPercent, DamageSeverePercent, ConductScoreDiscountPercent, MaxRenewalTimes, RenewalExtraDays, DebtLockAmount, AutoLockDebtThreshold, AiRiskThreshold, AiRemindDaysBefore, AiAutoEmailReminder, CompensationFixedFee, CompensationBasePercent, MaxFineCapPercent, CompensationRatePercent, AiDiscount_90, AiAccuracy, AiLastTrained, IsActive) 
VALUES (N'Quy định Thư viện Tiêu chuẩn', 5000, 1.0, 5, 14, 10, 30, 30.0, 40.0, 110.0, 20.0, 1, 7, 50000, 1, 80, 3, 1, 0, 110.0, 100.0, 200.0, 10.0, 84.5, '10/09/2026', 1);

INSERT INTO WaiverReasons (ReasonCode, ReasonName, DefaultDiscountPercent, IsActive) VALUES
('WR-SICK', N'Nghỉ ốm có giấy ra/nhập viện điều trị', 100, 1),
('WR-FORCE-MAJEURE', N'Thiên tai, lũ lụt, dịch bệnh, sự cố bất khả kháng', 100, 1),
('WR-SYS-ERROR', N'Sự cố lỗi phần mềm hệ thống hoặc mất điện thư viện', 100, 1),
('WR-POOR-STUDENT', N'Sinh viên diện chính sách hoàn cảnh khó khăn', 50, 0);

INSERT INTO RuleAuditLogs (RuleKey, RuleName, OldValue, NewValue, ChangedBy, ChangedAt, IpAddress) VALUES
('aiRiskThreshold', N'Ngưỡng kích hoạt rủi ro AI Early Warning', '75%', '80%', N'Thủ thư (Admin)', '2026-09-18 15:10:00', '192.168.1.10'),
('finePerDay', N'Phí phạt trễ hạn theo ngày', N'3.000 VNĐ', N'2.000 VNĐ', N'Thủ thư (Admin)', '2026-09-18 14:32:10', '192.168.1.45'),
('aiDiscount_100', N'Chiết khấu AI điểm tuyệt đối (100 điểm)', '15%', '20%', N'Thủ thư (Admin)', '2026-09-15 09:20:00', '192.168.1.45'),
('borrowLimit_MaxTogether', N'Số sách tối đa được mượn cùng lúc', N'4 cuốn', N'5 cuốn', N'Thủ thư (Admin)', '2026-09-10 09:15:00', '192.168.1.12');

-- 2. TÀI KHOẢN ADMIN & NHÂN VIÊN MẪU (BẢO MẬT BCRYPT CHUẨN, ISACTIVE = 1)
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive) 
VALUES 
(1, 'khoanv', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Nguyễn Võ Lê Khoa', 'khoanv249@gmail.com', 1),
(2, 'nhatnam', '$2a$11$hbz6Xj1VJWPIbZBTOkaNg.uH3iavoeqoNL2yjEZoaGl1STHVeDnV2', N'Nguyễn Thành Nhất Nam', 'nguyennhatnam213654@gmail.com', 1);

-- 3. TẠO ĐỘC GIẢ ĐẠI DIỆN (USERS + READERS, ISACTIVE = 1, CREDIT SCORE = 100)
-- Độc giả đại diện: Trần Đức Huy
DECLARE @NewUserID INT;
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, 'duchuy', '$2a$11$YieZsQ4dNdbN.64JMR0YVezmjNGzehGaMfUXiMiXUp.Uod.NvhG/K', N'Trần Đức Huy', 'duchuy3d2005@gmail.com', 1);

SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, 'RD20260001', 'Standard', N'CNTT', N'K21-CC', '2027-12-31', 100);

-- Độc giả 2: Nguyễn Văn Minh (102220184) - Đang nợ tiền phạt 45.000 VNĐ (Kịch bản từ chối mượn nợ phạt)
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102220184', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Nguyễn Văn Minh', 'minhnv@smartlib.edu.vn', 1);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102220184', 'Standard', N'CNTT', N'K22-CC', '2027-12-31', 85);

-- Độc giả 3: Lê Thị Khánh Huyền (102230045) - Thẻ bị khóa IsActive = 0 (Kịch bản từ chối mượn thẻ bị khóa)
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102230045', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Lê Thị Khánh Huyền', 'huyenltk@smartlib.edu.vn', 0);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102230045', 'Standard', N'Kinh Tế', N'K23-KT', '2027-12-31', 95);

-- Độc giả 4: Phan Hoàng Long (102220412) - Đang mượn tối đa 5 cuốn (Kịch bản từ chối mượn vượt hạn mức)
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102220412', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Phan Hoàng Long', 'longph@smartlib.edu.vn', 1);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102220412', 'Standard', N'Cơ Khí', N'K22-CK', '2027-12-31', 100);

-- 4. TẠO 20 ĐẦU SÁCH VÀ BẢN SAO MÃ VẠCH (BOOKCOPIES, ISACTIVE = 1)
DECLARE @b INT = 1;
DECLARE @NewBookID INT;
WHILE @b <= 20
BEGIN
    INSERT INTO Books (CategoryID, ISBN, Title, Author, Publisher, BasePrice, IsActive) 
    VALUES (
        (@b % 10) + 1, 
        '9780439' + RIGHT('000000' + CAST(@b AS VARCHAR), 6),
        N'Đầu sách SmartLib Số ' + CAST(@b AS VARCHAR), 
        N'Tác giả Nhóm LV23-088', 
        N'NXB Đại học Quốc gia',
        85000,
        1
    );
    
    SET @NewBookID = SCOPE_IDENTITY();

    INSERT INTO BookCopies (BookID, Barcode, Status) VALUES (@NewBookID, 'BC' + RIGHT('0000' + CAST(@b AS VARCHAR), 4) + '-A', 'Available');
    INSERT INTO BookCopies (BookID, Barcode, Status) VALUES (@NewBookID, 'BC' + RIGHT('0000' + CAST(@b AS VARCHAR), 4) + '-B', 'Available');
    
    SET @b = @b + 1;
END

-- 5. SINH 200 LƯỢT MƯỢN TRẢ, TIỀN PHẠT & ĐÁNH GIÁ AI (GÁN CHO ĐỘC GIẢ DUY NHẤT TRẦN ĐỨC HUY)
DECLARE @Counter INT = 1;
DECLARE @RandomReader INT = 1;
DECLARE @RandomCopy INT;
DECLARE @RandomDaysOffset INT;
DECLARE @BorrowDate DATETIME;
DECLARE @DueDate DATETIME;
DECLARE @NewBorrowingID INT;
DECLARE @IsOverdue BIT;
DECLARE @DaysLate INT;
DECLARE @FineAmount DECIMAL(18,2);

WHILE @Counter <= 200
BEGIN
    SET @RandomCopy = (ABS(CHECKSUM(NEWID())) % 40) + 1;
    SET @RandomDaysOffset = (ABS(CHECKSUM(NEWID())) % 120) * -1;
    SET @BorrowDate = DATEADD(DAY, @RandomDaysOffset, GETDATE());
    SET @DueDate = DATEADD(DAY, 14, @BorrowDate);

    SET @IsOverdue = CASE WHEN @DueDate < GETDATE() THEN 1 ELSE 0 END;

    INSERT INTO Borrowings (ReaderID, LibrarianID, BorrowDate, DueDate, Status)
    VALUES (
        @RandomReader, 
        2, 
        @BorrowDate, 
        @DueDate, 
        CASE 
            WHEN @Counter % 3 = 0 THEN 'Returned' 
            WHEN @IsOverdue = 1 THEN 'Overdue' 
            ELSE 'Active' 
        END
    );
    
    SET @NewBorrowingID = SCOPE_IDENTITY();

    INSERT INTO BorrowingDetails (BorrowingID, CopyID, ReturnDate, ItemStatus)
    VALUES (
        @NewBorrowingID, 
        @RandomCopy, 
        CASE WHEN @Counter % 3 = 0 THEN DATEADD(DAY, 10, @BorrowDate) ELSE NULL END, 
        CASE WHEN @Counter % 3 = 0 THEN 'Returned' ELSE 'Borrowed' END
    );
    
    -- Tự động sinh biên lai phạt cho các ca trễ hạn chưa trả
    IF (@IsOverdue = 1 AND @Counter % 3 <> 0)
    BEGIN
        SET @DaysLate = DATEDIFF(DAY, @DueDate, GETDATE());
        SET @FineAmount = @DaysLate * 5000.0;

        INSERT INTO FineReceipts (BorrowingID, RuleID, TotalAmount, DiscountAmount, FinalAmount, Status)
        VALUES (@NewBorrowingID, 1, @FineAmount, 0, @FineAmount, 'Pending');
    END

    -- Ghi nhận log AI cảnh báo rủi ro
    IF (@Counter % 4 = 0)
    BEGIN
        INSERT INTO AIPredictionLogs (BorrowingID, RiskScore, SuggestedAction, EvaluatedAt)
        VALUES (
            @NewBorrowingID, 
            CAST((ABS(CHECKSUM(NEWID())) % 10000) / 100.0 AS DECIMAL(5,2)), 
            CASE 
                WHEN @IsOverdue = 1 THEN N'Rủi ro trễ hạn cao: Cảnh báo qua SMS/Email và tạm dừng quyền mượn tiếp.'
                ELSE N'Rủi ro thấp: Gửi email nhắc trước hạn 2 ngày.'
            END,
            DATEADD(DAY, 1, @BorrowDate)
        );
    END

    SET @Counter = @Counter + 1;
END

-- =============================================
-- 6. KHỞI TẠO HÓA ĐƠN THU TIỀN PHẠT MẪU (PenaltyInvoices)
-- =============================================
-- Cập nhật một số biên lai phạt sang Paid và tạo hóa đơn kế toán mẫu
IF EXISTS (SELECT 1 FROM FineReceipts WHERE Status = 'Pending')
BEGIN
    DECLARE @SampleReceiptID INT = (SELECT TOP 1 ReceiptID FROM FineReceipts WHERE Status = 'Pending');
    DECLARE @SampleAmount DECIMAL(18,2) = (SELECT FinalAmount FROM FineReceipts WHERE ReceiptID = @SampleReceiptID);
    
    UPDATE FineReceipts 
    SET Status = 'Paid' 
    WHERE ReceiptID = @SampleReceiptID;

    INSERT INTO PenaltyInvoices (InvoiceCode, ReceiptID, PaymentMethod, AmountPaid, PaymentDate, CashierID, Note)
    VALUES ('INV20261001001', @SampleReceiptID, N'Cash', @SampleAmount, GETDATE(), 2, N'Thu tiền phạt trễ hạn trực tiếp tại quầy');
END

-- Đảm bảo luôn duy trì các khoản phạt vi phạm chưa thu (Pending) để phục vụ kiểm thử thu tiền phạt & xuất biên lai
IF NOT EXISTS (SELECT 1 FROM FineReceipts WHERE Status = 'Pending')
BEGIN
    DECLARE @PendingBorrowID INT = (SELECT TOP 1 BorrowingID FROM Borrowings WHERE Status = 'Overdue');
    IF @PendingBorrowID IS NOT NULL
    BEGIN
        INSERT INTO FineReceipts (BorrowingID, RuleID, TotalAmount, DiscountAmount, FinalAmount, Status)
        VALUES (@PendingBorrowID, 1, 25000.00, 0, 25000.00, 'Pending');
    END
END
GO