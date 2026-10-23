
-- 1. Xóa bảng cũ theo thứ tự khóa ngoại (nếu đã từng tạo)
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS AIPredictionLogs;
DROP TABLE IF EXISTS PenaltyInvoices;
DROP TABLE IF EXISTS FineReceipts;
DROP TABLE IF EXISTS RuleAuditLogs;
DROP TABLE IF EXISTS WaiverReasons;
DROP TABLE IF EXISTS FineRules;
DROP TABLE IF EXISTS BorrowingDetails;
DROP TABLE IF EXISTS Borrowings;
DROP TABLE IF EXISTS BookCopies;
DROP TABLE IF EXISTS Books;
DROP TABLE IF EXISTS Categories;
DROP TABLE IF EXISTS Readers;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Roles;
GO

-- =============================================
-- 2. TẠO CẤU TRÚC BẢNG (SCHEMA)
-- =============================================

CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    RoleID INT NOT NULL,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

CREATE TABLE Readers (
    ReaderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    ReaderCode NVARCHAR(20) NOT NULL UNIQUE,
    MemberType NVARCHAR(20) NOT NULL DEFAULT 'Standard',
    Faculty NVARCHAR(100) NOT NULL DEFAULT N'CNTT',
    ClassGroup NVARCHAR(50) NOT NULL DEFAULT N'K21-CC',
    ExpiryDate DATE NOT NULL,
    CreditScore INT NOT NULL DEFAULT 100,
    TotalDebt DECIMAL(18,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Books (
    BookID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL,
    ISBN NVARCHAR(20) NULL,
    Title NVARCHAR(500) NOT NULL,
    Author NVARCHAR(1000) NOT NULL,
    Publisher NVARCHAR(255) NULL,
    BasePrice DECIMAL(18,2) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

CREATE TABLE BookCopies (
    CopyID INT IDENTITY(1,1) PRIMARY KEY,
    BookID INT NOT NULL,
    Barcode NVARCHAR(50) NOT NULL UNIQUE,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Available',
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);

CREATE TABLE Borrowings (
    BorrowingID INT IDENTITY(1,1) PRIMARY KEY,
    ReaderID INT NOT NULL,
    LibrarianID INT NOT NULL,
    BorrowDate DATETIME DEFAULT GETDATE(),
    DueDate DATETIME NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
    RenewalCount INT NOT NULL DEFAULT 0,
    LastRenewedDate DATETIME NULL,
    FOREIGN KEY (ReaderID) REFERENCES Readers(ReaderID),
    FOREIGN KEY (LibrarianID) REFERENCES Users(UserID)
);

CREATE TABLE BorrowingDetails (
    DetailID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    CopyID INT NOT NULL,
    ReturnDate DATETIME NULL,
    ItemStatus NVARCHAR(20) NOT NULL DEFAULT 'Borrowed',
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID),
    FOREIGN KEY (CopyID) REFERENCES BookCopies(CopyID)
);

CREATE TABLE FineRules (
    RuleID INT IDENTITY(1,1) PRIMARY KEY,
    RuleName NVARCHAR(100) NOT NULL,
    FinePerDay DECIMAL(18,2) NOT NULL,
    DamageMultiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    StudentBorrowLimit INT NOT NULL DEFAULT 5,
    StudentBorrowDays INT NOT NULL DEFAULT 14,
    LecturerBorrowLimit INT NOT NULL DEFAULT 10,
    LecturerBorrowDays INT NOT NULL DEFAULT 30,
    DamageFeePercent DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    DamageMediumPercent DECIMAL(5,2) NOT NULL DEFAULT 40.0,
    DamageSeverePercent DECIMAL(5,2) NOT NULL DEFAULT 110.0,
    ConductScoreDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    MaxRenewalTimes INT NOT NULL DEFAULT 1,
    RenewalExtraDays INT NOT NULL DEFAULT 7,
    DebtLockAmount DECIMAL(18,2) NOT NULL DEFAULT 50000,
    AutoLockDebtThreshold BIT NOT NULL DEFAULT 1,
    AiRiskThreshold INT NOT NULL DEFAULT 80,
    AiRemindDaysBefore INT NOT NULL DEFAULT 3,
    AiAutoEmailReminder BIT NOT NULL DEFAULT 1,
    CompensationFixedFee DECIMAL(18,2) NOT NULL DEFAULT 0,
    CompensationBasePercent DECIMAL(5,2) NOT NULL DEFAULT 110.0,
    MaxFineCapPercent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    CompensationRatePercent DECIMAL(5,2) NOT NULL DEFAULT 200.0,
    AiDiscount_90 DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    AiAccuracy DECIMAL(5,2) NOT NULL DEFAULT 84.5,
    AiLastTrained NVARCHAR(50) NOT NULL DEFAULT '10/09/2026',
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE WaiverReasons (
    ReasonID INT IDENTITY(1,1) PRIMARY KEY,
    ReasonCode NVARCHAR(50) NOT NULL UNIQUE,
    ReasonName NVARCHAR(255) NOT NULL,
    DefaultDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    IsActive BIT NOT NULL DEFAULT 1
);

CREATE TABLE RuleAuditLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    RuleKey NVARCHAR(100) NOT NULL,
    RuleName NVARCHAR(255) NOT NULL,
    OldValue NVARCHAR(255) NOT NULL,
    NewValue NVARCHAR(255) NOT NULL,
    ChangedBy NVARCHAR(100) NOT NULL,
    ChangedAt DATETIME NOT NULL DEFAULT GETDATE(),
    IpAddress NVARCHAR(50) NOT NULL DEFAULT '127.0.0.1'
);

CREATE TABLE FineReceipts (
    ReceiptID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    RuleID INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    FinalAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID),
    FOREIGN KEY (RuleID) REFERENCES FineRules(RuleID)
);

CREATE TABLE PenaltyInvoices (
    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceCode NVARCHAR(50) NOT NULL UNIQUE,
    ReceiptID INT NOT NULL UNIQUE,
    PaymentMethod NVARCHAR(50) NOT NULL,
    AmountPaid DECIMAL(18,2) NOT NULL,
    PaymentDate DATETIME NOT NULL DEFAULT GETDATE(),
    CashierID INT NOT NULL,
    Note NVARCHAR(255) NULL,
    FOREIGN KEY (ReceiptID) REFERENCES FineReceipts(ReceiptID),
    FOREIGN KEY (CashierID) REFERENCES Users(UserID)
);

CREATE TABLE AIPredictionLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    RiskScore DECIMAL(5,2) NOT NULL,
    SuggestedAction NVARCHAR(255) NULL,
    EvaluatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID)
);

CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(1000) NOT NULL,
    Type NVARCHAR(50) NOT NULL DEFAULT 'System',
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- =============================================
-- 3. TẠO CHỈ MỤC INDEXES
-- =============================================
CREATE NONCLUSTERED INDEX IX_Books_CategoryID ON Books(CategoryID);
CREATE NONCLUSTERED INDEX IX_Books_IsActive_CategoryID ON Books(IsActive, CategoryID) INCLUDE (Title, Author, Publisher, BasePrice, ISBN);
CREATE NONCLUSTERED INDEX IX_BookCopies_BookID_Status ON BookCopies(BookID, Status);
CREATE NONCLUSTERED INDEX IX_BookCopies_Barcode ON BookCopies(Barcode);
GO

-- =============================================
-- 4. NẠP DỮ LIỆU BAN ĐẦU (SEED DATA)
-- =============================================

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
VALUES (N'Quy định Thư viện Tiêu chuẩn', 5000, 1.0, 5, 14, 10, 30, 20.0, 40.0, 110.0, 20.0, 1, 7, 50000, 1, 80, 3, 1, 0, 110.0, 100.0, 200.0, 10.0, 84.5, '10/09/2026', 1);

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

-- Tài khoản Admin & Staff (Password: Admin@123)
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive) 
VALUES 
(1, 'khoanv', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Nguyễn Võ Lê Khoa', 'khoanv249@gmail.com', 1),
(2, 'nhatnam', '$2a$11$hbz6Xj1VJWPIbZBTOkaNg.uH3iavoeqoNL2yjEZoaGl1STHVeDnV2', N'Nguyễn Thành Nhất Nam', 'nguyennhatnam213654@gmail.com', 1);

-- Độc giả mẫu
DECLARE @NewUserID INT;
INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, 'duchuy', '$2a$11$YieZsQ4dNdbN.64JMR0YVezmjNGzehGaMfUXiMiXUp.Uod.NvhG/K', N'Trần Đức Huy', 'duchuy3d2005@gmail.com', 1);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, 'RD20260001', 'Standard', N'CNTT', N'K21-CC', '2027-12-31', 100);

INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102220184', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Nguyễn Văn Minh', 'minhnv@smartlib.edu.vn', 1);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102220184', 'Standard', N'CNTT', N'K22-CC', '2027-12-31', 85);

INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102230045', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Lê Thị Khánh Huyền', 'huyenltk@smartlib.edu.vn', 0);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102230045', 'Standard', N'Kinh Tế', N'K23-KT', '2027-12-31', 95);

INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
VALUES (3, '102220412', '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6', N'Phan Hoàng Long', 'longph@smartlib.edu.vn', 1);
SET @NewUserID = SCOPE_IDENTITY();
INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
VALUES (@NewUserID, '102220412', 'Standard', N'Cơ Khí', N'K22-CK', '2027-12-31', 100);

-- Tạo 20 đầu sách và bản sao mã vạch
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

-- Sinh lượt mượn trả & dữ liệu AI mẫu
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

WHILE @Counter <= 100
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
    
    IF (@IsOverdue = 1 AND @Counter % 3 <> 0)
    BEGIN
        SET @DaysLate = DATEDIFF(DAY, @DueDate, GETDATE());
        SET @FineAmount = @DaysLate * 5000.0;

        INSERT INTO FineReceipts (BorrowingID, RuleID, TotalAmount, DiscountAmount, FinalAmount, Status)
        VALUES (@NewBorrowingID, 1, @FineAmount, 0, @FineAmount, 'Pending');
    END

    IF (@Counter % 2 = 0)
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
