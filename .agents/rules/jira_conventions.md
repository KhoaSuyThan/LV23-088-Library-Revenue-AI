# QUY ƯỚC ĐẶT TÊN NHÁNH GIT & COMMIT THEO ĐÚNG MẪU JIRA CLOUD

Mỗi khi người dùng cung cấp hoặc nhắc đến mã Jira Issue (ví dụ: `LOLRA-<Số>` hoặc `LOLRA-<Số> <tiêu đề>`):

1. **Lệnh tạo & chuyển nhánh (Create branch - Đúng mẫu popup Jira gợi ý):**
   Luôn bắt đầu trực tiếp bằng mã Issue (KHÔNG thêm tiền tố `feat/`):
   ```bash
   git checkout -b LOLRA-<Số>-<tieu-de-slug-khong-dau>
   ```
   - Ví dụ: `git checkout -b LOLRA-78-viet-api-quan-ly-doc-gia-va-khoa-the`

2. **Lệnh Commit (Create commit - Đúng mẫu popup Jira gợi ý):**
   Luôn bắt đầu trực tiếp bằng mã Issue ở đầu message (KHÔNG dùng tiền tố `feat(...)` hay ngoặc vuông `[]`):
   ```bash
   git commit -m "LOLRA-<Số> <Tiêu đề công việc>"
   ```
   - Ví dụ: `git commit -m "LOLRA-78 Viết API Quản lý độc giả & Khóa thẻ"`
