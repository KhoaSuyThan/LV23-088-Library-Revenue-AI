using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartLibAI.API.Middlewares;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Core.Services;
using SmartLibAI.Infrastructure.Data;
using SmartLibAI.Infrastructure.Repositories;
using SmartLibAI.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình DbContext kết nối SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<SmartLibDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Đăng ký DI cho AI Prediction Service (Singleton tải ONNX Runtime 1 lần trong bộ nhớ)
builder.Services.AddSingleton<IAIPredictionService, OnnxAIPredictionService>();

// 3. Đăng ký DI cho Repositories và Business Services
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IBorrowRepository, BorrowRepository>();
builder.Services.AddScoped<IReturnRepository, ReturnRepository>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IBorrowService, BorrowService>();
builder.Services.AddScoped<IReturnService, ReturnService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IRulesRepository, RulesRepository>();
builder.Services.AddScoped<IRulesService, RulesService>();
builder.Services.AddScoped<IReaderRepository, ReaderRepository>();
builder.Services.AddScoped<IReaderService, ReaderService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// 3. Cấu hình JWT Authentication & Authorization
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var envSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
var configSecretKey = jwtSettings["Key"] ?? jwtSettings["SecretKey"];

// [CRITICAL SECURITY GATE - P0/P1] Chặn đứng việc khởi động ở mọi môi trường không phải Development nếu thiếu secret an toàn
if (!builder.Environment.IsDevelopment())
{
    var effectiveKey = !string.IsNullOrWhiteSpace(envSecretKey) ? envSecretKey : configSecretKey;
    if (string.IsNullOrWhiteSpace(effectiveKey) || 
        effectiveKey.Contains("SmartLibAI_Super_Secret_Key_For_Jwt_2026_DotNet10") ||
        effectiveKey.StartsWith("DEV_ONLY_") ||
        Encoding.UTF8.GetByteCount(effectiveKey) < 32)
    {
        throw new InvalidOperationException(
            $"[CRITICAL SECURITY BLOCKER] Hệ thống bị chặn khởi động trên môi trường '{builder.Environment.EnvironmentName}' (Staging/Production) do thiếu hoặc dùng khóa bí mật JWT mặc định/không an toàn. " +
            "Bắt buộc phải cấu hình biến môi trường 'JWT_SECRET_KEY' với khóa bảo mật riêng có độ dài tối thiểu 32 ký tự (256-bit).");
    }
}

var secretKey = !string.IsNullOrWhiteSpace(envSecretKey) 
    ? envSecretKey 
    : (!string.IsNullOrWhiteSpace(configSecretKey) ? configSecretKey : "DEV_ONLY_SmartLibAI_Secret_Key_2026_DotNet10_Min32Bytes!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "SmartLibAI",
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"] ?? "SmartLibAIUser",
        ValidateLifetime = true,
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Name,
        ClockSkew = TimeSpan.Zero
    };
});

// Áp dụng FallbackPolicy toàn cục: Mặc định 100% endpoint đều bắt buộc có JWT Token hợp lệ,
// trừ khi endpoint đó được gắn [AllowAnonymous] một cách tường minh.
builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();
});

// 4. Cấu hình CORS an toàn theo môi trường (chỉ chấp nhận domain frontend chính thức)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        if (configuredOrigins.Length > 0)
        {
            policy.WithOrigins(configuredOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else
        {
            // Danh sách trắng các origin chính thức được cấp phép, triệt tiêu nguy cơ CORS từ các subdomain lạ
            var explicitAllowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
                "https://lv-23-088-library-revenue-ai-git-main-khoa-suy-than.vercel.app",
                "https://lv23-088-library-revenue-ai.vercel.app",
                "http://smartlib-ai-api.runasp.net"
            };

            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    // Cho phép dev local
                    if (uri.Host == "localhost" || uri.Host == "127.0.0.1") return true;
                    // Trên Cloud, chỉ chấp nhận đúng origin đã đăng ký chính thức
                    return explicitAllowedOrigins.Contains(origin.TrimEnd('/'));
                }
                return false;
            })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
        }
    });
});

// 5. Cấu hình Controllers và SwaggerGen với Bearer Token
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SmartLib AI API",
        Version = "v1",
        Description = "Nền tảng Backend Web API cho hệ thống SmartLib AI (LV23-088) chạy trên .NET 10"
    });

    // Thêm nút Authorize cho JWT Bearer Token
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập mã token JWT theo định dạng: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    // Thêm Security Requirement cho Bearer Token (.NET 10 / Swashbuckle 10.x)
    c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", doc, null)] = new List<string>()
    });
});

var app = builder.Build();

// 6. Middleware Pipeline
app.UseMiddleware<GlobalExceptionMiddleware>();

// Bật Swagger UI ở cả Development và Production (MonsterASP / Cloud) để kiểm thử và phục vụ chấm điểm đồ án
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartLib AI API v1");
    c.RoutePrefix = string.Empty; // Mở Swagger UI trực tiếp tại trang chủ root "/"
});

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 7. Tự động kiểm tra Schema CSDL & Khởi tạo dữ liệu mẫu (Auto-Migration & Seeding)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<SmartLibDbContext>();

        // Tự động kiểm tra và thêm các cột mới an toàn (Idempotent DDL)
        await context.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Books') AND name = 'IsActive')
            BEGIN
                ALTER TABLE Books ADD IsActive BIT NOT NULL DEFAULT 1;
            END

            -- Tự động mở rộng độ dài cột Title, Author, Publisher của Books
            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Books') AND name = 'Author' AND max_length < 1600)
            BEGIN
                IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_IsActive_CategoryID' AND object_id = OBJECT_ID('Books'))
                    DROP INDEX IX_Books_IsActive_CategoryID ON Books;
                ALTER TABLE Books ALTER COLUMN Title NVARCHAR(500) NOT NULL;
                ALTER TABLE Books ALTER COLUMN Author NVARCHAR(1000) NOT NULL;
                ALTER TABLE Books ALTER COLUMN Publisher NVARCHAR(255) NULL;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Readers') AND name = 'CreditScore')
            BEGIN
                ALTER TABLE Readers ADD CreditScore INT NOT NULL DEFAULT 100;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Readers') AND name = 'Faculty')
            BEGIN
                ALTER TABLE Readers ADD Faculty NVARCHAR(100) NOT NULL DEFAULT N'CNTT';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Readers') AND name = 'ClassGroup')
            BEGIN
                ALTER TABLE Readers ADD ClassGroup NVARCHAR(50) NOT NULL DEFAULT N'K21-CC';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FineRules') AND name = 'StudentBorrowLimit')
            BEGIN
                ALTER TABLE FineRules ADD 
                    StudentBorrowLimit INT NOT NULL DEFAULT 5,
                    StudentBorrowDays INT NOT NULL DEFAULT 14,
                    LecturerBorrowLimit INT NOT NULL DEFAULT 10,
                    LecturerBorrowDays INT NOT NULL DEFAULT 30,
                    DamageFeePercent DECIMAL(5,2) NOT NULL DEFAULT 10.0,
                    ConductScoreDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 20.0;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FineRules') AND name = 'DamageMediumPercent')
            BEGIN
                ALTER TABLE FineRules ADD DamageMediumPercent DECIMAL(5,2) NOT NULL DEFAULT 40.0;
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FineRules') AND name = 'DamageSeverePercent')
            BEGIN
                ALTER TABLE FineRules ADD DamageSeverePercent DECIMAL(5,2) NOT NULL DEFAULT 110.0;
            END

            -- Tự động kiểm tra và tạo các chỉ mục Non-Clustered tối ưu hiệu năng phân trang
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_CategoryID' AND object_id = OBJECT_ID('Books'))
            BEGIN
                CREATE NONCLUSTERED INDEX IX_Books_CategoryID ON Books(CategoryID);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Books_IsActive_CategoryID' AND object_id = OBJECT_ID('Books'))
            BEGIN
                CREATE NONCLUSTERED INDEX IX_Books_IsActive_CategoryID 
                ON Books(IsActive, CategoryID)
                INCLUDE (Title, Author, Publisher, BasePrice, ISBN);
            END

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BookCopies_BookID_Status' AND object_id = OBJECT_ID('BookCopies'))
            BEGIN
                CREATE NONCLUSTERED INDEX IX_BookCopies_BookID_Status 
                ON BookCopies(BookID, Status);
            END

            -- Chỉ mục tối ưu hóa tìm kiếm và quét mã vạch Barcode O(1) (Performance - L03)
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BookCopies_Barcode' AND object_id = OBJECT_ID('BookCopies'))
            BEGIN
                CREATE NONCLUSTERED INDEX IX_BookCopies_Barcode 
                ON BookCopies(Barcode);
            END

            -- Tự động kiểm tra và tạo bảng PenaltyInvoices (Story LOLRA-19)
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PenaltyInvoices')
            BEGIN
                CREATE TABLE PenaltyInvoices (
                    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
                    InvoiceCode NVARCHAR(50) NOT NULL UNIQUE,
                    ReceiptID INT NOT NULL,
                    PaymentMethod NVARCHAR(50) NOT NULL,
                    AmountPaid DECIMAL(18,2) NOT NULL,
                    PaymentDate DATETIME NOT NULL DEFAULT GETDATE(),
                    CashierID INT NOT NULL,
                    Note NVARCHAR(255) NULL,
                    FOREIGN KEY (ReceiptID) REFERENCES FineReceipts(ReceiptID),
                    FOREIGN KEY (CashierID) REFERENCES Users(UserID)
                );
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FineRules') AND name = 'MaxRenewalTimes')
            BEGIN
                ALTER TABLE FineRules ADD 
                    MaxRenewalTimes INT NOT NULL DEFAULT 1,
                    RenewalExtraDays INT NOT NULL DEFAULT 7,
                    DebtLockAmount DECIMAL(18,2) NOT NULL DEFAULT 50000,
                    AutoLockDebtThreshold BIT NOT NULL DEFAULT 1,
                    AiRiskThreshold INT NOT NULL DEFAULT 80,
                    AiRemindDaysBefore INT NOT NULL DEFAULT 3,
                    AiAutoEmailReminder BIT NOT NULL DEFAULT 1,
                    CompensationFixedFee DECIMAL(18,2) NOT NULL DEFAULT 20000,
                    AiAccuracy DECIMAL(5,2) NOT NULL DEFAULT 84.5,
                    AiLastTrained NVARCHAR(50) NOT NULL DEFAULT '10/09/2026';
            END

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('FineRules') AND name = 'CompensationBasePercent')
            BEGIN
                ALTER TABLE FineRules ADD 
                    CompensationBasePercent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
                    MaxFineCapPercent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
                    CompensationRatePercent DECIMAL(5,2) NOT NULL DEFAULT 200.0,
                    AiDiscount_90 DECIMAL(5,2) NOT NULL DEFAULT 10.0;
            END

            -- Tự động kiểm tra và tạo bảng RuleAuditLogs
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RuleAuditLogs')
            BEGIN
                CREATE TABLE RuleAuditLogs (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    RuleKey NVARCHAR(100) NOT NULL,
                    RuleName NVARCHAR(255) NOT NULL,
                    OldValue NVARCHAR(255) NULL,
                    NewValue NVARCHAR(255) NULL,
                    ChangedBy NVARCHAR(100) NOT NULL,
                    ChangedAt DATETIME NOT NULL DEFAULT GETDATE(),
                    IpAddress NVARCHAR(50) NULL
                );
            END

            -- Tự động kiểm tra và tạo bảng WaiverReasons
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WaiverReasons')
            BEGIN
                CREATE TABLE WaiverReasons (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    ReasonCode NVARCHAR(50) NOT NULL UNIQUE,
                    ReasonName NVARCHAR(255) NOT NULL,
                    DefaultDiscountPercent DECIMAL(5,2) NOT NULL DEFAULT 100.0,
                    IsActive BIT NOT NULL DEFAULT 1
                );
            END

            -- Tự động nạp lý do miễn giảm nếu chưa có
            IF NOT EXISTS (SELECT * FROM WaiverReasons)
            BEGIN
                INSERT INTO WaiverReasons (ReasonCode, ReasonName, DefaultDiscountPercent, IsActive) VALUES
                ('WR-SICK', N'Nghỉ ốm có giấy ra/nhập viện điều trị', 100, 1),
                ('WR-FORCE-MAJEURE', N'Thiên tai, lũ lụt, dịch bệnh, sự cố bất khả kháng', 100, 1),
                ('WR-SYS-ERROR', N'Sự cố lỗi phần mềm hệ thống hoặc mất điện thư viện', 100, 1),
                ('WR-POOR-STUDENT', N'Sinh viên diện chính sách hoàn cảnh khó khăn', 50, 0);
            END

            -- Tự động nạp lịch sử kiểm toán ban đầu nếu chưa có
            IF NOT EXISTS (SELECT * FROM RuleAuditLogs)
            BEGIN
                INSERT INTO RuleAuditLogs (RuleKey, RuleName, OldValue, NewValue, ChangedBy, ChangedAt, IpAddress) VALUES
                ('aiRiskThreshold', N'Ngưỡng kích hoạt rủi ro AI Early Warning', '75%', '80%', N'Thủ thư (Admin)', '2026-09-18 15:10:00', '192.168.1.10'),
                ('finePerDay', N'Phí phạt trễ hạn theo ngày', N'3.000 VNĐ', N'2.000 VNĐ', N'Thủ thư (Admin)', '2026-09-18 14:32:10', '192.168.1.45'),
                ('aiDiscount_100', N'Chiết khấu tín nhiệm xuất sắc (90-100 điểm)', '15%', '20%', N'Thủ thư (Admin)', '2026-09-15 09:20:00', '192.168.1.45'),
                ('borrowLimit_MaxTogether', N'Số sách tối đa được mượn cùng lúc', N'4 cuốn', N'5 cuốn', N'Thủ thư (Admin)', '2026-09-10 09:15:00', '192.168.1.12');
            END
        ");

        // Tự động nạp vai trò nếu chưa có
        if (!await context.Roles.AnyAsync())
        {
            await context.Roles.AddRangeAsync(
                new SmartLibAI.Core.Entities.Role { RoleName = "Admin" },
                new SmartLibAI.Core.Entities.Role { RoleName = "Staff" },
                new SmartLibAI.Core.Entities.Role { RoleName = "Reader" }
            );
            await context.SaveChangesAsync();
        }

        // Tự động nạp quy định thư viện chuẩn nếu chưa có
        if (!await context.FineRules.AnyAsync())
        {
            await context.FineRules.AddAsync(new SmartLibAI.Core.Entities.FineRule
            {
                RuleName = "Quy định Thư viện Tiêu chuẩn",
                FinePerDay = 5000m,
                DamageMultiplier = 1.0m,
                StudentBorrowLimit = 5,
                StudentBorrowDays = 14,
                LecturerBorrowLimit = 10,
                LecturerBorrowDays = 30,
                DamageFeePercent = 20.0m,
                DamageMediumPercent = 40.0m,
                DamageSeverePercent = 110.0m,
                ConductScoreDiscountPercent = 20.0m,
                MaxRenewalTimes = 1,
                RenewalExtraDays = 7,
                DebtLockAmount = 50000m,
                AutoLockDebtThreshold = true,
                AiRiskThreshold = 80,
                AiRemindDaysBefore = 3,
                AiAutoEmailReminder = true,
                CompensationFixedFee = 0m,
                CompensationBasePercent = 110.0m,
                MaxFineCapPercent = 100.0m,
                CompensationRatePercent = 200.0m,
                AiDiscount_90 = 10.0m,
                IsActive = true
            });
            await context.SaveChangesAsync();
        }

        // Tự động nạp danh sách độc giả phong phú và đa dạng Khoa/Viện nếu chưa có
        var seedReadersList = new[]
        {
            new { Code = "102220184", Name = "Nguyễn Văn Minh", Email = "minhnv@smartlib.edu.vn", Faculty = "CNTT", Class = "K22-CC", Type = "Standard", Credit = 85 },
            new { Code = "102230045", Name = "Lê Thị Khánh Huyền", Email = "huyenltk@smartlib.edu.vn", Faculty = "Kinh Tế", Class = "K23-KT", Type = "Standard", Credit = 92 },
            new { Code = "102220412", Name = "Phan Hoàng Long", Email = "longph@smartlib.edu.vn", Faculty = "Cơ Khí", Class = "K22-CK", Type = "Standard", Credit = 75 },
            new { Code = "2180600123", Name = "Nguyễn Văn A", Email = "vana@gmail.com", Faculty = "CNTT", Class = "K21-CC", Type = "Standard", Credit = 45 },
            new { Code = "2180600124", Name = "Trần Thị B", Email = "thib@gmail.com", Faculty = "Kinh Tế", Class = "K21-KT", Type = "Standard", Credit = 95 },
            new { Code = "2080601245", Name = "Phạm Minh C", Email = "minhc@gmail.com", Faculty = "Cơ Khí", Class = "K20-CK", Type = "Standard", Credit = 78 },
            new { Code = "2280702111", Name = "Lê Thị D", Email = "thid@gmail.com", Faculty = "Ngoại Ngữ", Class = "K22-NN", Type = "Standard", Credit = 90 },
            new { Code = "GV2026001", Name = "TS. Trần Văn Giảng", Email = "giangtv@smartlib.edu.vn", Faculty = "CNTT", Class = "GV-CNTT", Type = "Lecturer", Credit = 100 }
        };

        foreach (var sr in seedReadersList)
        {
            if (!await context.Readers.AnyAsync(r => r.ReaderCode == sr.Code))
            {
                var newUser = new SmartLibAI.Core.Entities.User
                {
                    RoleID = 3,
                    Username = sr.Code,
                    PasswordHash = "$2a$11$VXHswuIwLM81sMGCTIdOveqq1uHzi5WbLTgN2tkKpnp46hBuVoVV6",
                    FullName = sr.Name,
                    Email = sr.Email,
                    IsActive = true
                };
                await context.Users.AddAsync(newUser);
                await context.SaveChangesAsync();

                await context.Readers.AddAsync(new SmartLibAI.Core.Entities.Reader
                {
                    UserID = newUser.UserID,
                    ReaderCode = sr.Code,
                    MemberType = sr.Type,
                    Faculty = sr.Faculty,
                    ClassGroup = sr.Class,
                    ExpiryDate = DateTime.UtcNow.AddYears(1),
                    CreditScore = sr.Credit
                });
                await context.SaveChangesAsync();
            }
        }

        // Cập nhật Khoa và Lớp cho độc giả đầu tiên (Trần Đức Huy) nếu chưa có
        var rHuy = await context.Readers.FirstOrDefaultAsync(r => r.ReaderCode == "RD20260001");
        if (rHuy != null)
        {
            rHuy.Faculty = "CNTT";
            rHuy.ClassGroup = "K21-CC";
            await context.SaveChangesAsync();
        }

        // Tự động seed phiếu mượn mẫu cho cuốn BC000001-B (Bản sao B) phục vụ kiểm thử lưu thông hoàn trả
        var readerMinh = await context.Readers.Include(r => r.User).FirstOrDefaultAsync(r => r.ReaderCode == "102220184");
        var copyB = await context.BookCopies.FirstOrDefaultAsync(c => c.Barcode == "BC000001-B");
        if (readerMinh != null && copyB != null)
        {
            var hasBorrowB = await context.BorrowingDetails.AnyAsync(bd => bd.CopyID == copyB.CopyID && bd.ItemStatus == "Borrowed");
            if (!hasBorrowB)
            {
                var adminUser = await context.Users.FirstOrDefaultAsync(u => u.RoleID == 1 || u.RoleID == 2) ?? readerMinh.User;
                var borrowMinh = new SmartLibAI.Core.Entities.Borrowing
                {
                    ReaderID = readerMinh.ReaderID,
                    LibrarianID = adminUser.UserID,
                    BorrowDate = DateTime.UtcNow.AddDays(-15),
                    DueDate = DateTime.UtcNow.AddDays(-5),
                    Status = "Overdue"
                };
                await context.Borrowings.AddAsync(borrowMinh);
                await context.SaveChangesAsync();

                var detailB = new SmartLibAI.Core.Entities.BorrowingDetail
                {
                    BorrowingID = borrowMinh.BorrowingID,
                    CopyID = copyB.CopyID,
                    ItemStatus = "Borrowed"
                };
                await context.BorrowingDetails.AddAsync(detailB);
                copyB.Status = "Borrowed";
                await context.SaveChangesAsync();
            }
        }

        // Tự động seed khoản phạt vi phạm Pending mẫu nếu chưa có khoản nào đang chờ thu (Story LOLRA-19)
        if (!await context.FineReceipts.AnyAsync(f => f.Status == "Pending"))
        {
            var overdueBorrowing = await context.Borrowings.FirstOrDefaultAsync(b => b.Status == "Overdue") 
                                  ?? await context.Borrowings.FirstOrDefaultAsync();
            var defaultRule = await context.FineRules.FirstOrDefaultAsync();
            if (overdueBorrowing != null && defaultRule != null)
            {
                var samplePendingFine = new SmartLibAI.Core.Entities.FineReceipt
                {
                    BorrowingID = overdueBorrowing.BorrowingID,
                    RuleID = defaultRule.RuleID,
                    TotalAmount = 25000m,
                    DiscountAmount = 0m,
                    FinalAmount = 25000m,
                    Status = "Pending"
                };
                await context.FineReceipts.AddAsync(samplePendingFine);
                await context.SaveChangesAsync();
            }
        }

        logger.LogInformation("SmartLib AI: Kiểm tra CSDL và Seeding tự động thành công!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "SmartLib AI: Lỗi trong quá trình tự động cập nhật CSDL và Seeding.");
    }
}

app.Run();
