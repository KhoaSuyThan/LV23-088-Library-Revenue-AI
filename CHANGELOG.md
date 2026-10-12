# Nhật ký thay đổi (CHANGELOG)

Tài liệu ghi lại toàn bộ lịch sử các thay đổi, bổ sung và cập nhật mã nguồn dự án LV23-088.

> Quy tắc: Nội dung cập nhật mới nhất luôn được tự động chèn ngay bên dưới dấu phân cách bên dưới.

---
## [2026-10-12] - [Ràng Buộc & Tùy Chỉnh Số Ngày Mượn Tiêu Chuẩn Theo Setting]

- **Phân hệ Nghiệp vụ Mượn sách Backend (`BorrowService.cs`, `BorrowReaderEligibilityDto.cs`):**
  - **Bổ sung trường `StandardBorrowDays`:** Thêm thuộc tính `StandardBorrowDays` vào `BorrowReaderEligibilityDto` và tự động lấy giá trị từ `FineRules` theo đối tượng bạn đọc (`StudentBorrowDays` cho Sinh viên, `LecturerBorrowDays` cho Cán bộ & Giảng viên) khi gọi API kiểm tra tư cách bạn đọc (`CheckReaderEligibilityAsync`).
  - **Ràng buộc thời hạn trả dự kiến (`CreateBorrowingAsync`):** Thêm logic kiểm tra ngày hẹn trả `request.DueDate` không được vượt quá số ngày mượn tiêu chuẩn cấu hình trong Setting. Nếu vượt quá, hệ thống từ chối tạo phiếu mượn và thông báo lỗi rõ ràng.

- **Phân hệ Giao diện Quầy Mượn Sách Frontend (`BorrowForm.jsx`, `BorrowForm.css`):**
  - **Tự động áp dụng hạn trả theo đối tượng & Setting:** Khi người dùng quét mã thẻ độc giả, hệ thống tự động nhận diện số ngày mượn tiêu chuẩn và gán `dueDate` mặc định đúng bằng `hôm nay + số ngày tiêu chuẩn`.
  - **Khóa giới hạn tối đa trên Date Picker:** Bổ sung thuộc tính `max={getMaxIsoDate()}` cho Date Picker HTML5 để ngăn chọn ngày vượt quá hạn mượn tiêu chuẩn cho phép.
  - **Xác thực hạn trả chặt chẽ (`validateDueDate`):** Báo lỗi tức thời nếu người dùng gõ tay ngày hẹn trả vượt quá số ngày mượn tiêu chuẩn cấu hình cho đối tượng (Sinh viên / Giảng viên).
  - **Thanh chọn nhanh thời hạn (Quick Chips) linh hoạt:** Các chip gợi ý thời hạn được sinh tự động dựa trên số ngày tiêu chuẩn (`+X ngày (Chuẩn SV/GV)`, `+7 ngày`, `+14 ngày`), đảm bảo luôn nằm trong giới hạn cho phép.
  - **Cân bằng giao diện 2 cột (`Mã vạch` & `Hạn trả`):** Tinh gọn header cột Hạn trả dự kiến thành 1 dòng (chỉ giữ nhãn và badge Hôm nay, chuyển thông tin số ngày chuẩn xuống thanh thời hạn), đồng bộ chiều cao nhãn 2 bên `min-height: 20px` để hai ô nhập liệu thẳng hàng ngang tuyệt đối, không còn bị lệch hay rớt dòng.

## [2026-10-12] - [Task L0LRA-103] Cải Thiện UI/UX Chi Tiết Độc Giả & Cài Đặt Quy Định (Setting)

- **Phân hệ Hồ sơ & Chi tiết Độc giả (`ReaderProfiles.jsx`, `ReaderProfiles.css`, `ReaderService.cs`, `ReaderDto.cs`):**
  - **Loại bỏ thuật ngữ kỹ thuật/CSDL (Ảnh 14 & 17):** Đổi tiêu đề danh sách thành `Danh sách hồ sơ độc giả toàn hệ thống ({count} kết quả)` (bỏ chữ "từ SQL Server"), đổi thẻ KPI thành `trong toàn hệ thống` (bỏ chữ "hệ thống SQL"), và nút thao tác đổi thành `Làm mới` (bỏ chữ "CSDL").
  - **Chuẩn hóa ngôn ngữ thuần tiếng Việt (Ảnh 15):** Đổi mức rủi ro AI từ `Cao (High)`, `Vừa (Medium)`, `Thấp (Low)` thành `Cao`, `Trung bình`, `Thấp` ở cả Backend (`ReaderService.cs`, `ReaderDto.cs`) và giao diện Frontend.
  - **Hộp thoại xác nhận Khóa/Mở khóa thẻ (Ảnh 16):** Bổ sung Modal xác nhận bảo vệ trước khi thực hiện thao tác Khóa hoặc Mở khóa thẻ bạn đọc, hiển thị rõ họ tên, mã thẻ và cảnh báo chặn mượn sách.
  - **Tách nhãn bộ lọc (Ảnh 18):** Tách biệt các tiêu đề nhãn `Khoa/Viện:`, `Trạng thái:`, `Mức rủi ro AI:` ra bên ngoài ô `<select>`, các thẻ `<option>` chỉ chứa giá trị cần chọn.

- **Phân hệ Cài đặt Quy định - Setting (`LibrarySettings.jsx`, `LibrarySettings.css`, `rulesApi.js`, `RulesController.cs`, `RulesService.cs`):**
  - **Slider rủi ro AI 2 màu (Ảnh 19):** Cập nhật dải màu động cho thanh kéo Slider với track bên trái núm kéo màu xanh `#2563eb` và track bên phải màu xám nhạt `#e2e8f0` biểu diễn tiến độ trực quan.
  - **Xóa text bản vẽ dư thừa (Ảnh 20):** Bỏ chữ `(Figma)` trên tab, chuẩn hóa tên tab thành `Cấu hình chung & AI`.
  - **Loại bỏ trường trùng lặp (Ảnh 21):** Bỏ trường "Số sách tối đa được mượn cùng lúc" ở Tab 1 do đã được cấu hình chi tiết theo Sinh viên / Giảng viên ở Tab 2.
  - **Bổ sung nút & Modal thêm lý do miễn giảm (Ảnh 22):** Thêm nút `+ Thêm lý do`, Modal nhập thông tin lý do miễn giảm mới (Mã lý do, Tên lý do, % giảm trừ) và endpoint API `POST /api/rules/waivers`.
  - **Tự động ẩn thông báo lưu cấu hình (Ảnh 23):** Loại bỏ banner tĩnh cố định ở đầu trang; chuyển thông điệp sang Toast tự động ẩn sau 3.5 giây khi nhấn "Lưu cấu hình".
  - **Khắc phục lỗi đè hạn mức mượn sách sinh viên:** Sửa thứ tự ưu tiên trong `RulesService.cs` (`request.BorrowLimit_Student ?? request.BorrowLimit_MaxTogether`) và đồng bộ `borrowLimit_Student` / `borrowLimit_MaxTogether` trong `LibrarySettings.jsx` để tránh việc giá trị mặc định `5` của trường cũ ghi đè lên giá trị người dùng vừa sửa.
  - **Ẩn thanh tìm kiếm thừa trên Header (Ảnh 24 - `DashboardPage.jsx`):** Hiển thị Breadcrumb `Trang chủ / Cài đặt Quy định` thay vì ô tìm kiếm chung khi truy cập trang Settings.

## [2026-10-09] - [Refactor & Bug Fix] Hoàn Thiện BUG-04, Chuẩn Hóa Đền Bù & Cảnh Báo Số Âm

- **Khắc phục triệt để BUG-04 (Khoa/Bộ phận thực tế của độc giả):**
  - Bổ sung [`DepartmentHelper.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Common/DepartmentHelper.cs) chuẩn hóa tên Khoa/Bộ phận hiển thị đầy đủ theo đối tượng (`CNTT`, `Kinh Tế`, `Lecturer`...).
  - Đồng bộ trường `Department` qua các DTOs, Services ([`ReturnService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/ReturnService.cs), [`BorrowService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/BorrowService.cs), [`InvoiceService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/InvoiceService.cs)) và giao diện Quầy lưu thông, biên lai, in phiếu A4 ([`CirculationDesk.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx), [`CirculationReceiptModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/CirculationReceiptModal.jsx)).
- **Chuẩn hóa mức đền bù mất sách & bỏ phí xử lý cố định:**
  - Quy chuẩn mức đền bù về **`110% giá bìa`**, loại bỏ phụ thu cố định 20.000 VNĐ (`compensationFixedFee = 0`) trên cả Frontend ([`LibrarySettings.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.jsx)) và Backend ([`RulesService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/RulesService.cs)).
- **Khắc phục BUG-05 & Xác thực số âm:**
  - Phát hiện và cảnh báo tức thời số âm trên các ô nhập mức phạt hư hỏng/đền bù tại [`LibrarySettings.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.jsx).
  - Tự động bóc tách số liệu và lưu vào CSDL `FineRules`; áp dụng tỷ lệ phạt thực tế vào tính toán trả sách tại quầy ([`ReturnProcessing.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/ReturnProcessing.jsx)).
  - Bổ sung xác thực `CompensationBasePercent` (0% - 500%) và dọn dẹp code thừa trong Backend.

## [2026-10-08] - [Optimization & Fixes] Cấu Hình Quy Định, Quầy Lưu Thông & Hợp Nhất Nhánh (L0LRA-71, 72, 78, 79)

- **Cấu hình quy định & Khôi phục mặc định (L0LRA-72 & L0LRA-79):**
  - Bổ sung endpoint `POST /api/rules/reset-defaults` và chức năng "Khôi phục mặc định" trên giao diện Cài đặt kèm hộp thoại xác nhận.
  - Tự động cập nhật thời hạn mượn và hạn mức sách theo đối tượng (Giảng viên 30 ngày / Sinh viên 14 ngày) trên [`BorrowForm.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BorrowForm.jsx).
  - Mở rộng bảng `FineRules` (4 cột cấu hình mới), hoàn thiện ràng buộc `[Range]` cho [`UpdateRulesRequestDto.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Rules/UpdateRulesRequestDto.cs) và ghi nhật ký kiểm toán (Audit Trail) chi tiết khi sửa đổi.
- **Hợp nhất mã nguồn Quản lý độc giả (L0LRA-71 & L0LRA-78):**
  - Tích hợp toàn diện DTOs, Repository và [`ReadersController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/ReadersController.cs): hỗ trợ phân trang, CRUD hồ sơ, cấp/gia hạn thẻ bạn đọc.
  - Tích hợp 4 thẻ KPI thống kê, đánh giá rủi ro AI, khóa/mở khóa thẻ tức thời và gửi cảnh báo trễ hạn.
  - Đồng bộ schema bảng `Readers` (`Faculty`, `ClassGroup`) và dữ liệu mẫu khởi tạo.

## [2026-10-07] - Triển Khai Backend Quản Lý Độc Giả & Cấu Hình Quy Định (L0LRA-78 & L0LRA-72)

- **Bộ API Quản lý độc giả & Khóa thẻ (L0LRA-78):**
  - Xây dựng cụm DTOs, Repository và Service ([`ReaderService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/ReaderService.cs)) hỗ trợ phân trang, tìm kiếm đa tiêu chí, tính sách mượn và nợ phạt theo batch query.
  - Cung cấp bộ API quản lý hồ sơ độc giả (`GET`, `POST`, `PUT`, `PATCH /status`, `POST /extend`) tại [`ReadersController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/ReadersController.cs) phân quyền Admin/Staff.
- **Backend Cấu hình quy định mượn trả & mức phạt:**
  - Bổ sung các thực thể CSDL [`FineRule.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Entities/FineRule.cs), [`RuleAuditLog.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Entities/RuleAuditLog.cs) và [`WaiverReason.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Entities/WaiverReason.cs).
  - Triển khai bộ API RESTful tại [`RulesController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/RulesController.cs) (`/api/rules`, `/api/rules/waivers`, `/api/rules/history`, `/api/ai/retrain`).
  - Áp dụng ngay quy định mới vào `BorrowService` và `ReturnService` cho quầy lưu thông; kết nối dữ liệu thực tế lên giao diện Cài đặt ([`LibrarySettings.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.jsx)).

## [2026-10-05] - Chuẩn Hóa Dữ Liệu Thực Tế & Xuất Excel Cho Sổ Nợ Đọng Và Biên Lai Thu Phạt

- **Sổ Nợ Đọng & Sách Hư Hỏng ([`RevenueArrearsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueArrearsTab.jsx), [`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx)):**
  - Đồng bộ số liệu thực tế từ cơ sở dữ liệu: Hiển thị chính xác tổng tiền nợ đọng, số tiền phạt đã thu và số lượng khoản phạt vi phạm (loại bỏ toàn bộ các số liệu mẫu/fallback giả lập).
  - Nâng cấp chức năng **Xuất file Excel**: Xuất danh sách nợ đọng thực tế với đầy đủ 14 cột chi tiết (Mã phiếu, Độc giả, Khoa, Tên sách, Mã bản sao, Ngày trễ, Tiền phạt, Hạn thu...), hỗ trợ mã hóa UTF-8 BOM hiển thị chuẩn tiếng Việt có dấu.
- **Biên Lai Đã Thu ([`RevenueReceiptsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueReceiptsTab.jsx)):**
  - Hiển thị danh sách biên lai thu tiền phạt thực tế từ hệ thống, đồng bộ trạng thái gạch nợ và hình thức thanh toán (Tiền mặt / Chuyển khoản QR).
  - Nâng cấp chức năng **Xuất file Excel**: Xuất toàn bộ dữ liệu lịch sử biên lai thực tế với 14 cột nghiệp vụ kế toán phục vụ đối soát tài chính, định dạng chuẩn UTF-8 BOM.

## [2026-10-05] - Nâng Cấp Dashboard Vận Hành Tổng Quát & Báo Cáo Xuất Excel Đa Tầng

- **Biểu đồ Vận hành Tổng quát ([`DashboardPage.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx)):**
  - Chuyển đổi biểu đồ chính sang theo dõi **Lưu thông Sách** (Lượt mượn vs Lượt trả), có nút chuyển nhanh sang *Thu phạt*.
  - Chuyển biểu đồ tròn sang **Cơ cấu Thể loại Kho sách** từ 10 danh mục CSDL thực tế (11.123 đầu sách), hỗ trợ 3 chế độ xem (*Thể loại*, *Bản sao*, *Thu phạt*).
  - Chuẩn hóa 4 thẻ KPI bao quát 4 trụ cột thư viện: *Kho sách & Danh mục*, *Lưu thông & Mượn trả*, *Hồ sơ Bạn đọc*, và *Doanh thu Thu phạt*.
- **Xuất Báo cáo Excel Tổng hợp ([`DashboardPage.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx)):**
  - Nâng cấp xuất Excel thành Báo cáo vận hành thư viện tổng hợp gồm 4 phần: Chỉ số KPI toàn hệ thống, Thống kê 10 thể loại sách, Danh sách độc giả rủi ro AI và Biên lai đối soát tài chính.

## [2026-10-05] - Thiết Kế & Nâng Cấp Dashboard Biểu Đồ Doanh Thu Thu Phạt & Thống Kê Vi Phạm

- **Đồng bộ hóa Dashboard Tổng quan ([`DashboardPage.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx)):**
  - Nâng cấp biểu đồ đường xu hướng SVG tương tác cao: kết nối trực tiếp mảng dữ liệu `trendPoints` từ CSDL, hỗ trợ bộ chọn thời gian linh hoạt (7 ngày, 30 ngày, Theo quý), hiển thị đồng thời đường diện tích *Thực thu* (Xanh dương) và đường nét đứt *Nợ phát sinh / Mục tiêu* (Vàng cam).
  - Tích hợp tooltip động hiển thị ngày và số tiền chi tiết khi rê chuột vào từng điểm mốc.
  - Cập nhật biểu đồ tròn Donut cơ cấu nguồn thu phạt tự động bóc tách từ mảng DTO thực tế, bổ sung chỉ số *Tỷ lệ thu hồi nợ phạt* và nút điều hướng nhanh sang Dashboard chi tiết.
- **Dashboard Phân tích Chuyên sâu ([`RevenueBreakdownTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueBreakdownTab.jsx)):**
  - Thiết kế hoàn chỉnh Dashboard phân tích tài chính & thống kê vi phạm trong tab *"Biểu đồ & Thống kê vi phạm"* tại phân hệ Báo cáo Thu phạt ([`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx)).
  - Bổ sung cụm 4 thẻ KPI tài chính: Thực thu lũy kế, Dòng tiền phạt nợ đọng, Tỷ lệ thu hồi nợ phạt (kèm thanh đo tiến độ), và Giá trị tài liệu hư hỏng/mất mát.
  - Thống kê cơ cấu 4 nhóm vi phạm quy chế trọng tâm: Phạt trễ hạn theo ngày, Hư hỏng vật lý (bìa/trang/vẽ bẩn), Làm mất tài liệu, và Phí cấp lại thẻ/nội quy khác (gồm thanh phân đoạn Segmented Bar và 4 thẻ chi tiết).
  - Phân tích kênh thanh toán: Chuyển khoản VietQR tự động đối soát (QR VietQR) vs Tiền mặt tại quầy lưu thông.
  - Bảng xếp hạng Top đầu sách thường xuyên vi phạm (số lượt quá hạn, số cuốn hư hỏng, mức phạt phát sinh và khuyến nghị giải pháp lưu thông).


- **Backend API Doanh thu & Biên lai:** Bổ sung DTOs, Repository, Service và 2 endpoint `GET /api/invoices/summary`, `GET /api/invoices/history` truy vấn dữ liệu thực tế từ SQL Server.
- **Báo cáo Thu phạt ([`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx)):** Kết nối dữ liệu thật cho 3 thẻ KPI, tab "Biên lai đã thu", tab "Cơ cấu doanh thu" và hỗ trợ xuất file Excel/CSV chuẩn UTF-8 có dấu.
- **Dashboard & Đồng bộ Real-time ([`DashboardPage.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx)):** Hiển thị số liệu thực tế trên thẻ KPI, biểu đồ tròn Donut tự động chia tỉ lệ và tự động làm mới số liệu theo thời gian thực khi phát sinh giao dịch thu phạt.


## [2026-10-02] - Khắc Phục Lỗ Hổng Phân Quyền: Chặn Tuyệt Đối Tài Khoản Reader Truy Cập Cổng Quản Trị

- **[Security & Auth - LoginPage] Ngăn chặn bypass đăng nhập qua khối Catch:**
  - Sửa lỗi trong [`LoginPage.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/LoginPage.jsx): Bắt và hiển thị chính xác thông điệp lỗi nghiệp vụ từ Backend khi nhận mã `403 Forbidden` (*"Tài khoản bạn đọc không có quyền truy cập Cổng quản trị..."*), dừng ngay quy trình đăng nhập thay vì kích hoạt chế độ Fallback Demo.
  - Vô hiệu hóa việc tự động cấp quyền Admin cho tài khoản Bạn đọc ngay cả khi xảy ra sự cố mất kết nối mạng.

- **[Security & Routing - App] Bổ sung Route Guard 2 lớp tại Router:**
  - Thêm cơ chế kiểm tra vai trò người dùng trong `ProtectedLayout` tại [`App.jsx`](LV23-088-Library-Revenue-AI/frontend/src/App.jsx): Nếu tài khoản có `role === 'Reader'`, lập tức hủy phiên làm việc và điều hướng về `/login` kèm thông báo từ chối truy cập.
## [2026-10-02] - Chuẩn Hóa Phân Trang, Máy Quét Mã Vạch & Tối Ưu Nghiệp Vụ Mượn/Trả Sách

- **Quản Lý Sách (BookCatalog):**
  - Xóa nút lọc trùng lặp `Chỉ sách có sẵn (> 0)`, đưa toàn bộ thanh lọc lên 1 hàng ngang duy nhất.
  - Đồng bộ modal quét mã vạch/QR sang component dùng chung [`BarcodeCameraModal`](LV23-088-Library-Revenue-AI/frontend/src/components/BarcodeCameraModal.jsx); sửa lỗi click nút Quét mã và phím `F2`.

- **Máy Quét Mã Vạch Dùng Chung (`BarcodeCameraModal`):**
  - Khắc phục lỗi lệch icon tiêu đề modal; cách ly kiểu dáng độc lập vào [`BarcodeCameraModal.css`](LV23-088-Library-Revenue-AI/frontend/src/components/BarcodeCameraModal.css).
  - Tối ưu thanh công cụ: Nút chọn Camera co dãn dài rộng theo khoảng trống, dàn đều các nút (`Lật ngang`, `Zoom 1x-2x`, `Tải PDF/Ảnh`) sang 2 bên và đưa dòng phím tắt `Ctrl + V` xuống hàng riêng biệt.

- **Nghiệp Vụ Lưu Thông (CirculationDesk):**
  - **Phân trang giao dịch trong ngày:** Tích hợp bộ phân trang chuẩn Catalog (5-50 giao dịch/trang, điều hướng và nhảy trang), nạp tối đa 50 bản ghi gần nhất.
  - **Mượn & Trả sách:** Thêm nút xem trước phiếu mượn A4; nâng cấp đánh giá tình trạng sách độc lập (Nguyên vẹn, Hư hỏng slider 3 nấc, Mất) và popup xem/sao chép Barcode.
  - **Biểu mẫu in A4 (`CirculationReceiptModal`):** Chuẩn hóa header 1 hàng ngang, mở rộng cột Tên sách và gom gọn 2 vị trí chữ ký chân trang.


## [2026-10-02] - Tích Hợp Phân Trang & Tìm Kiếm Nhanh Cho Sổ Nợ Đọng & Lịch Sử Biên Lai Thu Phạt (`/revenue`)

- **Phân Trang & Tìm Kiếm Danh Sách Quá Hạn & Nợ Phạt Tích Lũy ([`RevenueArrearsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueArrearsTab.jsx)):**
  - **Bộ điều khiển phân trang:** Hỗ trợ phân trang danh sách với tùy chọn hiển thị linh hoạt (5, 10, 20, 50 trường hợp / trang), chỉ báo vị trí (`Hiển thị X - Y / Z trường hợp`), cụm nút điều hướng trang đầu (`«`), trang trước (`‹`), danh sách số trang thông minh (có dấu `…` rút gọn khi số lượng trang lớn), trang tiếp (`›`), trang cuối (`»`) và ô nhập nhảy trang trực tiếp khi có trên 5 trang.
  - **Thanh tìm kiếm tức thì (Quick Search):** Cho phép tra cứu nhanh theo tên độc giả, mã sinh viên (readerCode), tên đầu sách hoặc mã phiếu mượn (borrowCode); tự động cập nhật số lượng kết quả lọc (`kết quả / tổng`) và reset về trang 1 khi tìm kiếm.
  - **Hiệu ứng làm mới:** Cập nhật nút "Làm mới" với hiệu ứng xoay icon (`RotateCw` + `spin-icon`) khi đang tải dữ liệu từ Backend và tự động quay về trang 1.
  - **Bảo toàn nghiệp vụ:** Giữ nguyên 100% logic thu tiền nợ phạt qua modal kế toán K80/A5 (`onOpenPayModal`).

- **Phân Trang & Bộ Lọc Nhanh Lịch Sử Biên Lai Đã Thu ([`RevenueReceiptsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueReceiptsTab.jsx)):**
  - **Bộ phân trang bảng biên lai:** Tích hợp bộ phân trang hoàn chỉnh với các tùy chọn 5, 10, 20, 50 biên lai / trang, điều hướng đa tầng và ô nhập trang trực tiếp.
  - **Thanh công cụ lọc phương thức & tìm kiếm:** Tích hợp thanh tìm kiếm theo mã biên lai (`BL-2026-xxxx`), tên độc giả, MSSV, nội dung thu phạt, thủ thư tiếp nhận, cùng bộ lọc phương thức thanh toán dạng pills: Tất cả, Tiền mặt, QR VietQR kèm số lượng thống kê theo từng phương thức.
  - **Liên kết dòng tiền thời gian thực ([`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx)):** Quản lý state `receiptsList`, tự động sinh và chèn bản ghi biên lai mới lên đầu bảng lịch sử ngay sau khi thủ thư xác nhận thu tiền thành công tại tab Sổ nợ đọng; tự động tính tổng lũy kế doanh thu trên banner tổng quan.
  - **Mở rộng dữ liệu mẫu:** Bổ sung bộ dữ liệu biên lai mẫu phong phú trải dài các ngày giúp kiểm thử trực quan và thuận tiện cho việc phân trang.

- **Thiết Kế & Giao Diện CSS Đồng Bộ ([`FineRevenue.css`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.css)):**
  - Bổ sung bộ quy tắc CSS hoàn chỉnh cho `.arrears-pagination`, `.receipts-pagination-bar`, `.arrears-page-btn`, `.arrears-page-size-select`, `.arrears-search-box`, `.receipts-toolbar`, `.receipts-filter-btn` và animation `arrears-spin`.
  - Thiết kế đồng bộ chuẩn giao diện hệ thống: màu xanh thương hiệu HUTECH, hiệu ứng hover, shadow thẻ, bo góc tròn 8-12px và hiển thị responsive.


- **[Security - L08] Phân Tách Tuyệt Đối Quyền Thủ Thư & Độc Giả (RBAC JWT):**
  - Bổ sung `[Authorize(Roles = "Admin,Staff")]` trên toàn bộ Controller nghiệp vụ lưu thông và quản trị tài nguyên: [`BorrowsController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/BorrowsController.cs), [`ReturnsController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/ReturnsController.cs), [`InvoicesController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/InvoicesController.cs), [`BookCopiesController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/BookCopiesController.cs).
  - Cấu hình `RoleClaimType = ClaimTypes.Role` và `NameClaimType = ClaimTypes.Name` trong [`Program.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs).
  - Đảm bảo token Độc giả (`Reader` / sinh viên) hoặc người dùng chưa xác thực khi gọi API thủ thư sẽ bị từ chối trả về **403 Forbidden** hoặc **401 Unauthorized**.

- **[Performance - L03] Tối Ưu Hóa Truy Vấn & Đánh Chỉ Mục CSDL SQL Server:**
  - Bổ sung chỉ mục Non-Clustered `IX_BookCopies_Barcode` trên bảng `BookCopies(Barcode)` giúp tra cứu quét mã vạch đạt độ phức tạp $O(1)$ thay vì Table Scan.
  - Đồng bộ DDL kiểm tra an toàn (Idempotent) vào khối tự động khởi tạo trong [`Program.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs) và script CSDL gốc [`01_schema_smartlib_ai.sql`](LV23-088-Library-Revenue-AI/data/01_schema_smartlib_ai.sql).
  - Kết quả đo kiểm Postman/Automated Test: API tra cứu và phân trang đạt **7.02ms - 81.42ms**, vượt xa chỉ tiêu `<= 500ms`.

- **[UX/Scanner - L01, L06 & BUG-04] Cải Tiến Module Quét Barcode & Phím Tắt Ctrl + V:**
  - Khắc phục **BUG-04**: Trong [`BorrowForm.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BorrowForm.jsx), khi API trả về 404 hoặc trạng thái không khả dụng, không xóa trắng ô nhập liệu mà giữ nguyên chuỗi và tự động bôi đen (`select()`) để thủ thư chỉnh sửa nhanh.
  - Hỗ trợ phím tắt **Ctrl + V** dán trực tiếp mã vạch bản sao hoặc dán ảnh chụp Barcode/PDF từ Clipboard trên [`BorrowForm.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BorrowForm.jsx), [`ReturnProcessing.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/ReturnProcessing.jsx) và [`BarcodeCameraModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BarcodeCameraModal.jsx).

- **[Data Integrity - L05, L10 & BUG-01, BUG-05, BUG-06] Chuẩn Hóa Biểu Mẫu In A4 & Bộ Lọc Giao Dịch:**
  - Khắc phục **BUG-01**: Trên [`CirculationReceiptModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/CirculationReceiptModal.jsx), sửa mapping Khoa ưu tiên thông tin thực tế của độc giả (không còn bị gán chữ "Standard"); xóa bỏ mã vạch gán cứng `BC000001-C`, đồng bộ 100% mã vạch thực tế.
  - Khắc phục **BUG-05**: Tinh chỉnh bảng in khổ A4 và CSS [`CirculationReceiptModal.css`](LV23-088-Library-Revenue-AI/frontend/src/components/CirculationReceiptModal.css) với `word-break: break-word` và mở rộng tỷ lệ cột Tên sách lên 36%, đảm bảo tựa đề dài tự xuống dòng đẹp mắt không bị cắt cụt.
  - Khắc phục **BUG-06**: Trong [`CirculationDesk.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx), lưu trữ đầy đủ toàn bộ mảng `items` vào bản ghi giao dịch; khi mở lại phiếu in từ danh sách "Các giao dịch trong ngày", hiển thị đầy đủ tất cả các cuốn sách mượn.
  - Khắc phục **L05, L10**: Bổ sung tìm kiếm theo trạng thái ("Đang mượn", "Chờ thu phạt", "Đã trả") vào bộ lọc `filteredTransactions` và xóa bỏ lệnh gọi lỗi `setChecks` gây crash khi click chọn dòng giao dịch.

## [2026-10-01] - Phân Chia 4 Tab Thành URL Sub-Routes & Tái Cấu Trúc Mô-đun Hóa Phân Hệ Thu Phạt (`/revenue`)

- **Định Tuyến URL Sub-Routes Phân Hệ Báo Cáo Thu Phạt:**
  - **Cấu hình Route (`App.jsx` & `DashboardPage.jsx`):** Bổ sung `<Route path="/revenue/*" ... />` và chuyển giao `subTab` xuống component [`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx) để hỗ trợ điều hướng URL cấp 2.
  - **URL Chuẩn RESTful:**
    - `http://localhost:5173/revenue` hoặc `/revenue/ai-forecast`: Tab AI Dự báo & Xu hướng (mặc định).
    - `http://localhost:5173/revenue/arrears`: Tab Sổ nợ đọng & Sách hư hỏng (Story LOLRA-19).
    - `http://localhost:5173/revenue/receipts`: Tab Biên lai đã thu.
    - `http://localhost:5173/revenue/breakdown`: Tab Cơ cấu doanh thu.
  - **Đồng bộ hóa 2 chiều:** Khi click tab trên giao diện, URL tự động thay đổi tương ứng; khi nhập trực tiếp URL hoặc nhấn F5, hệ thống mở chính xác tab tương ứng.

- **Tái Cấu Trúc Mô-đun Hóa Component:**
  - Phân tách file đơn khối `FineRevenue.jsx` thành 4 component độc lập trong `frontend/src/components/revenue/`:
    - [`RevenueAiForecastTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueAiForecastTab.jsx): Đồ thị SVG dự báo 30 ngày & danh sách độc giả rủi ro AI.
    - [`RevenueArrearsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueArrearsTab.jsx): Quản lý nợ phạt CSDL thực tế, nút "Thu tiền ngay" và 12 ca bồi hoàn sách.
    - [`RevenueReceiptsTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueReceiptsTab.jsx): Bảng lịch sử biên lai đã thu & nút xem lại/in phiếu K80/A5.
    - [`RevenueBreakdownTab.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/revenue/RevenueBreakdownTab.jsx): Tỷ trọng phân bổ dòng tiền vi phạm và phương thức thanh toán.
  - [`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx) đóng vai trò Orchestrator tinh gọn: quản lý 3 thẻ KPI tổng quan, thanh điều hướng 4 tab URL sync và các modal dùng chung.

## [2026-10-01] - Cập Nhật Dữ Liệu Phạt Vi Phạm Chờ Thu (Pending) & Hoàn Thiện Luồng Kiểm Thử LOLRA-19

- **Cơ Sở Dữ Liệu & Seeding Dữ Liệu Kiểm Thử:**
  - **Khởi tạo dữ liệu Pending:** Bổ sung các bản ghi phạt vi phạm trạng thái `Pending` trong bảng `FineReceipts` (trỏ tới các phiếu mượn thực tế trong `Borrowings`) vào CSDL trực tiếp và cập nhật trong [`02_seed_dummy_data.sql`](LV23-088-Library-Revenue-AI/data/02_seed_dummy_data.sql).
  - **Seeding tự động Idempotent:** Cập nhật [`Program.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs) để tự động kiểm tra và khởi tạo bản ghi phạt `Pending` mẫu nếu hệ thống chưa có khoản phạt nào đang chờ thu, đảm bảo hệ thống luôn sẵn sàng kiểm thử luồng thu tiền phạt và xuất biên lai.

## [2026-10-01] - Hoàn Thiện Thu Tiền Phạt, Hóa Đơn Kế Toán Bất Biến & Xuất Biên Lai K80/A5 (Story LOLRA-19)

- **Cơ Sở Dữ Liệu & Hóa Đơn Kế Toán Bất Biến (`PenaltyInvoices`):**
  - **Schema & Seeding:** Bổ sung bảng `PenaltyInvoices` vào [`01_schema_smartlib_ai.sql`](LV23-088-Library-Revenue-AI/data/01_schema_smartlib_ai.sql), [`02_seed_dummy_data.sql`](LV23-088-Library-Revenue-AI/data/02_seed_dummy_data.sql), và logic tự động tạo bảng an toàn (Idempotent DDL) trong [`Program.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs).
  - **Entity C# & DbContext:** Tạo Entity [`PenaltyInvoice.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Entities/PenaltyInvoice.cs) và cập nhật [`SmartLibDbContext.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Data/SmartLibDbContext.cs), cấu hình khóa ngoại `ReceiptID` trỏ tới `FineReceipts` và `CashierID` trỏ tới `Users`.

- **Backend API Kế Toán Bất Biến & Mở Lại Quyền Mượn Sách (Sub-task 1 - Khoa NK):**
  - **Controller & Endpoints:** Triển khai [`InvoicesController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/InvoicesController.cs) với các endpoints: `POST /api/invoices` (xác nhận thu tiền), `GET /api/invoices/pending` (danh sách nợ phạt) và `GET /api/invoices/{idOrCode}` (tra cứu biên lai).
  - **Database Transaction Bất Biến:** Xây dựng [`InvoiceRepository.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/InvoiceRepository.cs) và [`InvoiceService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/InvoiceService.cs), bọc toàn bộ thao tác trong `IDbContextTransaction`. Cơ chế chống thanh toán trùng lặp (Double-spending protection), tự động sinh mã biên lai chuẩn hóa `INVyyyyMMddxxxx`.
  - **Tự Động Mở Lại Quyền Mượn Sách (Scenario 1):** Cập nhật `FineReceipt.Status = 'Paid'` đồng bộ ngay lập tức với cơ chế kiểm tra `CheckUnpaidFinesByReaderIdAsync()` của module lưu thông, giúp bạn đọc có thể mượn sách trở lại ngay sau khi hoàn thành nộp phạt.

- **Frontend In Ấn Biên Lai K80/A5 & Tích Hợp Quầy Lưu Thông (Sub-task 2 - Huy TH):**
  - **Chuẩn Hóa Nhận Diện HUTECH & Tối Ưu Bố Cục:**
    - Cập nhật chuẩn hóa tên trường thành **TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP.HCM (HUTECH)** và **TRUNG TÂM THÔNG TIN - THƯ VIỆN HUTECH** (475A Điện Biên Phủ, P. 25, Q. Bình Thạnh, TP.HCM).
    - Tinh chỉnh typography cho cả 2 khổ K80 và A5: thu nhỏ font chữ vừa vặn, đều đẹp, thay thế các dòng gạch ký tự thô bằng đường viền CSS border dashed, khắc phục triệt để lỗi tràn chữ và xuống hàng cục bộ.
    - Căn chỉnh nút đóng `X` ngay ngắn, sát mép phải thanh công cụ modal.
    - Tách biệt thanh header thành 2 hàng độc lập (Hàng 1: Tiêu đề + Nút X; Hàng 2: Bộ chọn khổ in K80/A5 + Chọn phương thức thanh toán + Nút Xác nhận thu), giải quyết triệt để lỗi các nút bấm và chữ bị chồng chéo, đè lên nhau.
  - **Quy Trình Nghiệp Vụ "Xem Trước Biên Lai Rồi Mới Xác Nhận Thu Tiền":**
    - Khi thủ thư bấm "Thu tiền ngay" tại sổ nợ hoặc "Lập phiếu thu phạt" tại quầy trả sách, hệ thống mở ngay [`ReceiptModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/ReceiptModal.jsx) ở chế độ **Xem trước (Preview)**.
    - Cho phép thủ thư kiểm tra đối soát thông tin độc giả, lý do vi phạm, số tiền thực thu và lựa chọn hình thức thanh toán (Tiền mặt / Chuyển khoản QR) trực tiếp trên giao diện biên lai.
    - Bấm nút **"Xác nhận đã thu tiền"** để kích hoạt gọi API Backend lập hóa đơn bất biến, tự động cấp mã `INVxxxxxx`, cập nhật `Paid` và mở khóa mượn sách.
  - **In Trực Tiếp & Xuất PDF:** Tích hợp `window.print()` với `@media print` tối ưu trang in nhiệt K80 và xuất file PDF vector sắc nét (html2canvas + jsPDF).
  - **Kết Nối Quầy Trả Sách:** Tích hợp gọi [`invoiceApi.js`](LV23-088-Library-Revenue-AI/frontend/src/api/invoiceApi.js) trực tiếp trong [`ReturnProcessing.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/ReturnProcessing.jsx) khi thủ thư tiếp nhận trả sách và bấm "Xác nhận thu & Xuất biên lai".
  - **Kết Nối Quản Lý Thu Phạt:** Nâng cấp [`FineRevenue.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/FineRevenue.jsx), bổ sung nút "Thu tiền ngay" trên từng dòng nợ đọng, hộp thoại xác nhận thanh toán (tiền mặt / chuyển khoản QR) và nút in lại biên lai trên bảng lịch sử.

## [2026-09-30] - Nâng Cấp Toàn Diện Quầy Lưu Thông: Hoàn Trả Rải Rác (LOLRA-17), Hạn Mức Mượn Động, In Phiếu A4 & Tối Ưu Máy Quét

- **Tiếp Nhận Sách Trả Rải Rác & Xử Lý Vi Phạm (Story LOLRA-17):**
  - **Backend API (.NET Core & SQL Server):** Triển khai [`ReturnsController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/ReturnsController.cs), [`ReturnService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/ReturnService.cs), [`ReturnRepository.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/ReturnRepository.cs) và các DTOs ([`ReturnBookRequestDto.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Returns/ReturnBookRequestDto.cs), [`ReturnBookResponseDto.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Returns/ReturnBookResponseDto.cs), [`ReturnLookupResponseDto.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Returns/ReturnLookupResponseDto.cs)). Cung cấp 2 endpoints RESTful: `GET /api/returns/lookup/{barcodeOrCode}` và `POST /api/returns/process-item`.
  - **Logic Hoàn Trả & Phạt:** Trả sách hợp lệ tự động tăng `AvailableCopies + 1`, đổi trạng thái bản sao `Available` và đóng phiếu `Returned` khi trả đủ. Trả sách sự cố (hỏng bìa, mất sách, trễ hạn) đánh dấu `Damaged`/`Lost` (không nhập kho), tự động tính tiền phạt vi phạm và kích hoạt tạo biên lai thu phạt điện tử.
  - **Frontend:** Xây dựng component độc lập [`ReturnProcessing.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/ReturnProcessing.jsx), [`ReturnProcessing.css`](LV23-088-Library-Revenue-AI/frontend/src/components/ReturnProcessing.css) tích hợp tính phạt động, miễn giảm phạt và modal thu tiền.

- **Nâng Cấp Hạn Mức Mượn Động & Chuẩn Hóa Thời Hạn Mượn ([`BorrowForm.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BorrowForm.jsx), [`BorrowForm.css`](LV23-088-Library-Revenue-AI/frontend/src/components/BorrowForm.css)):**
  - **Hạn Mức Động Theo Đối Tượng:** Đồng bộ với Backend theo quy định: Sinh viên mượn tối đa 5 cuốn (chuẩn 14 ngày), Giảng viên mượn tối đa 10 cuốn (chuẩn 30 ngày).
  - **Nhận Diện Tư Cách Bạn Đọc:** Tự động gọi API `GET /api/borrows/eligibility/{readerCode}` khi quét/nhập mã bạn đọc; hiển thị badge đối tượng trực quan.
  - **Sửa Lỗi Highlight Nút Thời Hạn:** Bỏ màu xanh cố định ở nút 14 ngày; kích hoạt `chip-active` động chính xác theo số ngày chênh lệch thực tế (+7, +14, +30 ngày) so với ngày hiện tại hôm nay.
  - **Tối Ưu Form Mượn & Phím Tắt:** Tách form thành component độc lập, bổ sung phím tắt `F2` focus nhanh ô mã thẻ và cơ chế quét liên hoàn từ thẻ sang sách.

- **Biểu Mẫu Hành Chính Phiếu Mượn & Phiếu Trả Chuẩn A4 ([`CirculationReceiptModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/CirculationReceiptModal.jsx), [`CirculationReceiptModal.css`](LV23-088-Library-Revenue-AI/frontend/src/components/CirculationReceiptModal.css)):**
  - **Thiết Kế Văn Bản Chuẩn Quốc Gia:** Đầy đủ Quốc hiệu, Tiêu ngữ, bảng kê danh mục sách mượn/trả, tình trạng tài liệu, xác nhận thu phạt và chữ ký 2 bên.
  - **In & Xuất Tệp PDF:** Hỗ trợ in trực tiếp khổ A4 (`window.print()`) và xuất file PDF chất lượng cao (html2canvas scale 2x + jsPDF), đảm bảo tiếng Việt chuẩn sắc nét.
  - **Tự Động Mở Phiếu:** Mở xem trước phiếu ngay sau khi tạo phiếu mượn hoặc tiếp nhận trả sách; thêm nút xem/in lại phiếu trên từng dòng bảng giao dịch trong ngày tại [`CirculationDesk.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx).

- **Tối Ưu Máy Quét Mã Vạch Camera ([`BarcodeCameraModal.jsx`](LV23-088-Library-Revenue-AI/frontend/src/components/BarcodeCameraModal.jsx)):**
  - **Macro Zoom Kỹ Thuật Số (1x, 1.5x, 2x):** Hỗ trợ zoom khung hình giúp camera lấy nét sắc nét ở cự ly chuẩn (30-45cm) mà không bị mờ nhòe mã vạch.
  - **Nâng Cấp Giải Mã ZXing BinaryBitmap:** Pipeline phân tích pixel đa tầng (Center Crop + Full Frame, quét 2 chiều), tăng tốc độ và độ chính xác khi quét mã 1D Code 128.
  - **Đa Năng & Hợp Nhất Giao Diện:** Tích hợp live camera, chọn webcam rời USB, lật ngang hình ảnh (Flip Horizontal), tải file ảnh và dán ảnh clipboard (`Ctrl + V`) trên cùng một màn hình.

## [2026-09-29] - Hoàn Thiện Phân Hệ Mượn Sách & Máy Quét Mã Vạch Tại Quầy Lưu Thông (Story LOLRA-16)

- **Backend API & Nghiệp Vụ Mượn Sách (.NET Core & SQL Server):**
  - **Triển khai Trọn bộ Module Mượn Sách:** Xây dựng [`BorrowsController.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Controllers/BorrowsController.cs), [`BorrowService.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/Services/BorrowService.cs), [`BorrowRepository.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/BorrowRepository.cs) và các DTOs nghiệp vụ.
  - **Kiểm Soát Ràng Buộc & Điều Kiện Mượn (AC Story LOLRA-16):** Kiểm tra toàn diện điều kiện độc giả (thẻ khóa/hết hạn, nợ phạt quá hạn, vượt quá 5 cuốn) và trạng thái cuốn sách khả dụng trước khi tạo giao dịch; hỗ trợ rollback an toàn qua SQL Server Transaction.
  - **Khởi Tạo Dữ Liệu Kiểm Thử (Seeding Data):** Cập nhật [`Program.cs`](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs) và [`02_seed_dummy_data.sql`](LV23-088-Library-Revenue-AI/data/02_seed_dummy_data.sql) tự động nạp độc giả và bản sao sách kiểm thử cho cả kịch bản mượn thành công lẫn từ chối.

- **Frontend Quầy Lưu Thông & Tích Hợp Máy Quét Mã Vạch ([`CirculationDesk.jsx`](LV23-088-Library-Revenue-AI/frontend/src/pages/CirculationDesk.jsx)):**
  - **Tích Hợp Modal Máy Quét Mã Vạch (Barcode Scanner):** Hỗ trợ quét qua camera, súng đọc barcode, tải tệp ảnh hoặc dán ảnh clipboard (`Ctrl + V`) kèm âm thanh bíp phản hồi khi nhận diện thành công.
  - **Quy Trình Quét Mượn Liên Hoàn:** Hỗ trợ quét Thẻ bạn đọc xong tự động chuyển trỏ chuột sang ô Mã vạch sách để quét tiếp cuốn sách, tạo phiếu trong tích tắc.
  - **Tối Ưu Giao Diện Ô Nhập Liệu:** Chuyển nút quét mã vạch clickable sang bên trái ô input (`.input-prefix-scan-btn`), loại bỏ icon thừa bên phải, chỉ hiển thị nút xóa nhanh `✕` (`.input-clear-btn`) khi có dữ liệu.
  - **Hoàn Thiện Luồng Trả Sách & Kiểm Tra Vi Phạm:** Khắc phục lỗi gán cứng mã sách, hỗ trợ tìm kiếm đa chiều (mã sách gốc, mã vạch bản sao, mã phiếu, MSSV) và lọc bảng realtime; tự động tính số ngày quá hạn và tiền phạt; bổ sung nút xác nhận trả sách đúng hạn.
  - **Kết Nối Trực Tiếp API:** Tạo [`borrowApi.js`](LV23-088-Library-Revenue-AI/frontend/src/api/borrowApi.js) kết nối trực tiếp backend, hỗ trợ phím tắt `F2` đưa trỏ chuột về ô quét mã và hiển thị banner cảnh báo lỗi đỏ từ chối mượn sách.

## [2026-09-24] - Hoàn thiện 5 Tiêu chí chấp nhận (AC1 - AC5) Phân hệ Tra cứu & Quản lý Sách

- **AC1: Tìm kiếm từ khóa linh hoạt (Không phân biệt hoa/thường & có dấu/không dấu):**
  - **Backend LINQ / SQL Server:** Triển khai `EF.Functions.Collate` với Collation `SQL_Latin1_General_CP1_CI_AI` (Case-Insensitive & Accent-Insensitive) trên 3 trường `Title`, `Author`, và `ISBN` trong [BookRepository.cs](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Repositories/BookRepository.cs). Hỗ trợ tìm kiếm từ khóa không dấu khớp chính xác sách tiếng Việt có dấu (ví dụ: gõ `"a la perle"` tìm ra `"La Jeune fille à la perle"`, `"dac nhan"` tìm ra `"Đắc Nhân Tâm"`).
  - **Frontend Chuẩn hóa:** Bổ sung hàm tiện ích `removeVietnameseTones()` trong [BookCatalog.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) nhằm hỗ trợ cơ chế tìm kiếm bỏ dấu linh hoạt cho cả chế độ dự phòng Offline/Fallback.
- **AC2: Kết hợp các bộ lọc tìm kiếm đa chiều (Từ khóa + Thể loại + Chỉ sách có sẵn):**
  - **Backend DTO & Query:** Mở rộng [BookFilterDto.cs](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Books/BookFilterDto.cs) bổ sung thuộc tính `OnlyAvailable`, xử lý điều kiện kiểm tra bản sao khả dụng `b.BookCopies.Any(c => c.Status == "Available")` kết hợp cùng `CategoryID`, khoảng giá và từ khóa.
  - **Giao diện Thanh lọc:** Thêm checkbox thao tác nhanh **"Chỉ sách có sẵn (> 0)"** (`.filter-checkbox-item`) trực tiếp trên thanh công cụ lọc [BookCatalog.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) và bộ style chuyên biệt trong [BookCatalog.css](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.css).
- **AC3: Hiển thị trực quan trạng thái kho sách (Tổng sở hữu & Sẵn sàng cho mượn):**
  - Cập nhật cột **"Tồn kho (Còn/Tổng)"** trên bảng quản lý sách thể hiện minh bạch cả 2 thông số: `<Số bản sao sẵn sàng> / <Tổng số bản sao sở hữu> cuốn` (ví dụ `3 / 3 cuốn`, `6 / 7 cuốn`).
  - Định dạng phân tách màu sắc (`.stock-avail-count` màu xanh lục thành công, `.stock-total-count` màu xám than chì) kèm thanh tiến trình phần trăm tồn kho và tooltip giải thích chi tiết.
- **AC4: Phân trang tại Server-side với kích thước mặc định 20 kết quả/trang:**
  - Thiết lập giá trị mặc định `PageSize = 20` tại [BookFilterDto.cs](LV23-088-Library-Revenue-AI/src/SmartLibAI.Core/DTOs/Books/BookFilterDto.cs) và State `pageSize` tại [BookCatalog.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx).
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
  - Cập nhật định nghĩa chỉ mục chuẩn trong file [01_schema_smartlib_ai.sql](LV23-088-Library-Revenue-AI/data/01_schema_smartlib_ai.sql).
  - Cấu hình Fluent API `HasIndex()` trong [SmartLibDbContext.cs](LV23-088-Library-Revenue-AI/src/SmartLibAI.Infrastructure/Data/SmartLibDbContext.cs).
  - Bổ sung lệnh DDL kiểm tra và tự động khởi tạo chỉ mục trong hàm khởi động tại [Program.cs](LV23-088-Library-Revenue-AI/src/SmartLibAI.API/Program.cs).
- **Hoàn thiện Phân trang giao diện Quản lý Sách (Page Size Selector):**
  - Cập nhật [BookCatalog.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.jsx) và [BookCatalog.css](LV23-088-Library-Revenue-AI/frontend/src/pages/BookCatalog.css): Bổ sung bộ chọn số dòng hiển thị trên mỗi trang (`10`, `20`, `50`, `100` đầu sách / trang) tại thanh điều khiển phân trang.
  - Khi người dùng thay đổi số dòng/trang, hệ thống tự động đưa về trang 1 và tải đúng số lượng bản ghi tương ứng từ API Backend.

## [2026-09-23] - Tính năng Tải lên & Quét ảnh Mã vạch / QR Code tự động (Upload, Drag-Drop, Paste & Reset)

- **Bổ sung nút Đặt lại & Xóa ảnh preview:** Khi quét ảnh không thành công hoặc muốn đổi ảnh khác, bổ sung nút **"Đặt lại"** (`.btn-reset-scanner-img`) trên thanh công cụ và nút xóa nhanh `✕` góc trên khung preview (`.btn-clear-scanner-preview`) để dễ dàng làm sạch khung laser và thử lại ảnh mới.
- **Giải mã mã vạch từ ảnh (Dual-Engine Decoder):** Xây dựng module [barcodeImageDecoder.js](LV23-088-Library-Revenue-AI/frontend/src/utils/barcodeImageDecoder.js) kết hợp Web API chuẩn `BarcodeDetector` (tối ưu phần cứng C++/GPU) và fallback thư viện tiêu chuẩn `@zxing/library`, hỗ trợ nhận diện cả mã vạch 1D (Code 128, Code 39, EAN-13) và mã QR 2D.
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
  - Tạo mới component [LibrarySettings.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.jsx), bộ style [LibrarySettings.css](LV23-088-Library-Revenue-AI/frontend/src/pages/LibrarySettings.css) (Vanilla CSS) và service [rulesApi.js](LV23-088-Library-Revenue-AI/frontend/src/api/rulesApi.js) (kèm Mock Data dự phòng).
  - Tích hợp trực tiếp vào [DashboardPage.jsx](LV23-088-Library-Revenue-AI/frontend/src/pages/DashboardPage.jsx) và định tuyến trong [App.jsx](LV23-088-Library-Revenue-AI/frontend/src/App.jsx).


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
