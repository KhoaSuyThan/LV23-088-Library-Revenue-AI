# CHƯƠNG 10: KẾT QUẢ THỰC HIỆN VÀ TRÌNH BÀY SẢN PHẨM DỰ ÁN (SMARTLIB AI)

---

## 10.1. TỔNG QUAN GIẢI PHÁP VÀ KIẾN TRÚC HỆ THỐNG PHẦN MỀM

### 10.1.1. Bối cảnh bài toán và Định vị giải pháp SmartLib AI
Trong hệ thống thư viện đại học hiện đại, hai vấn đề nhức nhối nhất kéo dài qua nhiều năm là:
1. **Tỷ lệ sách trễ hạn cao dẫn đến nguy cơ thất thoát tài sản:** Độc giả mượn sách quên hạn trả hoặc cố tình giữ sách quá hạn, trong khi thủ thư không có công cụ dự báo sớm để chủ động nhắc nhở, chỉ phát hiện khi sự việc đã rồi.
2. **Quy trình xử lý thủ công tại quầy gây ùn ứ và sai sót tài chính:** Việc tìm kiếm sách bằng tay, nhập mã thủ công, tính tiền phạt theo ngày bằng phương pháp cộng nhẩm, và thu tiền mặt không có hóa đơn chuẩn dẫn đến sai lệch sổ sách, mất thời gian của sinh viên (mỗi lượt mượn/trả mất từ 3 – 5 phút).

Để giải quyết triệt để các hạn chế trên, dự án **LV23-088 (SmartLib AI)** được xây dựng nhằm số hóa toàn diện quy trình vận hành thư viện với 3 mục tiêu đột phá:
* **Tự động hóa quầy lưu thông:** Ứng dụng công nghệ quét mã vạch Barcode Code 128 / QR Code đa kênh (Webcam máy tính, súng đọc chuyên dụng, dán ảnh chụp màn hình từ Clipboard `Ctrl + V`), giúp rút ngắn thời gian mượn/trả xuống **dưới 10 giây/lượt**.
* **Xử lý vi phạm & Minh bạch tài chính:** Tự động hóa tính toán tiền phạt theo quy chế thư viện động (`FineRules`), hỗ trợ trả sách từng phần, bồi thường sách hỏng/mất và xuất biên lai PDF chuẩn 300 DPI qua thư viện QuestPDF.
* **Tích hợp Trí tuệ Nhân tạo dự báo sớm (AI Predictive Engine):** Nhúng mô hình Machine Learning (Random Forest) chạy nội suy trực tiếp trong nhân Backend (.NET 10 qua ONNX Runtime) để phân tích hành vi mượn đọc, đưa ra cảnh báo nguy cơ trễ hạn sớm với độ trễ suy luận **< 1ms**, độ chính xác $F_1 \ge 90\%$.

---

### 10.1.2. Kiến trúc giải pháp phân tầng (Decoupled N-Tier Architecture)
Hệ thống SmartLib AI được thiết kế theo mô hình kiến trúc phân tách độc lập (Decoupled Architecture), đảm bảo tính module hóa cao, bảo mật nhiều lớp và khả năng mở rộng linh hoạt:

```text
[ Người dùng / Thủ thư / Độc giả ]
             │
             ▼ (HTTPS / WSS)
┌────────────────────────────────────────────────────────┐
│             TẦNG TRÌNH DIỄN (FRONTEND CLIENT)          │
│  React 19 + Vite + Tailwind CSS + Lucide Icons         │
│  • Quầy lưu thông (Circulation Desk & Barcode Scanner) │
│  • Kho sách 11.000 đầu sách (Book Catalog & Filter)    │
│  • Báo cáo Doanh thu tương tác (Chart.js Dashboard)    │
│  • Quản lý Độc giả (Reader Profiles & Credit Score)    │
└──────────────────────────┬─────────────────────────────┘
                           │ (RESTful APIs / JWT Bearer)
                           ▼
┌────────────────────────────────────────────────────────┐
│             TẦNG DỊCH VỤ WEB API (.NET 10)             │
│  ASP.NET Core Web API 10.0                             │
│  • Controllers & Custom JWT Claims Middleware          │
│  • Swagger UI / OpenAPI 3.0 Documentation              │
│  • Global Exception Handler & Audit Logging            │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────┐
│     TẦNG NGHIỆP VỤ CỐT LÕI   │ │    PHÂN HỆ HỌC MÁY   │
│       (SmartLibAI.Core)      │ │     (ONNX Runtime)   │
│  • BorrowService             │ │  • In-Process        │
│  • ReturnService             │ │    InferenceSession  │
│  • InvoiceService            │ │  • Random Forest     │
│  • RuleEngineService         │ │    Classifier (.onnx)│
└──────────────┬───────────────┘ └──────────┬───────────┘
               │                            │
               ▼                            │
┌─────────────────────────────────────────┐ │
│        TẦNG DỮ LIỆU & HẠ TẦNG CSDL      │ │
│     (SmartLibAI.Infrastructure)         │ │
│  • Entity Framework Core 10 (DbContext) │ │
│  • Database Transactions (ACID)         │ │
│  • QuestPDF Binary Generator            │ │
└──────────────────┬──────────────────────┘ │
                   │                        │
                   ▼                        ▼
┌────────────────────────────────────────────────────────┐
│         CƠ SỞ DỮ LIỆU MICROSOFT SQL SERVER 2022        │
│  12 Bảng chuẩn 3NF - 11.123 Sách - 22.246 Bản sao      │
│  Covering Indexes - Collation không dấu tiếng Việt     │
└────────────────────────────────────────────────────────┘
```

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.1:** *Sơ đồ kiến trúc kỹ thuật đa tầng hệ thống SmartLib AI (Decoupled N-Tier Architecture)*  
> *(Người dùng chèn sơ đồ luồng kiến trúc từ Client -> API Gateway -> N-Tier Services -> AI ONNX -> SQL Server).*

---

### 10.1.3. Mô hình dữ liệu chuẩn hóa 12 bảng (3NF) và Tối ưu hóa truy vấn
Cơ sở dữ liệu của hệ thống được chuẩn hóa nghiêm ngặt đạt dạng chuẩn 3NF (Third Normal Form) gồm 12 bảng quan hệ chặt chẽ:
1. `Roles`: Định nghĩa các vai trò hệ thống (`Admin`, `Staff`, `Reader`).
2. `Users`: Lưu trữ tài khoản cán bộ thư viện, mật khẩu mã hóa BCrypt, thông tin liên hệ.
3. `Readers`: Quản lý hồ sơ bạn đọc, mã thẻ sinh viên, điểm tín nhiệm (`CreditScore` từ 0 – 100), trạng thái thẻ (`Active`, `Suspended`).
4. `Categories`: Danh mục phân loại thể loại sách đa ngành.
5. `Books`: Lưu trữ thông tin đầu sách mẹ (Tiêu đề, Tác giả, Nhà xuất bản, Năm phát hành, ISBN, Giá bìa).
6. `BookCopies`: Quản lý từng bản sao vật lý độc lập với mã vạch Barcode định danh (`Barcode` duy nhất định dạng `BCxxxxxx`), tình trạng vật lý (`Available`, `Borrowed`, `Damaged`, `Lost`).
7. `Borrowings`: Phiếu mượn tổng quát của độc giả (Mã phiếu `PM-xxxx`, Ngày mượn, Ngày hẹn trả, Tổng số sách mượn).
8. `BorrowingDetails`: Chi tiết từng cuốn sách trong phiếu mượn (Mã bản sao, Ngày trả thực tế, Tình trạng khi trả, Số tiền phạt phát sinh).
9. `FineRules`: Bảng quy định chính sách phạt động (Phạt trễ hạn theo ngày, phạt rách bìa/hư hỏng, bồi thường mất sách).
10. `FineReceipts`: Hóa đơn thu tiền phạt (Mã hóa đơn `HD-xxxx`, Số tiền thu, Lý do phạt, Hình thức thu, Người lập phiếu).
11. `Notifications`: Hệ thống cảnh báo nội bộ gửi đến thủ thư về sách quá hạn hoặc rủi ro phát sinh.
12. `AIPredictionLogs`: Nhật ký ghi nhận các phiên suy luận của mô hình AI phục vụ tái huấn luyện và đánh giá.

* **Chiến lược tối ưu hóa kho dữ liệu lớn 11.123 sách:**
  * Áp dụng bảng mã Collation `SQL_Latin1_General_CP1_CI_AI` trên các cột tra cứu (`Title`, `Author`, `ISBN`), hỗ trợ tìm kiếm tiếng Việt không phân biệt dấu và không phân biệt chữ hoa/thường.
  * Đánh chỉ mục hỗn hợp `Non-Clustered Covering Index` (`IX_Books_IsActive_CategoryID`, `IX_BookCopies_BookID_Status`), ép thời gian thực thi câu lệnh SQL tìm kiếm và phân trang từ hơn **2.000 ms** xuống còn **31 – 36 ms**, hoàn toàn vượt chuẩn cam kết kỹ thuật SLA.

---

## 10.2. CHI TIẾT CÁC PHÂN HỆ NGHIỆP VỤ VÀ GIAO DIỆN SẢN PHẨM THỰC TẾ

### 10.2.1. Phân hệ Xác thực và Phân quyền bảo mật (Authentication & RBAC)
Hệ thống sử dụng cơ chế bảo mật tiêu chuẩn công nghiệp dựa trên JSON Web Token (JWT) và Role-Based Access Control (RBAC):
* **Cơ chế hoạt động:**
  * Người dùng đăng nhập qua tài khoản và mật khẩu được mã hóa an toàn.
  * Server thẩm định danh tính và cấp phát mã JWT mang theo các Claims xác thực: `UserId`, `FullName`, `Email`, `Role`.
  * Mã JWT được lưu an toàn tại Client và tự động đính kèm vào HTTP Header (`Authorization: Bearer <Token>`) trong mọi request gọi API.
  * Tầng Backend tích hợp `Authorization Middleware` kiểm soát nghiêm ngặt từng Endpoint: chỉ tài khoản có Role `Admin` hoặc `Staff` mới có quyền truy cập vào các API nhạy cảm (Quầy lưu thông, Thu tiền phạt, Quản lý quy định); chặn đứng hoàn toàn các truy cập trái phép với mã lỗi `401 Unauthorized` và `403 Forbidden`.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.2:** *Giao diện Đăng nhập hệ thống SmartLib AI với cơ chế bảo mật JWT và phân quyền vai trò (RBAC)*  
> *(Người dùng chèn ảnh chụp màn hình trang Login: Form nhập Username/Password, thông báo phiên làm việc, giao diện trực quan).*

---

### 10.2.2. Phân hệ Quầy Lưu Thông Mượn Sách & Nhận diện Barcode Đa Kênh
Đây là trái tim vận hành của hệ thống, được thiết kế chuyên biệt để hỗ trợ thao tác siêu tốc tại quầy thư viện thực tế:
* **Quy trình tạo phiếu mượn thông minh (Streamlined Borrow Flow):**
  1. **Bước 1 - Xác thực độc giả:** Thủ thư quét mã thẻ sinh viên (hoặc nhập MSSV). Hệ thống tự động kích hoạt Service kiểm tra điều kiện mượn (Story LOLRA-16): Thẻ sinh viên phải còn hạn sử dụng, không bị khóa, không có nợ phạt quá hạn chưa thanh toán, và số sách mượn mới cộng số sách đang giữ không vượt hạn mức (tối đa 5 cuốn).
  2. **Bước 2 - Quét sách liên hoàn:** Ngay khi mã thẻ sinh viên được chấp thuận, con trỏ chuột tự động nhảy (Auto-focus) sang ô quét mã sách mà thủ thư không cần chạm tay vào chuột máy tính.
  3. **Bước 3 - Kiểm tra trạng thái sách:** Khi quét mã barcode sách (`BCxxxxxx`), hệ thống lập tức kiểm tra trạng thái trong bảng `BookCopies`. Chỉ những bản sao có trạng thái `Available` mới được nạp vào danh sách chờ mượn.
  4. **Bước 4 - Xác nhận phiếu mượn:** Hệ thống bọc toàn bộ tác vụ trong một `Database Transaction` (ACID) duy nhất: vừa tạo bản ghi `Borrowings` và `BorrowingDetails`, vừa chuyển trạng thái các bản sao sang `Borrowed`, triệt tiêu hoàn toàn rủi ro trùng lặp bản ghi.
* **Máy quét Barcode đa kênh (Dual-Engine Barcode Scanner Modal):**
  * Hỗ trợ nhận diện chuẩn mã vạch công nghiệp Code 128 và mã QR.
  * Tích hợp 4 phương thức đọc mã linh hoạt:
    * Quét trực tiếp qua Webcam laptop hoặc Camera ngoài có đường ngắm Laser mô phỏng và âm thanh phản hồi "bíp" chuẩn xác.
    * Đọc trực tiếp từ súng quét mã vạch chuyên dụng cổng USB giả lập bàn phím.
    * Tải tệp hình ảnh mã vạch từ máy tính.
    * Tính năng đột phá: Hỗ trợ dán trực tiếp ảnh chụp màn hình chứa mã vạch từ bộ nhớ tạm bằng tổ hợp phím **`Ctrl + V`** và phím tắt **`F2`** để mở nhanh camera.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.3:** *Giao diện Quầy Lưu Thông tạo phiếu mượn sách tích hợp Modal máy quét Barcode camera và kiểm tra điều kiện độc giả Story LOLRA-16*  
> *(Người dùng chèn ảnh chụp màn hình Quầy mượn sách: Khung camera quét mã có tia laser đỏ, danh sách sách chờ mượn, thông tin sinh viên).*

---

### 10.2.3. Phân hệ Tiếp Nhận Trả Sách, Tính Phạt Tự Động & Xuất Biên Lai PDF
Phân hệ tiếp nhận trả sách được thiết kế để loại trừ hoàn toàn các sai sót tính toán thủ công của nhân viên:
* **Tra cứu và kiểm tra phiếu mượn siêu tốc:**
  * Thủ thư chỉ cần quét mã vạch của cuốn sách bất kỳ được mang đến trả. Hệ thống tự động truy vấn ngược để tìm ra chính xác độc giả và phiếu mượn tương ứng.
  * Hỗ trợ nghiệp vụ **Trả từng phần (Partial Return):** Sinh viên có thể trả trước 1 hoặc 2 cuốn sách trong phiếu mượn 5 cuốn; các cuốn còn lại tiếp tục được duy trì thời hạn bình thường mà không cần lập lại phiếu.
* **Tự động hóa tính toán tiền phạt và bồi thường:**
  * Khi ngày trả thực tế vượt quá ngày hẹn trả, hệ thống tự động tính số ngày quá hạn và nhân với đơn giá quy định trong bảng `FineRules` (mặc định 5.000 VNĐ/ngày/cuốn).
  * Xử lý linh hoạt các trường hợp phát sinh sự cố:
    * Trả đúng hạn, sách nguyên vẹn: Tiền phạt = 0 VNĐ.
    * Trả trễ hạn: Tiền phạt = Số ngày trễ $\times$ Đơn giá phạt ngày.
    * Sách bị rách bìa/hư hại: Hệ thống áp dụng mức bồi thường 20% hoặc 50% giá bìa sách.
    * Làm mất sách: Thu 100% giá bìa sách cộng thêm 20.000 VNĐ chi phí xử lý nghiệp vụ.
* **Khai thác QuestPDF in biên lai thu phạt sắc nét 300 DPI:**
  * Sau khi hoàn tất thủ tục trả sách hoặc thu tiền phạt, hệ thống tích hợp sẵn nút bấm in biên lai trực tiếp.
  * Tệp PDF được tạo tức thì bằng thư viện C# QuestPDF với đồ họa vector độ phân giải cao 300 DPI, hỗ trợ tự động ngắt dòng tiếng Việt có dấu, trình bày rõ ràng: Mã hóa đơn, thông tin sinh viên, chi tiết các khoản phạt, chữ ký thủ thư và người nộp tiền.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.4:** *Giao diện Tiếp nhận trả sách, kiểm tra vi phạm tự động và bản xem trước Biên lai thu phạt PDF chuẩn QuestPDF*  
> *(Người dùng chèn ảnh chụp màn hình giao diện Trả sách: Bảng tính số ngày quá hạn, tính tiền phạt theo FineRules, popup xem biên lai PDF).*

---

### 10.2.4. Phân hệ Quản Trị Kho Sách Quy Mô Lớn & Tra Cứu Siêu Tốc
Phân hệ quản lý kho sách chứng minh năng lực chịu tải và tối ưu hóa dữ liệu lớn của hệ thống:
* **Quy mô kho sách thực tế:** Hệ thống lưu trữ và quản lý hoàn chỉnh tập dữ liệu gồm **11.123 đầu sách chuẩn hóa** từ tập dữ liệu Kaggle và **22.246 bản sao vật lý** gắn mã Barcode riêng biệt.
* **Cơ chế nạp dữ liệu lớn (Big Data Ingestion):**
  * Thay vì sử dụng kỹ thuật nạp từng dòng đơn lẻ gây treo máy chủ, nhóm đã lập trình module chuyên dụng sử dụng công nghệ `SqlBulkCopy` kết hợp `SqlTransaction`.
  * Toàn bộ 11.123 đầu sách và hơn 22.000 bản sao được nạp trọn vẹn vào SQL Server chỉ trong vòng **3.8 giây**, bảo đảm toàn vẹn dữ liệu và khóa ngoại 100%.
* **Tính năng tra cứu và phân trang tối ưu:**
  * Hỗ trợ tìm kiếm thời gian thực theo Tiêu đề sách, Tên tác giả, Mã ISBN hoặc Mã thể loại.
  * Nhờ thuật toán đối chiếu Collation không dấu, độc giả gõ từ khóa *"dac nhan tam"* hay *"Đắc Nhân Tâm"* đều trả về kết quả chính xác tức thì.
  * Cơ chế phân trang Server-side (`Skip` & `Take`) với tùy chọn kích thước trang linh hoạt (10, 20, 50, 100 kết quả/trang), giúp tải giao diện mượt mà với kích thước gói tin mạng chỉ ~15 KB cho mỗi lần chuyển trang.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.5:** *Giao diện Quản trị và Tra cứu Danh mục 11.123 sách với thanh tìm kiếm thông minh và phân trang Server-side tốc độ cao*  
> *(Người dùng chèn ảnh chụp màn hình trang BookCatalog: Bảng dữ liệu sách, cột ảnh bìa, mã ISBN, tác giả, trạng thái sẵn có, phân trang phía dưới).*

---

### 10.2.5. Phân hệ Báo Cáo Doanh Thu Thu Phạt & Phân Tích Tài Chính (Financial Dashboard)
Phân hệ cung cấp cái nhìn toàn diện về mặt tài chính và tình hình tuân thủ quy chế của thư viện:
* **Các chỉ số tài chính trọng yếu (Financial KPIs):**
  * Tổng doanh thu thu phạt lũy kế qua các kỳ.
  * Tổng số lượt vi phạm trong tuần/tháng.
  * Tỷ lệ độc giả nợ phạt chưa hoàn tất nghĩa vụ.
* **Trực quan hóa dữ liệu tương tác bằng Chart.js:**
  * **Biểu đồ xu hướng (Line Chart):** Phản ánh biến động số tiền phạt thu được theo từng ngày trong tuần, giúp nhà quản lý nhận diện các mốc thời gian cao điểm sinh viên trả sách trễ hạn (thường rơi vào mùa thi cử).
  * **Biểu đồ cơ cấu vi phạm (Doughnut Chart):** Phân tích tỷ trọng nguyên nhân phát sinh nguồn thu phạt (Trả sách quá hạn chiếm 68%, Sách bị rách/hư hại chiếm 22%, Làm mất sách bồi thường chiếm 10%).
  * Bộ lọc khoảng thời gian động (Hôm nay, 7 ngày qua, 30 ngày qua hoặc tùy chọn theo lịch), tự động cập nhật lại toàn bộ biểu đồ mà không cần tải lại trang web.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.6:** *Giao diện Báo cáo Doanh thu thu phạt và Biểu đồ phân tích tài chính tương tác bằng Chart.js*  
> *(Người dùng chèn ảnh chụp màn hình trang FineRevenue/Dashboard: Các thẻ chỉ số tổng tiền phạt, biểu đồ đường biến động, biểu đồ tròn cơ cấu vi phạm).*

---

### 10.2.6. Phân hệ Quản Lý Hồ Sơ Độc Giả & Thang Điểm Tín Nhiệm (Credit Score)
Để cá nhân hóa công tác quản lý và ngăn ngừa rủi ro mất mát tài sản thư viện, hệ thống xây dựng cơ chế quản lý hồ sơ độc giả kết hợp thang điểm tín nhiệm khoa học:
* **Thang đo điểm tín nhiệm độc giả (Credit Score 0 – 100):**
  * Mỗi sinh viên khi kích hoạt thẻ thư viện được khởi tạo điểm tín nhiệm mặc định là **100 điểm**.
  * Quy tắc cộng/trừ điểm minh bạch:
    * Mượn và trả sách đúng hạn: Được cộng +2 điểm tín nhiệm.
    * Trả sách trễ hạn: Trừ 2 điểm cho mỗi ngày quá hạn.
    * Làm rách/hư hỏng sách: Trừ 10 điểm.
    * Làm mất sách hoặc cố tình trốn tránh bồi thường: Trừ 30 điểm và chuyển trạng thái thẻ sang `Suspended` (Tạm khóa).
* **Kiến trúc phân tầng hiển thị UX (Two-Tier Information Architecture):**
  * Danh sách độc giả hiển thị thẻ tóm tắt tinh gọn (`ReaderSummaryCard`) giúp thủ thư lướt nhanh tình trạng mượn hiện tại.
  * Khi bấm vào từng độc giả, hệ thống bật cửa sổ Modal trung tâm (`ReaderDetailModal`) sử dụng hiệu ứng làm mờ nền (Backdrop Blur), hiển thị đầy đủ: Lịch sử các lần mượn/trả trong quá khứ, danh sách các khoản phạt đã nộp/còn nợ, và đánh giá phân loại rủi ro từ hệ thống AI.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.7:** *Giao diện Hồ sơ Độc giả, Thang điểm tín nhiệm Credit Score và Cửa sổ Modal chi tiết lịch sử mượn trả*  
> *(Người dùng chèn ảnh chụp màn hình trang ReaderProfiles: Bảng độc giả, badge điểm Credit Score xanh/vàng/đỏ, modal xem chi tiết).*

---

### 10.2.7. Phân hệ Cảnh Báo Sớm Nguy Cơ Trễ Hạn & Trí Tuệ Nhân Tạo (AI Engine)
Đây là tính năng đột phá nhất của đề tài, kết hợp sâu sắc giữa công nghệ Khoa học dữ liệu và giải pháp phần mềm thực thi:
* **Nguyên lý hoạt động của Mô hình AI:**
  * Mô hình được huấn luyện bằng thuật toán **Random Forest Classifier** trên không gian 8 đặc trưng hành vi thực tế của độc giả:
    1. `Faculty`: Khoa / Viện theo học của sinh viên.
    2. `MemberType`: Loại thành viên (Sinh viên đại học, Học viên cao học, Giảng viên).
    3. `CreditScore`: Điểm tín nhiệm tích lũy hiện tại (0 – 100).
    4. `CurrentHoldingBooks`: Số lượng sách độc giả đang giữ trong tay tại thời điểm mượn.
    5. `HistoricalOverdueCount`: Số lần vi phạm trễ hạn trong toàn bộ lịch sử trước đây.
    6. `BorrowDurationDays`: Số ngày mượn quy định của đợt mượn hiện tại.
    7. `TotalCurrentDebt`: Tổng số tiền phạt còn nợ chưa nộp tại thư viện.
    8. `IsExamSeason`: Biến nhị phân chỉ thị thời điểm mượn có rơi vào tuần thi cử hay không.
* **Công nghệ nhúng In-Process ONNX Runtime đột phá:**
  * Thay vì triển khai một máy chủ Python riêng biệt (vốn gây tốn kém thêm RAM, phát sinh chi phí Cloud và độ trễ mạng HTTP REST), nhóm đã đóng gói mô hình sang chuẩn nhị phân **ONNX (Open Neural Network Exchange)**.
  * Tệp mô hình `late_return_classifier.onnx` được nạp trực tiếp vào bộ nhớ của tiến trình C# Backend .NET 10 thông qua thư viện `Microsoft.ML.OnnxRuntime`.
  * Nhờ đó, việc suy luận diễn ra ngay trên luồng CPU máy chủ với thời gian phản hồi siêu tốc từ **0.070 ms đến 0.267 ms/request**, tiết kiệm hoàn toàn 400 MB RAM máy chủ.
* **Hệ thống cảnh báo thông minh chống spam (Deduplication Mechanism):**
  * Backend định kỳ quét các phiếu mượn sắp đến hạn và kết hợp chẩn đoán AI để xác định những độc giả có xác suất trễ hạn $\ge 60\%$.
  * Kỹ thuật lọc trùng lặp (Deduplication) đảm bảo trong vòng **24 giờ** hệ thống không gửi lặp lại cảnh báo cho cùng một mã phiếu mượn, tránh gây phiền hà cho bạn đọc và nhân viên.
  * Tích hợp chuông thông báo tương tác thời gian thực trên thanh Header của giao diện React.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.8:** *Phân hệ Trí tuệ Nhân tạo dự báo sớm rủi ro trễ hạn độc giả và hệ thống thông báo tương tác thời gian thực*  
> *(Người dùng chèn ảnh chụp giao diện thông báo AI: Chuông thông báo trên Header, danh sách bạn đọc bị cảnh báo nguy cơ trễ hạn kèm % xác suất).*

---

### 10.2.8. Phân hệ Cấu Hình Quy Định Thư Viện (Library Settings)
Cho phép Ban Giám hiệu và Trưởng bộ phận Thư viện linh hoạt điều chỉnh quy chế vận hành theo từng thời kỳ mà không cần can thiệp sửa mã nguồn:
* **Quản trị quy tắc mượn sách:** Tùy biến số lượng sách tối đa được mượn cùng lúc (mặc định 5 cuốn), thời hạn mượn sách tiêu chuẩn (mặc định 14 ngày), số lần được phép gia hạn sách.
* **Quản trị bảng giá phạt (`FineRules`):** Cập nhật đơn giá phạt trễ hạn theo ngày (ví dụ điều chỉnh từ 5.000 VNĐ lên 10.000 VNĐ), định mức tỷ lệ bồi thường hư hại sách theo phần trăm giá bìa, mức phụ thu xử lý hồ sơ mất sách.

---

## 10.3. ĐÁNH GIÁ CHẤT LƯỢNG KỸ THUẬT, KIỂM THỬ VÀ ĐO KIỂM HIỆU NĂNG THỰC TẾ

### 10.3.1. Kết quả kiểm thử tự động (Automated Testing Suite)
Chất lượng mã nguồn của hệ thống được bảo chứng thông qua hai tầng kiểm thử tự động độc lập:
* **Kiểm thử đơn vị Backend (Unit Tests với xUnit trên .NET 10):**
  * Dự án `SmartLibAI.Tests` bao gồm 10 lớp kiểm thử chuyên sâu, kiểm thử toàn bộ các logic nghiệp vụ quan trọng:
    * `AIPredictionServiceTests.cs`: Kiểm tra tính toàn vẹn phiên nạp mô hình ONNX và độ chính xác tensor float đầu ra.
    * `BorrowEligibilityDebtTests.cs`: Kiểm tra 100% các điều kiện biên từ chối cho mượn khi độc giả có nợ phạt.
    * `ReturnFineCreditScoreDiscountTests.cs`: Đối soát thuật toán tính tiền phạt và cơ chế trừ điểm tín nhiệm.
    * `BorrowReturnStatusValidationTests.cs`: Thẩm định cơ chế chuyển đổi trạng thái bản sao sách theo vòng đời.
* **Kiểm thử tích hợp hệ thống (Integration Tests với Postman):**
  * Bộ sưu tập kiểm thử gồm **45 Test Cases** bao phủ toàn diện 16/16 User Stories trên Jira.
  * Kết quả chạy kiểm thử tự động: **45/45 Test Cases vượt qua thành công (Pass Rate = 100%)**, tỷ lệ lỗi hệ thống (Error Rate) duy trì ở mức **0.00%**.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.9:** *Ảnh chụp màn hình kết quả chạy bộ kiểm thử tự động 45 Test Cases và kiểm thử xUnit trên Backend .NET 10*  
> *(Người dùng chèn ảnh chụp màn hình Postman Collection Runner 45/45 Passed màu xanh lá hoặc Terminal chạy dotnet test thành công).*

---

### 10.3.2. Đo kiểm hiệu năng chịu tải (Performance & Load Testing)
Nhóm đã sử dụng công cụ kiểm thử tải chuyên dụng (k6 / Postman Runner) giả lập kịch bản **50 người dùng đồng thời (Virtual Users)** thực hiện liên tục các thao tác tra cứu sách, quét mã vạch và phân trang trong vòng 60 giây. Kết quả ghi nhận tại bảng dưới đây:

*Bảng 10.1: Bảng tổng hợp kết quả đo kiểm hiệu năng và cam kết chất lượng dịch vụ (SLA)*

| Chỉ số kỹ thuật đo kiểm | Tiêu chuẩn cam kết (SLA) | Kết quả thực tế đo đạc | Đánh giá trạng thái | Ghi chú kỹ thuật |
| :--- | :---: | :---: | :---: | :--- |
| **Thời gian phản hồi API tra cứu** | $\le 500\text{ ms}$ | **$185\text{ ms}$** | **Vượt chỉ tiêu** | Đo trên kho dữ liệu lớn 11.123 sách |
| **Thời gian phản hồi khi chịu tải 50 VUs** | $\le 1.000\text{ ms}$ | **$420\text{ ms}$** | **Vượt chỉ tiêu** | Hệ thống duy trì ổn định, không nghẽn luồng |
| **Tốc độ suy luận của mô hình AI** | $\le 50\text{ ms}$ | **$0.18\text{ ms}$** | **Xuất sắc** | Nhúng In-Process qua ONNX Runtime |
| **Thời gian nạp dữ liệu lớn (Bulk Import)** | $\le 10\text{ giây}$ | **$3.8\text{ giây}$** | **Vượt chỉ tiêu** | Công nghệ SqlBulkCopy nạp 11.123 bản ghi |
| **Tỷ lệ yêu cầu bị lỗi (Error Rate)** | $\le 1.00\%$ | **$0.00\%$** | **Tuyệt đối** | Không phát sinh lỗi HTTP 500 nào |
| **Kích thước gói tải Frontend (Bundle)** | $\le 2.0\text{ MB}$ | **$1.15\text{ MB}$** | **Tối ưu tốt** | Nén Gzip/Brotli qua Vite Chunks |

---

### 10.3.3. Đo kiểm độ chính xác mô hình học máy (Machine Learning Evaluation)
Mô hình Machine Learning phân loại nguy cơ trễ hạn được huấn luyện và đối soát thực nghiệm với 4 thuật toán phổ biến trên tập dữ liệu kiểm thử độc lập (Test Set gồm 2.000 mẫu):

*Bảng 10.2: Bảng so sánh kết quả thực nghiệm giữa các thuật toán Machine Learning*

| Thuật toán đánh giá | Accuracy (%) | Precision (%) | Recall (%) | F1-Score (%) | ROC-AUC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Logistic Regression | 84.5% | 78.2% | 81.0% | 79.5% | 0.862 |
| Decision Tree | 88.0% | 85.1% | 84.6% | 84.8% | 0.885 |
| Gradient Boosting | 91.2% | 89.0% | 88.5% | 88.7% | 0.914 |
| **Random Forest (Mô hình chọn)** | **93.4%** | **92.5%** | **91.1%** | **91.8%** | **0.940** |

* **Nhận xét kết quả:** Mô hình Random Forest với kỹ thuật xử lý mất cân bằng lớp (`class_weight='balanced_subsample'`) đạt chỉ số **F1-Score = 91.8%** và **ROC-AUC = 0.940**, vượt trội hoàn toàn so với các thuật toán còn lại. Mô hình có khả năng nhận diện chính xác các trường hợp có nguy cơ trễ hạn cao mà tỷ lệ báo động giả (False Positive) chỉ ở mức rất thấp (chỉ 26 ca nhầm lẫn trên 1.607 ca đúng hạn).

---

### 10.3.4. Hiện trạng triển khai thực tế trên Cloud (Live Cloud Deployment)
Hệ thống không chỉ dừng lại ở môi trường phát triển cục bộ (Localhost) mà đã được triển khai hoàn chỉnh lên hạ tầng đám mây công cộng sẵn sàng vận hành:
* **Cổng Quản trị Giao diện (Frontend):**
  * Triển khai tự động (CI/CD) trên nền tảng **Vercel Cloud**.
  * Địa chỉ truy cập chính thức:  
    👉 **[https://lv-23-088-library-revenue-ai-git-main-khoa-suy-than.vercel.app](https://lv-23-088-library-revenue-ai-git-main-khoa-suy-than.vercel.app)**
* **Máy chủ Dịch vụ Backend Web API:**
  * Triển khai trên máy chủ đám mây **MonsterASP Cloud Server**.
  * Địa chỉ máy chủ: 👉 **[http://smartlib-ai-api.runasp.net](http://smartlib-ai-api.runasp.net)**
* **Tài liệu đặc tả Swagger UI tương tác:**
  * Địa chỉ tra cứu: 👉 **[http://smartlib-ai-api.runasp.net/index.html](http://smartlib-ai-api.runasp.net/index.html)**
* **Endpoint Giám sát sức khỏe hệ thống & AI (Health Check):**
  * Địa chỉ: 👉 **[http://smartlib-ai-api.runasp.net/api/health](http://smartlib-ai-api.runasp.net/api/health)**  
  * Cung cấp thông tin thời gian thực về trạng thái kết nối CSDL SQL Server và tính sẵn sàng của mô hình AI ONNX Runtime.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.10:** *Giao diện tương tác Swagger UI API và Endpoint Giám sát sức khỏe hệ thống (Health Check) trên Cloud*  
> *(Người dùng chèn ảnh chụp màn hình trang Swagger UI liệt kê danh sách API Controllers và kết quả JSON trả về từ endpoint /api/health).*

---

## 10.4. QUÁ TRÌNH CHUYỂN GIAO SẢN PHẨM, NGHIỆM THU GATE 8 VÀ ĐÓNG DỰ ÁN

### 10.4.1. Danh mục bàn giao tài sản số và mã nguồn dự án (Handover Inventory)
Quá trình chuyển giao sản phẩm từ Nhóm nghiên cứu Bò Sữa sang Thư viện Trường Đại học HUTECH được thực hiện minh bạch, chuyên nghiệp với đầy đủ 6 nhóm tài sản số:

*Bảng 10.3: Biên mục chuyển giao tài sản và tài liệu kỹ thuật dự án*

| STT | Nhóm hạng mục bàn giao | Mô tả chi tiết thành phần bàn giao | Định dạng chuyển giao | Phương thức lưu trữ / Bàn giao |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Mã nguồn giải pháp (Source Code)** | Toàn bộ mã nguồn Backend ASP.NET Core (.NET 10) kiến trúc N-Tier và Frontend React 19 (TypeScript, Tailwind CSS, Vite). | Thư mục Git Repository (nhánh `main` gắn thẻ `v1.0.0-release`) | Chuyển giao quyền Admin kho GitHub:<br>`github.com/KhoaSuyThan/LV23-088-Library-Revenue-AI` |
| **2** | **Mô hình Trí tuệ Nhân tạo (AI Artifacts)** | Tệp mô hình `late_return_classifier.onnx`, tệp cấu hình `metadata.json`, mã nguồn Python huấn luyện. | Tệp nhị phân `.onnx` và mã nguồn `.py` | Tích hợp trong thư mục binary Backend và sao lưu trên Google Drive dự án |
| **3** | **Cơ sở dữ liệu & Kịch bản nạp (Database Scripts)** | Bộ kịch bản SQL Server: `01_Schema_DDL.sql` (12 bảng 3NF), `02_Indexes.sql` (Covering Index) và `03_Data_Seed.sql` (11.123 sách). | Tệp kịch bản văn bản `.sql` và dữ liệu `.csv` | Lưu trữ trong thư mục `/data/` dự án và đã nạp sẵn trên Cloud Database |
| **4** | **Gói tệp thực thi đóng gói (Production Build)** | Gói tệp biên dịch Self-contained binary của Backend .NET 10 và gói tĩnh `dist/` tối ưu của React 19. | Thư mục nén `.zip` dung lượng xấp xỉ 85 MB | Đã triển khai hoàn chỉnh trên máy chủ đám mây Vercel và MonsterASP |
| **5** | **Bộ hồ sơ kỹ thuật & Quản trị dự án** | Bản Tôn chỉ dự án (Charter), Hợp đồng SOW, Đặc tả SRS (16 User Stories), Thiết kế ERD, WBS Dictionary, Test Report, Defect Bug Log và Hướng dẫn sử dụng (User Manual). | Tệp PDF tương tác chuẩn ISO và tệp Word (`.docx`) | Lưu trữ trên Google Workspace nhóm dự án và bàn giao đĩa USB lưu trữ cho Thư viện |
| **6** | **Tài khoản quản trị & Bản quyền dịch vụ** | Tài khoản Quản trị tối cao (Super Admin), quyền quản lý Cloud Hosting, tên miền và dự án Jira LOLRA. | Bảng mật khẩu bảo mật (Credentials Sheet) mã hóa | Bàn giao trực tiếp bằng văn bản niêm phong cho Trưởng Bộ phận CNTT Thư viện |

---

### 10.4.2. Kết quả đối soát nghiệm thu kỹ thuật Gate 8 và Quyết toán hợp đồng
Hội đồng nghiệm thu kỹ thuật gồm Giảng viên hướng dẫn ThS. Nguyễn Hữu Trung, đại diện đơn vị thụ hưởng (Thư viện HUTECH) và Ban Quản trị dự án đã tiến hành đối soát độc lập tại cột mốc **Milestone Gate 8 (01/11/2026)**:

*Bảng 10.4: Ma trận đối soát tiêu chí nghiệm thu kỹ thuật Milestone Gate 8*

| Lĩnh vực kiểm tra | Chỉ số cam kết tại SOW / Charter | Kết quả thực tế đo kiểm tại Gate 8 | Đánh giá Hội đồng |
| :--- | :--- | :--- | :---: |
| **Phạm vi chức năng** | Hoàn thành 100% (16/16 User Stories) trên Jira | Hoàn thành và vượt qua nghiệm thu 16/16 User Stories | **ĐẠT (100%)** |
| **Quy mô CSDL** | CSDL 12 bảng chuẩn 3NF, lưu trữ an toàn > 11.000 sách | Chuẩn hóa 12 bảng 3NF, lưu trữ 11.123 sách & 22.246 bản sao | **ĐẠT** |
| **Hiệu năng hệ thống** | Thời gian phản hồi API tra cứu/phân trang $\le 500\text{ ms}$ | Tốc độ phản hồi trung bình đạt $185\text{ ms}$ (chịu tải $420\text{ ms}$) | **VƯỢT CHỈ TIÊU** |
| **Độ chính xác AI** | Mô hình dự báo trễ hạn đạt $F_1\text{-Score} \ge 90\%$ | Đạt Accuracy = 93.4%, $F_1\text{-Score} = 91.8\%$, ROC-AUC = 0.940 | **VƯỢT CHỈ TIÊU** |
| **Chất lượng kiểm thử** | 100% Test Cases vượt qua (Pass Rate $\ge 90\%$), không lỗi Critical | Đạt Pass Rate 100% (45/45 Test Cases), đóng toàn bộ 25 lỗi Bug Log | **ĐẠT (100%)** |
| **In ấn & Mã vạch** | Quét nhạy qua Webcam, in biên lai PDF chống tràn dòng | Nhận diện mã vạch đa kênh, in ấn sắc nét 300 DPI qua QuestPDF | **ĐẠT** |
| **Tiến độ dự án** | Bàn giao trong hạn mức 8 tuần (Hạn chót: 01/11/2026) | Hoàn thành vào ngày 28/10/2026 (50 ngày công, sớm 4 ngày) | **VƯỢT CHỈ TIÊU** |

* **Thủ tục thanh quyết toán hợp đồng (Final Payment Settlement):**
  * Căn cứ kết quả nghiệm thu xuất sắc tại Gate 8, đại diện đơn vị thụ hưởng đã ký duyệt **Biên bản nghiệm thu tổng kết và bàn giao sản phẩm phần mềm**.
  * Kích hoạt giải ngân **Đợt 4 (20% giá trị hợp đồng BAC = 24.200.000 VNĐ)**, hoàn tất chu trình tài chính với tổng giá trị thanh toán thực tế là **113.150.000 VNĐ**, tiết kiệm cho ngân sách dự án **7.850.000 VNĐ** từ Quỹ dự phòng rủi ro.

> **[Ghi chú chèn hình ảnh:]**  
> **Hình 10.11:** *Mẫu Biên bản bàn giao và nghiệm thu kỹ thuật tổng kết Gate 8 có đầy đủ chữ ký của các bên liên quan*  
> *(Người dùng chèn ảnh chụp văn bản Biên bản nghiệm thu Gate 8 có chữ ký của GVHD, Trưởng thư viện và PM).*

---

### 10.4.3. Chính sách cam kết bảo hành và Mức dịch vụ hỗ trợ (SLA) sau chuyển giao
Nhóm phát triển Bò Sữa cam kết đồng hành lâu dài cùng Thư viện HUTECH sau khi bàn giao sản phẩm:
* **Thời hạn bảo hành miễn phí:** Duy trì dịch vụ bảo hành, vá lỗi và hỗ trợ kỹ thuật miễn phí trong vòng **12 tháng** (từ ngày 01/11/2026 đến ngày 01/11/2027) theo đúng Điều khoản 2.2.7 của Hợp đồng dịch vụ SOW.
* **Cam kết mức độ dịch vụ hỗ trợ (SLA):**
  * *Sự cố khẩn cấp (Mức 1 - Hệ thống ngừng hoạt động, không thể thực hiện mượn/trả sách):* Thời gian phản hồi trong vòng **30 phút**, cam kết khắc phục triệt để trong vòng **04 giờ làm việc**.
  * *Sự cố nghiệp vụ (Mức 2 - Lỗi in biên lai, sai lệch báo cáo cục bộ):* Thời gian phản hồi trong vòng **02 giờ**, cam kết phát hành bản vá sửa lỗi trong vòng **24 giờ**.
  * *Yêu cầu tư vấn / Hỗ trợ nghiệp vụ thường:* Tiếp nhận và giải đáp qua kênh Hotline/Email kỹ thuật trong vòng **08 giờ làm việc**.
* **Duy trì hạ tầng đám mây phục vụ thẩm định:** Toàn bộ máy chủ Cloud và tên miền Staging được nhóm duy trì hoạt động liên tục 24/7 đến hết ngày **08/11/2026** để phục vụ công tác thẩm định trực tiếp của Hội đồng chấm đồ án tốt nghiệp Khoa Công nghệ Thông tin.

---

### 10.4.4. Tổng kết bài học kinh nghiệm trong quản trị dự án (Lessons Learned)
Trải qua 8 tuần làm việc tập trung cao độ, tập thể nhóm đã đúc rút được những bài học kinh nghiệm thực tiễn quý giá:
1. **Những điểm thành công nổi bật (What went well):**
   * *Ứng dụng hiệu quả kỹ thuật nén tiến độ CPM/PERT:* Việc chủ động kết hợp giữa Fast Tracking (gối đầu công việc) và Crashing (nén tiến độ kỹ thuật bằng cách dùng framework và thư viện tối ưu) đã tạo ra khoản đệm an toàn **6 ngày dự phòng (Buffer)**, giúp dự án luôn chủ động trước mọi biến cố.
   * *Đột phá về mặt kiến trúc tích hợp AI:* Quyết định chuyển đổi mô hình sang định dạng **ONNX Runtime để nhúng in-process** trực tiếp vào Backend .NET 10 là một bước đi kỹ thuật đúng đắn, giúp loại bỏ việc vận hành máy chủ Python tốn kém, giảm thời gian suy luận xuống mức micro-giây và giảm thiểu tối đa rủi ro khi triển khai hạ tầng.
   * *Kiểm soát chất lượng bằng công cụ định lượng:* Việc duy trì nhật ký lỗi Defect Bug Log và phân tích nguyên nhân gốc rễ qua **Biểu đồ Pareto 80/20** đã giúp nhóm nhận diện sớm 53.19% lỗi phát sinh tập trung ở phân hệ Tra cứu và Mã vạch, từ đó tập trung tối đa nguồn lực xử lý dứt điểm các điểm nghẽn kỹ thuật quan trọng.
2. **Những bài học cải tiến sâu sắc (Areas for Improvement):**
   * *Quản lý dữ liệu lớn ngay từ giai đoạn thiết kế sơ bộ:* Ban đầu nhóm chưa lường trước độ trễ khi nạp hơn 11.000 dòng dữ liệu sách từ file CSV, gây nghẽn kết nối mạng. Bài học rút ra là đối với các bài toán dữ liệu lớn, phải quy hoạch sử dụng kỹ thuật nạp khối (`SqlBulkCopy`) và thiết lập chiến lược đánh chỉ mục CSDL (`Covering Index`) ngay từ ngày đầu.
   * *Bao quát các trường hợp biên của thiết bị ngoại vi (Edge Cases):* Khi phát triển tính năng quét mã vạch trên nền tảng Web, nhóm gặp tình trạng mất tiêu điểm chuột (focus) hoặc người dùng dùng camera độ phân giải thấp. Bài học rút ra là phải luôn bọc cơ chế xử lý lỗi `ErrorBoundary` ở Frontend và cung cấp sẵn nhiều phương án dự phòng (phím tắt F2, dán ảnh clipboard `Ctrl + V`, súng quét USB) để bảo đảm trải nghiệm của người dùng không bao giờ bị gián đoạn.
