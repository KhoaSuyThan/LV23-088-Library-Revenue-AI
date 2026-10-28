using System.ComponentModel.DataAnnotations;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.DTOs.Books;
using SmartLibAI.Core.DTOs.Returns;
using SmartLibAI.Core.Entities;
using SmartLibAI.Infrastructure.Data;
using SmartLibAI.Infrastructure.Repositories;
using Xunit;

namespace SmartLibAI.Tests;

/// <summary>
/// Bộ kiểm thử tự động kiểm chứng tính toàn vẹn trạng thái mượn trả và ràng buộc Condition (Story LOLRA-16/17, P0/P1/P2).
/// Thực thi trực tiếp trên Production Repositories với SQLite In-Memory Database Engine độc lập.
/// </summary>
public class BorrowReturnStatusValidationTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<SmartLibDbContext> _options;

    public BorrowReturnStatusValidationTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _options = new DbContextOptionsBuilder<SmartLibDbContext>()
            .UseSqlite(_connection)
            .Options;

        using var context = CreateContext();
        context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _connection.Dispose();
    }

    private SmartLibDbContext CreateContext() => new(_options);

    private static IList<ValidationResult> ValidateModel(object model)
    {
        var validationResults = new List<ValidationResult>();
        var ctx = new ValidationContext(model, null, null);
        Validator.TryValidateObject(model, ctx, validationResults, true);
        return validationResults;
    }

    #region 1. Data Annotation Whitelist Validation Tests (P1)

    [Theory]
    [InlineData("Good")]
    [InlineData("DamagedLight")]
    [InlineData("DamagedMedium")]
    [InlineData("DamagedSevere")]
    [InlineData("Damaged")]
    [InlineData("Lost")]
    public void ReturnBookRequestDto_ValidConditions_PassesValidation(string condition)
    {
        // Arrange
        var dto = new ReturnBookRequestDto
        {
            Barcode = "BC000001-A",
            Condition = condition
        };

        // Act
        var results = ValidateModel(dto);

        // Assert
        Assert.Empty(results);
    }

    [Theory]
    [InlineData("Normal")]
    [InlineData("Hỏng sách")]
    [InlineData("Unknown")]
    [InlineData("Available")]
    [InlineData("Borrowed")]
    [InlineData("Good_Bad")]
    public void ReturnBookRequestDto_InvalidConditions_FailsValidation(string invalidCondition)
    {
        // Arrange
        var dto = new ReturnBookRequestDto
        {
            Barcode = "BC000001-A",
            Condition = invalidCondition
        };

        // Act
        var results = ValidateModel(dto);

        // Assert
        Assert.NotEmpty(results);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ReturnBookRequestDto.Condition)));
    }

    [Theory]
    [InlineData(-10)]
    [InlineData(250)]
    public void ReturnBookRequestDto_InvalidDamagePercent_FailsValidation(decimal invalidPercent)
    {
        // Arrange
        var dto = new ReturnBookRequestDto
        {
            Barcode = "BC000001-A",
            Condition = "DamagedLight",
            DamagePercent = invalidPercent
        };

        // Act
        var results = ValidateModel(dto);

        // Assert
        Assert.NotEmpty(results);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ReturnBookRequestDto.DamagePercent)));
    }

    [Theory]
    [InlineData(-5)]
    [InlineData(105)]
    public void ReturnBookRequestDto_InvalidWaiverDiscount_FailsValidation(decimal invalidWaiver)
    {
        // Arrange
        var dto = new ReturnBookRequestDto
        {
            Barcode = "BC000001-A",
            Condition = "Good",
            WaiverDiscountPercent = invalidWaiver
        };

        // Act
        var results = ValidateModel(dto);

        // Assert
        Assert.NotEmpty(results);
        Assert.Contains(results, r => r.MemberNames.Contains(nameof(ReturnBookRequestDto.WaiverDiscountPercent)));
    }

    #endregion

    #region 2. Production Code Integration Tests: BookRepository & Concurrency Safeguard (P0)

    [Fact]
    public async Task BookRepository_ManualBorrowedTransition_ReturnsManualBorrowedNotAllowed()
    {
        // Arrange: Tạo Book và BookCopy thật trong DB Test
        using var context = CreateContext();
        var category = new Category { CategoryName = "CNTT" };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var book = new Book { CategoryID = category.CategoryID, Title = "Clean Architecture", ISBN = "9780134494166", BasePrice = 120000 };
        context.Books.Add(book);
        await context.SaveChangesAsync();

        var copy = new BookCopy { BookID = book.BookID, Barcode = "BC999901-A", Status = "Available" };
        context.BookCopies.Add(copy);
        await context.SaveChangesAsync();

        var repository = new BookRepository(context);

        // Act: Thử chuyển thủ công sang 'Borrowed'
        var result = await repository.UpdateCopyStatusAsync(copy.CopyID, "Borrowed");

        // Assert: Production code phải trả về ManualBorrowedNotAllowed
        Assert.False(result.Success);
        Assert.Equal(CopyStatusUpdateError.ManualBorrowedNotAllowed, result.ErrorCode);
    }

    [Fact]
    public async Task BookRepository_WhenActiveBorrowExists_BlocksManualStatusTransition()
    {
        // Arrange: Tạo dữ liệu mượn sách đang hoạt động (ReturnDate == null && ItemStatus == 'Borrowed')
        using var context = CreateContext();
        var category = new Category { CategoryName = "Toán" };
        context.Categories.Add(category);

        var role = new Role { RoleName = "Reader" };
        context.Roles.Add(role);
        await context.SaveChangesAsync();

        var user = new User { Username = "reader01", FullName = "Nguyễn Văn A", PasswordHash = "hash", RoleID = role.RoleID };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var reader = new Reader { UserID = user.UserID, ReaderCode = "RD999001", MemberType = "Student", ExpiryDate = DateTime.UtcNow.AddYears(1) };
        context.Readers.Add(reader);

        var book = new Book { CategoryID = category.CategoryID, Title = "Đại số tuyến tính", ISBN = "9781111111111", BasePrice = 80000 };
        context.Books.Add(book);
        await context.SaveChangesAsync();

        var copy = new BookCopy { BookID = book.BookID, Barcode = "BC999902-A", Status = "Borrowed" };
        context.BookCopies.Add(copy);
        await context.SaveChangesAsync();

        var borrowing = new Borrowing { ReaderID = reader.ReaderID, LibrarianID = 1, BorrowDate = DateTime.UtcNow, DueDate = DateTime.UtcNow.AddDays(14), Status = "Active" };
        context.Borrowings.Add(borrowing);
        await context.SaveChangesAsync();

        var detail = new BorrowingDetail { BorrowingID = borrowing.BorrowingID, CopyID = copy.CopyID, ReturnDate = null, ItemStatus = "Borrowed" };
        context.BorrowingDetails.Add(detail);
        await context.SaveChangesAsync();

        var repository = new BookRepository(context);

        // Act: Thủ thư gọi API chuyển trạng thái sang 'Available' trong khi sách đang được mượn
        var result = await repository.UpdateCopyStatusAsync(copy.CopyID, "Available");

        // Assert: Production code phải từ chối với ActiveBorrowExists
        Assert.False(result.Success);
        Assert.Equal(CopyStatusUpdateError.ActiveBorrowExists, result.ErrorCode);
    }

    [Fact]
    public async Task BookRepository_WhenStaleBorrowedWithoutActiveBorrow_AllowsStatusRecovery()
    {
        // Arrange: Trường hợp dữ liệu bị lệch (Status == 'Borrowed' nhưng không có chi tiết mượn hoạt động nào)
        using var context = CreateContext();
        var category = new Category { CategoryName = "Kinh tế" };
        context.Categories.Add(category);
        await context.SaveChangesAsync();

        var book = new Book { CategoryID = category.CategoryID, Title = "Kinh tế học", ISBN = "9782222222222", BasePrice = 90000 };
        context.Books.Add(book);
        await context.SaveChangesAsync();

        var copy = new BookCopy { BookID = book.BookID, Barcode = "BC999903-A", Status = "Borrowed" };
        context.BookCopies.Add(copy);
        await context.SaveChangesAsync();

        var repository = new BookRepository(context);

        // Act: Thủ thư sửa kẹt dữ liệu chuyển về 'Available'
        var result = await repository.UpdateCopyStatusAsync(copy.CopyID, "Available");

        // Assert: Hệ thống cho phép phục hồi và trạng thái trong DB phải được cập nhật thành công
        Assert.True(result.Success);
        Assert.Equal(CopyStatusUpdateError.None, result.ErrorCode);

        using var verifyContext = CreateContext();
        var updatedCopy = await verifyContext.BookCopies.FindAsync(copy.CopyID);
        Assert.NotNull(updatedCopy);
        Assert.Equal("Available", updatedCopy.Status);
    }

    [Fact]
    public async Task BorrowRepository_WhenCopyNotAvailable_ThrowsExceptionAndRollsBack()
    {
        // Arrange: Chuẩn bị độc giả và 1 bản sao đang ở trạng thái 'Damaged' (không phải 'Available')
        using var context = CreateContext();
        var category = new Category { CategoryName = "Văn học" };
        context.Categories.Add(category);

        var role = new Role { RoleName = "Reader" };
        context.Roles.Add(role);
        await context.SaveChangesAsync();

        var user = new User { Username = "reader02", FullName = "Trần Thị B", PasswordHash = "hash", RoleID = role.RoleID };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var reader = new Reader { UserID = user.UserID, ReaderCode = "RD999002", MemberType = "Student", ExpiryDate = DateTime.UtcNow.AddYears(1) };
        context.Readers.Add(reader);

        var book = new Book { CategoryID = category.CategoryID, Title = "Dế Mèn Phiêu Lưu Ký", ISBN = "9783333333333", BasePrice = 50000 };
        context.Books.Add(book);
        await context.SaveChangesAsync();

        var copy = new BookCopy { BookID = book.BookID, Barcode = "BC999904-A", Status = "Damaged" };
        context.BookCopies.Add(copy);
        await context.SaveChangesAsync();

        var repository = new BorrowRepository(context);
        var borrowing = new Borrowing
        {
            ReaderID = reader.ReaderID,
            LibrarianID = 1,
            BorrowDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(14),
            Status = "Active"
        };

        // Act & Assert: Gọi production code CreateBorrowingWithTransactionAsync phải ném InvalidOperationException
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            repository.CreateBorrowingWithTransactionAsync(borrowing, new List<int> { copy.CopyID }));

        Assert.Contains("không còn ở trạng thái khả dụng", ex.Message);

        // Assert sau Rollback: Bảng Borrowings và BorrowingDetails hoàn toàn không có bản ghi nào bị tạo dở dang
        using var verifyContext = CreateContext();
        var totalBorrowings = await verifyContext.Borrowings.CountAsync();
        var totalDetails = await verifyContext.BorrowingDetails.CountAsync();
        Assert.Equal(0, totalBorrowings);
        Assert.Equal(0, totalDetails);
    }

    #endregion
}
