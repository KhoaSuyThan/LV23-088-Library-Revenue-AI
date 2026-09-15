# LV23-088: HỆ THỐNG BÁO CÁO DOANH THU & AI DỰ BÁO TRỄ HẠN THƯ VIỆN

> **Môn học:** Quản lý dự án CNTT  
> **Học kỳ:** HK1 (2026 - 2027)  
> **Thời gian thực hiện:** 08/09/2026 – 08/11/2026 (8 tuần kỹ thuật + 1 tuần bảo vệ)

---

## 1. Giới thiệu tổng quan
Dự án **LV23-088 (SmartLib AI)** tập trung giải quyết bài toán quản trị thất thoát tài sản và tối ưu hóa nguồn thu tài chính cho hệ thống thư viện. Hệ thống số hóa toàn bộ quy trình lưu thông sách, tự động hóa xử lý vi phạm, đồng thời ứng dụng mô hình Trí tuệ nhân tạo (Machine Learning) để phân tích hành vi độc giả nhằm đưa ra cảnh báo sớm nguy cơ trễ hạn trước khi sự cố phát sinh.

### Mục tiêu SMART của dự án:
* **S (Specific):** Xây dựng hoàn chỉnh 16 chức năng cốt lõi (Mượn/Trả, Xử lý vi phạm, Báo cáo tài chính, Mô hình AI dự báo trễ hạn).
* **M (Measurable):** Hoàn thành 100% tài liệu theo chuẩn Agile (Charter, SRS, RACI, Backlog, ERD 12 bảng); mô hình AI đạt độ chính xác $F_1\text{-score} \ge 90\%$.
* **A (Achievable):** Triển khai trên nền tảng đám mây gói miễn phí (Free-tier), sử dụng máy tính cá nhân để phát triển và huấn luyện mô hình.
* **R (Relevant):** Giải quyết triệt để bài toán thất thoát và nợ phạt quá hạn của thư viện đại học.
* **T (Time-bound):** Bàn giao toàn bộ sản phẩm và nghiệm thu đúng tuần thứ 9 theo tiến độ môn học.

---

## 2. Thông tin nhóm thực hiện & Phân công trách nhiệm

| STT | Họ và tên | Vai trò chính | Nhiệm vụ đảm nhiệm |
| :---: | :--- | :---: | :--- |
| 1 | **Nguyễn Võ Lê Khoa** | **Project Manager / Backend Dev** | Quản lý tiến độ Jira/GitHub, kiến trúc hệ thống, phát triển Backend API và logic xử lý mượn/trả/phạt. |
| 2 | **Nguyễn Thành Nhất Nam** | **Business Analyst / QA Tester** | Khảo sát quy trình nghiệp vụ, viết đặc tả SRS/Use Cases, thiết kế kịch bản kiểm thử (Test Cases) & Defect Log. |
| 3 | **Trần Đức Huy** | **UI/UX Designer / Data Engineer** | Thiết kế Wireframe/Prototype trên Figma, chuẩn hóa CSDL 12 bảng, huấn luyện mô hình AI dự báo. |

---

## 3. Liên kết tài nguyên & Minh chứng quản lý

* **Jira Cloud Workspace:** [Theo dõi tiến độ Sprint & Backlog](https://khoanv249.atlassian.net/jira/software/projects/L0LRA/boards/2)
* **GitHub Repository:** [Kho lưu trữ mã nguồn dự án](https://github.com/KhoaSuyThan/LV23-088-Library-Revenue-AI)
* **Google Drive Workspace:** [Thư mục lưu trữ tài liệu & minh chứng dự án](https://drive.google.com/drive/folders/1dNWi_LnFo-nnB-v9ey1Er508-DRr0E3d?usp=drive_link)
* **Figma Prototype:** *(Đang cập nhật link hoàn thiện từ Đức Huy)*
* **Cơ sở dữ liệu (dbdiagram):** *(Đang cập nhật link sơ đồ quan hệ ERD)*

---

## 4. Kiến trúc hệ thống & Công nghệ sử dụng

Hệ thống được phát triển theo mô hình phân tách độc lập (Decoupled Architecture) kết hợp kiến trúc phân tầng **N-Tier** tại Backend:

* **Frontend:** Web Dashboard tương tác (React / HTML5 / CSS3 / Chart.js).
* **Backend:** **.NET 10 Web API (`net10.0`)** xây dựng theo kiến trúc N-Tier kết hợp MVC Web API Controller:
  * **Tầng Core (`SmartLibAI.Core`):** Định nghĩa 12 Domain Entities, Data Transfer Objects (DTOs), Repository Interfaces, Service Interfaces và Business Logic (Xác thực BCrypt, JWT Token, nghiệp vụ sách).
  * **Tầng Infrastructure (`SmartLibAI.Infrastructure`):** Quản trị CSDL qua `SmartLibDbContext` (Entity Framework Core 10) với cấu hình Fluent API chi tiết, triển khai `GenericRepository<T>`.
  * **Tầng API (`SmartLibAI.API`):** Controllers, Dependency Injection, Swagger UI tích hợp xác thực Bearer Token, Global Exception Middleware và CORS.
* **Cơ sở dữ liệu:** Microsoft SQL Server chuẩn hóa 12 bảng quan hệ:
  * `Roles`, `Users`, `Readers`, `Notifications` (Quản trị & Người dùng)
  * `Categories`, `Books`, `BookCopies` (Quản lý tài nguyên sách)
  * `Borrowings`, `BorrowingDetails` (Nghiệp vụ Mượn / Trả)
  * `FineRules`, `FineReceipts`, `AIPredictionLogs` (Tài chính & Dự báo AI)
* **Trí tuệ nhân tạo (AI Engine):**
  * Ngôn ngữ & Thư viện: Python (Scikit-learn, Pandas, NumPy).
  * Thuật toán: Random Forest / Logistic Regression phân loại rủi ro trễ hạn (Risk Score 0.00 – 100.00).
  * Thuộc tính đầu vào (Features): Lịch sử trễ hạn, số lượng sách đang mượn, thể loại tài liệu, thời gian mượn.
* **Hạ tầng & Công cụ quản lý:** Git, GitHub, Atlassian Jira, Figma, Postman / Swagger UI.

---

## 5. Cấu trúc thư mục dự án (Directory Structure)

```text
LV23-088-Library-Revenue-AI/
├── CHANGELOG.md               # Nhật ký ghi nhận lịch sử thay đổi mã nguồn
├── LICENSE                    # Giấy phép phát hành phi thương mại & học thuật
├── README.md                  # Tài liệu tổng quan và hướng dẫn dự án
├── data/                      # Kịch bản CSDL và dữ liệu mẫu demo
│   ├── 01_schema_smartlib_ai.sql   # Script khởi tạo 12 bảng CSDL SQL Server
│   ├── 02_seed_dummy_data.sql      # Script nạp dữ liệu mẫu thử nghiệm
│   └── books.csv                   # Tập dữ liệu Kaggle thông tin sách thực tế
└── src/                       # Mã nguồn giải pháp Backend .NET 10
    ├── SmartLibAI.sln         # File Solution quản lý toàn bộ các project
    ├── SmartLibAI.Core/       # Tầng nghiệp vụ lõi (Entities, DTOs, Interfaces, Services)
    ├── SmartLibAI.Infrastructure/ # Tầng hạ tầng dữ liệu (DbContext, GenericRepository)
    └── SmartLibAI.API/        # Tầng Web API (Controllers, Middlewares, Program.cs)
```

---

## 6. Hướng dẫn cài đặt & Khởi chạy (Getting Started)

### Yêu cầu môi trường:
* [.NET 10 SDK](https://dotnet.microsoft.com/download) (hoặc phiên bản mới nhất hỗ trợ `net10.0`).
* [Microsoft SQL Server](https://www.microsoft.com/sql-server) (LocalDB / Express / Standard) & SSMS / Azure Data Studio.
* [Git](https://git-scm.com/).

### Các bước thực hiện:

#### Bước 1: Khởi tạo Cơ sở dữ liệu
1. Mở SQL Server Management Studio (SSMS) hoặc công cụ quản trị SQL tương đương.
2. Thực thi script [`data/01_schema_smartlib_ai.sql`](data/01_schema_smartlib_ai.sql) để tạo cơ sở dữ liệu `SmartLibAI` và 12 bảng cấu trúc chuẩn.
3. Thực thi script [`data/02_seed_dummy_data.sql`](data/02_seed_dummy_data.sql) để nạp các bản ghi dữ liệu mẫu phục vụ kiểm thử.

#### Bước 2: Cấu hình chuỗi kết nối Backend
Mở tệp [`src/SmartLibAI.API/appsettings.json`](src/SmartLibAI.API/appsettings.json) và điều chỉnh chuỗi kết nối CSDL nếu cần:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=SmartLibAI;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  }
}
```

#### Bước 3: Biên dịch & Khởi chạy Backend Web API
Mở cửa sổ dòng lệnh tại thư mục gốc của repository:

```bash
# Khôi phục các gói phụ thuộc và biên dịch solution
dotnet restore src/SmartLibAI.sln
dotnet build src/SmartLibAI.sln

# Khởi chạy dự án Web API
dotnet run --project src/SmartLibAI.API/SmartLibAI.API.csproj
```

#### Bước 4: Kiểm tra & Trải nghiệm API qua Swagger UI
* Khi ứng dụng khởi chạy thành công, truy cập trình duyệt tại địa chỉ gốc:  
  👉 **`http://localhost:5000`** (hoặc port được hiển thị trên console terminal).
* Giao diện **Swagger UI** sẽ tự động hiển thị với đầy đủ các endpoints:
  * `GET /api/health`: Kiểm tra trạng thái hoạt động hệ thống.
  * `POST /api/auth/login`: Đăng nhập hệ thống và lấy mã JWT Token.
  * `GET /api/books`: Tra cứu danh mục sách thư viện.
* Bấm vào nút **Authorize** ở góc trên bên phải giao diện Swagger và nhập `Bearer {token}` để xác thực quyền truy cập các API yêu cầu bảo mật.

---

## 7. Quy chuẩn phát triển mã nguồn (Git Workflow)

Dự án áp dụng mô hình phân nhánh **Gitflow rút gọn**:

* `main`: Nhánh ổn định (Production), chỉ tiếp nhận mã nguồn sau khi hoàn thành Sprint và kiểm thử thành công.
* `develop`: Nhánh làm việc trung tâm, tích hợp các tính năng của các thành viên.
* `feat/<ten-tinh-nang>`: Nhánh con được rẽ nhánh để mỗi cá nhân phát triển độc lập (ví dụ: `feat/backend`, `feat/auth`, `feat/borrow-api`, `feat/ai-model`).

### Quy ước đặt tên commit (Conventional Commits):
* `feat`: Thêm một tính năng mới.
* `fix`: Sửa lỗi phát sinh.
* `docs`: Cập nhật tài liệu, README.
* `style`: Chỉnh sửa giao diện, định dạng code.
* `refactor`: Tối ưu hóa cấu trúc mã nguồn.

---

## 8. Lộ trình triển khai (Sprint Roadmap)

* **Sprint 1 (Tuần 1):** Khởi động dự án, Project Charter, ma trận RACI, thiết lập Jira Backlog & Git Repo, khảo sát phạm vi và phác thảo sơ bộ UI/DB.
* **Sprint 2 (Tuần 2 - 3):** Đặc tả chi tiết SRS, thiết kế ERD 12 bảng chuẩn hóa, dựng Prototype Figma, khởi tạo dữ liệu mẫu (`data/`) và cấu trúc Backend N-Tier .NET 10.
* **Sprint 3 (Tuần 4 - 6):** Lập trình các nghiệp vụ lõi (Mượn/Trả, Xử lý tính phạt, Dashboard doanh thu) và xây dựng module AI.
* **Sprint 4 (Tuần 7 - 8):** Tích hợp toàn diện hệ thống, kiểm thử hệ thống (System Test), sửa lỗi (Bug Fixing) và đóng gói triển khai.
* **Nghiệm thu (Tuần 9):** Báo cáo và bảo vệ đồ án trước hội đồng giảng viên.

---

## 9. Giấy phép phát hành (License)

Dự án được cấp phép theo [Non-Commercial & Educational License](LICENSE):
* **Học tập & Nghiên cứu:** Được phép tự do đọc, tham khảo, thử nghiệm và trích dẫn phục vụ học thuật.
* **Phi thương mại:** **Nghiêm cấm** mọi hành vi sao chép, sử dụng hoặc tái phân phối nhằm mục đích thương mại, kinh doanh và tạo ra lợi nhuận tài chính khi chưa được nhóm tác giả đồng ý.