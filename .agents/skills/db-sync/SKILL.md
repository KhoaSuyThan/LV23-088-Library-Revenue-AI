---
name: db-sync
description: Hướng dẫn trích xuất và đồng bộ CSDL từ máy cục bộ lên máy chủ Cloud MonsterASP an toàn, tránh tường lửa WAF.
---

# Kỹ năng Đồng bộ CSDL Cloud (`db-sync`)

Áp dụng khi cần đồng bộ dữ liệu hoặc cập nhật cấu trúc schema CSDL giữa Local (`SmartLibAI`) và Cloud MonsterASP (`db75065`).

## 1. Nguyên tắc An toàn Tường lửa WAF (MonsterASP)
* **Tuyệt đối KHÔNG sử dụng:**
  * Lệnh `CREATE DATABASE` hoặc `ALTER DATABASE`.
  * Lệnh `USE [TênCSDL]` hoặc `GO` không hợp lệ (WAF sẽ lập tức ngắt kết nối).
* **Chia nhỏ dữ liệu theo Batch:**
  * Các bảng dữ liệu lớn (như `Books` 11.000 dòng, `BookCopies` 55.000 dòng) bắt buộc phải chia nhỏ thành các batch tối đa **500 dòng/câu lệnh INSERT**.
  * Tách file script nếu dung lượng vượt quá 2 MB (ví dụ: `02a_copies.sql`, `02b_copies.sql`).

## 2. Thứ tự thực thi theo quan hệ khóa ngoại (FK)
Khi nạp mới hoặc đồng bộ, bắt buộc tuân theo thứ tự phụ thuộc:
1. `Roles`, `Categories`, `FineRules`, `WaiverReasons` (Bảng danh mục cha).
2. `Books` (Đầu sách).
3. `BookCopies` (Bản sao sách vật lý).
4. `Users`, `Readers` (Hồ sơ người dùng và bạn đọc).
5. `CirculationTransactions`, `BorrowReceipts`, `Fines`, `Invoices`, `AIPredictionLogs` (Giao dịch lưu thông & phạt).

## 3. Quản lý Khóa chính Identity
* Sử dụng `SET IDENTITY_INSERT [TênBảng] ON;` trước khi nạp dữ liệu có sẵn ID.
* Bắt buộc đóng lại bằng `SET IDENTITY_INSERT [TênBảng] OFF;` ngay sau khi nạp xong từng bảng.

## 4. Bảo tồn dữ liệu Seeding Local
* Khi có bất kỳ thay đổi nào về schema, **bắt buộc cập nhật đồng thời cả script SQL trong thư mục `data/` lẫn mã khởi tạo tự động trong `src/SmartLibAI.API/Program.cs`**.
* Không tự ý xóa hoặc thay đổi dữ liệu demo đang phục vụ chấm điểm.
