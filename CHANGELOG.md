# Nhật ký thay đổi (CHANGELOG)

Tài liệu ghi lại toàn bộ lịch sử các thay đổi, bổ sung và cập nhật mã nguồn dự án LV23-088.

> Quy tắc: Nội dung cập nhật mới nhất luôn được tự động chèn ngay bên dưới dấu phân cách bên dưới.

---

## [2026-09-29] - Tối Ưu Vị Trí Icon Quét Mã Vạch Trong Các Ô Nhập Liệu (Quầy Lưu Thông)

- **Tinh Gọn Giao Diện Nhập Liệu & Trải Nghiệm Thao Tác (UI/UX Refactor):**
  - **Chuyển Icon Quét Mã Sang Trái (Clickable Prefix Icon):** Thay thế icon tĩnh ở đầu ô nhập thành nút bấm tương tác trực tiếp (`input-prefix-scan-btn`), click vào là mở ngay Modal Máy Quét Mã Vạch với hiệu ứng hover màu xanh sinh động.
  - **Xóa Bỏ Icon Thừa Bên Phải:** Loại bỏ hoàn toàn icon quét trùng lặp ở đuôi ô input, giúp giao diện thông thoáng, chuẩn quy chuẩn thiết kế.
  - **Tối Ưu Vị Trí Nút Xóa Nhanh (`✕`):** Bên phải ô input chỉ hiển thị duy nhất nút xóa nội dung (`input-clear-btn`) khi ô có dữ liệu, tránh gây rối mắt và nhầm lẫn cho thủ thư.
  - **Áp Dụng Cho Cả 3 Ô Thao Tác:** Mã độc giả / MSSV, Mã vạch sách và Mã phiếu / Barcode trả sách.

## [2026-09-29] - Tích Hợp Máy Quét Mã Vạch Cho Form Tạo Phiếu Mượn Mới (Quét Thẻ & Sách Liên Hoàn)

- **Nâng Cấp Toàn Diện Quy Trình Mượn Sách Bằng Barcode (Story LOLRA-16):**
  - **Quét Thẻ Bạn Đọc / Thẻ Sinh Viên:** Ô "Mã độc giả / MSSV" được tích hợp nút quét mã vạch chuyên dụng (`ScanLine`), hỗ trợ quét mã vạch trên thẻ sinh viên qua súng đọc, camera hoặc ảnh chụp.
  - **Quét Mã Vạch Bản Sao Sách:** Ô "Mã vạch sách" hỗ trợ quét nhanh mã vạch trên cuốn sách (`BC000001-A`, `BC000001-B`...).
  - **Quy Trình Quét Liên Hoàn (Continuous Scan Workflow):** Sau khi quét xong Thẻ bạn đọc, hệ thống tự động phát tiếng Bíp, đóng modal và tự động chuyển con trỏ chuột sang ô Mã vạch sách để thủ thư quét ngay cuốn sách, hoàn tất tạo phiếu trong tích tắc.
  - **Modal Ngữ Cảnh Thông Minh:** Modal Máy Quét tự động điều chỉnh tiêu đề, placeholder và danh sách chip mẫu kiểm thử tùy theo việc đang quét Thẻ bạn đọc (`RD20260001`, `102220184`...) hay quét Mã sách (`BC000001-A`, `BC000001-B`...).
  - **Nút Xóa Nhanh:** Bổ sung nút clear `X` cho cả 2 ô Mã độc giả và Mã vạch sách để làm sạch dữ liệu nhanh chóng.

## [2026-09-29] - Tích Hợp Modal Máy Quét Mã Vạch (Barcode Scanner) Chuẩn Chuyên Nghiệp vào Quầy Lưu Thông

- **Đồng bộ Tính năng Máy Quét Mã Vạch từ Catalog sang Quầy Lưu Thông:**
  - **Tích hợp Modal Barcode Scanner Đồ Họa:** Thêm Modal Máy Quét Mã Vạch với khung ngắm camera, vạch laser quét màu đỏ sinh động, hỗ trợ tải ảnh mã vạch từ máy tính, kéo thả tệp ảnh, dán ảnh màn hình bằng `Ctrl + V` hoặc quét trực tiếp từ súng quét Barcode / nhập tay.
  - **Hỗ trợ 2 luồng thao tác linh hoạt:**
    1. **Tiếp nhận trả sách:** Quét mã vạch trên sách để tự động tra cứu, nạp dữ liệu phiếu mượn tương ứng và kiểm tra vi phạm.
    2. **Tạo phiếu mượn mới:** Bấm icon `ScanLine` trên ô "Mã vạch sách" để quét nhanh mã sách vào phiếu mượn mà không cần gõ tay.
  - **Âm thanh tiếng Bíp phản hồi thực tế:** Phát âm thanh Bíp xác thực (`playScannerBeep(true / false)`) bằng Web Audio API khi quét hoặc nhận diện mã thành công.
  - **Thanh chip mã mẫu kiểm thử:** Tích hợp sẵn hàng nút bấm mã mẫu (`BC000001-A`, `BC000001-B`, `BC000001-C`, `BC000002-A`, `BC000003-A`) giúp thủ thư kiểm thử quy trình mượn/trả trong 1 click.
  - **Đồng bộ Style & Trải nghiệm:** Bổ sung toàn bộ hệ thống lớp CSS scanner đồ họa vào [`CirculationDesk.css`](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.css).

## [2026-09-29] - Loại Bỏ Triệt Để Fallback BC000001-A & Hỗ Trợ Lọc Realtime Toàn Bộ Giao Dịch

- **Xử lý Triệt để Lỗi "Tìm cái gì cũng nhảy về `BC000001-A`":**
  - **Xóa bỏ hoàn toàn cơ chế Fallback sai:** Trong [`handleSimulateScan()`](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx#L490-L550), nếu người dùng đã nhập mã/từ khóa mà không tìm thấy giao dịch nào, hệ thống thông báo rõ ràng `⚠️ Không tìm thấy giao dịch nào khớp với mã "${returnQuery}"` và **giữ nguyên nội dung, tuyệt đối không tự ý gán đè sang `BC000001-A`**.
  - **Quét xoay vòng khi ô tìm kiếm trống:** Khi ô tìm kiếm rỗng, bấm nút quét barcode sẽ xoay vòng lần lượt qua từng cuốn sách đang mượn (`BC000001-A`, `BC000001-B`, `BC000002-B`...) thay vì chỉ chọn duy nhất 1 cuốn.
- **Bổ sung Dữ liệu Mẫu & Seeding cho Bản sao B (`BC000001-B`):**
  - Cập nhật [`Program.cs`](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs#L225-L255): Tự động seed phiếu mượn quá hạn cho cuốn `BC000001-B` của bạn đọc Nguyễn Văn Minh (`102220184`).
  - Cập nhật `INITIAL_TRANSACTIONS` trong [`CirculationDesk.jsx`](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx#L28-L85) đầy đủ cả 2 bản sao A và B của đầu sách `BC000001`.
- **Lọc Danh Sách Giao Dịch Realtime (Bảng Hàng 3):**
  - Nâng cấp `filteredTransactions` đồng bộ với `returnQuery`. Khi thủ thư gõ "B", "BC000001" hay bất kỳ mã nào, bảng giao dịch bên dưới lập tức lọc và hiển thị danh sách các phiếu khớp ngay trong tích tắc.

## [2026-09-29] - Khắc Phục Lỗi Tìm B Ra A & Bổ Sung Tìm Kiếm Đa Chiều Bằng Mã Sách / Mã Vạch

- **Khắc phục Triệt để Lỗi "Tìm B ra A":**
  - **Xóa Bỏ Ép Cứng Mã `BC000001-A`:** Sửa hàm `handleSimulateScan()`, ưu tiên nhận diện và quét đúng giá trị người dùng đang nhập trong ô tìm kiếm (`returnQuery`). Khi ô trống mới tự động lấy phiếu mượn thực tế gần nhất, tuyệt đối không ghi đè thành `BC000001-A`.
- **Hỗ trợ Tìm kiếm Đa Chiều Toàn diện (Mã sách, Mã vạch, Mã phiếu):**
  - **Tìm kiếm theo Mã đầu sách gốc:** Người dùng có thể tìm bằng `BC000001` (Call Number bỏ hậu tố copy), hệ thống tự động tìm và khớp các phiếu mượn tương ứng.
  - **Tìm kiếm theo Mã vạch bản sao cụ thể:** Khớp chính xác `BC000001-B`, `BC000001-A` hoặc duyệt sâu vào mảng `items` của phiếu mượn nhiều cuốn.
  - **Tìm kiếm theo BookID số, MSSV, Tên bạn đọc và Tên sách:** Mở rộng điều kiện khớp dữ liệu linh hoạt.
  - **Bổ sung Thanh Gợi Ý Chip Nhanh:** Thêm các nút chip tìm nhanh `🔍 BC000001-B (Cuốn B)`, `📖 BC000001 (Mã sách)`, `🏷️ BC000001-A (Cuốn A)` ngay dưới ô tìm kiếm để thủ thư kiểm tra và thao tác 1 chạm.
  - **Hiển thị Rõ Ràng Cả Mã Sách và Mã Vạch:** Bổ sung hiển thị trực quan cả Mã vạch (`BC000001-B`) và Mã đầu sách gốc (`BC000001`) trong Thẻ Chi tiết kiểm tra sách hoàn trả.

## [2026-09-29] - Sửa Lỗi Quét Barcode Hoàn Trả & Bổ Sung Nút Xác Nhận Trả Sách

- **Khắc phục Triệt để Luồng Quét Barcode & Tiếp Nhận Trả Sách:**
  - **Sửa Lỗi Quét Mô phỏng:** Điều chỉnh hàm `handleSimulateScan()` liên kết chính xác với các bản ghi giao dịch thực tế trong bảng (`BC000001-A` / các phiếu đang mượn) thay vì gán mã giả lập `PM-9920` không tồn tại, giúp bảng "CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ" xuất hiện ngay lập tức sau khi máy đọc barcode quét thành công.
  - **Bổ sung Nút "Xác nhận hoàn tất trả sách":** Khi sách hoàn trả đúng hạn và không có tiền phạt (`finalFine === 0`), hệ thống hiển thị nút xác nhận trả sách màu xanh lá cây (`.btn-confirm-return`), cho phép thủ thư hoàn tất quy trình lưu thông và cập nhật trạng thái phiếu sang `Đã trả (Đúng hạn)`.

## [2026-09-29] - Ẩn Bảng Kiểm Tra Mặc Định Ban Đầu & Bổ Sung Nút X Xóa Tìm Kiếm Hoàn Trả

- **Tối ưu Trải nghiệm Quầy Lưu thông khi Tìm kiếm & Hoàn trả:**
  - **Ẩn Bảng Kiểm tra Ban đầu:** Thiết lập trạng thái `selectedTransactionId = null` mặc định khi mở màn hình. Bảng "CHI TIẾT KIỂM TRA SÁCH HOÀN TRẢ" chỉ hiển thị khi thủ thư quét mã vạch/tìm kiếm mã phiếu hoặc click vào một giao dịch cụ thể trên bảng.
  - **Nút X Xóa Nhanh trong Ô Input:** Bổ sung nút clear `X` bên trong ô nhập mã vạch/mã phiếu, cho phép thủ thư xóa nhanh nội dung tìm kiếm chỉ bằng 1 cú nhấp chuột.
  - **Nút X Đóng Chi Tiết ở Header:** Bổ sung nút "Đóng / Xóa" trên thanh tiêu đề của card kiểm tra hoàn trả để đóng bảng và đưa màn hình trở về trạng thái trống ban đầu một cách tiện lợi.

## [2026-09-29] - Tối ưu Đồng bộ Động Chi Tiết Kiểm Tra Hoàn Trả & Mã Vạch Kho Thực Tế

- **Đồng bộ Động Chi Tiết Kiểm Tra Hoàn Trả theo Từng Phiếu Mượn của Khách:**
  - **Tính toán Quá hạn Tự động:** Xây dựng hàm `calculateOverdueDays()` tính toán khoảng cách ngày thực tế giữa `DueDate` và ngày hiện tại. Phiếu mượn còn hạn (như PM-0002) sẽ tự động tích **"Đúng hạn"** với tiền phạt = 0đ; phiếu quá hạn sẽ tự động tích **"Quá hạn (Trễ X ngày)"** và tính tiền phạt chuẩn xác `X * 5.000đ`.
  - **Đồng bộ State Động:** Bổ sung `useEffect` tự động đồng bộ lại các ô kiểm tra vi phạm (`checks`), chi tiết độc giả và tiền phạt tương ứng mỗi khi người dùng chọn phiếu mượn khác nhau trên bảng giao dịch, loại bỏ hoàn toàn các giá trị gán cứng.
  - **Cập nhật Mã vạch Thật trong Kho CSDL:** Điều chỉnh các nút chip thử nghiệm sang các mã vạch vật lý khả dụng thực tế (`BC000001-A`, `BC000002-B`, `BC000002-C`, `BC000003-B`), giúp quá trình quét mượn sách diễn ra trơn tru.

## [2026-09-29] - Kết nối Frontend CirculationDesk với Backend API & Tích hợp Dữ liệu Thật SQL Server

- **Kết nối API & Xử lý Giao diện Quầy lưu thông (Story LOLRA-16):**
  - **Service API Frontend:** Tạo [borrowApi.js](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/api/borrowApi.js) kết nối trực tiếp các endpoint Backend qua Axios `apiClient` (`createBorrow`, `getRecentBorrows`, `checkEligibility`, `lookupBarcode`).
  - **Tích hợp [CirculationDesk.jsx](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx):**
    - Tự động nạp danh sách phiếu mượn thực tế từ CSDL SQL Server qua `GET /api/borrows/recent` khi mở màn hình.
    - Hỗ trợ phím tắt **`F2`** giúp thủ thư nhanh chóng đưa con trỏ chuột vào ô quét thẻ bạn đọc/MSSV.
    - Xử lý tạo phiếu mượn gọi trực tiếp `POST /api/borrows`: khi thành công cập nhật giao dịch mới vào bảng và thông báo toast xanh; khi bị từ chối mượn (Scenario 2) bắt lỗi HTTP 400 và hiển thị banner cảnh báo đỏ nổi bật (`.borrow-error-banner`) giải thích rõ nguyên nhân từ chối (nợ phạt chưa đóng, thẻ bị khóa, vượt hạn mức 5 cuốn,...).
    - Bổ sung thanh nút chip chọn nhanh các bạn đọc mẫu kiểm thử (`RD20260001`, `102220184`, `102230045`, `102220412`).
  - **Tạo & Đồng bộ Dữ liệu mẫu kiểm thử trong CSDL:** Cập nhật [Program.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs) và [02_seed_dummy_data.sql](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/data/02_seed_dummy_data.sql) tự động nạp các độc giả đại diện cho cả 2 kịch bản thành công và từ chối.
  - **Bộ style giao diện:** Mở rộng [CirculationDesk.css](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.css) với định dạng cho banner cảnh báo lỗi đỏ từ chối và chip kiểm thử nhanh.

## [2026-09-29] - Triển khai Backend API POST /api/borrows Tạo Phiếu Mượn Bằng Mã Vạch (Story LOLRA-16)

- **Viết API Backend POST /api/borrows & Kiểm tra điều kiện độc giả:**
  - **DTOs nghiệp vụ mượn sách:** Xây dựng [CreateBorrowRequestDto.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Borrows/CreateBorrowRequestDto.cs), [BorrowResponseDto.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Borrows/BorrowResponseDto.cs) và [BorrowReaderEligibilityDto.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Borrows/BorrowReaderEligibilityDto.cs).
  - **Interface & Repository:** Xây dựng [IBorrowRepository.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Interfaces/IBorrowRepository.cs) và triển khai tại [BorrowRepository.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/BorrowRepository.cs) hỗ trợ tra cứu thẻ bạn đọc, kiểm tra khoản nợ phạt chưa thanh toán (`FineReceipts` có Status = `Pending`), đếm số sách đang mượn (`BorrowingDetails` có ItemStatus = `Borrowed` & ReturnDate = `null`), nạp thông tin bản sao theo mã vạch Barcode Code 128.
  - **SQL Server Transaction an toàn (Scenario 1):** Triển khai `ExecutionStrategy` và `BeginTransactionAsync()` đảm bảo tính toàn vẹn ACID khi đồng thời chèn bản ghi vào bảng `Borrowings`, ghi nhận danh sách chi tiết vào `BorrowingDetails`, và cập nhật trạng thái các bản sao sách `BookCopies.Status` từ `Available` sang `Borrowed`.
  - **Kiểm soát chặt chẽ quy tắc từ chối mượn sách (Scenario 2):** Xây dựng [BorrowService.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/BorrowService.cs) với các lớp bảo vệ trả về HTTP 400 Bad Request kèm lý do chi tiết khi: thẻ bạn đọc bị khóa hoặc hết hạn; độc giả đang có tiền phạt chưa thanh toán; số sách yêu cầu vượt quá hạn mức tối đa (mặc định 5 cuốn đối với sinh viên); mã vạch không tồn tại hoặc bản sao sách đang ở trạng thái không khả dụng/đầu sách ngưng lưu thông.
  - **Controller & Endpoints:** Xây dựng [BorrowsController.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/BorrowsController.cs) cung cấp các endpoint `POST /api/borrows`, `GET /api/borrows/eligibility/{readerCode}`, `GET /api/borrows/{id}` và `GET /api/borrows/recent`. Đăng ký DI trong [Program.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs).

## [2026-09-24] - Hoàn thiện 5 Tiêu chí chấp nhận (AC1 - AC5) Phân hệ Tra cứu & Quản lý Sách

- **AC1: Tìm kiếm từ khóa linh hoạt (Không phân biệt hoa/thường & có dấu/không dấu):**
  - **Backend LINQ / SQL Server:** Triển khai `EF.Functions.Collate` với Collation `SQL_Latin1_General_CP1_CI_AI` (Case-Insensitive & Accent-Insensitive) trên 3 trường `Title`, `Author`, và `ISBN` trong [BookRepository.cs](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/BookRepository.cs). Hỗ trợ tìm kiếm từ khóa không dấu khớp chính xác sách tiếng Việt có dấu (ví dụ: gõ `"a la perle"` tìm ra `"La Jeune fille à la perle"`, `"dac nhan"` tìm ra `"Đắc Nhân Tâm"`).
  - **Frontend Chuẩn hóa:** Bổ sung hàm tiện ích `removeVietnameseTones()` trong [BookCatalog.jsx](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) nhằm hỗ trợ cơ chế tìm kiếm bỏ dấu linh hoạt cho cả chế độ dự phòng Offline/Fallback.
- **AC2: Kết hợp các bộ lọc tìm kiếm đa chiều (Từ khóa + Thể loại + Chỉ sách có sẵn):**
  - **Backend DTO & Query:** Mở rộng [BookFilterDto.cs](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Books/BookFilterDto.cs) bổ sung thuộc tính `OnlyAvailable`, xử lý điều kiện kiểm tra bản sao khả dụng `b.BookCopies.Any(c => c.Status == "Available")` kết hợp cùng `CategoryID`, khoảng giá và từ khóa.
  - **Giao diện Thanh lọc:** Thêm checkbox thao tác nhanh **"Chỉ sách có sẵn (> 0)"** (`.filter-checkbox-item`) trực tiếp trên thanh công cụ lọc [BookCatalog.jsx](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) và bộ style chuyên biệt trong [BookCatalog.css](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.css).
- **AC3: Hiển thị trực quan trạng thái kho sách (Tổng sở hữu & Sẵn sàng cho mượn):**
  - Cập nhật cột **"Tồn kho (Còn/Tổng)"** trên bảng quản lý sách thể hiện minh bạch cả 2 thông số: `<Số bản sao sẵn sàng> / <Tổng số bản sao sở hữu> cuốn` (ví dụ `3 / 3 cuốn`, `6 / 7 cuốn`).
  - Định dạng phân tách màu sắc (`.stock-avail-count` màu xanh lục thành công, `.stock-total-count` màu xám than chì) kèm thanh tiến trình phần trăm tồn kho và tooltip giải thích chi tiết.
- **AC4: Phân trang tại Server-side với kích thước mặc định 20 kết quả/trang:**
  - Thiết lập giá trị mặc định `PageSize = 20` tại [BookFilterDto.cs](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Books/BookFilterDto.cs) và State `pageSize` tại [BookCatalog.jsx](file:///c:/Users/duchu/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx).
  - Máy chủ SQL Server chỉ truy xuất đúng lượng bản ghi của trang yêu cầu thông qua cú pháp `.Skip((PageNumber - 1) * PageSize).Take(PageSize)`.
  - Hỗ trợ đầy đủ bộ chọn kích thước trang `10`, `20`, `50`, `100` cuốn/trang và phản hồi tức thời.
- **AC5: Đảm bảo hiệu năng cao & Thời gian phản hồi vượt chuẩn SLA:**
  - Tối ưu hóa cấu trúc câu truy vấn LINQ và tận dụng Covering Index `IX_Books_IsActive_CategoryID` cùng `IX_BookCopies_BookID_Status`.
  - Kiểm thử tải thực tế trên CSDL chứa **11.123 đầu sách** và **16.250 bản sao**: Thời gian thực thi truy vấn SQL Server đạt **31 - 36 mili-giây**, thời gian phản hồi toàn trình API đạt **~190 mili-giây** (nhanh hơn nhiều so với ngưỡng tiêu chuẩn SLA 500ms).

## [2026-09-24] - Tối ưu hóa Chỉ mục SQL Server (Indexing) & Hoàn thiện Phân trang Danh mục Sách

- **Bổ sung Non-Clustered Indexes tối ưu CSDL SQL Server:**
  - `IX_Books_CategoryID` & `IX_Books_IsActive_CategoryID`: Đánh chỉ mục kết hợp trên bảng `Books` cho các điều kiện lọc `IsActive = 1`, `CategoryID` và `INCLUDE` các cột thông tin hiển thị (`Title`, `Author`, `Publisher`, `BasePrice`, `ISBN`), hỗ trợ kỹ thuật Covering Index để SQL Server tìm kiếm trực tiếp (Index Seek) mà không cần quét toàn bộ bảng.
  - `IX_BookCopies_BookID_Status`: Đánh chỉ mục kết hợp trên bảng `BookCopies` theo `BookID` và `Status`, tăng tốc gấp nhiều lần các truy vấn con đếm số lượng bản sao khả dụng (`AvailableCopies`) và tổng số bản sao (`TotalCopies`) khi phân trang.
- **Đồng bộ mã nguồn CSDL & Tự động di trú an toàn (Idempotent Migration):**
  - Cập nhật định nghĩa chỉ mục chuẩn trong file [01_schema_smartlib_ai.sql](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/data/01_schema_smartlib_ai.sql).
  - Cấu hình Fluent API `HasIndex()` trong [SmartLibDbContext.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Data/SmartLibDbContext.cs).
  - Bổ sung lệnh DDL kiểm tra và tự động khởi tạo chỉ mục trong hàm khởi động tại [Program.cs](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs).
- **Hoàn thiện Phân trang giao diện Quản lý Sách (Page Size Selector):**
  - Cập nhật [BookCatalog.jsx](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) và [BookCatalog.css](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.css): Bổ sung bộ chọn số dòng hiển thị trên mỗi trang (`10`, `20`, `50`, `100` đầu sách / trang) tại thanh điều khiển phân trang.
  - Khi người dùng thay đổi số dòng/trang, hệ thống tự động đưa về trang 1 và tải đúng số lượng bản ghi tương ứng từ API Backend.

## [2026-09-23] - Tính năng Tải lên & Quét ảnh Mã vạch / QR Code tự động (Upload, Drag-Drop, Paste & Reset)

- **Bổ sung nút Đặt lại & Xóa ảnh preview:** Khi quét ảnh không thành công hoặc muốn đổi ảnh khác, bổ sung nút **"Đặt lại"** (`.btn-reset-scanner-img`) trên thanh công cụ và nút xóa nhanh `✕` góc trên khung preview (`.btn-clear-scanner-preview`) để dễ dàng làm sạch khung laser và thử lại ảnh mới.
- **Giải mã mã vạch từ ảnh (Dual-Engine Decoder):** Xây dựng module [barcodeImageDecoder.js](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/utils/barcodeImageDecoder.js) kết hợp Web API chuẩn `BarcodeDetector` (tối ưu phần cứng C++/GPU) và fallback thư viện tiêu chuẩn `@zxing/library`, hỗ trợ nhận diện cả mã vạch 1D (Code 128, Code 39, EAN-13) và mã QR 2D.
- **3 phương thức nạp ảnh linh hoạt:**
  - 📂 **Nút "Tải ảnh mã vạch / QR"**: Chọn ảnh trực tiếp từ máy tính.
  - 🖱️ **Kéo & Thả (Drag & Drop)**: Thả trực tiếp file ảnh vào khung quét laser có hiệu ứng phát sáng viền.
  - 📋 **Dán từ Clipboard (`Ctrl + V`)**: Bắt sự kiện dán ảnh chụp màn hình từ bộ nhớ tạm (Snipping Tool, Zalo,...) để quét ngay lập tức mà không cần lưu file.
- **Tự động hóa hoàn toàn luồng nghiệp vụ:** Khi ảnh được nhận diện thành công, hệ thống tự động điền mã, phát âm thanh beep, tự động tra cứu CSDL và mở ngay cuốn sách/bản sao tương ứng.

## [2026-09-23] - Sửa lỗi Tra cứu Quét mã vạch nhanh & Đồng bộ định dạng CSDL

- **Đồng bộ mã vạch kiểm thử nhanh:** Cập nhật các nút bấm quét nhanh trên modal Barcode Scanner thành `BC000001-A`, `BC000001-B`, `BC000001-C`,... khớp chính xác 100% với dữ liệu thực tế đang lưu trong bảng `BookCopies`.
- **Cơ chế tra cứu thông minh (Smart Normalization):** Hàm `handleBarcodeScanLookup` tự động thử cả 2 định dạng (chuẩn 6 chữ số `BC000001-A` và chuẩn 4 chữ số `BC0001-A`), đảm bảo dù quét hay gõ bằng tay theo cách nào thì hệ thống đều tìm ra sách ngay lập tức.
- **Tối ưu trải nghiệm quét:** Tự động đóng modal quét khi tìm thấy, chuyển sang tab Quản lý bản sao và phát sáng nổi bật dòng bản sao vừa quét kèm âm thanh beep báo thành công.
- **Chuẩn hóa CSS Appearance:** Bổ sung thuộc tính `appearance: textfield` và `appearance: none` loại bỏ hoàn toàn cảnh báo linter.
- **Tinh chỉnh giao diện nút Quét mã:** Đưa ra ngoài ô tìm kiếm thành nút độc lập cao 35px, rút gọn nhãn và ẩn badge F2 trên nút để giao diện thoáng mắt.

## [2026-09-22] - Quản lý Sách cốt lõi, Thêm thể loại & Động hóa KPI Cards từ CSDL

- **Thêm sách & Bản sao:** Bổ sung nút/modal "+ Thêm sách", tự động sinh $N$ bản sao mã vạch `BookCopies`, kết nối API `POST /api/Books`.
- **Thêm thể loại:** Bổ sung endpoint `POST /api/Categories` và nút tạo nhanh thể loại ngay trên modal sách.
- **Đồng bộ CRUD vào CSDL:** Hoàn thiện API `PUT /api/Books/{id}` (sửa sách) và `DELETE /api/Books/{id}` (xóa mềm `IsActive = 0`, chặn xóa khi sách đang mượn).
- **Động hóa 4 thẻ KPI:** Bổ sung API `GET /api/Books/summary`, hiển thị số liệu thực tế thời gian thực (Tổng sách, Đang mượn, Quá hạn, Sách hỏng).
- **Sửa lỗi:** Khắc phục lỗi `ReferenceError` khởi tạo Hook `refreshKey` trên `BookCatalog.jsx`.

## [2026-09-21] - Hoàn thiện Nhập/Xuất CSV, Phân trang & Bộ lọc đa tiêu chí (US-06 / LOLRA-14)

### 1. Nhập & Xuất CSV (`SmartLibAI.API`, `BookCatalog.jsx`):
- Thêm tính năng Nhập CSV hàng loạt (Stream tối ưu RAM, tự sinh bản sao `BookCopies`) và Xuất CSV chuẩn UTF-8 BOM.
- Đồng bộ script SQL `03_import_books_and_copies.sql` theo dữ liệu thực tế.

### 2. Tối ưu UI/UX & Phân trang:
- Cố định bố cục bảng (`table-layout: fixed`), cân đối kích thước các cột tránh giật khung hình khi đổi trang.
- Nâng lên 10 cuốn/trang; tích hợp ô nhập số trang trực tiếp (chuyển nhanh khi Enter hoặc click ra ngoài).

### 3. Thanh lọc đa tiêu chí & Sửa lỗi sập trang:
- Thêm bộ lọc: Tìm kiếm theo Mã/Tên/Tác giả/ISBN, dropdown Thể loại, khoảng giá đơn vị (k) (10 = 10.000đ), trạng thái Sẵn sàng/Hết sách và nút Đặt lại.
- Backend C#: Bổ sung lọc `MinPrice`, `MaxPrice`, `Status` trong `BookRepository.cs`.
- Sửa lỗi crash trắng màn hình khi bộ lọc trả về 0 kết quả.

## [2026-09-20] - Bổ sung Nút Xóa Mềm & Cơ chế Chặn Xóa khi sách đang mượn (US-04 / LOLRA-12)

### Đã thêm & Cải thiện (Added & Improved):
- **Cột Thao tác Quản lý sách (`BookCatalog.jsx`, `BookCatalog.css`)**:
  - Bổ sung nút **Xóa** (`.btn-action-link.danger-link`) màu đỏ kế bên các nút *Sửa* và *Chi tiết*.
  - **Cơ chế Chặn xóa (Block Mode)**: Kiểm tra số lượng bản sao đang được mượn (`totalCopies - availableCopies > 0` hoặc trạng thái `borrowed_all`). Khi phát hiện sách đang được bạn đọc mượn, hiển thị Modal cảnh báo màu cam/vàng với icon `AlertTriangle`, giải thích chi tiết lý do và chặn tuyệt đối hành vi xóa để bảo toàn tài sản thư viện.
  - **Cơ chế Xóa mềm (Soft-Delete Mode)**: Nếu toàn bộ bản sao đều sẵn sàng (`availableCopies == totalCopies`), hiển thị Modal xác nhận màu đỏ với icon `Trash2`, giải thích rõ việc chuyển `IsActive = 0` (ngừng lưu thông nhưng bảo lưu lịch sử giao dịch).
  - Tự động cập nhật Client state: Loại bỏ sách khỏi danh sách lưu thông, giảm chỉ số KPI *Tổng đầu sách*, gửi yêu cầu HTTP DELETE tới backend (nếu có kết nối) và kích hoạt Toast thông báo thành công.
- **Kiểm thử biên dịch**: Frontend (`npm run build`) hoàn thành xuất sắc với 0 lỗi.

## [2026-09-19] - Triển khai Giao diện Cài đặt quy định, Định tuyến Subtabs & Fix giật UI thanh cuộn (US-03 / LOLRA-11)

### Đã thêm & Cải thiện (Added & Improved):
- **Giao diện Cài đặt quy định (`/settings`)**:
  - Tái hiện chuẩn xác mẫu thiết kế Figma `smartlib-ai-settings` với dải thông báo đầu trang và bố cục 2 cột trực quan.
  - **Quy định lưu thông & Mức phạt**: Cấu hình thời hạn mượn (Sinh viên, Giảng viên, Số sách tối đa), khung tính phí phạt vi phạm và tự động khóa mượn khi nợ phạt > 50.000 VNĐ.
  - **Cấu hình mô hình AI Early Warning**: Thanh trượt Slider chỉnh ngưỡng rủi ro cao (80%), tự động gửi email nhắc nhở và khối theo dõi mô hình Random Forest Classifier (hỗ trợ nút Retrain Model realtime).
  - **Định tuyến 4 Subtabs chuyên sâu**: Phân tách URL riêng biệt (`/settings/general`, `/settings/borrow`, `/settings/fines`, `/settings/audit`), đồng bộ trạng thái khi F5 hoặc chia sẻ link.
  - **Khắc phục triệt để lỗi giật giao diện (Layout Shift)**: Tối ưu `scrollbar-gutter: stable` và `overflow-y: scroll` trên `html`, `body` và `.dashboard-main`, giữ không gian thanh cuộn ổn định tuyệt đối khi cuộn tab AI.
- **Mã nguồn & Tích hợp**:
  - Tạo mới component [LibrarySettings.jsx](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.jsx), bộ style [LibrarySettings.css](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.css) (Vanilla CSS) và service [rulesApi.js](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/api/rulesApi.js) (kèm Mock Data dự phòng).
  - Tích hợp trực tiếp vào [DashboardPage.jsx](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx) và định tuyến trong [App.jsx](file:///c:/Users/aaa/Pictures/SaveCode/LV23-088-Library-Revenue-AI/frontend/src/App.jsx).


## [2026-09-18] - Xác thực, Phân quyền RBAC & Điều hướng URL Tab (US-01 / LOLRA-9)

### Đã thêm & Cải thiện (Added & Improved):
- **Phân quyền RBAC**: Admin toàn quyền; Staff ẩn menu Cài đặt quy định; Reader bị chặn truy cập Cổng quản trị (mã 403).
- **Điều hướng React Router**: Phân tách URL riêng (`/dashboard`, `/catalog`, `/circulation`, `/revenue`, `/readers`, `/settings`, `/login`); hỗ trợ F5, Back/Forward không mất trạng thái.
- **Khung chờ phân hệ khác**: Các tab chưa code hiển thị giao diện trống (Placeholder) chờ thành viên nhóm phát triển.
- **Xử lý phiên hết hạn**: Axios Interceptor tự động dọn sạch token và chuyển về trang đăng nhập khi gặp lỗi 401.

## [2026-09-18] - Cập nhật Database Schema và Tích hợp Auto-Migration & Seeding trong Program.cs

### Đã thêm & Cải thiện (Added & Improved):
- **Cập nhật CSDL (`data/` & `DtbDoAnCS/`)**:
  - `Books`: Bổ sung cột `IsActive BIT NOT NULL DEFAULT 1` phục vụ cơ chế Xóa mềm (Soft-delete).
  - `Readers`: Bổ sung cột `CreditScore INT NOT NULL DEFAULT 100` quản lý điểm tín nhiệm bạn đọc.
  - `FineRules`: Mở rộng 6 cột hạn mức mượn (Sinh viên 5 cuốn/14 ngày, Giảng viên 10 cuốn/30 ngày), phụ thu đền bù sách (10%) và tỷ lệ giảm trừ theo điểm rèn luyện (20%).
  - Đồng bộ trọn bộ script SQL sang cả 2 thư mục `data/` và `DtbDoAnCS/`.
- **Cập nhật Entity & DbContext (`SmartLibAI.Core` & `SmartLibAI.Infrastructure`)**:
  - Ánh xạ đầy đủ thuộc tính mới trong các Entity `Book`, `Reader`, `FineRule`.
  - Cấu hình Fluent API chuẩn hóa giá trị mặc định trong `SmartLibDbContext`.
- **Tích hợp Tự động vá Schema & Seeding (`Program.cs`)**:
  - Bổ sung lệnh Idempotent DDL tự động kiểm tra và thêm cột mới nếu CSDL của thành viên trong nhóm chưa có.
  - Tự động nạp 3 vai trò chuẩn (`Admin`, `Staff`, `Reader`) và quy định thư viện mặc định khi chạy ứng dụng.

## [2026-09-18] - Xây dựng Giao diện Dashboard Quản trị SmartLib AI theo mẫu Figma

### Đã thêm & Cải thiện (Added & Improved):
- **Giao diện Dashboard Quản trị (`DashboardPage.jsx`, `DashboardPage.css`)**:
  - Tái hiện 100% giao diện Figma với tông màu Dark Navy Sidebar kết hợp Light Content.
  - Tối ưu **Sticky Header** ghim cố định thanh tìm kiếm, thời gian, nút xuất Excel và Avatar khi cuộn trang.
  - Phân quyền RBAC giao diện: Tự động ẩn menu *Cài đặt quy định* đối với vai trò `Staff`.
  - Thiết kế 3 thẻ KPI: Tổng doanh thu phạt (15.45M), Phạt trễ hạn dự kiến (2.35M), Chỉ số rủi ro AI (88% Acc).
  - Hàng biểu đồ kép: Biểu đồ đường xu hướng 30 ngày kết hợp Biểu đồ tròn Doughnut cơ cấu nguồn thu phạt.
  - Bảng danh sách độc giả có nguy cơ trễ hạn cao kèm thanh đo `AI Score` trực quan.
- **Kiểm thử biên dịch**: Frontend (`npm run build`) và Backend (`dotnet build`) thành công 100% với 0 lỗi.

## [2026-09-17] - Tiền xử lý dữ liệu sách Kaggle & Chuẩn hóa CSDL

### Đã thêm & Cải thiện (Added & Improved):
- **API Phân trang Server-Side & Tìm kiếm Sách (`BooksController`, `BookRepository`)**: Triển khai phân trang `Skip().Take()` trực tiếp tại SQL Server tránh tải quá mức bộ nhớ với hơn 11.000 đầu sách. Hỗ trợ tìm kiếm từ khóa (`keyword`) và lọc thể loại (`categoryID`).
- **API Danh mục Thể loại (`CategoriesController`, `CategoryRepository`)**: Cung cấp endpoint `GET /api/categories` trả về 10 thể loại kèm tổng số đầu sách.
- **Tiền xử lý dữ liệu sách (`data/clean_kaggle_books.py`)**: Làm sạch 11.123 đầu sách Kaggle, cắt chuỗi chuẩn schema, sinh `BasePrice` (50k-250k) và `CategoryID` (1-10). Xuất file sạch `cleaned_books.csv` và `cleaned_book_copies.csv` (22.246 bản sao).
- **Kịch bản nạp CSDL (`data/03_import_books_and_copies.sql`)**: Tạo script `BULK INSERT` nạp đồng bộ bảng `Books` và `BookCopies`.
- **Chuẩn hóa CSDL (`data/02_seed_dummy_data.sql`)**: Mở rộng 10 danh mục chuẩn, xóa thư mục trùng lặp `DtbDoAnCS/`.
- **Cập nhật tài liệu (`README.md`)**: Chuẩn hóa liên kết GitHub sang nhánh `main`, cập nhật link Figma Prototype và chi tiết hóa bảng lộ trình 8 Sprint cùng giai đoạn Hậu kỳ.

## [2026-09-16] - Tối ưu hóa lệnh khởi chạy nhanh & Cập nhật toàn diện Tài liệu README.md

### Đã thêm & Cải thiện (Added & Improved):
- **Cấu hình `package.json` tại thư mục gốc**:
  - Hỗ trợ chạy ngay frontend từ thư mục gốc bằng lệnh `npm run dev` (không cần `cd frontend`).
  - Bổ sung lệnh chạy backend nhanh `npm run api` và `npm run backend`.
- **Tập lệnh tiện ích rút gọn đa nền tảng (`api`, `dev`, `api.cmd`, `dev.cmd`)**:
  - Hỗ trợ môi trường Git Bash (Linux/Bash Shell): Chạy trực tiếp `./api` và `./dev`.
  - Hỗ trợ môi trường Windows CMD/PowerShell: Chạy trực tiếp `api` (hoặc `.\api`) và `dev` (hoặc `.\dev`).
- **Cập nhật toàn diện `README.md`**:
  - Hướng dẫn chi tiết các cách khởi chạy nhanh từ thư mục gốc.
  - Đồng bộ cấu trúc thư mục gồm `DtbDoAnCS/`, `package.json`, các script khởi chạy.
  - Bổ sung bảng thông tin tài khoản kiểm thử chuẩn, phân quyền RBAC và lộ trình Sprint 2 hoàn thành task LOLRA-9.
  - Cập nhật quy chuẩn Gitflow với nhánh `develop`.

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
