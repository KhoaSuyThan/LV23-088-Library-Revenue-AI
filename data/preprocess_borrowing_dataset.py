"""
File: data/preprocess_borrowing_dataset.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-20
Mô tả: Tiền xử lý dữ liệu hành vi độc giả:
       - Kiểm tra tính toàn vẹn (Missing values, Data types)
       - Mã hóa biến phân loại danh mục (Label Encoding)
       - Xuất từ điển ánh xạ sang tệp metadata JSON phục vụ Backend C#
       - Phân chia tập dữ liệu Train/Test 80/20 phân tầng (Stratified Split)
"""

import os
import sys
import json

# Đảm bảo in tiếng Việt chuẩn trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# pyrefly: ignore [missing-import]
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def preprocess_and_split(input_csv_path, output_dir, test_size=0.2, random_state=42):
    print(f"[*] Đang tải dữ liệu từ: {input_csv_path}")
    if not os.path.exists(input_csv_path):
        raise FileNotFoundError(f"Không tìm thấy tệp {input_csv_path}")

    df = pd.read_csv(input_csv_path, encoding='utf-8')
    print(f"[+] Kích thước dữ liệu gốc: {df.shape[0]:,} dòng, {df.shape[1]} cột")

    # 1. Kiểm tra giá trị khuyết
    missing_count = df.isna().sum().sum()
    if missing_count > 0:
        print(f"[!] Phát hiện {missing_count} ô bị khuyết, tiến hành xử lý dropna...")
        df = df.dropna()
    else:
        print("[✓] Dữ liệu hoàn toàn sạch, không có giá trị khuyết (NaN).")

    # 2. Định nghĩa các đặc trưng và biến mục tiêu
    target_col = 'IsOverdue'
    feature_cols = [c for c in df.columns if c != target_col]

    # 3. Mã hóa các biến phân loại danh mục (Categorical Features)
    cat_cols = ['Faculty', 'MemberType']
    encoders_dict = {}
    encoded_df = df.copy()

    for col in cat_cols:
        le = LabelEncoder()
        encoded_df[col] = le.fit_transform(encoded_df[col])
        
        # Lưu bảng ánh xạ từ điển dạng JSON { "Tên chuỗi": Mã số }
        mapping = {str(cls_name): int(idx) for idx, cls_name in enumerate(le.classes_)}
        encoders_dict[col] = {
            'classes': list(le.classes_),
            'mapping': mapping
        }
        print(f"[✓] Đã mã hóa {col}: {mapping}")

    # 4. Tạo metadata toàn diện để bàn giao cho Sprint 6.3 (Backend .NET 10)
    metadata = {
        'version': '1.0.0',
        'generated_for': 'LV23-088 SmartLib AI Risk Prediction',
        'feature_order': feature_cols,
        'target_column': target_col,
        'categorical_encoders': encoders_dict,
        'feature_types': {col: str(encoded_df[col].dtype) for col in feature_cols},
        'dataset_summary': {
            'total_samples': len(encoded_df),
            'overdue_samples': int(encoded_df[target_col].sum()),
            'overdue_rate_percent': round(float(encoded_df[target_col].mean()) * 100, 2)
        }
    }

    metadata_path = os.path.join(output_dir, 'encoders_metadata.json')
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"[✓] Đã xuất tệp metadata đặc trưng: {metadata_path}")

    # 5. Phân tách tập Train / Test phân tầng (Stratified Split 80 / 20)
    X = encoded_df[feature_cols]
    y = encoded_df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y
    )

    train_df = pd.concat([X_train, y_train], axis=1)
    test_df = pd.concat([X_test, y_test], axis=1)

    train_path = os.path.join(output_dir, 'train_data.csv')
    test_path = os.path.join(output_dir, 'test_data.csv')

    train_df.to_csv(train_path, index=False, encoding='utf-8')
    test_df.to_csv(test_path, index=False, encoding='utf-8')

    print("=" * 60)
    print(f"[✓] Đã tạo tệp huấn luyện (Train Set 80%): {train_path}")
    print(f"    - Số lượng mẫu: {len(train_df):,} dòng")
    print(f"    - Tỷ lệ trễ hạn: {train_df[target_col].mean()*100:.2f}% ({train_df[target_col].sum():,} ca)")
    print(f"[✓] Đã tạo tệp kiểm thử (Test Set 20%): {test_path}")
    print(f"    - Số lượng mẫu: {len(test_df):,} dòng")
    print(f"    - Tỷ lệ trễ hạn: {test_df[target_col].mean()*100:.2f}% ({test_df[target_col].sum():,} ca)")
    print("=" * 60)

    # 6. Hiển thị ma trận tương quan cơ bản (Correlation with Target)
    corr = encoded_df.corr()[target_col].sort_values(ascending=False)
    print("[+] Mức độ tương quan của các thuộc tính với hành vi trễ hạn (IsOverdue):")
    for feat, val in corr.items():
        if feat != target_col:
            sign = "+" if val >= 0 else "-"
            print(f"    • {feat:<24}: {sign}{abs(val):.4f}")
    print("=" * 60)

if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(base_dir, 'borrowing_behavior_dataset.csv')
    preprocess_and_split(input_file, base_dir, test_size=0.2, random_state=42)
