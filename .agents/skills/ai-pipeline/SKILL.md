---
name: ai-pipeline
description: Hướng dẫn chuẩn hóa dữ liệu, huấn luyện mô hình Random Forest, xuất file ONNX và nhúng suy luận In-Process cho SmartLib AI.
---

# Kỹ năng Vận hành Mô hình AI ONNX (`ai-pipeline`)

Áp dụng khi cần kiểm tra, huấn luyện lại (Retrain) hoặc nâng cấp mô hình AI dự báo nguy cơ trễ hạn mượn sách.

## 1. Thứ tự 8 đặc trưng đầu vào (Bắt buộc chuẩn hóa)
Khi suy luận qua ONNX Runtime, mảng `DenseTensor<float>(1, 8)` bắt buộc phải tuân theo đúng thứ tự đã định nghĩa trong `data/model_metadata.json`:

| Chỉ số | Tên đặc trưng | Kiểu dữ liệu | Quy tắc mã hóa |
| :---: | :--- | :---: | :--- |
| **0** | `Faculty` | float | 0: CNTT, 1: Cơ khí, 2: Kinh tế, 3: Luật, 4: Ngoại ngữ, 5: Y Dược |
| **1** | `MemberType` | float | 0: Giảng viên, 1: Cao học/SĐH, 2: Sinh viên |
| **2** | `CreditScore` | float | Điểm tín nhiệm (0 - 100) |
| **3** | `CurrentHoldingBooks`| float | Số sách đang giữ trong tay |
| **4** | `HistoricalOverdueCount`| float | Số lần từng trễ hạn trong quá khứ |
| **5** | `BorrowDurationDays` | float | Số ngày đăng ký mượn |
| **6** | `TotalCurrentDebt` | float | Tổng tiền phạt đang nợ tồn đọng (VNĐ) |
| **7** | `IsExamSeason` | float | 1.0 nếu trong mùa thi, 0.0 nếu ngày thường |

## 2. Quy tắc Nhúng In-Process (C# ONNX Runtime)
* Khởi tạo `InferenceSession` một lần duy nhất theo dạng Singleton (`OnnxAIPredictionService`).
* Bật cờ tối ưu: `GraphOptimizationLevel = ORT_ENABLE_ALL` để đạt tốc độ suy luận dưới 1ms.
* Luôn bọc trong khối `try-catch` an toàn. Nếu thiếu file ONNX hoặc suy luận lỗi, tự động chuyển về hàm `FallbackRiskEvaluation`.

## 3. Quy tắc Minh bạch hóa Kết quả Dự báo
* Nếu suy luận thành công từ ONNX:
  * `IsHeuristicFallback = false`
  * `PredictionSource = "ONNX_Model"`
* Nếu rơi vào nhánh dự phòng:
  * `IsHeuristicFallback = true`
  * `PredictionSource = "Heuristic_Fallback"`
* Tuyệt đối không trình bày kết quả Heuristic như thể là kết quả máy học của mô hình ONNX.
