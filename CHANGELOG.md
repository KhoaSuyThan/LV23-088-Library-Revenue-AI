# Nhật ký thay đổi (CHANGELOG)

Tài liệu ghi lại toàn bộ lịch sử các thay đổi, bổ sung và cập nhật mã nguồn dự án LV23-088.

> Quy tắc: Nội dung cập nhật mới nhất luôn được tự động chèn ngay bên dưới dấu phân cách bên dưới.

---
## [2026-09-16] - Hoàn thiện US-01: Đăng nhập, đăng xuất và phân quyền người dùng RBAC (LOLRA-9)

### Đã thay đổi & Cải thiện (Changed & Improved):
- **Cơ sở dữ liệu & Data scripts (`data/` & `DtbDoAnCS/`)**:
  - Bổ sung cột `IsActive BIT NOT NULL DEFAULT 1` vào bảng `Users` trong `01_schema_smartlib_ai.sql`.
  - Tối ưu `02_seed_dummy_data.sql`: Loại bỏ vòng lặp sinh 9 tài khoản thừa, gán trực tiếp các lượt mượn trả mẫu cho độc giả đại diện `duchuy`, giữ cấu trúc 3 tài khoản chuẩn (`khoanv` - Admin, `nhatnam` - Staff, `duchuy` - Reader).
  - Đồng bộ toàn bộ các tệp script SQL sang thư mục `DtbDoAnCS/` theo đúng quy định kiến trúc CSDL dự án.
- **Tầng Core (`SmartLibAI.Core`)**:
  - `User.cs`: Bổ sung thuộc tính `IsActive` (kiểu `bool`, mặc định `true`).
  - `LoginRequestDto.cs`: Hỗ trợ linh hoạt cho phép đăng nhập bằng cả `Email` lẫn `Username` khi client gửi request body.
  - `AuthResponseDto.cs`: Bổ sung trường `Email` vào dữ liệu phản hồi trả về khi đăng nhập thành công.
  - `UserProfileDto.cs`: Tạo mới DTO chuẩn hóa cho kết quả trả về của endpoint hồ sơ cá nhân.
  - `AuthService.cs`:
    - Bổ sung logic kiểm tra trạng thái kích hoạt tài khoản `user.IsActive`: Nếu tài khoản có `IsActive = false`, chặn truy cập và báo lỗi *"Tài khoản đã bị khóa hoặc ngừng hoạt động"*.
    - Chuẩn hóa thông báo lỗi xác thực không chính xác thành *"Email hoặc mật khẩu không chính xác"*.
    - Bổ sung đầy đủ các JWT Claims chuẩn hóa: `sub`/`nameid`, `email`, `role`, `exp`.
- **Tầng Infrastructure & API (`SmartLibAI.Infrastructure` & `SmartLibAI.API`)**:
  - `SmartLibDbContext.cs`: Khai báo Fluent API cấu hình `IsActive` với giá trị mặc định `true`.
  - `appsettings.json` & `Program.cs`: Bổ sung cấu hình `Key`, `Issuer`, `Audience`, `ExpiryHours` đảm bảo tính tương thích kép cho hệ thống JWT Bearer.
  - `AuthController.cs`:
    - Phân biệt mã trạng thái HTTP: Trả về `403 Forbidden` khi tài khoản bị khóa, `401 Unauthorized` khi thông tin đăng nhập sai.
    - Cập nhật endpoint `GET /api/Auth/profile` trả về kiểu `UserProfileDto` chuẩn hóa.

## [2026-09-15] - Xây dựng Giao diện Đăng nhập Quản trị (Frontend React) theo phong cách SmartCV AI

### Đã thêm (Added):
- **Khởi tạo dự án Frontend (`frontend/`)**: Ứng dụng React 19 + Vite kết hợp thư viện `axios` và `lucide-react`.
- **Giao diện Đăng nhập (`LoginPage.jsx` & `LoginPage.css`)**:
  - Tái hiện chính xác phong cách **Split-Card** của dự án tham khảo *SmartCV AI*: Thẻ trung tâm nổi bật trên nền xanh tím pastel (`#eaf0fb`), khối cong màu xanh dương (`#5373ea`) uốn lượn mềm mại hình giọt nước bên trái với logo SmartLib AI và lời chào *"Xin chào!"*.
  - Form đăng nhập bên phải: Ô nhập Username/Email và Mật khẩu có nền xám sáng thanh lịch (`#f1f4f9`), icon đại diện bên phải, nút con mắt bật/tắt hiển thị mật khẩu, nút **Đăng nhập** xanh dương bo góc 12px với hiệu ứng hover mượt mà.
  - Tích hợp hộp **Tài khoản kiểm thử nhanh**: Cho phép bấm trực tiếp để tự động điền tài khoản Admin (`khoanv249@gmail.com`) hoặc Staff (`nguyennhatnam213654@gmail.com`).
- **Giao diện Dashboard Chào mừng (`DashboardPage.jsx`)**:
  - Hiển thị thông tin phiên làm việc, họ tên cán bộ, badge chức vụ (`Admin` / `Staff`), hạ tầng kỹ thuật và nút Đăng xuất an toàn.
- **Dịch vụ kết nối API (`api/authApi.js`)**: Kết nối trực tiếp vào endpoint `POST /api/Auth/login`, lưu trữ JWT token và tự động xử lý xác thực phiên làm việc.
- **Kiểm thử biên dịch**: Chạy `npm run build` thành công xuất sắc (0 lỗi, hoàn thành trong 1.11s).

## [2026-09-15] - Chuẩn hóa 3 vai trò (Admin, Staff, Reader) và cập nhật dữ liệu mẫu

### Đã thay đổi (Changed):
- **Dữ liệu mẫu (`data/02_seed_dummy_data.sql`)**:
  - Chuẩn hóa 3 vai trò hệ thống: `Admin` (ID: 1), `Staff` (ID: 2 - thay thế Librarian), `Reader` (ID: 3).
  - Cập nhật 3 tài khoản thực tế của nhóm với mã hóa BCrypt chuẩn:
    - Admin: `khoanv` (`khoanv249@gmail.com` - Nguyễn Võ Lê Khoa).
    - Staff: `nhatnam` (`nguyennhatnam213654@gmail.com` - Nguyễn Thành Nhất Nam).
    - Reader: `duchuy` (`duchuy3d2005@gmail.com` - Trần Đức Huy, liên kết mã độc giả `RD20260001`).
- **Backend API (`AuthService.cs` & `Program.cs`)**:
  - Nâng cấp `AuthService`: Cho phép đăng nhập linh hoạt bằng cả `Username` hoặc `Email`, đồng thời chặn quyền truy cập đối với tài khoản `Reader` khi cố tình đăng nhập Cổng Quản trị.
  - Bổ sung logic Seeding tự động trong `Program.cs`: Tự động khởi tạo 3 vai trò và 3 tài khoản nhóm nếu CSDL chưa có dữ liệu.

## [2026-09-15] - Khởi tạo Backend SmartLib AI (.NET 10 N-Tier Architecture)

### Đã thêm (Added):
- **Cấu trúc Solution & Projects**: Khởi tạo Solution `SmartLibAI.sln` (.NET 10) gồm 3 tầng phân chia rõ ràng:
  - `SmartLibAI.Core`: Chứa 12 Domain Entities (Role, User, Reader, Notification, Category, Book, BookCopy, Borrowing, BorrowingDetail, FineRule, FineReceipt, AIPredictionLog) khớp 100% schema `data/01_schema_smartlib_ai.sql`, Data Transfer Objects (DTOs), Generic Repository Interface, Authentication & Book Services Interfaces và Business Services.
  - `SmartLibAI.Infrastructure`: Triển khai `SmartLibDbContext` với cấu hình Fluent API chi tiết cho 12 bảng và lớp triển khai `GenericRepository<T>` sử dụng Entity Framework Core.
  - `SmartLibAI.API`: Cung cấp Web API Controllers (`HealthController`, `AuthController`, `BooksController`), `GlobalExceptionMiddleware`, Swagger UI tích hợp Bearer Token và JWT Authentication middleware.
- **Cấu hình hệ thống**: Thiết lập chuỗi kết nối SQL Server, thông số JWT Secret/Issuer/Audience trong `appsettings.json`, đăng ký Dependency Injection và pipeline ASP.NET Core trong `Program.cs`.
- **Kiểm thử biên dịch**: Hoàn thành build toàn bộ Solution `SmartLibAI.sln` trên .NET 10 (`net10.0`) với 0 lỗi (0 errors) và 0 cảnh báo (0 warnings).

## [2026-09-11] - Áp dụng Giấy phép Phi thương mại & Học thuật (Non-Commercial & Educational)

### Đã thay đổi (Changed):
- **Tệp LICENSE**: Chuyển đổi sang [Non-Commercial & Educational License](LICENSE) – Nghiêm cấm mọi hình thức thương mại, kinh doanh hoặc phân phối có thu phí; chỉ cho phép học tập, nghiên cứu và trích dẫn học thuật.
- **Tài liệu README.md**: Cập nhật mục **7. Giấy phép phát hành (License)** với các điều khoản ràng buộc phi thương mại.

## [2026-09-11] - Khởi tạo dự án, tài liệu tổng quan và cấu hình Gitignore

### Đã thêm (Added):
- **Tài liệu README.md**: Cung cấp tổng quan hệ thống LV23-088, mục tiêu SMART ($F_1\text{-score} \ge 90\%$), phân công nhân sự nhóm, liên kết tài nguyên (Jira, GitHub, Google Drive Workspace), kiến trúc kỹ thuật đa nền tảng (ASP.NET Core, React, Python AI, SQL Server), Git Workflow và kế hoạch 4 Sprint.
- **Cấu hình .gitignore**: Thiết lập bộ quy tắc loại trừ toàn diện cho ASP.NET Core (`bin/`, `obj/`), React (`node_modules/`, `dist/`), Python AI (`.venv/`, weights lớn `*.pkl`/`*.h5`), Database (`*.mdf`, `*.bak`), file môi trường bảo mật (`.env`, `secrets.json`) và hệ điều hành.
- **Nhật ký thay đổi CHANGELOG.md**: Khởi tạo tài liệu theo dõi tiến độ và lịch sử thay đổi mã nguồn chuẩn hóa.
