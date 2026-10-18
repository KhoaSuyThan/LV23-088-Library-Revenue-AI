"""
File: data/smoke_test_onnx.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-100
Mô tả: Kịch bản kiểm thử đối chiếu (Smoke Test) giữa mô hình gốc Python (best_random_forest.pkl)
       và mô hình nhị phân (smartlib_risk_model.onnx) trên 20 mẫu ngẫu nhiên từ test_data.csv.
       Yêu cầu độ lệch sai số xác suất lớn nhất (Max Absolute Error) < 10^-5.
"""

import os
import sys
# pyrefly: ignore [missing-import]
import joblib
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import onnxruntime as rt

# Cấu hình in UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_smoke_test(num_samples=20, random_seed=42):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_pkl_path = os.path.join(base_dir, 'best_random_forest.pkl')
    onnx_path = os.path.join(base_dir, 'smartlib_risk_model.onnx')
    test_path = os.path.join(base_dir, 'test_data.csv')

    print("=" * 88)
    print("KỊCH BẢN KIỂM THỬ ĐỐI CHIẾU MÔ HÌNH (SMOKE TEST: PKL vs ONNX)")
    print("=" * 88)

    # 1. Tải dữ liệu kiểm thử
    test_df = pd.read_csv(test_path, encoding='utf-8')
    feature_cols = [c for c in test_df.columns if c != 'IsOverdue']

    # Lấy 20 mẫu ngẫu nhiên
    sample_df = test_df.sample(n=num_samples, random_state=random_seed)
    X_sample = sample_df[feature_cols].values.astype(np.float32)
    y_true = sample_df['IsOverdue'].values

    # 2. Tải mô hình scikit-learn
    print(f"[*] Nạp mô hình scikit-learn: {model_pkl_path}")
    rf_model = joblib.load(model_pkl_path)
    proba_sklearn = rf_model.predict_proba(X_sample)[:, 1]

    # 3. Tải mô hình ONNX Runtime
    print(f"[*] Nạp mô hình ONNX Runtime: {onnx_path}")
    sess_options = rt.SessionOptions()
    sess_options.log_severity_level = 3  # Chỉ in lỗi nghiêm trọng
    session = rt.InferenceSession(onnx_path, sess_options, providers=['CPUExecutionProvider'])

    input_name = session.get_inputs()[0].name
    output_names = [o.name for o in session.get_outputs()]
    print(f"[+] Input tensor: '{input_name}' | Output tensors: {output_names}")

    # Chạy suy luận ONNX
    onnx_results = session.run(None, {input_name: X_sample})
    # outputs: [0] = labels, [1] = probabilities [N, 2]
    proba_onnx = onnx_results[1][:, 1]

    # 4. So sánh đối chiếu sai số
    abs_errors = np.abs(proba_sklearn - proba_onnx)
    max_error = float(np.max(abs_errors))
    mean_error = float(np.mean(abs_errors))

    print("\n" + "-" * 88)
    print(f"{'STT':<5} | {'Nhãn thật':<10} | {'Xác suất Sklearn':<18} | {'Xác suất ONNX':<18} | {'Độ lệch sai số':<16} | {'Kết quả':<8}")
    print("-" * 88)

    pass_count = 0
    tolerance = 1e-5

    for i in range(num_samples):
        p_sk = proba_sklearn[i]
        p_on = proba_onnx[i]
        err = abs_errors[i]
        is_pass = err < tolerance
        if is_pass:
            pass_count += 1
        status = "PASSED" if is_pass else "FAILED"
        print(f"#{i+1:<4} | {y_true[i]:<10} | {p_sk * 100:>14.6f}% | {p_on * 100:>14.6f}% | {err:>15.8e} | {status:<8}")

    print("=" * 88)
    print("TỔNG KẾT KIỂM THỬ ĐỐI CHIẾU:")
    print(f"  - Tổng số mẫu kiểm tra        : {num_samples} mẫu")
    print(f"  - Số mẫu đạt tiêu chuẩn       : {pass_count}/{num_samples} ({pass_count/num_samples*100:.1f}%)")
    print(f"  - Độ lệch lớn nhất (Max Error): {max_error:.8e} (Ngưỡng cho phép: < {tolerance:.0e})")
    print(f"  - Độ lệch trung bình (MAE)    : {mean_error:.8e}")

    if max_error < tolerance:
        print("\n[★★★] KẾT QUẢ NGHIỆM THU: CHÍNH XÁC TUYỆT ĐỐI (SMOKE TEST PASSED)!")
        print("      Mô hình ONNX hoàn toàn đồng nhất về mặt toán học với mô hình Python.")
        print("      Sẵn sàng tích hợp in-process vào Backend C# .NET 10 tại Giai đoạn 4.")
    else:
        print("\n[!] CẢNH BÁO: Độ lệch vượt ngưỡng cho phép. Cần kiểm tra lại cấu hình export.")

    print("=" * 88 + "\n")
    return max_error < tolerance

if __name__ == '__main__':
    run_smoke_test()
