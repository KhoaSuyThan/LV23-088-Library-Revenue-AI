-- SmartLib AI demo/UAT reset seed (LO LRA-94).
-- WARNING: Deletes circulation, fine, notification, and demo reader data. Keeps
-- catalog (Books, BookCopies, Categories), staff/admin accounts, and settings.
-- Run only against a disposable demo database after taking a backup.
-- Compatible with the current schema and SQL Server.

USE SmartLibAI;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

-- Preserve staff accounts and catalog while clearing prior circulation/demo data.
DELETE FROM PenaltyInvoices;
DELETE FROM FineReceipts;
DELETE FROM AIPredictionLogs;
DELETE FROM BorrowingDetails;
DELETE FROM Borrowings;
DELETE FROM Notifications;
DELETE FROM Readers;
DELETE FROM Users WHERE RoleID = (SELECT TOP (1) RoleID FROM Roles WHERE RoleName = 'Reader');

-- Restore catalog copy states to the known baseline before creating loans.
UPDATE BookCopies SET Status = 'Available' WHERE Status = 'Borrowed';

DECLARE @ReaderRoleID INT = (SELECT TOP (1) RoleID FROM Roles WHERE RoleName = 'Reader');
DECLARE @StaffID INT = (SELECT TOP (1) UserID FROM Users WHERE Username = 'nhatnam' AND IsActive = 1);
DECLARE @RuleID INT = (SELECT TOP (1) RuleID FROM FineRules WHERE IsActive = 1 ORDER BY RuleID);
DECLARE @FinePerDay DECIMAL(18,2) = ISNULL((SELECT TOP (1) FinePerDay FROM FineRules WHERE RuleID = @RuleID), 5000.0);
DECLARE @CopyCount INT = (SELECT COUNT(*) FROM BookCopies WHERE Status = 'Available');

IF @ReaderRoleID IS NULL OR @StaffID IS NULL OR @RuleID IS NULL
    THROW 51000, 'Seed prerequisites missing: Reader role, active nhatnam staff, or active fine rule.', 1;
IF @CopyCount < 100
    THROW 51001, 'At least 100 available book copies are required for this seed.', 1;

DECLARE @PasswordHash VARCHAR(255) = '$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6';
DECLARE @Readers TABLE (SequenceNo INT PRIMARY KEY, ReaderID INT NOT NULL);
DECLARE @i INT = 1;

WHILE @i <= 100
BEGIN
    DECLARE @Code VARCHAR(20) = 'DEMO' + RIGHT('0000' + CAST(@i AS VARCHAR(4)), 4);
    DECLARE @Username VARCHAR(50) = 'demo' + RIGHT('0000' + CAST(@i AS VARCHAR(4)), 4);
    DECLARE @UserID INT;

    INSERT INTO Users (RoleID, Username, PasswordHash, FullName, Email, IsActive)
    VALUES (@ReaderRoleID, @Username, @PasswordHash,
        N'Độc giả Demo ' + RIGHT('000' + CAST(@i AS VARCHAR(3)), 3),
        @Username + '@demo.smartlib.local', 1);
    SET @UserID = SCOPE_IDENTITY();

    INSERT INTO Readers (UserID, ReaderCode, MemberType, Faculty, ClassGroup, ExpiryDate, CreditScore)
    VALUES (@UserID, @Code, 'Standard',
        CASE @i % 4 WHEN 0 THEN N'Công nghệ thông tin' WHEN 1 THEN N'Kinh tế' WHEN 2 THEN N'Cơ khí' ELSE N'Ngoại ngữ' END,
        N'DEMO-K23', DATEADD(YEAR, 1, CAST(GETDATE() AS DATE)),
        CASE WHEN @i % 10 = 0 THEN 70 ELSE 85 + (@i % 16) END);

    INSERT INTO @Readers VALUES (@i, SCOPE_IDENTITY());
    SET @i += 1;
END;

-- Build a balanced circulation history:
-- 50 overdue open loans, 30 on-time returned loans, and 20 active not-yet-due loans.
;WITH OverdueSeed AS (
    SELECT SequenceNo, ReaderID,
           DATEADD(DAY, -(21 + (SequenceNo % 20)), CAST(GETDATE() AS DATE)) AS BorrowDate
    FROM @Readers
    WHERE SequenceNo <= 50
)
INSERT INTO Borrowings (ReaderID, LibrarianID, BorrowDate, DueDate, Status)
SELECT ReaderID, @StaffID, BorrowDate, DATEADD(DAY, 14, BorrowDate), 'Overdue'
FROM OverdueSeed;

;WITH OnTimeSeed AS (
    SELECT SequenceNo, ReaderID,
           DATEADD(DAY, -(10 + (SequenceNo % 30)), CAST(GETDATE() AS DATE)) AS BorrowDate
    FROM @Readers
    WHERE SequenceNo BETWEEN 51 AND 80
)
INSERT INTO Borrowings (ReaderID, LibrarianID, BorrowDate, DueDate, Status)
SELECT ReaderID, @StaffID, BorrowDate, DATEADD(DAY, 14, BorrowDate), 'Returned'
FROM OnTimeSeed;

;WITH ActiveSeed AS (
    SELECT SequenceNo, ReaderID,
           DATEADD(DAY, -(SequenceNo % 10), CAST(GETDATE() AS DATE)) AS BorrowDate
    FROM @Readers
    WHERE SequenceNo BETWEEN 81 AND 100
)
INSERT INTO Borrowings (ReaderID, LibrarianID, BorrowDate, DueDate, Status)
SELECT ReaderID, @StaffID, BorrowDate, DATEADD(DAY, 14, BorrowDate), 'Active'
FROM ActiveSeed;

DECLARE @DemoCopies TABLE (SequenceNo INT PRIMARY KEY, CopyID INT NOT NULL);
INSERT INTO @DemoCopies (SequenceNo, CopyID)
SELECT rn, CopyID FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY CopyID) AS rn, CopyID
    FROM BookCopies WHERE Status = 'Available'
) c WHERE rn <= 100;

DECLARE @DemoBorrowings TABLE (SequenceNo INT PRIMARY KEY, BorrowingID INT NOT NULL);
INSERT INTO @DemoBorrowings (SequenceNo, BorrowingID)
SELECT r.SequenceNo, b.BorrowingID
FROM Borrowings b JOIN @Readers r ON r.ReaderID = b.ReaderID;

;WITH BorrowMap AS (
    SELECT b.BorrowingID, d.SequenceNo, c.CopyID
    FROM @DemoBorrowings b
    JOIN @Readers d ON d.SequenceNo = b.SequenceNo
    JOIN @DemoCopies c ON c.SequenceNo = d.SequenceNo
    WHERE d.SequenceNo <= 50
)
INSERT INTO BorrowingDetails (BorrowingID, CopyID, ReturnDate, ItemStatus)
SELECT BorrowingID, CopyID, NULL, 'Borrowed' FROM BorrowMap;

;WITH BorrowMap AS (
    SELECT b.BorrowingID, d.SequenceNo, c.CopyID
    FROM @DemoBorrowings b
    JOIN @Readers d ON d.SequenceNo = b.SequenceNo
    JOIN @DemoCopies c ON c.SequenceNo = d.SequenceNo
    WHERE d.SequenceNo BETWEEN 51 AND 80
)
INSERT INTO BorrowingDetails (BorrowingID, CopyID, ReturnDate, ItemStatus)
SELECT m.BorrowingID, m.CopyID, DATEADD(DAY, 10, b.BorrowDate), 'Returned'
FROM BorrowMap m JOIN Borrowings b ON b.BorrowingID = m.BorrowingID;

;WITH BorrowMap AS (
    SELECT b.BorrowingID, d.SequenceNo, c.CopyID
    FROM @DemoBorrowings b
    JOIN @Readers d ON d.SequenceNo = b.SequenceNo
    JOIN @DemoCopies c ON c.SequenceNo = d.SequenceNo
    WHERE d.SequenceNo BETWEEN 81 AND 100
)
INSERT INTO BorrowingDetails (BorrowingID, CopyID, ReturnDate, ItemStatus)
SELECT BorrowingID, CopyID, NULL, 'Borrowed' FROM BorrowMap;

;WITH BorrowMap AS (
    SELECT b.BorrowingID, d.SequenceNo, DATEDIFF(DAY, b.DueDate, CAST(GETDATE() AS DATE)) AS DaysLate
    FROM @DemoBorrowings demo
    JOIN @Readers d ON d.SequenceNo = demo.SequenceNo
    JOIN Borrowings b ON b.BorrowingID = demo.BorrowingID
    WHERE d.SequenceNo <= 50
)
INSERT INTO FineReceipts (BorrowingID, RuleID, TotalAmount, DiscountAmount, FinalAmount, Status)
SELECT BorrowingID, @RuleID, DaysLate * @FinePerDay, 0, DaysLate * @FinePerDay,
       CASE WHEN SequenceNo % 5 = 0 THEN 'Paid' ELSE 'Pending' END
FROM BorrowMap;

-- 10 paid invoices for revenue reporting; the remaining 40 receipts stay pending.
;WITH PaidReceipts AS (
    SELECT fr.ReceiptID, fr.FinalAmount,
           ROW_NUMBER() OVER (ORDER BY fr.ReceiptID) AS rn
    FROM FineReceipts fr
    JOIN Borrowings b ON b.BorrowingID = fr.BorrowingID
    JOIN @Readers r ON r.ReaderID = b.ReaderID
    WHERE fr.Status = 'Paid'
)
INSERT INTO PenaltyInvoices (InvoiceCode, ReceiptID, PaymentMethod, AmountPaid, PaymentDate, CashierID, Note)
SELECT CONCAT('DEMO-', CONVERT(CHAR(8), GETDATE(), 112), '-', RIGHT('000' + CAST(rn AS VARCHAR(3)), 3)),
       ReceiptID, CASE WHEN rn % 2 = 0 THEN 'Transfer' ELSE 'Cash' END,
       FinalAmount, DATEADD(DAY, -rn, GETDATE()), @StaffID, N'Hóa đơn thu phạt seed demo'
FROM PaidReceipts;

-- High-risk AI examples for the 50 overdue loans.
INSERT INTO AIPredictionLogs (BorrowingID, RiskScore, SuggestedAction, EvaluatedAt)
    SELECT b.BorrowingID, CAST(80 + (r.SequenceNo % 20) AS DECIMAL(5,2)),
       N'Quá hạn: liên hệ độc giả, tiếp nhận trả sách và xử lý tiền phạt.', GETDATE()
FROM Borrowings b JOIN @Readers r ON r.ReaderID = b.ReaderID
WHERE r.SequenceNo <= 50;

-- Match copy status only to the currently active and overdue open loans (exclude returned copies).
;WITH OpenLoanCopies AS (
    SELECT CopyID FROM BorrowingDetails WHERE ItemStatus = 'Borrowed'
)
UPDATE bc SET Status = 'Borrowed'
FROM BookCopies bc JOIN OpenLoanCopies lc ON lc.CopyID = bc.CopyID;

COMMIT TRANSACTION;

SELECT (SELECT COUNT(*) FROM Readers WHERE ReaderCode LIKE 'DEMO%') AS DemoReaders,
       (SELECT COUNT(*) FROM Borrowings b JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%' AND b.Status = 'Overdue') AS OverdueLoans,
       (SELECT COUNT(*) FROM Borrowings b JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%' AND b.Status = 'Returned') AS ReturnedOnTimeLoans,
       (SELECT COUNT(*) FROM Borrowings b JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%' AND b.Status = 'Active') AS ActiveNotDueLoans,
       (SELECT COUNT(*) FROM FineReceipts fr JOIN Borrowings b ON b.BorrowingID = fr.BorrowingID JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%') AS FineReceipts,
       (SELECT COUNT(*) FROM FineReceipts fr JOIN Borrowings b ON b.BorrowingID = fr.BorrowingID JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%' AND fr.Status = 'Pending') AS PendingFines,
       (SELECT COUNT(*) FROM PenaltyInvoices pi JOIN FineReceipts fr ON fr.ReceiptID = pi.ReceiptID JOIN Borrowings b ON b.BorrowingID = fr.BorrowingID JOIN Readers r ON r.ReaderID = b.ReaderID WHERE r.ReaderCode LIKE 'DEMO%') AS PaidInvoices,
       (SELECT COUNT(*) FROM BookCopies WHERE Status = 'Borrowed') AS BorrowedCopiesAfterSeed;
GO
