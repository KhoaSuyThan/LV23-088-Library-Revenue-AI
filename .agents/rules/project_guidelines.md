# QUY TẮC & TIÊU CHUẨN DỰ ÁN SMARTLIB AI (LV23-088)

Tài liệu này quy định toàn bộ nguyên tắc làm việc, tiêu chuẩn viết mã nguồn, an toàn hệ thống và quy trình vận hành mà trợ lý AI (Agent) bắt buộc phải tuân thủ nghiêm ngặt trong suốt quá trình phát triển dự án **SmartLib AI (LV23-088)**.

---

## 1. NGUYÊN TẮC GIAO TIẾP & PHONG CÁCH LÀM VIỆC
* **Ngôn ngữ:** Luôn luôn trả lời bằng **Tiếng Việt**.
* **Thái độ:** Trả lời trung thực, khách quan, đi thẳng vào trọng tâm vấn đề kỹ thuật; không nịnh nọt, khen ngợi sáo rỗng hoặc dài dòng.
* **Minh bạch:** Giải thích rõ ràng nguyên nhân gốc rễ của lỗi, phương án xử lý và các rủi ro tiềm ẩn (nếu có) trước khi thực thi.

---

## 2. QUY TẮC CƠ SỞ DỮ LIỆU (DATABASE & MIGRATION)
* **Hỏi ý kiến trước khi sửa:** Khi gặp yêu cầu thay đổi cấu trúc CSDL (Schema, bảng, cột, kiểu dữ liệu, khóa ngoại, chỉ mục...), **BẮT BUỘC** phải lập kế hoạch chi tiết (Plan) và hỏi ý kiến xác nhận của người dùng trước khi tiến hành thực hiện.
* **Đồng bộ hóa dữ liệu:** Khi cập nhật cơ sở dữ liệu, phải đảm bảo:
  1. Cập nhật các file script SQL tương ứng trong thư mục lưu trữ data của dự án (`data/01_schema_smartlib_ai.sql`, `data/02_seed_dummy_data.sql`...).
  2. Cập nhật mã nguồn khởi tạo / nạp dữ liệu tự động (seeding logic) trong Backend C# (`Program.cs` hoặc DbContext) để ứng dụng có thể tự động chạy trên môi trường mới mà không bị crash.

---

## 3. TIÊU CHUẨN PHÁT TRIỂN & VIẾT MÃ NGUỒN (CODING STANDARDS)
* **Kế hoạch trước khi làm:** Luôn lập kế hoạch chi tiết (Implementation Plan) cho tất cả các yêu cầu mới trước khi bắt tay vào chỉnh sửa mã nguồn.
* **Bình luận mã nguồn (Comments):** Luôn thêm các dòng chú thích ngắn gọn, súc tích và rõ nghĩa vào code khi sinh ra để giải thích logic cốt lõi.
* **Bảo toàn mã nguồn:** Tuyệt đối giữ nguyên các chú thích cũ, tài liệu (docs) và cấu trúc code cũ ở các phần không liên quan trực tiếp đến thay đổi.
* **Kiểm tra biên dịch:** Sau khi chỉnh sửa code Front-end (React) hoặc Back-end (.NET 10), luôn tự động chạy lệnh build kiểm tra (`npm run build` trong `frontend/` hoặc `dotnet build` trong `src/`) để đảm bảo không có lỗi cú pháp/biên dịch trước khi kết thúc lượt hỗ trợ.
* **Tự động kiểm thử chủ động:** AI BẮT BUỘC phải chủ động chạy kiểm tra lại hệ thống sau khi làm xong (test build, gọi endpoint API kiểm tra, kiểm tra kịch bản test runner hoặc xác minh tính đúng đắn của tính năng vừa sửa) trước khi hoàn tất lượt.

---

## 4. QUY TẮC VẬN HÀNH & KHỞI CHẠY HỆ THỐNG (DEV WORKFLOW)
* **Front-end (React 19 + Vite - Thư mục `frontend/`):**
  * Khởi chạy môi trường phát triển: Dùng lệnh `npm run dev` (từ root) hoặc `.\dev` để mở server tại cổng `http://localhost:5173`.
  * Lưu ý: Lệnh `npm run build` chỉ dùng để đóng gói thành tệp tĩnh kiểm tra lỗi biên dịch, không phải lệnh chạy dev server.
* **Back-end (.NET 10 Web API - Thư mục `src/SmartLibAI.API`):**
  * Khởi chạy bằng `npm run api` (từ root) hoặc `.\api` hoặc `dotnet run --project src/SmartLibAI.API/SmartLibAI.API.csproj`.
  * Cổng Swagger UI tài liệu API: `http://localhost:5264/index.html`.
  * Tránh chạy `dotnet build` khi tiến trình `dotnet run` đang khóa tệp thực thi `bin/Debug/net10.0/*.exe`. Khi cần build kiểm tra, sử dụng cờ `--no-incremental`.
* **Phân hệ AI (Machine Learning / ONNX Runtime):**
  * **Huấn luyện Offline:** Chạy độc lập bằng Python (Pandas, Scikit-Learn, `skl2onnx`) trong thư mục `data/` hoặc `scripts/`.
  * **Vận hành In-process:** Export mô hình sang định dạng `smartlib_risk_model.onnx`, nhúng trực tiếp vào Backend .NET 10 qua thư viện `Microsoft.ML.OnnxRuntime`. **Tuyệt đối không cần duy trì Server Python chạy nền (Flask/FastAPI)** gây tốn RAM và rớt kết nối.

---

## 5. AN TOÀN TỆP TIN & QUẢN TRỊ HỆ THỐNG
* **Bảo vệ tệp có sẵn:** Tuyệt đối **KHÔNG** tự ý xóa, di chuyển hoặc đổi tên bất kỳ tệp tin/thư mục sẵn có nào trong dự án cũng như trên máy tính của người dùng khi chưa có sự cho phép rõ ràng.
* **Quy trình khi đề xuất xóa tệp:** Bắt buộc liệt kê danh sách tệp cần xóa, nêu rõ lý do kỹ thuật và hỏi ý kiến xác nhận của người dùng trước khi thực thi.
* **Dọn dẹp an toàn:** Chỉ được phép tự động xóa các tệp tin tạm (scratch / temp test scripts) do chính AI tự tạo ra trong phiên làm việc hiện tại để phục vụ kiểm thử.
* **Không tự ý commit Git:** Tuyệt đối không tự ý thực hiện commit mã nguồn lên Git; hãy để người dùng tự review và commit.
* **Quy chuẩn Git & Jira (ƯU TIÊN JIRA CLOUD CONVENTIONS):**
  * **Branch Name:** Bắt đầu trực tiếp bằng mã Issue: `L0LRA-<Số>-<tieu-de-slug-khong-dau>` (Ví dụ: `git checkout -b L0LRA-78-reader-management`). **KHÔNG** dùng tiền tố `feat/`.
  * **Commit Message:** Bắt đầu trực tiếp bằng mã Issue: `L0LRA-<Số> <Tiêu đề bằng tiếng Việt có dấu>` (Ví dụ: `git commit -m "L0LRA-78 Viết API Quản lý độc giả & Khóa thẻ"`). **KHÔNG** dùng tiền tố `feat(...)` hay ngoặc vuông `[]`.
* **Giải phóng cổng mạng (Ports):** Nếu trong quá trình chạy thử nghiệm có khởi chạy bất kỳ tiến trình chiếm dụng port (Dev server, API...), bắt buộc phải tắt tiến trình đó để giải phóng cổng sau khi hoàn thành.

---

## 6. TỐI ƯU GIAO DIỆN & SỬ DỤNG CÔNG CỤ (AGENT TOOLS)
* **Tiêu đề công cụ:** Khi gọi các tool, bắt buộc phải đặt `toolAction` và `toolSummary` bằng **Tiếng Việt ngắn gọn, súc tích (từ 2 đến 5 từ)** để tiêu đề thông báo hiển thị đẹp mắt, không bị tràn khung.
* **Tránh lệnh dài trên Terminal:** Tuyệt đối **KHÔNG** truyền các câu lệnh shell/powershell/python inline quá dài (`python -c "..."` nhiều dòng) vào `run_command` vì sẽ làm tràn nút bấm và vỡ giao diện xác nhận quyền của IDE.
* **Thực thi script phức tạp:** Tạo file script ngắn trong thư mục scratch (`scratch/temp_task.py`) rồi chạy file đó bằng câu lệnh ngắn gọn (ví dụ: `python scratch/temp_task.py`), sau đó tự động dọn dẹp file tạm.
* **Ưu tiên công cụ chuyên biệt:** Ưu tiên dùng `view_file`, `replace_file_content`, `grep_search`, `list_dir` thay vì chạy lệnh terminal dài dòng nếu không cần thiết.

---

## 7. CẬP NHẬT NHẬT KÝ THAY ĐỔI (CHANGELOG)
* **Tự động cập nhật:** Sau mỗi lần hoàn thành thay đổi mã nguồn, bắt buộc phải tự động cập nhật tóm tắt các thay đổi vào file `CHANGELOG.md` tại thư mục gốc.
* **Quy tắc 1 ngày 1 mục:** Mỗi ngày làm việc chỉ duy trì **duy nhất 1 heading `## [YYYY-MM-DD]`**. Nếu ngày hôm đó đã có mục trong file rồi thì chỉ gộp/bổ sung các bullet points vào mục đó, tuyệt đối không tạo thêm heading ngày trùng lặp.
* **Ngắn gọn & súc tích:** Nội dung ghi chú phải thật cô đọng, đi thẳng vào bản chất thay đổi chính, không viết rườm rà dài dòng.
* **Vị trí chèn:** Các thông tin thay đổi mới bắt buộc phải được tự động chèn vào ngay bên dưới dòng thứ 7 (ngay sau dấu phân cách `---`) để luôn đưa nội dung mới nhất lên đầu file.

---

## 8. QUY TẮC NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG - BẮT BUỘC)
* **Minh bạch học thuật:** Mọi hoạt động AI tham gia hỗ trợ dự án (viết code, giải thích khái niệm, sửa lỗi, thiết kế kiến trúc, sinh test case, viết báo cáo) đều phải có nhật ký theo dõi minh bạch tại `AI_USAGE_LOG.md`.
* **Chuẩn biểu mẫu 5 cột của Giảng viên:** Bắt buộc duy trì đúng cấu trúc 5 cột:
  `Thời gian | AI | Nội dung yêu cầu | AI tạo ra | Sinh viên xử lý`
* **Quy chuẩn ghi chép chi tiết & Chuyên sâu kỹ thuật (Tuyệt đối không ghi sơ sài):**
  * **Cột Nội dung yêu cầu:** Nêu rõ bối cảnh nghiệp vụ, bài toán đặt ra và mục tiêu kỹ thuật cụ thể.
  * **Cột AI tạo ra:** Liệt kê chính xác tên các file tạo/sửa, các thuật toán (Random Forest, ONNX In-process, Logistic Sigmoid...), các đặc trưng (features) và kết quả kiểm thử số liệu cụ thể.
  * **Cột Sinh viên xử lý (Trọng tâm học thuật):** Phải thể hiện rõ tư duy phản biện và trách nhiệm kỹ thuật của sinh viên:
    1. *Quyết định kiến trúc:* Phân tích so sánh và lý do chọn/bác bỏ phương án kỹ thuật (ví dụ: từ chối FastAPI server phụ, chọn ONNX in-process để giảm RAM/latency; chọn 10.000 mẫu thay vì 15.000 mẫu).
    2. *Thẩm định toán học & sửa lỗi:* Nêu rõ việc phát hiện lỗi (như lệch bias xác suất, lỗi encode tiếng Việt terminal) và cách sinh viên định hướng điều chỉnh.
    3. *Đánh giá dữ liệu & An toàn hệ thống:* Phân tích ma trận tương quan EDA, kiểm tra logic nghiệp vụ và bảo vệ dữ liệu CSDL SQL Server không bị ô nhiễm.
  * **Phụ lục kỹ thuật (Technical Appendix):** Bắt buộc bổ sung công thức toán học, sơ đồ luồng dữ liệu hoặc bảng ánh xạ metadata bên dưới để phục vụ sinh viên bảo vệ và trả lời vấn đáp trước Hội đồng chấm đồ án.

