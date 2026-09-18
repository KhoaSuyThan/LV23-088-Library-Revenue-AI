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

var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình DbContext kết nối SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<SmartLibDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Đăng ký DI cho Repositories và Business Services
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IBookRepository, BookRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IBookService, BookService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();

// 3. Cấu hình JWT Authentication & Authorization
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Key"] ?? jwtSettings["SecretKey"] ?? "SmartLibAI_Super_Secret_Key_For_Jwt_2026_DotNet10";

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
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// 4. Cấu hình CORS mở rộng cho kết nối Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartLib AI API v1");
        c.RoutePrefix = string.Empty; // Mở Swagger UI tại trang chủ root "/"
    });
}

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

            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Readers') AND name = 'CreditScore')
            BEGIN
                ALTER TABLE Readers ADD CreditScore INT NOT NULL DEFAULT 100;
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
                DamageFeePercent = 10.0m,
                ConductScoreDiscountPercent = 20.0m,
                IsActive = true
            });
            await context.SaveChangesAsync();
        }

        logger.LogInformation("SmartLib AI: Kiểm tra CSDL và Seeding tự động thành công!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "SmartLib AI: Lỗi trong quá trình tự động cập nhật CSDL và Seeding.");
    }
}

app.Run();
