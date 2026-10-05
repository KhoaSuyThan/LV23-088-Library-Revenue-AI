# LV23-088: HỆ THỐNG BÁO CÁO DOANH THU & AI DỰ BÁO TRỄ HẠN THƯ VIỆN

> **Môn học:** Quản lý dự án CNTT  
> **Học kỳ:** HK1 (2026 - 2027)  
> **Thời gian thực hiện:** 08/09/2026 – 08/11/2026 (8 tuần kỹ thuật + 1 tuần bảo vệ)

---

## 1. Giới thiệu tổng quan
Dự án **LV23-088 (SmartLib AI)** tập trung giải quyết bài toán quản trị thất thoát tài sản và tối ưu hóa nguồn thu tài chính cho hệ thống thư viện đại học. Hệ thống số hóa toàn bộ quy trình lưu thông sách, tự động hóa xử lý vi phạm bằng máy quét Barcode, phân tích dữ liệu lớn trên 11.000 đầu sách, đồng thời ứng dụng mô hình Trí tuệ nhân tạo (Machine Learning) để phân tích hành vi độc giả nhằm đưa ra cảnh báo sớm nguy cơ trễ hạn trước khi sự cố phát sinh.

### Mục tiêu SMART của dự án:
* **S (Specific):** Xây dựng hoàn chỉnh các phân hệ nghiệp vụ cốt lõi: Quầy lưu thông mượn/trả bằng Barcode, Kiểm tra vi phạm & tính phạt tự động, Danh mục sách phân trang tối ưu Indexing, Báo cáo doanh thu thu phạt và Quản trị quy chế thư viện.
* **M (Measurable):** Hoàn thành 100% tài liệu theo chuẩn Agile (Charter, SRS, RACI, Backlog, ERD 12 bảng); hệ thống chịu tải trên 11.123 đầu sách với thời gian phản hồi truy vấn SQL Server đạt dưới 50ms; mô hình AI dự báo trễ hạn đạt độ chính xác $F_1\text{-score} \ge 90\%$.
* **A (Achievable):** Triển khai kiến trúc Decoupled hiện đại với Backend .NET 10 Web API N-Tier kết hợp Frontend React 19 + Vite.
* **R (Relevant):** Giải quyết triệt để bài toán thất thoát, giảm thời gian thao tác tại quầy lưu thông xuống dưới 10 giây/lượt và minh bạch nguồn thu tiền phạt.
* **T (Time-bound):** Bàn giao toàn bộ sản phẩm và nghiệm thu đúng tiến độ 8 tuần học phần.

---

## 2. Thông tin nhóm thực hiện & Phân công trách nhiệm

| STT | Họ và tên | Vai trò chính | Nhiệm vụ đảm nhiệm |
| :---: | :--- | :---: | :--- |
| 1 | **Nguyễn Võ Lê Khoa** | **Project Manager / Backend Dev** | Quản lý tiến độ Jira/GitHub, kiến trúc hệ thống, phát triển Backend API (.NET 10, EF Core) và các nghiệp vụ Mượn/Trả/Hóa đơn phạt. |
| 2 | **Nguyễn Thành Nhất Nam** | **Business Analyst / QA Tester** | Khảo sát quy trình nghiệp vụ, viết đặc tả SRS/User Stories (AC Given-When-Then), thiết kế kịch bản kiểm thử (Test Cases) & Defect Log. |
| 3 | **Trần Đức Huy** | **UI/UX Designer / Data Engineer** | Thiết kế Prototype Figma, chuẩn hóa CSDL 12 bảng, tối ưu Indexing SQL Server, tiền xử lý dữ liệu sách Kaggle & huấn luyện AI. |

---

## 3. Liên kết tài nguyên & Minh chứng quản lý

* **Jira Cloud Workspace:** [Theo dõi tiến độ Sprint & Backlog](https://khoanv249.atlassian.net/jira/software/projects/L0LRA/boards/2)
* **GitHub Repository:** [Kho lưu trữ mã nguồn dự án (Nhánh `main`)](https://github.com/KhoaSuyThan/LV23-088-Library-Revenue-AI)
* **Google Drive Workspace:** [Thư mục lưu trữ tài liệu & minh chứng dự án](https://drive.google.com/drive/folders/1dNWi_LnFo-nnB-v9ey1Er508-DRr0E3d?usp=drive_link)
* **Figma Prototype:** [Thiết kế giao diện Prototype Figma](https://www.figma.com/design/CjIXDOJma0kSL0UTjTMOXq/Untitled?node-id=47-867&t=lb1ircxLC0sNDjTx-0)

---

## 4. Kiến trúc hệ thống & Các phân hệ chức năng

Hệ thống được phát triển theo mô hình phân tách độc lập (Decoupled Architecture) gồm Cổng Quản trị Web Frontend và giải pháp phân tầng **N-Tier** tại Backend:

### 4.1. Phân hệ Frontend (React 19 + Vite):
* **Quầy Lưu Thông (`CirculationDesk`):**
  * **Tạo phiếu mượn:** Tích hợp máy quét mã vạch liên hoàn (quét thẻ sinh viên tự động focus sang quét mã sách), kiểm tra ràng buộc điều kiện độc giả (Story LOLRA-16: khóa thẻ, nợ phạt chưa đóng, vượt quá 5 cuốn).
  * **Tiếp nhận trả sách:** Quét mã vạch sách/phiếu, tự động tính số ngày quá hạn, tiền phạt theo quy định `FineRules`, xử lý tình trạng sách hỏng/mất.
  * **In biên lai:** Hỗ trợ xem trước và in phiếu mượn sách, phiếu thu tiền phạt vi phạm trực tiếp (`ReceiptModal`).
  * **Máy quét Barcode đa năng (`BarcodeCameraModal`):** Nhận diện mã vạch qua webcam, súng đọc USB, tải tệp ảnh hoặc dán ảnh chụp màn hình bằng tổ hợp phím `Ctrl + V`.
* **Quản lý & Tra cứu Danh mục Sách (`BookCatalog`):**
  * Hỗ trợ tìm kiếm từ khóa không dấu/có dấu tiếng Việt (`SQL_Latin1_General_CP1_CI_AI`), lọc theo thể loại, trạng thái sẵn có (> 0).
  * Phân trang Server-side linh hoạt (10, 20, 50, 100 kết quả/trang) tối ưu cho kho dữ liệu lớn trên 11.000 đầu sách.
* **Báo cáo Thu phạt & Doanh thu (`FineRevenue`):** Thống kê tổng tiền phạt thu được, biểu đồ tỷ lệ các loại vi phạm (trễ hạn, làm rách, mất sách) và bộ lọc theo khoảng thời gian.
* **Quản lý Hồ sơ Độc giả (`ReaderProfiles`):** Xem thông tin thẻ, trạng thái hoạt động, lịch sử mượn trả và công nợ phạt.
* **Cấu hình Quy định Thư viện (`LibrarySettings`):** Tùy chỉnh hạn mức mượn, số ngày mượn tối đa, đơn giá phạt trễ hạn theo ngày và mức bồi thường hư hại sách.
* **Xác thực & Bảo mật (`LoginPage`):** Đăng nhập an toàn bằng JWT Token, lưu thông tin phiên làm việc và phân quyền RBAC.

### 4.2. Phân hệ Backend (.NET 10 Web API):
* **Kiến trúc N-Tier chuẩn hóa:**
  * **`SmartLibAI.Core`:** Định nghĩa Entities, DTOs, Interfaces và Services nghiệp vụ (`BorrowService`, `ReturnService`, `BookService`, `InvoiceService`, `AuthService`).
  * **`SmartLibAI.Infrastructure`:** Quản lý truy cập dữ liệu với Entity Framework Core 10 (`SmartLibDbContext`), triển khai Repositories với Database Transactions đảm bảo tính toàn vẹn ACID.
  * **`SmartLibAI.API`:** Cung cấp RESTful APIs với các Controllers (`BorrowsController`, `ReturnsController`, `BooksController`, `InvoicesController`, `AuthController`...), tích hợp Swagger UI, Global Exception Middleware và CORS.
* **Tối ưu hóa CSDL SQL Server:**
  * Đánh chỉ mục Non-Clustered Indexes kết hợp (`IX_Books_IsActive_CategoryID`, `IX_BookCopies_BookID_Status`) giúp truy vấn tìm kiếm và phân trang đạt tốc độ 31 - 36ms trên 11.123 bản ghi.
  * 12 bảng quan hệ chuẩn hóa: `Roles`, `Users`, `Readers`, `Categories`, `Books`, `BookCopies`, `Borrowings`, `BorrowingDetails`, `FineRules`, `FineReceipts`, `Notifications`, `AIPredictionLogs`.

---

## 5. Cấu trúc thư mục dự án (Directory Structure)

```text
LV23-088-Library-Revenue-AI/
├── CHANGELOG.md                   # Nhật ký chi tiết lịch sử thay đổi mã nguồn
├── LICENSE                        # Giấy phép học thuật phi thương mại
├── README.md                      # Tài liệu tổng quan và hướng dẫn dự án
├── package.json                   # Scripts điều phối chạy toàn hệ thống từ root
├── api.cmd                        # Lệnh tắt chạy Backend API trên Windows
├── dev.cmd                        # Lệnh tắt chạy Frontend trên Windows
├── data/                          # Kịch bản CSDL & tập dữ liệu thực tế
│   ├── 01_schema_smartlib_ai.sql  # Script tạo cấu trúc 12 bảng CSDL SQL Server
│   ├── 02_seed_dummy_data.sql     # Script nạp danh mục mẫu, độc giả kiểm thử & quy định phạt
│   ├── 03_import_books_and_copies.sql # Script nạp 11.123 đầu sách & bản sao mã vạch
│   ├── clean_kaggle_books.py      # Script Python tiền xử lý dữ liệu sách Kaggle
│   ├── cleaned_books.csv          # Dữ liệu 11.123 sách chuẩn hóa
│   ├── cleaned_book_copies.csv    # Dữ liệu 22.246 bản sao sách có barcode
│   └── books.csv                  # Dữ liệu sách thô ban đầu
├── frontend/                      # Cổng Quản trị & Nghiệp vụ (React 19 + Vite)
│   ├── src/
│   │   ├── api/                   # Axios API Clients (borrowApi, returnApi, invoiceApi, authApi, rulesApi)
│   │   ├── components/            # Components tái sử dụng (BorrowForm, ReturnProcessing, BarcodeCameraModal, ReceiptModal)
│   │   ├── pages/                 # Các trang chức năng chính (CirculationDesk, BookCatalog, FineRevenue, LibrarySettings, ReaderProfiles, DashboardPage, LoginPage)
│   │   ├── utils/                 # Module tiện ích giải mã mã vạch (barcodeImageDecoder.js)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── src/                           # Mã nguồn Backend N-Tier .NET 10
    ├── SmartLibAI.sln             # File Solution quản lý giải pháp Backend
    ├── SmartLibAI.Core/           # Entities, DTOs, Service & Repository Interfaces
    ├── SmartLibAI.Infrastructure/ # DbContext, Entity Framework Core Repositories
    └── SmartLibAI.API/            # Controllers, Middlewares, Program.cs
```

---

## 6. Hướng dẫn cài đặt & Khởi chạy (Getting Started)

### Yêu cầu môi trường:
* [.NET 10 SDK](https://dotnet.microsoft.com/download) (hoặc .NET 8/9/10 SDK).
* [Node.js](https://nodejs.org/) (phiên bản 18+ trở lên) & npm.
* [Microsoft SQL Server](https://www.microsoft.com/sql-server) (LocalDB, Express hoặc Standard) & SSMS.
* [Git](https://git-scm.com/).

---

### Các bước thực hiện:

#### Bước 1: Khởi tạo Cơ sở dữ liệu SQL Server
Mở **SQL Server Management Studio (SSMS)** hoặc dùng cửa sổ dòng lệnh chạy lần lượt 3 script SQL:
```powershell
# 1. Tạo 12 bảng cơ sở dữ liệu
sqlcmd -S localhost -E -i data/01_schema_smartlib_ai.sql

# 2. Nạp dữ liệu cấu hình, tài khoản kiểm thử và kịch bản mượn trả mẫu
sqlcmd -S localhost -E -i data/02_seed_dummy_data.sql

# 3. Nạp kho dữ liệu hơn 11.000 sách và bản sao mã vạch Barcode
sqlcmd -S localhost -E -i data/03_import_books_and_copies.sql
```

---

#### Bước 2: Khởi chạy Backend Web API (.NET)
Tại thư mục gốc của dự án, bạn có thể chọn **1 trong các cách sau**:

* **Cách 1 (Nhanh nhất bằng lệnh npm):**
  ```bash
  npm run api
  ```
* **Cách 2 (Bằng tập lệnh tắt trên Windows PowerShell):**
  ```powershell
  .\api
  ```
* **Cách 3 (Lệnh chuẩn .NET CLI):**
  ```powershell
  dotnet run --project src/SmartLibAI.API/SmartLibAI.API.csproj
  ```

👉 **Swagger UI API Document:** Mở trình duyệt tại **`http://localhost:5264/index.html`**

---

#### Bước 3: Khởi chạy Cổng Quản trị Frontend (React 19 + Vite)
Mở một tab terminal mới tại **thư mục gốc của dự án**:

* **Khởi chạy trực tiếp:**
  ```bash
  npm run dev
  ```
  *(hoặc gõ `.\dev` trên PowerShell)*

👉 **Cổng Quản trị Web:** Mở trình duyệt truy cập **`http://localhost:5173`**

---

#### Bước 4: Danh sách tài khoản kiểm thử sẵn có trong hệ thống

| Vai trò | Tên đăng nhập | Địa chỉ Email | Mật khẩu mặc định | Họ và tên | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin** | `khoanv` | `khoanv249@gmail.com` | `24092005k` | **Nguyễn Võ Lê Khoa** | Toàn quyền Quản trị hệ thống & Cấu hình |
| **Staff** | `nhatnam` | `nguyennhatnam213654@gmail.com` | `14022005N` | **Nguyễn Thành Nhất Nam** | Thao tác Quầy lưu thông, Sách, Thu phạt |
| **Reader** | `duchuy` | `duchuy3d2005@gmail.com` | `25022005H` | **Trần Đức Huy** | Bạn đọc *(Thẻ kiểm thử mượn sách)* |

---

## 7. Quy chuẩn phát triển mã nguồn (Git Workflow)

Dự án áp dụng mô hình phân nhánh **Gitflow**:

* `main`: Nhánh ổn định, chỉ tiếp nhận mã nguồn sau khi kiểm thử và nghiệm thu tính năng.
* `develop`: Nhánh làm việc trung tâm tích hợp mã nguồn của toàn nhóm.
* `feat/<ten-tinh-nang>`: Nhánh phát triển tính năng độc lập (ví dụ: `feat/backend-circulation`, `feat/CirculationDesk`, `feat/bookCatalog-crud`).

### Quy ước đặt tên commit (Conventional Commits):
```text
<loại-thay-đổi>(<phạm-vi>): <mô tả nội dung bằng tiếng Việt> (<mã-công-việc>)
```
* **Ví dụ:** `feat(circulation): hoàn thiện quét mã vạch mượn trả sách và tính tiền phạt vi phạm (LOLRA-16)`

---

## 8. Lộ trình triển khai (Sprint Roadmap)

| Sprint | Thời gian | Nội dung công việc chính | Trạng thái |
| :---: | :---: | :--- | :---: |
| **Sprint 1** | 08/09 – 13/09/2026 | Khởi động dự án, lập Project Charter, ma trận RACI, thiết lập Jira/GitHub, Figma Prototype | **Hoàn thành** |
| **Sprint 2** | 14/09 – 20/09/2026 | Hoàn thiện SRS, WBS, sơ đồ Gantt, thiết kế CSDL 12 bảng SQL Server & Seeding | **Hoàn thành** |
| **Sprint 3** | 21/09 – 27/09/2026 | Dựng khung Backend API N-Tier, phân quyền RBAC JWT, phân trang & đánh index 11.000 sách | **Hoàn thành** |
| **Sprint 4** | 28/09 – 04/10/2026 | Tích hợp máy quét Barcode, hoàn thiện API Mượn/Trả sách, kiểm tra vi phạm & in biên lai | **Hoàn thành** |
| **Sprint 5** | 05/10 – 11/10/2026 | Báo cáo doanh thu thu phạt, hoàn thiện pipeline mô hình AI dự báo trễ hạn | Đang thực hiện |
| **Sprint 6** | 12/10 – 18/10/2026 | Tích hợp hệ thống toàn diện, kiểm thử chức năng, khắc phục Defect Log | Kế hoạch |
| **Sprint 7** | 19/10 – 25/10/2026 | Triển khai môi trường thử nghiệm (Staging Cloud), kiểm thử nghiệm thu UAT | Kế hoạch |
| **Sprint 8** | 26/10 – 01/11/2026 | Đóng gói sản phẩm Release v1.0, hoàn thiện tài liệu thuyết minh đồ án | Kế hoạch |
| **Hậu kỳ** | 02/11 – 15/11/2026 | Chuẩn bị slide thuyết trình, video demo sản phẩm và tham gia bảo vệ đồ án | Kế hoạch |

---

## 9. Giấy phép phát hành (License)

Dự án được cấp phép theo [Non-Commercial & Educational License](LICENSE):
* **Học tập & Nghiên cứu:** Được phép tự do tham khảo, chạy thử nghiệm và trích dẫn phục vụ học thuật.
* **Phi thương mại:** **Nghiêm cấm** mọi hành vi sao chép, sử dụng hoặc tái phân phối nhằm mục đích thương mại khi chưa có sự đồng ý của nhóm tác giả.