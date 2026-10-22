-- ==============================================================================
-- BƯỚC 0: DỌN SẠCH CÁC BẢNG DỮ LIỆU ĐỂ CHUẨN BỊ ĐỒNG BỘ TOÀN DIỆN TỪ LOCAL
-- Giữ nguyên: Roles, Categories, FineRules, WaiverReasons, Admin/Staff Users
-- ==============================================================================

SET NOCOUNT ON;
BEGIN TRANSACTION;

DELETE FROM Notifications;
DELETE FROM AIPredictionLogs;
DELETE FROM PenaltyInvoices;
DELETE FROM FineReceipts;
DELETE FROM BorrowingDetails;
DELETE FROM Borrowings;
DELETE FROM BookCopies;
DELETE FROM Books;
DELETE FROM Readers;
DELETE FROM Users WHERE RoleID = 3;

COMMIT TRANSACTION;

-- Mở rộng độ dài cột bảng Books để chứa đủ sách có nhiều tác giả (tránh lỗi truncation)
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_IsActive_CategoryID' AND object_id = OBJECT_ID('Books'))
BEGIN
    DROP INDEX IX_Books_IsActive_CategoryID ON Books;
END

ALTER TABLE Books ALTER COLUMN Title NVARCHAR(500) NOT NULL;
ALTER TABLE Books ALTER COLUMN Author NVARCHAR(1000) NOT NULL;
ALTER TABLE Books ALTER COLUMN Publisher NVARCHAR(255) NULL;

-- Tạo lại Index sau khi đã mở rộng cột
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_IsActive_CategoryID' AND object_id = OBJECT_ID('Books'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Books_IsActive_CategoryID 
    ON Books(IsActive, CategoryID)
    INCLUDE (Title, Author, Publisher, BasePrice, ISBN);
END

PRINT N'==> BƯỚC 0 HOÀN TẤT: ĐÃ DỌN SẠCH DỮ LIỆU CŨ & MỞ RỘNG CỘT TÁC GIẢ THÀNH CÔNG!';

