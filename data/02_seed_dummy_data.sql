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

INSERT INTO FineRules (RuleName, FinePerDay, DamageMultiplier, StudentBorrowLimit, StudentBorrowDays, LecturerBorrowLimit, LecturerBorrowDays, DamageFeePercent, ConductScoreDiscountPercent) 
VALUES (N'Quy định Thư viện Tiêu chuẩn', 5000, 1.0, 5, 14, 10, 30, 10.0, 20.0);

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
INSERT INTO Readers (UserID, ReaderCode, MemberType, ExpiryDate, CreditScore)
VALUES (@NewUserID, 'RD20260001', 'Standard', '2027-12-31', 100);

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
GO