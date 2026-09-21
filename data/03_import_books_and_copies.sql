-- ==========================================================
-- File: 03_import_books_and_copies.sql
-- Database: SmartLibAI
-- Description: Nạp dữ liệu sách sạch từ book_data_clean.csv và cleaned_book_copies.csv
-- Hướng dẫn: Mở SSMS, kết nối Database SmartLibAI và nhấn Execute (F5).
-- ==========================================================

USE SmartLibAI;
GO

SET NOCOUNT ON;

PRINT N'=== BẮT ĐẦU QUÁ TRÌNH NẠP DỮ LIỆU SÁCH KAGGLE ===';

-- 1. Bật IDENTITY_INSERT cho bảng Books để chèn đúng BookID
PRINT N'[1/4] Đang nạp dữ liệu vào bảng Books...';

-- Tạo bảng tạm để đọc file CSV sạch (khớp 10 cột của book_data_clean.csv)
IF OBJECT_ID('tempdb..#TempBooks') IS NOT NULL DROP TABLE #TempBooks;

CREATE TABLE #TempBooks (
    BookID INT,
    CategoryID INT,
    CategoryName NVARCHAR(100),
    ISBN VARCHAR(20),
    Title NVARCHAR(350),
    Author NVARCHAR(800),
    Publisher NVARCHAR(200),
    BasePrice DECIMAL(18,2),
    TotalCopies INT,
    AvailableCopies INT
);

BULK INSERT #TempBooks
FROM 'C:\Users\aaa\Pictures\SaveCode\LV23-088-Library-Revenue-AI\data\book_data_clean.csv'
WITH (
    FORMAT = 'CSV',
    FIELDQUOTE = '"',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0a',
    CODEPAGE = '65001', -- UTF-8
    TABLOCK
);

SET IDENTITY_INSERT Books ON;

INSERT INTO Books (BookID, CategoryID, ISBN, Title, Author, Publisher, BasePrice)
SELECT t.BookID, t.CategoryID, t.ISBN, t.Title, t.Author, t.Publisher, t.BasePrice
FROM #TempBooks t
WHERE NOT EXISTS (SELECT 1 FROM Books b WHERE b.BookID = t.BookID);

SET IDENTITY_INSERT Books OFF;

DROP TABLE #TempBooks;
DECLARE @BookCount INT = (SELECT COUNT(*) FROM Books);
PRINT N' -> Đã hoàn tất nạp bảng Books. Tổng số đầu sách hiện tại: ' + CAST(@BookCount AS NVARCHAR(20));

-- 2. Nạp dữ liệu bản sao vào bảng BookCopies
PRINT N'[2/4] Đang nạp dữ liệu vào bảng BookCopies...';

IF OBJECT_ID('tempdb..#TempCopies') IS NOT NULL DROP TABLE #TempCopies;

CREATE TABLE #TempCopies (
    CopyID INT,
    BookID INT,
    Barcode VARCHAR(50),
    Status NVARCHAR(50)
);

BULK INSERT #TempCopies
FROM 'C:\Users\aaa\Pictures\SaveCode\LV23-088-Library-Revenue-AI\data\cleaned_book_copies.csv'
WITH (
    FORMAT = 'CSV',
    FIELDQUOTE = '"',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0a',
    CODEPAGE = '65001',
    TABLOCK
);

SET IDENTITY_INSERT BookCopies ON;

INSERT INTO BookCopies (CopyID, BookID, Barcode, Status)
SELECT c.CopyID, c.BookID, c.Barcode, c.Status
FROM #TempCopies c
WHERE NOT EXISTS (SELECT 1 FROM BookCopies bc WHERE bc.Barcode = c.Barcode);

SET IDENTITY_INSERT BookCopies OFF;

DROP TABLE #TempCopies;
DECLARE @CopyCount INT = (SELECT COUNT(*) FROM BookCopies);
PRINT N' -> Đã hoàn tất nạp bảng BookCopies. Tổng số bản sao hiện tại: ' + CAST(@CopyCount AS NVARCHAR(20));

PRINT N'=== HOÀN TẤT NẠP DỮ LIỆU THÀNH CÔNG ===';
GO
