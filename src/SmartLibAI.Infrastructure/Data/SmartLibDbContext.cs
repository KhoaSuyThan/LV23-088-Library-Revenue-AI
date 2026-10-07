using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;

namespace SmartLibAI.Infrastructure.Data;

/// <summary>
/// DbContext quản trị toàn bộ 12 bảng thực thể CSDL SmartLibAI theo schema SQL.
/// </summary>
public class SmartLibDbContext : DbContext
{
    public SmartLibDbContext(DbContextOptions<SmartLibDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Reader> Readers => Set<Reader>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<BookCopy> BookCopies => Set<BookCopy>();
    public DbSet<Borrowing> Borrowings => Set<Borrowing>();
    public DbSet<BorrowingDetail> BorrowingDetails => Set<BorrowingDetail>();
    public DbSet<FineRule> FineRules => Set<FineRule>();
    public DbSet<FineReceipt> FineReceipts => Set<FineReceipt>();
    public DbSet<PenaltyInvoice> PenaltyInvoices => Set<PenaltyInvoice>();
    public DbSet<AIPredictionLog> AIPredictionLogs => Set<AIPredictionLog>();
    public DbSet<RuleAuditLog> RuleAuditLogs => Set<RuleAuditLog>();
    public DbSet<WaiverReason> WaiverReasons => Set<WaiverReason>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =============================================
        // 1. NHÓM QUẢN TRỊ HỆ THỐNG & NGƯỜI DÙNG
        // =============================================

        // Roles
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles");
            entity.HasKey(e => e.RoleID);
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .IsRequired();
            entity.HasIndex(e => e.RoleName)
                .IsUnique();
        });

        // Users
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.UserID);
            entity.Property(e => e.Username)
                .HasMaxLength(50)
                .IsUnicode(false)
                .IsRequired();
            entity.HasIndex(e => e.Username)
                .IsUnique();
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .IsUnicode(false)
                .IsRequired();
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .IsRequired();
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .IsUnicode(false);
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("GETDATE()");

            entity.HasOne(e => e.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(e => e.RoleID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Readers
        modelBuilder.Entity<Reader>(entity =>
        {
            entity.ToTable("Readers");
            entity.HasKey(e => e.ReaderID);
            entity.Property(e => e.ReaderCode)
                .HasMaxLength(20)
                .IsUnicode(false)
                .IsRequired();
            entity.HasIndex(e => e.ReaderCode)
                .IsUnique();
            entity.Property(e => e.MemberType)
                .HasMaxLength(50)
                .HasDefaultValue("Standard");
            entity.Property(e => e.ExpiryDate)
                .HasColumnType("date")
                .IsRequired();
            entity.Property(e => e.CreditScore)
                .HasDefaultValue(100);

            entity.HasOne(e => e.User)
                .WithOne(u => u.Reader)
                .HasForeignKey<Reader>(e => e.UserID)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Notifications
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.NotificationID);
            entity.Property(e => e.Message)
                .IsRequired();
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("GETDATE()");

            entity.HasOne(e => e.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.UserID)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =============================================
        // 2. NHÓM QUẢN LÝ TÀI NGUYÊN (SÁCH)
        // =============================================

        // Categories
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(e => e.CategoryID);
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .IsRequired();
            entity.HasIndex(e => e.CategoryName)
                .IsUnique();
        });

        // Books (khớp data/books.csv: Title max 350, Author max 800, Publisher max 200)
        modelBuilder.Entity<Book>(entity =>
        {
            entity.ToTable("Books");
            entity.HasKey(e => e.BookID);
            entity.Property(e => e.ISBN)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Title)
                .HasMaxLength(350)
                .IsRequired();
            entity.Property(e => e.Author)
                .HasMaxLength(800)
                .IsRequired();
            entity.Property(e => e.Publisher)
                .HasMaxLength(200);
            entity.Property(e => e.BasePrice)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(50000m);
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Books)
                .HasForeignKey(e => e.CategoryID)
                .OnDelete(DeleteBehavior.Restrict);

            // Chỉ mục tối ưu hóa truy vấn lọc và phân trang sách
            entity.HasIndex(e => e.CategoryID)
                .HasDatabaseName("IX_Books_CategoryID");

            entity.HasIndex(e => new { e.IsActive, e.CategoryID })
                .HasDatabaseName("IX_Books_IsActive_CategoryID")
                .IncludeProperties(e => new { e.Title, e.Author, e.Publisher, e.BasePrice, e.ISBN });
        });

        // BookCopies
        modelBuilder.Entity<BookCopy>(entity =>
        {
            entity.ToTable("BookCopies");
            entity.HasKey(e => e.CopyID);
            entity.Property(e => e.Barcode)
                .HasMaxLength(50)
                .IsUnicode(false)
                .IsRequired();
            entity.HasIndex(e => e.Barcode)
                .IsUnique();
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Available");

            // Chỉ mục tối ưu hóa đếm và tra cứu tình trạng bản sao theo đầu sách
            entity.HasIndex(e => new { e.BookID, e.Status })
                .HasDatabaseName("IX_BookCopies_BookID_Status");

            entity.HasOne(e => e.Book)
                .WithMany(b => b.BookCopies)
                .HasForeignKey(e => e.BookID)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =============================================
        // 3. NHÓM NGHIỆP VỤ MƯỢN / TRẢ
        // =============================================

        // Borrowings
        modelBuilder.Entity<Borrowing>(entity =>
        {
            entity.ToTable("Borrowings");
            entity.HasKey(e => e.BorrowingID);
            entity.Property(e => e.BorrowDate)
                .HasDefaultValueSql("GETDATE()");
            entity.Property(e => e.DueDate)
                .IsRequired();
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Active");

            entity.HasOne(e => e.Reader)
                .WithMany(r => r.Borrowings)
                .HasForeignKey(e => e.ReaderID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Librarian)
                .WithMany(u => u.BorrowingsHandled)
                .HasForeignKey(e => e.LibrarianID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // BorrowingDetails
        modelBuilder.Entity<BorrowingDetail>(entity =>
        {
            entity.ToTable("BorrowingDetails");
            entity.HasKey(e => e.DetailID);
            entity.Property(e => e.ItemStatus)
                .HasMaxLength(50)
                .HasDefaultValue("Borrowed");

            entity.HasOne(e => e.Borrowing)
                .WithMany(b => b.BorrowingDetails)
                .HasForeignKey(e => e.BorrowingID)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.BookCopy)
                .WithMany(bc => bc.BorrowingDetails)
                .HasForeignKey(e => e.CopyID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =============================================
        // 4. NHÓM TÀI CHÍNH & DỰ BÁO AI
        // =============================================

        // FineRules
        modelBuilder.Entity<FineRule>(entity =>
        {
            entity.ToTable("FineRules");
            entity.HasKey(e => e.RuleID);
            entity.Property(e => e.RuleName)
                .HasMaxLength(100)
                .IsRequired();
            entity.Property(e => e.FinePerDay)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(5000m);
            entity.Property(e => e.DamageMultiplier)
                .HasColumnType("decimal(4,2)")
                .HasDefaultValue(1.0m);
            entity.Property(e => e.StudentBorrowLimit)
                .HasDefaultValue(5);
            entity.Property(e => e.StudentBorrowDays)
                .HasDefaultValue(14);
            entity.Property(e => e.LecturerBorrowLimit)
                .HasDefaultValue(10);
            entity.Property(e => e.LecturerBorrowDays)
                .HasDefaultValue(30);
            entity.Property(e => e.DamageFeePercent)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(10.0m);
            entity.Property(e => e.ConductScoreDiscountPercent)
                .HasColumnType("decimal(5,2)")
                .HasDefaultValue(20.0m);
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true);
        });

        // FineReceipts
        modelBuilder.Entity<FineReceipt>(entity =>
        {
            entity.ToTable("FineReceipts");
            entity.HasKey(e => e.ReceiptID);
            entity.Property(e => e.TotalAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();
            entity.Property(e => e.DiscountAmount)
                .HasColumnType("decimal(18,2)")
                .HasDefaultValue(0m);
            entity.Property(e => e.FinalAmount)
                .HasColumnType("decimal(18,2)")
                .IsRequired();
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasDefaultValue("Pending");

            entity.HasOne(e => e.Borrowing)
                .WithMany(b => b.FineReceipts)
                .HasForeignKey(e => e.BorrowingID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.FineRule)
                .WithMany(fr => fr.FineReceipts)
                .HasForeignKey(e => e.RuleID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // PenaltyInvoices (Hóa đơn kế toán thu tiền phạt bất biến - Story LOLRA-19)
        modelBuilder.Entity<PenaltyInvoice>(entity =>
        {
            entity.ToTable("PenaltyInvoices");
            entity.HasKey(e => e.InvoiceID);
            entity.Property(e => e.InvoiceCode)
                .HasMaxLength(50)
                .IsRequired();
            entity.HasIndex(e => e.InvoiceCode)
                .IsUnique();
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .IsRequired();
            entity.Property(e => e.AmountPaid)
                .HasColumnType("decimal(18,2)")
                .IsRequired();
            entity.Property(e => e.PaymentDate)
                .HasDefaultValueSql("GETDATE()");
            entity.Property(e => e.Note)
                .HasMaxLength(255);

            entity.HasOne(e => e.FineReceipt)
                .WithOne(fr => fr.PenaltyInvoice)
                .HasForeignKey<PenaltyInvoice>(e => e.ReceiptID)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Cashier)
                .WithMany()
                .HasForeignKey(e => e.CashierID)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AIPredictionLogs
        modelBuilder.Entity<AIPredictionLog>(entity =>
        {
            entity.ToTable("AIPredictionLogs");
            entity.HasKey(e => e.LogID);
            entity.Property(e => e.RiskScore)
                .HasColumnType("decimal(5,2)")
                .IsRequired();
            entity.Property(e => e.SuggestedAction)
                .HasMaxLength(255);
            entity.Property(e => e.EvaluatedAt)
                .HasDefaultValueSql("GETDATE()");

            entity.HasOne(e => e.Borrowing)
                .WithMany(b => b.AIPredictionLogs)
                .HasForeignKey(e => e.BorrowingID)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RuleAuditLogs
        modelBuilder.Entity<RuleAuditLog>(entity =>
        {
            entity.ToTable("RuleAuditLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RuleKey).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RuleName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.OldValue).HasMaxLength(255);
            entity.Property(e => e.NewValue).HasMaxLength(255);
            entity.Property(e => e.ChangedBy).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ChangedAt).HasDefaultValueSql("GETDATE()");
            entity.Property(e => e.IpAddress).HasMaxLength(50);
        });

        // WaiverReasons
        modelBuilder.Entity<WaiverReason>(entity =>
        {
            entity.ToTable("WaiverReasons");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ReasonCode).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ReasonName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.DefaultDiscountPercent).HasColumnType("decimal(5,2)").HasDefaultValue(100m);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });
    }
}
