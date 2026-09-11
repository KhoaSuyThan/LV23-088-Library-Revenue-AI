# LV23-088: HỆ THỐNG BÁO CÁO DOANH THU & AI DỰ BÁO TRỄ HẠN THƯ VIỆN

> **Môn học:** Quản lý dự án CNTT  
> **Học kỳ:** HK1 (2026 - 2027)  
> **Thời gian thực hiện:** 08/09/2026 – 08/11/2026 (8 tuần kỹ thuật + 1 tuần bảo vệ)

---

## 1. Giới thiệu tổng quan
Dự án **LV23-088** tập trung giải quyết bài toán quản trị thất thoát tài sản và tối ưu hóa nguồn thu tài chính cho hệ thống thư viện. Hệ thống số hóa toàn bộ quy trình lưu thông sách, tự động hóa xử lý vi phạm, đồng thời ứng dụng mô hình Trí tuệ nhân tạo (Machine Learning) để phân tích hành vi độc giả nhằm đưa ra cảnh báo sớm nguy cơ trễ hạn trước khi sự cố phát sinh.

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

* **Frontend:** Web Dashboard tương tác (React / HTML5 / Bootstrap 5 / Chart.js).
* **Backend:** ASP.NET Core Web API / Python Flask xây dựng theo chuẩn RESTful.
* **Database:** SQL Server / PostgreSQL chuẩn hóa 12 bảng (Users, Roles, Readers, Categories, Books, BookCopies, Borrowings, BorrowingDetails, FineRules, FineReceipts, AIPredictionLogs, Notifications).
* **Trí tuệ nhân tạo (AI Engine):**
  * Thư viện: Python (Scikit-learn, Pandas, NumPy).
  * Thuật toán: Random Forest / Logistic Regression phân loại nhị phân (Nguy cơ trễ hạn: Có / Không).
  * Thuộc tính đầu vào (Features): Số lần trễ quá khứ, loại sách mượn, số lượng sách đang giữ, thời gian mượn.
* **Hạ tầng & Công cụ:** Git, GitHub, Atlassian Jira, Figma, Render/Vercel/Supabase Free-tier.

---

## 5. Quy chuẩn phát triển mã nguồn (Git Workflow)

Dự án áp dụng mô hình phân nhánh **Gitflow rút gọn**:

* `main`: Nhánh ổn định (Production), chỉ tiếp nhận mã nguồn sau khi hoàn thành Sprint và kiểm thử thành công.
* `develop`: Nhánh làm việc trung tâm, tích hợp các tính năng của các thành viên.
* `feature/<ten-tinh-nang>`: Nhánh con được rẽ nhánh từ `develop` để mỗi cá nhân phát triển độc lập (ví dụ: `feature/auth`, `feature/borrow-api`, `feature/ai-model`).

### Quy ước đặt tên commit (Conventional Commits):
* `feat`: Thêm một tính năng mới.
* `fix`: Sửa lỗi phát sinh.
* `docs`: Cập nhật tài liệu, README.
* `style`: Chỉnh sửa giao diện, định dạng code.
* `refactor`: Tối ưu hóa cấu trúc mã nguồn.

---

## 6. Lộ trình triển khai (Sprint Roadmap)

* **Sprint 1 (Tuần 1):** Khởi động dự án, Project Charter, ma trận RACI, thiết lập Jira Backlog & Git Repo, khảo sát phạm vi và phác thảo sơ bộ UI/DB.
* **Sprint 2 (Tuần 2 - 3):** Đặc tả chi tiết SRS, thiết kế ERD 12 bảng chuẩn hóa, dựng Prototype Figma và khung Base Backend.
* **Sprint 3 (Tuần 4 - 6):** Lập trình các nghiệp vụ lõi (Mượn/Trả, Xử lý tính phạt, Dashboard doanh thu) và xây dựng module AI.
* **Sprint 4 (Tuần 7 - 8):** Tích hợp toàn diện hệ thống, kiểm thử hệ thống (System Test), sửa lỗi (Bug Fixing) và đóng gói triển khai.
* **Nghiệm thu (Tuần 9):** Báo cáo và bảo vệ đồ án trước hội đồng giảng viên.

---

## 7. Giấy phép phát hành (License)

Dự án được cấp phép theo [Non-Commercial & Educational License](LICENSE):
* **Học tập & Nghiên cứu:** Được phép tự do đọc, tham khảo, thử nghiệm và trích dẫn phục vụ học thuật.
* **Phi thương mại:** **Nghiêm cấm** mọi hành vi sao chép, sử dụng hoặc tái phân phối nhằm mục đích thương mại, kinh doanh và tạo ra lợi nhuận tài chính khi chưa được nhóm tác giả đồng ý.