# Kế hoạch xử lý và kiểm chứng lỗi mượn, trả, cập nhật trạng thái sách

> Ngày lập: 28/10/2026  
> Phạm vi: API/backend và frontend liên quan đến tạo phiếu mượn, xử lý trả sách, cập nhật trạng thái bản sao.  
> Nguyên tắc dữ liệu: Không thay đổi hoặc xóa dữ liệu mẫu trong `src/SmartLibAI.API/Program.cs`.

## 1. Bằng chứng hiện có

Các kiểm tra sau được thực hiện trên API production qua Swagger:

- Đăng nhập tài khoản thử nghiệm thành công.
- API kiểm tra điều kiện mượn trả `canBorrow=true` cho độc giả đã tra cứu.
- Tra cứu mã vạch `BC000001-B` trả trạng thái `Borrowed`.
- Gửi yêu cầu mượn lại mã vạch đang `Borrowed` bị từ chối với HTTP 400 và thông báo trạng thái hiện tại.
- Gửi giá trị trạng thái bản sao ngoài danh sách cho phép bị từ chối HTTP 400.
- Chưa thực hiện mượn thành công, trả sách hoặc chuyển trạng thái hợp lệ trên production vì những request đó sẽ ghi dữ liệu thật.

Các kiểm tra trên chỉ xác nhận những đường đi cụ thể vừa gọi; chưa phải kiểm thử toàn bộ nghiệp vụ.

## 2. Rủi ro đã thấy khi đối chiếu mã nguồn

1. **Tranh chấp khi mượn đồng thời:** `BorrowService` kiểm tra trạng thái bản sao trước transaction. `BorrowRepository.CreateBorrowingWithTransactionAsync` sau đó tải các bản sao và đặt trạng thái `Borrowed` mà không kiểm tra lại trạng thái trong transaction. Hai request đồng thời có thể cùng qua bước kiểm tra.
2. **Cập nhật trạng thái không ràng buộc phiếu mượn:** `BookRepository.UpdateCopyStatusAsync` gán trực tiếp trạng thái gửi lên. Có thể làm bản sao đang mượn thành `Available`, hoặc thành `Borrowed` mà không có chi tiết mượn tương ứng.
3. **Tình trạng trả sách chưa được giới hạn:** `ReturnBookRequestDto.Condition` chưa có validator danh sách cho phép. Giá trị lạ có thể đi vào xử lý và bị repository coi như trả bình thường, trong khi tính phí chỉ nhận các tình trạng đã biết.
4. **Cần kiểm chứng tính nguyên tử của trả sách:** cần xác nhận cập nhật chi tiết mượn, bản sao, phiếu phạt và phiếu mượn cùng commit hoặc cùng rollback ở tất cả nhánh lỗi.
5. **Frontend trả nhiều sách tuần tự:** nếu một request thành công rồi request tiếp theo thất bại, giao diện cần phản ánh chính xác phần đã hoàn tất và phần còn lại, tránh người dùng gửi lại gây nhầm lẫn.

## 3. Kế hoạch theo thứ tự ưu tiên

### P0 — Bảo toàn trạng thái và ngăn mượn trùng

- Chuyển kiểm tra khả dụng và ghi nhận mượn vào cùng một transaction ở tầng repository/DB.
- Dùng khóa phù hợp hoặc cập nhật có điều kiện để mỗi bản sao chỉ được nhận bởi một giao dịch đồng thời; kiểm tra số bản sao được cập nhật có đúng bằng số yêu cầu.
- Nếu có bản sao không còn khả dụng, hủy toàn bộ giao dịch và không để lại phiếu mượn hoặc chi tiết một phần.
- Với endpoint cập nhật trạng thái, từ chối chuyển trạng thái mâu thuẫn với chi tiết mượn đang hoạt động. Xác định rõ trạng thái nào được phép chuyển thủ công và trạng thái nào chỉ được tạo bởi nghiệp vụ mượn/trả.
- Trả lỗi nghiệp vụ dễ hiểu (409 cho xung đột trạng thái nếu phù hợp API hiện tại), giữ nguyên dữ liệu khi bị từ chối.

**Tiêu chí hoàn thành:** hai request đồng thời cùng mượn một bản sao chỉ có tối đa một request thành công; request thất bại không tạo dữ liệu dở dang; không thể đặt bản sao đang mượn thành `Available` bằng endpoint trạng thái.

### P1 — Ràng buộc và giao dịch trả sách

- Ràng buộc `Condition` theo các giá trị được hỗ trợ: `Good`, `DamagedLight`, `DamagedMedium`, `DamagedSevere`, `Lost` (giữ alias hiện có nếu cần tương thích).
- Kiểm tra `DamagePercent` và `WaiverDiscountPercent` theo quy tắc nghiệp vụ; không cho giá trị tùy ý làm sai lệch khoản phạt/bồi thường.
- Đảm bảo trả trùng bị từ chối; cập nhật `BorrowingDetail`, `BookCopy`, `FineReceipt` và trạng thái phiếu mượn nằm trong cùng transaction.
- Kiểm tra mọi nhánh lỗi để chắc chắn rollback toàn bộ; không tạo phiếu phạt thiếu hoặc giải phóng bản sao khi trả thất bại.
- Với trả nhiều sách ở frontend, hiển thị kết quả từng mã vạch và trạng thái đã hoàn tất/chưa hoàn tất; không tự gửi lại giao dịch đã thành công.

**Tiêu chí hoàn thành:** điều kiện hợp lệ ánh xạ đúng trạng thái và mức phí; condition không hợp lệ bị từ chối trước khi ghi; trả lặp không phát sinh phiếu phạt/trạng thái lần hai; lỗi giữa giao dịch không để lại cập nhật một phần.

### P2 — Kiểm thử tự động nghiệp vụ và phân quyền

- Mượn: độc giả hoạt động/hết hạn/bị khóa/có nợ phạt/vượt hạn mức; mã vạch thiếu, trùng, không tồn tại, không khả dụng; sách ngừng lưu thông.
- Mượn đồng thời: hai request cùng một bản sao; một request nhiều bản sao khi một bản sao vừa bị request khác lấy.
- Trả: đúng hạn/quá hạn; Good và từng loại hư hỏng/mất; chiết khấu biên; trả lặp; lỗi ghi phiếu phạt; phiếu có nhiều sách và trả từng phần.
- Cập nhật trạng thái: giá trị không hợp lệ; mọi chuyển trạng thái hợp lệ; các chuyển đổi mâu thuẫn với phiếu mượn đang mở; kiểm tra dữ liệu sau request bị từ chối không đổi.
- Kiểm thử quyền: anonymous, Reader, Staff, Admin theo ma trận quyền từng endpoint; không dùng tài khoản Admin cho các thử nghiệm nhằm chứng minh quyền Staff/Reader.
- Thêm log có mã tương quan và thông tin lỗi nghiệp vụ cần thiết; không ghi mật khẩu, token hoặc thông tin cá nhân không cần thiết.

**Tiêu chí hoàn thành:** bộ kiểm thử chạy ổn định trên DB test riêng, không phụ thuộc seed production; có kiểm tra cả response lẫn trạng thái dữ liệu sau mỗi thao tác.

### P3 — Kiểm thử triển khai staging và production

- Tạo dữ liệu dùng một lần trên staging: độc giả, bản sao Available, bản sao Borrowed và cấu hình quy tắc phạt.
- Chạy luồng thật: mượn thành công → tra cứu phiếu → trả sách → xác nhận trạng thái bản sao, trạng thái phiếu và khoản phạt.
- Chạy các ca bị từ chối và xác minh DB không thay đổi.
- Xác nhận frontend deploy gọi đúng API, gửi JWT thật, xử lý status/body lỗi và không báo thành công khi backend thất bại.
- Sau khi staging đạt, deploy backend/frontend theo đúng thứ tự phụ thuộc; chạy smoke test production chỉ đọc. Chỉ thực hiện giao dịch production khi có dữ liệu thử được chủ hệ thống cho phép thay đổi và có cách hoàn nguyên được thống nhất.

**Tiêu chí đóng:** staging hoàn tất luồng mượn/trả và các ca trạng thái; production xác nhận endpoint và cấu hình deploy đúng; không còn lỗi 401/403/5xx ngoài dự kiến trong luồng đã nghiệm thu.

## 4. Thứ tự triển khai đề xuất

1. Viết test hồi quy cho lỗi đã tái hiện: mượn bản sao Borrowed và cập nhật status không hợp lệ.
2. Sửa tính nguyên tử/chống tranh chấp ở luồng mượn và khóa chuyển trạng thái thủ công.
3. Ràng buộc condition và hoàn thiện transaction trả sách.
4. Sửa phản hồi UI cho trả nhiều sách và lỗi API.
5. Chạy toàn bộ kiểm tra trên DB test; rà lại quyền theo vai trò.
6. Triển khai staging và hoàn tất kiểm thử end-to-end bằng dữ liệu dùng một lần.
7. Deploy production và chạy kiểm tra chỉ đọc; giao dịch thật chỉ trên bản ghi thử được cho phép.

## 5. Ngoài phạm vi file plan này

- Không xóa hoặc sửa dữ liệu mẫu/seed trong `Program.cs`.
- Không thực hiện giao dịch mượn/trả/cập nhật trạng thái trên production trong lúc lập kế hoạch.
- Không khẳng định luồng mượn thành công hoặc trả sách đã hoạt động cho tới khi được kiểm thử end-to-end trong môi trường có dữ liệu thử an toàn.
