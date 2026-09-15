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
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);

CREATE TABLE Readers (
    ReaderID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL UNIQUE,
    ReaderCode VARCHAR(20) NOT NULL UNIQUE,
    MemberType NVARCHAR(50) DEFAULT 'Standard',
    ExpiryDate DATE NOT NULL,
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