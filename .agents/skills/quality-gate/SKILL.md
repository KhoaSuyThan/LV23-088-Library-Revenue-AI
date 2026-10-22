---
name: quality-gate
description: Quy trình kiểm tra chất lượng, tự động chạy unit test, build frontend và cập nhật CHANGELOG trước khi bàn giao.
---

# Kỹ năng Kiểm soát Chất lượng & Bàn giao (`quality-gate`)

Kỹ năng này bắt buộc kích hoạt trước khi kết thúc bất kỳ lượt chỉnh sửa mã nguồn nào trên dự án SmartLib AI.

## 1. Các bước kiểm tra tự động bắt buộc
1. **Kiểm thử Backend (`dotnet test`):**
   * Chạy lệnh: `dotnet test tests/SmartLibAI.Tests/SmartLibAI.Tests.csproj`.
   * Tiêu chuẩn đạt: 100% test cases PASSED (không có bài test nào bị Fail).
2. **Kiểm tra biên dịch Frontend (`npm run build`):**
   * Chạy lệnh: `npm --prefix frontend run build`.
   * Tiêu chuẩn đạt: Build thành công trong < 2 giây, không có cảnh báo chunk > 500 kB (file `index.js` chính duy trì < 500 kB).
3. **Kiểm tra trạng thái Backend:**
   * Đảm bảo controller `HealthController` trả về đúng trạng thái kết nối CSDL và tình trạng nạp mô hình AI.

## 2. Quy tắc cập nhật CHANGELOG
* Luôn cập nhật tóm tắt các thay đổi vào file `CHANGELOG.md` tại thư mục gốc.
* **Vị trí bắt buộc:** Chèn ngay bên dưới dòng thứ 7 (ngay sau dấu phân cách `---`) để nội dung mới nhất luôn ở đầu file.
* Định dạng tiêu đề: `## [YYYY-MM-DD] - <Tiêu đề ngắn gọn bằng Tiếng Việt>`.

## 3. Quy tắc trình bày minh chứng bàn giao
* Ngôn ngữ đời thường, ngắn gọn, dễ hiểu, không học thuật rườm rà.
* Chỉ tập trung vào những việc vừa làm trong lượt hiện tại (không gom lại các việc cũ đã làm từ trước).
* Cung cấp số liệu kiểm thử thực tế (số bài test pass, dung lượng bundle đã giảm).
