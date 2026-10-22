# Kế hoạch cải thiện và hoàn thiện SmartLib AI

> **Phạm vi:** Kế hoạch xử lý các rủi ro và khoảng trống ghi nhận trong đợt rà soát ngày 22/10/2026.  
> **Nguyên tắc dữ liệu:** Giữ nguyên dữ liệu mẫu và logic seed hiện có trong `src/SmartLibAI.API/Program.cs`. Không xóa hoặc di chuyển phần dữ liệu mẫu đó trong phạm vi kế hoạch này.

## Mục tiêu

1. Khóa các đường truy cập chưa được phân quyền và loại bỏ bí mật mặc định khỏi cấu hình production.
2. Làm cho cấu hình chạy local, build và triển khai frontend/backend nhất quán, có thể chẩn đoán.
3. Xác minh AI đang dùng ONNX hay fallback, và trình bày kết quả đúng với trạng thái thực tế.
4. Bổ sung kiểm thử cho nghiệp vụ lưu thông, tiền phạt và phân quyền; giảm cảnh báo và thời gian tải frontend.

## Giai đoạn 1 — Bảo mật và phân quyền (P0)

### 1.1. JWT và thông tin đăng nhập

- Rà soát mật khẩu tài khoản demo trong README, seed SQL và code; thống nhất cách cung cấp thông tin demo an toàn cho môi trường học tập.
- Không dùng JWT key mặc định trong production. Nạp khóa qua biến môi trường/User Secrets và làm ứng dụng báo lỗi rõ ràng khi production chưa cấu hình khóa hợp lệ.
- Kiểm tra thời hạn, issuer, audience, HTTPS và quy trình cấp token; giữ thông tin local trong cấu hình development phù hợp.
- Đảm bảo không ghi mật khẩu, token hoặc secret vào log.

**Nghiệm thu:** Không có secret production trong mã nguồn/cấu hình được commit; production không khởi động với JWT key mặc định; đăng nhập và xác thực token hợp lệ vẫn hoạt động.

### 1.2. Authorization theo endpoint

- Lập danh sách toàn bộ endpoint và phân loại: công khai, Reader, Staff, Admin.
- Bổ sung `[Authorize]`/role phù hợp cho thao tác tạo, sửa, xóa sách/thể loại, độc giả, quy chế, waiver, cảnh báo và huấn luyện lại AI.
- Kiểm tra riêng các endpoint `[AllowAnonymous]` trong `RulesController`; chỉ giữ công khai các dữ liệu thực sự cần hiển thị trước đăng nhập.
- Kiểm tra quyền theo chủ sở hữu đối với hồ sơ độc giả và thông báo nếu Reader được phép truy cập các API này.

**Nghiệm thu:** Ma trận quyền được ghi lại; request thiếu token hoặc sai vai trò nhận 401/403; vai trò được phép vẫn sử dụng được endpoint tương ứng.

### 1.3. CORS và tài liệu API

- Thay policy `AllowAll` bằng allowlist origin cấu hình theo môi trường.
- Giữ Swagger có chủ đích theo môi trường; nếu bật trên staging/production, bảo vệ hoặc giới hạn theo yêu cầu deploy.
- Xác minh URL Swagger thật và cập nhật README.

**Nghiệm thu:** Origin ngoài allowlist không được trình duyệt chấp nhận; frontend local và domain deploy được cho phép theo cấu hình.

## Giai đoạn 2 — Ổn định backend và cấu hình triển khai (P1)

### 2.1. Xác minh build và chuẩn hóa lệnh chạy

- Chạy restore/build backend trong môi trường có .NET 10 SDK; lưu lại lỗi đầy đủ nếu thất bại và khắc phục lỗi thực tế.
- Đối chiếu `dotnet build` solution, `dotnet publish` API và hướng dẫn npm scripts.
- Kiểm tra cấu hình connection string theo môi trường; không dùng connection string localhost trên cloud.

**Nghiệm thu:** Build solution và publish API hoàn tất; lệnh hướng dẫn trong README chạy đúng với cấu hình đã nêu.

### 2.2. Quản lý schema, giữ nguyên dữ liệu mẫu

- **Không thay đổi hoặc xóa dữ liệu mẫu/seed hiện có trong `Program.cs`.**
- Tách riêng việc cập nhật cấu trúc schema (DDL) khỏi luồng seed hiện có; đánh giá EF migrations hoặc script migration có version và quy trình backup/rollback.
- Lập danh mục DDL startup hiện tại và đối chiếu với schema SQL cùng `SmartLibDbContext` để tránh drift.
- Chạy migration trước khi khởi chạy nhiều instance; seed mẫu hiện có tiếp tục hoạt động như hiện nay trong giai đoạn này.

**Nghiệm thu:** Cơ sở dữ liệu mới và đã tồn tại đều nâng cấp lặp lại an toàn; dữ liệu mẫu đang có không bị xóa hoặc ghi đè ngoài hành vi seed vốn có.

### 2.3. Deploy frontend/backend

- Xác minh Vercel rewrite `/api/*` đến backend và SPA route fallback; kiểm tra domain, giao thức HTTPS, CORS và proxy.
- Bỏ giả định rằng Vite `preview` proxy là cấu hình production; mô tả đúng từng môi trường local/staging/production.
- Cập nhật đường dẫn Swagger (`/` hoặc `/index.html`) theo `RoutePrefix` hiện hành.
- Thêm health check tối thiểu để kiểm tra API và kết nối DB; không trả thông tin nhạy cảm trong response.

**Nghiệm thu:** API health có phản hồi; gọi API từ frontend deploy trả JSON thành công; tải trực tiếp và refresh route con không lỗi 404.

## Giai đoạn 3 — Độ tin cậy của dự báo AI (P1)

- Phơi bày trạng thái model qua health/diagnostics: model ONNX đã tải, phiên bản/đường dẫn logic, hoặc đang dùng fallback; không lộ đường dẫn máy chủ nhạy cảm.
- Thêm log/metric có cấu trúc cho lỗi nạp model và lỗi inference; tránh báo fallback như thể là dự báo ONNX.
- Kiểm tra schema input/output ONNX, thứ tự và chuẩn hóa feature so với metadata và script export.
- Ghi rõ nguồn dự báo ở dữ liệu/API/UI (ONNX hoặc heuristic fallback) và ngưỡng rủi ro đang áp dụng.
- Đối chiếu lại chỉ số F1 được công bố với báo cáo đánh giá và dữ liệu test thực tế.

**Nghiệm thu:** Có thể nhận biết model/fallback ở môi trường chạy; test smoke ONNX thành công; báo cáo chỉ số AI có nguồn và tập đánh giá rõ ràng.

## Giai đoạn 4 — Kiểm thử nghiệp vụ và chất lượng frontend (P2)

### 4.1. Kiểm thử tự động

- Tạo project test backend và kiểm thử service/controller cho đăng nhập, quyền truy cập, điều kiện mượn, trả sách, tính phạt, thanh toán và hoàn tác giao dịch lỗi.
- Bổ sung kiểm thử tích hợp cho SQL Server hoặc môi trường test tương đương; tập trung vào transaction và hai yêu cầu đồng thời cùng một bản sao sách.
- Bổ sung smoke test frontend/API cho luồng đăng nhập → mượn → trả/phạt và báo cáo.
- Xác định các kiểm thử này là cổng trước khi nghiệm thu/release.

**Nghiệm thu:** Các ca nghiệp vụ trọng yếu chạy tự động; lỗi cạnh tranh không tạo mượn trùng hoặc trạng thái thanh toán sai; lệnh test được ghi trong README.

### 4.2. Lint và bundle frontend

- Xử lý cảnh báo correctness trước: component tạo trong render ở `App.jsx`, dependency React hooks thiếu, và state đồng bộ trong effect.
- Dọn biến/import không sử dụng sau khi rà soát để tránh che cảnh báo quan trọng.
- Tách lazy route/chunk cho các trang lớn và thư viện nặng như barcode/PDF nếu phù hợp; đo bundle sau thay đổi.
- Thiết lập mức cảnh báo/lint tối thiểu cho CI sau khi xử lý các lỗi có ảnh hưởng hành vi.

**Nghiệm thu:** Không còn cảnh báo correctness đã xác định; lint/build chạy ổn định; bundle tải ban đầu giảm đáng kể hoặc có lý do và ngưỡng được ghi lại.

## Thứ tự triển khai đề xuất

| Ưu tiên | Hạng mục | Phụ thuộc |
|---|---|---|
| P0 | JWT, secret, ma trận authorization, CORS | Không |
| P1 | Build backend, schema/migration, cấu hình deploy và health check | P0 cho môi trường production |
| P1 | Trạng thái và kiểm chứng ONNX/fallback | Build backend ổn định |
| P2 | Test nghiệp vụ/integration/smoke | API ổn định |
| P2 | Lint correctness và code splitting frontend | Có thể làm song song sau khi chốt luồng API |

## Ngoài phạm vi của kế hoạch

- Không xóa, thay thế hoặc di chuyển dữ liệu mẫu trong `Program.cs`.
- Không thay đổi dữ liệu demo đang dùng cho chấm điểm nếu chưa có kế hoạch backup và xác nhận riêng.
- Không thay đổi mục tiêu nghiệp vụ hoặc thuật toán AI chỉ dựa trên cảnh báo lint/build; cần kết quả kiểm chứng trước.
