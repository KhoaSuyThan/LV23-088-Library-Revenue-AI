# QUY ƯỚC ĐẶT TÊN NHÁNH GIT & COMMIT THEO ĐÚNG MẪU JIRA CLOUD

Mỗi khi người dùng cung cấp hoặc nhắc đến mã Jira Issue (ví dụ: `L0LRA-<Số>` hoặc `L0LRA-<Số> <tiêu đề>` - LƯU Ý KÝ TỰ THỨ 2 LÀ SỐ KHÔNG '0'):

1. **Lệnh tạo & chuyển nhánh (Create branch - Đúng mẫu popup Jira gợi ý):**
   Luôn bắt đầu trực tiếp bằng mã Issue `L0LRA` (KHÔNG thêm tiền tố `feat/`):
   ```bash
   git checkout -b L0LRA-<Số>-<tieu-de-slug-khong-dau>
   ```
   - Ví dụ: `git checkout -b L0LRA-78-reader-management`

2. **Lệnh Commit (Create commit - Đúng mẫu popup Jira gợi ý):**
   Luôn bắt đầu trực tiếp bằng mã Issue `L0LRA` ở đầu message (KHÔNG dùng tiền tố `feat(...)` hay ngoặc vuông `[]`):
   ```bash
   git commit -m "L0LRA-<Số> <Tiêu đề công việc>"
   ```
   - Ví dụ: `git commit -m "L0LRA-78 Viết API Quản lý độc giả & Khóa thẻ"`
