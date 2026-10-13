# NHẬT KÝ SỬ DỤNG TRÍ TUỆ NHÂN TẠO (AI USAGE LOG)

> **Mã đồ án:** LV23-088 - Hệ thống Báo cáo Doanh thu & AI Dự báo Trễ hạn Thư viện  
> **Nhóm sinh viên thực hiện:** 
> * Nguyễn Võ Lê Khoa (Project Manager / Backend Dev)
> * Nguyễn Thành Nhất Nam (Business Analyst / QA Tester)
> * Trần Đức Huy (UI/UX Designer / Data Engineer)
> 
> **Mục đích:** Minh chứng minh bạch học thuật theo chuẩn yêu cầu của Giảng viên hướng dẫn môn học Quản lý dự án CNTT. Thể hiện rõ vai trò phản biện, thẩm định kỹ thuật và kiểm thử độc lập của sinh viên đối với mọi nội dung do AI hỗ trợ.

---

## BẢNG THEO DÕI HOẠT ĐỘNG SỬ DỤNG AI (CHUẨN 5 CỘT)

| Thời gian | AI sử dụng | Nội dung yêu cầu | Nội dung AI tạo ra (AI Generated) | Hoạt động xử lý & Thẩm định của Sinh viên (Student Evaluation) |
| :--- | :---: | :--- | :--- | :--- |
| **13/10/2026**<br>*(10:30 - 10:45)* | Antigravity AI<br>*(Gemini 3.8 Flash)* | **Khảo sát toàn bộ dự án, phản biện Backlog Sprint 6.1 (Huấn luyện AI) và tham vấn kiến trúc vận hành AI:**<br>- Kiểm tra tính hợp lý của 4 task Jira ban đầu (`L0LRA-20`, `86`, `87`, `100`).<br>- Tham vấn lựa chọn giữa việc dựng Server Python phụ trợ (FastAPI/Flask) hay chạy AI in-process trong C# .NET 10.<br>- Giải quyết bài toán khởi động lạnh (Cold-Start) khi thư viện mới chưa có lịch sử mượn trả thật. | - Phân tích chi tiết quy trình CRISP-DM; đề xuất bổ sung 2 task còn thiếu: Sinh dữ liệu mô phỏng (`L0LRA-106`) và Đối sánh mô hình cơ sở (`L0LRA-107`).<br>- Đề xuất thuật toán **Random Forest Classifier** tối ưu cho dữ liệu dạng bảng kết hợp xuất định dạng chuẩn **ONNX**.<br>- So sánh kiến trúc: Chỉ ra nhược điểm của Server Python phụ (tốn 200–400MB RAM, tăng độ trễ 15–30ms) và đề xuất giải pháp **ONNX Runtime in-process** chạy trực tiếp trong C# .NET 10 ($< 1\text{ms}$).<br>- Lập 2 tài liệu thiết kế chi tiết: [`docs/AI_DEVELOPMENT_PLAN.md`](docs/AI_DEVELOPMENT_PLAN.md) và [`docs/PHASE_1_DATA_GENERATION_PLAN.md`](docs/PHASE_1_DATA_GENERATION_PLAN.md). | **1. Quyết định kiến trúc:** Sinh viên phê duyệt giải pháp ONNX Runtime in-process để đơn giản hóa vận hành (người dùng chỉ cần chạy `npm run api` và `npm run dev`, không cần duy trì 3 server).<br>**2. Thẩm định quy mô dữ liệu:** Phản biện đề xuất 15.000 mẫu xuống **10.000 mẫu mô phỏng**, tương ứng hợp lý với quy mô 11.123 đầu sách thực tế của thư viện.<br>**3. Bảo vệ CSDL:** Yêu cầu tập dữ liệu huấn luyện lưu riêng dưới dạng file CSV độc lập, tuyệt đối không chèn vào SQL Server để giữ nguyên vẹn dữ liệu kế toán và màn hình Quầy lưu thông (`/circulation`).<br>**4. Tinh chỉnh Jira Backlog:** Đồng bộ và cập nhật lại Sprint 6.1 và Sprint 6.3 trên Jira Cloud Board của nhóm. |
| **13/10/2026**<br>*(10:48 - 10:51)* | Antigravity AI<br>*(Gemini 3.8 Flash)* | **Đồng bộ và chuẩn hóa bộ quy tắc Agent Rules (`.agents/rules/`):**<br>- Chuyển đổi bộ quy tắc mẫu từ dự án khác sang phù hợp với dự án SmartLib AI.<br>- Bảo đảm ưu tiên quy chuẩn Jira Smart Commits & Branching hiện tại của nhóm. | - Tạo file quy chuẩn hệ thống: [`.agents/rules/project_guidelines.md`](.agents/rules/project_guidelines.md).<br>- Tích hợp chuẩn công nghệ: Frontend React 19, Backend .NET 10, thư mục CSDL `data/`, in-process ONNX.<br>- Chuẩn hóa quy tắc cập nhật `CHANGELOG.md` nghiêm ngặt theo nguyên tắc **1 ngày 1 heading duy nhất**, nội dung chèn ngay dưới dòng thứ 7.<br>- Tích hợp quy định bắt buộc duy trì `AI_USAGE_LOG.md` theo biểu mẫu 5 cột của Giảng viên. | **1. Rà soát tương thích:** Sinh viên đối chiếu cấu trúc thư mục, loại bỏ các cấu hình của Vue 3 và FastAPI không thuộc dự án.<br>**2. Khẳng định quy ước Jira:** Bắt buộc duy trì tiền tố `L0LRA` (chữ L - số Không - LRA) cho tên nhánh và commit message (không dùng `feat/` hay dấu ngoặc vuông) để Jira Webhook bắt đúng sự kiện.<br>**3. Kiểm tra nhật ký:** Xác nhận format heading ngày `## [2026-10-13]` trong `CHANGELOG.md`. |
| **13/10/2026**<br>*(10:52 - 10:58)* | Antigravity AI<br>*(Gemini 3.8 Flash)* | **Thực thi Giai đoạn 1 (Sprint 6.1: `L0LRA-106` & `L0LRA-20`):**<br>- Lập trình script sinh 10.000 mẫu dữ liệu hành vi theo phân phối xác suất.<br>- Lập trình pipeline tiền xử lý, mã hóa nhãn và chia Train/Test 80/20.<br>- Tự động kiểm thử và đánh giá phân phối dữ liệu đầu ra. | - Viết mã nguồn [`data/generate_borrowing_dataset.py`](data/generate_borrowing_dataset.py):<br>  + Mô phỏng 8 đặc trưng: `Faculty`, `MemberType`, `CreditScore`, `CurrentHoldingBooks`, `HistoricalOverdueCount`, `BorrowDurationDays`, `TotalCurrentDebt`, `IsExamSeason`.<br>  + Tính xác suất qua hàm Logistic Sigmoid kết hợp Bernoulli sampling.<br>- Viết mã nguồn [`data/preprocess_borrowing_dataset.py`](data/preprocess_borrowing_dataset.py):<br>  + Sử dụng `LabelEncoder` mã hóa danh mục.<br>  + Xuất file từ điển [`data/encoders_metadata.json`](data/encoders_metadata.json).<br>  + Phân tách `StratifiedShuffleSplit` thành `train_data.csv` (8.000 dòng) và `test_data.csv` (2.000 dòng).<br>- Chạy terminal kiểm thử tự động toàn bộ pipeline. | **1. Phát hiện & Xử lý lỗi Encoding:** Phát hiện lỗi `UnicodeEncodeError: charmap` trên terminal Windows; hướng dẫn bổ sung `sys.stdout.reconfigure(encoding='utf-8')` để script in tiếng Việt chuẩn.<br>**2. Thẩm định toán học & Hiệu chỉnh Bias:** Phát hiện ban đầu hàm logit bị lệch âm làm tỷ lệ trễ hạn chỉ đạt 0.01%; sinh viên yêu cầu chuẩn hóa lại biến `CreditScore` và cân chỉnh bias về `-2.15` để đạt tỷ lệ trễ hạn chuẩn xác **20.66%** (`2.066 / 10.000` ca trễ hạn).<br>**3. Đánh giá ma trận tương quan (EDA):** Thẩm định kết quả tương quan: `HistoricalOverdue (+0.40)`, `CreditScore (-0.37)`, `TotalDebt (+0.21)` — xác nhận hoàn toàn phù hợp với thực tế hành vi bạn đọc.<br>**4. Nghiệm thu bàn giao:** Xác nhận 4 tệp dữ liệu sạch, sẵn sàng cho Giai đoạn 2 (Huấn luyện & Đối sánh). |

---

## CHI TIẾT KỸ THUẬT CÁC BƯỚC ĐÃ THẨM ĐỊNH (TECHNICAL APPENDIX)

### 1. Công thức phân phối xác suất trễ hạn đã nghiệm thu:
Hàm Logit biểu diễn rủi ro trễ hạn của một lượt mượn sách:
$$\text{credit\_norm} = \frac{\text{CreditScore} - 80}{10}, \quad \text{debt\_norm} = \frac{\text{TotalCurrentDebt}}{30000}$$
$$z = -2.15 + 0.30 \times (\text{CurrentHoldingBooks} - 2) + 0.58 \times \text{HistoricalOverdueCount} - 0.68 \times \text{credit\_norm} + 0.38 \times \text{debt\_norm} + 0.45 \times \text{IsExamSeason} - 0.75 \times \mathbb{I}_{(\text{Giảng viên})}$$
$$P(\text{Trễ hạn}) = \frac{1}{1 + e^{-z}}$$

### 2. Bảng ánh xạ nhãn Categorical bàn giao cho Backend (.NET 10):
* **`Faculty`:** `CNTT: 0`, `Cơ khí: 1`, `Kinh tế: 2`, `Luật: 3`, `Ngoại ngữ: 4`, `Y dược: 5`
* **`MemberType`:** `Giảng viên: 0`, `Học viên SĐH: 1`, `Sinh viên: 2`
* **Tệp cấu hình lưu trữ:** [`data/encoders_metadata.json`](data/encoders_metadata.json)
