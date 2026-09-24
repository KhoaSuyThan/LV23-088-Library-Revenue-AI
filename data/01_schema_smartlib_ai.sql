-- =============================================
-- File: 01_schema_smartlib_ai.sql
-- Database: SmartLibAI
-- Description: Script tạo cấu trúc 12 bảng chuẩn hóa
-- Tương thích: Microsoft SQL Server, tập dữ liệu Kaggle books.csv
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SmartLibAI')
BEGIN
    CREATE DATABASE SmartLibAI;
END
GO

USE SmartLibAI;
GO

-- Xóa bảng theo thứ tự ràng buộc khóa ngoại (nếu đã tồn tại)
DROP TABLE IF EXISTS Notifications;
DROP TABLE IF EXISTS AIPredictionLogs;
DROP TABLE IF EXISTS FineReceipts;
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
-- 1. NHÓM QUẢN TRỊ HỆ THỐNG & NGƯỜI DÙNG
-- =============================================

CREATE TABLE Roles (
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    RoleID INT NOT NULL,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) NULL,
    IsActive BIT NOT NULL DEFAULT 1, -- Trạng thái tài khoản: 1 = Đang hoạt động, 0 = Đã bị khóa
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

CREATE TABLE Readers (
    ReaderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    ReaderCode VARCHAR(20) NOT NULL UNIQUE,
    MemberType NVARCHAR(50) DEFAULT 'Standard',
    ExpiryDate DATE NOT NULL,
    CreditScore INT NOT NULL DEFAULT 100, -- Điểm tín nhiệm bạn đọc (0 - 100, mặc định 100 điểm)
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

CREATE TABLE Notifications (
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- =============================================
-- 2. NHÓM QUẢN LÝ TÀI NGUYÊN (SÁCH)
-- =============================================

CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Books (
    BookID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryID INT NOT NULL,
    ISBN VARCHAR(20) NULL,
    Title NVARCHAR(350) NOT NULL,
    Author NVARCHAR(800) NOT NULL,
    Publisher NVARCHAR(200) NULL,
    BasePrice DECIMAL(18,2) NOT NULL DEFAULT 50000,
    IsActive BIT NOT NULL DEFAULT 1, -- Trạng thái lưu hành: 1 = Đang lưu hành, 0 = Ngưng lưu hành (Xóa mềm)
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

CREATE TABLE BookCopies (
    CopyID INT IDENTITY(1,1) PRIMARY KEY,
    BookID INT NOT NULL,
    Barcode VARCHAR(50) NOT NULL UNIQUE,
    Status NVARCHAR(50) DEFAULT 'Available', -- 'Available', 'Borrowed', 'Lost', 'Damaged'
    FOREIGN KEY (BookID) REFERENCES Books(BookID)
);

-- =============================================
-- 3. NHÓM NGHIỆP VỤ MƯỢN / TRẢ
-- =============================================

CREATE TABLE Borrowings (
    BorrowingID INT IDENTITY(1,1) PRIMARY KEY,
    ReaderID INT NOT NULL,
    LibrarianID INT NOT NULL,
    BorrowDate DATETIME DEFAULT GETDATE(),
    DueDate DATETIME NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Active', -- 'Active', 'Returned', 'Overdue'
    FOREIGN KEY (ReaderID) REFERENCES Readers(ReaderID),
    FOREIGN KEY (LibrarianID) REFERENCES Users(UserID)
);

CREATE TABLE BorrowingDetails (
    DetailID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    CopyID INT NOT NULL,
    ReturnDate DATETIME NULL,
    ItemStatus NVARCHAR(50) DEFAULT 'Borrowed', -- 'Borrowed', 'Returned', 'Damaged', 'Lost'
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID),
    FOREIGN KEY (CopyID) REFERENCES BookCopies(CopyID)
);

-- =============================================
-- 4. NHÓM TÀI CHÍNH & DỰ BÁO AI
-- =============================================

CREATE TABLE FineRules (
    RuleID INT IDENTITY(1,1) PRIMARY KEY,
    RuleName NVARCHAR(100) NOT NULL,
    FinePerDay DECIMAL(18,2) DEFAULT 5000,
    DamageMultiplier DECIMAL(4,2) DEFAULT 1.0,
    StudentBorrowLimit INT NOT NULL DEFAULT 5, -- Hạn mức mượn Sinh viên: tối đa 5 cuốn
    StudentBorrowDays INT NOT NULL DEFAULT 14, -- Thời hạn mượn Sinh viên: 14 ngày
    LecturerBorrowLimit INT NOT NULL DEFAULT 10, -- Hạn mức mượn Giảng viên: tối đa 10 cuốn
    LecturerBorrowDays INT NOT NULL DEFAULT 30, -- Thời hạn mượn Giảng viên: 30 ngày
    DamageFeePercent DECIMAL(5,2) NOT NULL DEFAULT 10.0, -- Mức phụ thu đền bù sách mất/hỏng (10%)
    ConductScoreDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 20.0, -- Tỷ lệ giảm trừ tiền phạt theo điểm rèn luyện
    IsActive BIT DEFAULT 1
);

CREATE TABLE FineReceipts (
    ReceiptID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    RuleID INT NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    DiscountAmount DECIMAL(18,2) DEFAULT 0,
    FinalAmount DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Paid', 'Cancelled'
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID),
    FOREIGN KEY (RuleID) REFERENCES FineRules(RuleID)
);

CREATE TABLE AIPredictionLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    BorrowingID INT NOT NULL,
    RiskScore DECIMAL(5,2) NOT NULL, -- Thang điểm 0.00 -> 100.00
    SuggestedAction NVARCHAR(255) NULL,
    EvaluatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (BorrowingID) REFERENCES Borrowings(BorrowingID)
);
GO

-- =============================================
-- 5. TỐI ƯU HÓA CHỈ MỤC (INDEXING FOR PERFORMANCE)
-- =============================================

-- 5.1. Chỉ mục tối ưu cho bảng Books: Lọc theo thể loại & trạng thái lưu thông kèm các cột hiển thị
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_CategoryID' AND object_id = OBJECT_ID('Books'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Books_CategoryID ON Books(CategoryID);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_IsActive_CategoryID' AND object_id = OBJECT_ID('Books'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Books_IsActive_CategoryID 
    ON Books(IsActive, CategoryID)
    INCLUDE (Title, Author, Publisher, BasePrice, ISBN);
END
GO

-- 5.2. Chỉ mục tối ưu cho bảng BookCopies: Lọc theo BookID và tình trạng bản sao (Available, Borrowed,...)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BookCopies_BookID_Status' AND object_id = OBJECT_ID('BookCopies'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_BookCopies_BookID_Status 
    ON BookCopies(BookID, Status);
END
GO