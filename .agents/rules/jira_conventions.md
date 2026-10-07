# QUY ƯỚC ĐẶT TÊN NHÁNH GIT & COMMIT THEO JIRA (SMART COMMITS)

Mỗi khi người dùng nhắc đến hoặc cung cấp mã Jira Issue (ví dụ: `LOLRA-<Số>` hoặc `LOLRA-<Số> <tiêu đề>`):

1. **Lệnh tạo & chuyển nhánh (Create branch):**
   Luôn tự động đề xuất lệnh tạo nhánh tính năng chuẩn Jira:
   ```bash
   git checkout -b feat/LOLRA-<Số>-<slug-tinh-nang>
   ```
   *(hoặc `fix/LOLRA-<Số>-<slug-tinh-nang>` đối với lỗi)*

2. **Lệnh Commit (Create commit):**
   Luôn tự động đề xuất lệnh commit chuẩn Conventional Commit có gắn mã Jira để hệ thống Jira tự động bắt và liên kết:
   ```bash
   git commit -m "<type>(<scope>): [LOLRA-<Số>] <Mô tả ngắn gọn công việc bằng tiếng Việt>"
   ```
   - Ví dụ: `git commit -m "feat(reader): [LOLRA-78] Viết API Quản lý độc giả & Khóa thẻ"`
