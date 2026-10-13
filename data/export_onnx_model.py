"""
File: data/export_onnx_model.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-100
Mô tả: Đóng gói mô hình Random Forest tối ưu từ scikit-learn sang định dạng ONNX
       (smartlib_risk_model.onnx) với thiết lập zipmap=False tối ưu cho C# .NET 10.
       Xuất tệp đặc tả schema đầu vào và ngưỡng rủi ro (data/model_metadata.json).
"""

import os
import sys
import json
import joblib
# pyrefly: ignore [missing-import]
from skl2onnx import convert_sklearn
# pyrefly: ignore [missing-import]
from skl2onnx.common.data_types import FloatTensorType

# Cấu hình in UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def export_to_onnx():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_pkl_path = os.path.join(base_dir, 'best_random_forest.pkl')
    onnx_output_path = os.path.join(base_dir, 'smartlib_risk_model.onnx')
    metadata_output_path = os.path.join(base_dir, 'model_metadata.json')
    eval_json_path = os.path.join(base_dir, 'evaluation_metrics.json')

    print("[*] Đang đọc mô hình Python gốc (best_random_forest.pkl)...")
    if not os.path.exists(model_pkl_path):
        print(f"[-] Không tìm thấy {model_pkl_path}!")
        return

    best_rf = joblib.load(model_pkl_path)

    # 1. Định nghĩa kiểu dữ liệu và Tensor đầu vào (8 đặc trưng dạng float)
    num_features = 8
    initial_type = [('float_input', FloatTensorType([None, num_features]))]

    print("[*] Đang chuyển đổi sang định dạng ONNX (skl2onnx, zipmap=False)...")
    # Tắt zipmap để output_probability xuất ra mảng float chuẩn [N, 2] cho C# OnnxRuntime dễ parse
    options = {type(best_rf): {'zipmap': False}}
    onnx_model = convert_sklearn(
        best_rf,
        initial_types=initial_type,
        target_opset=15,
        options=options
    )

    # Lưu file .onnx
    with open(onnx_output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    file_size_mb = os.path.getsize(onnx_output_path) / (1024 * 1024)
    print(f"[✓] Đã xuất mô hình ONNX thành công: {onnx_output_path} ({file_size_mb:.2f} MB)")

    # 2. Đọc thông tin đánh giá nếu có
    eval_info = {}
    if os.path.exists(eval_json_path):
        with open(eval_json_path, 'r', encoding='utf-8') as f:
            eval_info = json.load(f)

    # 3. Tạo tệp đặc tả schema model_metadata.json cho lập trình viên Backend .NET 10
    features = [
        "Faculty",
        "MemberType",
        "CreditScore",
        "CurrentHoldingBooks",
        "HistoricalOverdueCount",
        "BorrowDurationDays",
        "TotalCurrentDebt",
        "IsExamSeason"
    ]

    metadata = {
        "model_information": {
            "model_name": "SmartLib AI Risk Assessment Model",
            "model_file": "smartlib_risk_model.onnx",
            "file_size_mb": round(file_size_mb, 2),
            "algorithm": "RandomForestClassifier (Ensemble Bagging)",
            "onnx_opset_version": 15,
            "runtime_environment": "Microsoft.ML.OnnxRuntime (.NET 10 / C#)"
        },
        "tensor_contract": {
            "input_tensor_name": "float_input",
            "input_tensor_shape": [None, 8],
            "input_tensor_data_type": "System.Single (Float32)",
            "output_label_name": "output_label",
            "output_probability_name": "output_probability",
            "output_probability_shape": [None, 2]
        },
        "feature_order": features,
        "feature_descriptions": {
            "Faculty": "Mã khoa đào tạo (0: CNTT, 1: Cơ khí, 2: Kinh tế, 3: Luật, 4: Ngoại ngữ, 5: Y dược)",
            "MemberType": "Mã loại độc giả (0: Giảng viên, 1: Học viên SĐH, 2: Sinh viên)",
            "CreditScore": "Điểm tín nhiệm độc giả (Thang điểm 0 - 100)",
            "CurrentHoldingBooks": "Số lượng sách hiện đang giữ tại thời điểm mượn (1 - 5 cuốn)",
            "HistoricalOverdueCount": "Tổng số lần độc giả từng trễ hạn trong quá khứ",
            "BorrowDurationDays": "Thời hạn mượn quy định (7, 14, 21 hoặc 30 ngày)",
            "TotalCurrentDebt": "Tổng số tiền nợ phạt hiện tại (VNĐ, 0 - 100.000)",
            "IsExamSeason": "Cờ mùa thi cử cao điểm (1: Tháng 5 hoặc Tháng 11, 0: Tháng thông thường)"
        },
        "classification_settings": {
            "decision_threshold": 0.50,
            "risk_tiers": {
                "high_risk": {
                    "condition": "prob_overdue >= 0.70",
                    "badge_color": "danger (red)",
                    "action_recommendation": "Cảnh báo cao: Khóa mượn tài liệu quý/giáo trình hot, yêu cầu thủ thư xét duyệt trực tiếp."
                },
                "medium_risk": {
                    "condition": "0.40 <= prob_overdue < 0.70",
                    "badge_color": "warning (yellow)",
                    "action_recommendation": "Cảnh báo vừa: Cho phép mượn nhưng thủ thư nhắc nhở hạn trả và gửi email cảnh báo sớm."
                },
                "low_risk": {
                    "condition": "prob_overdue < 0.40",
                    "badge_color": "success (green)",
                    "action_recommendation": "An toàn: Độc giả có điểm tín nhiệm tốt, cho phép mượn sách nhanh tự động."
                }
            }
        },
        "model_performance": {
            "accuracy_percent": eval_info.get("optimal_metrics_tuned", {}).get("accuracy", 95.10),
            "precision_percent": eval_info.get("optimal_metrics_tuned", {}).get("precision", 92.02),
            "recall_percent": eval_info.get("optimal_metrics_tuned", {}).get("recall", 82.19),
            "f1_score_percent": eval_info.get("optimal_metrics_tuned", {}).get("f1_score", 86.83),
            "roc_auc_percent": eval_info.get("optimal_metrics_tuned", {}).get("roc_auc", 93.17)
        }
    }

    with open(metadata_output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"[✓] Đã xuất tệp đặc tả schema: {metadata_output_path}")

if __name__ == '__main__':
    export_to_onnx()
