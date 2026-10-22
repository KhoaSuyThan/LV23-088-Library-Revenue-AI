---
name: jira-git
description: Hướng dẫn đặt tên nhánh Git và thông điệp commit chuẩn mã Jira bằng tiếng Việt cho dự án SmartLib AI.
---

# Kỹ năng Quản lý Git & Jira (`jira-git`)

## 1. Quy tắc đặt tên nhánh (Branch Naming)
Mọi nhánh làm việc cho một tính năng, sửa lỗi hoặc cải tiến đều phải gắn với mã Jira Story của dự án (mã tiền tố: `L0LRA-` hoặc `LOLRA-`):

* **Cú pháp chuẩn:** `L0LRA-<Mã-Jira>-<mo-ta-ngan-gon-viet-thuong-ngan-cach-bang-dau-gach-ngang>`
* **Ví dụ thực tế:**
  * `L0LRA-118-ui-improvements-and-bugfixes`
  * `L0LRA-78-reader-management`
  * `L0LRA-94-demo-data`
  * `L0LRA-88-integrate-onnx-model`

## 2. Quy tắc viết Commit (Commit Message)
* **Ngôn ngữ bắt buộc:** 100% Tiếng Việt rõ ràng, đi thẳng vào trọng tâm công việc, không viết chung chung.
* **Cấu trúc thông điệp commit:**
  ```text
  L0LRA-<Mã-Jira>: <Hành động cụ thể bằng tiếng Việt>
  ```
  *Hoặc:*
  ```text
  <Hành động cụ thể bằng tiếng Việt> (Story L0LRA-<Mã-Jira>)
  ```
* **Ví dụ chuẩn:**
  * `git commit -m "L0LRA-118: Khóa bảo mật API, nâng cấp health check và tối ưu bundle frontend"`
  * `git commit -m "L0LRA-78: Bổ sung chức năng khóa mở thẻ bạn đọc và thống kê nợ phạt"`

## 3. Quy trình đề xuất cho người dùng
1. Kiểm tra trạng thái và nhánh hiện tại: `git status -s`, `git branch --show-current`.
2. Tuyệt đối **KHÔNG tự ý commit** mã nguồn lên Git khi chưa có sự xác nhận của người dùng.
3. Luôn cung cấp sẵn bộ lệnh Git đầy đủ để người dùng copy chạy:
   ```bash
   git checkout <Tên-Nhánh-Chuẩn-Jira>
   git add .
   git commit -m "<Thông-điệp-tiếng-Việt-kèm-mã-Jira>"
   git push origin <Tên-Nhánh-Chuẩn-Jira>
   ```
