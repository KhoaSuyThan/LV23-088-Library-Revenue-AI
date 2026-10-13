"""
File: data/compare_baseline_models.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-107
Mô tả: Huấn luyện và đo kiểm đối sánh 4 mô hình học máy cơ sở:
       1. Logistic Regression (Baseline tuyến tính)
       2. Decision Tree Classifier (Cây quyết định đơn)
       3. Random Forest Classifier (Mô hình quần thể Bagging)
       4. Gradient Boosting Classifier (Mô hình tăng cường độ dốc)
       Xuất bảng số liệu so sánh chi tiết làm minh chứng bảo vệ đề tài.
"""

import os
import sys
import time

# Cấu hình in tiếng Việt chuẩn trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# pyrefly: ignore [missing-import]
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def evaluate_models():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    train_path = os.path.join(base_dir, 'train_data.csv')
    test_path = os.path.join(base_dir, 'test_data.csv')
    output_csv = os.path.join(base_dir, 'model_comparison_results.csv')

    print("[*] Đang đọc tập dữ liệu Train và Test...")
    train_df = pd.read_csv(train_path, encoding='utf-8')
    test_df = pd.read_csv(test_path, encoding='utf-8')

    target_col = 'IsOverdue'
    feature_cols = [c for c in train_df.columns if c != target_col]

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    print(f"[+] Tập Train: {X_train.shape[0]:,} mẫu | Tập Test: {X_test.shape[0]:,} mẫu")
    print(f"[+] Số lượng đặc trưng đầu vào: {len(feature_cols)} thuộc tính\n")

    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler

    # Danh sách 4 mô hình đưa vào đối sánh
    models = {
        'Logistic Regression': make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'Random Forest (Default)': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42)
    }

    results = []

    print("=" * 85)
    print(f"{'Mô hình (Model)':<26} | {'Accuracy':<9} | {'Precision':<9} | {'Recall':<9} | {'F1-Score':<9} | {'ROC-AUC':<9} | {'Thời gian':<9}")
    print("-" * 85)

    for name, model in models.items():
        # Đo thời gian huấn luyện
        start_time = time.time()
        model.fit(X_train, y_train)
        train_time = time.time() - start_time

        # Dự báo trên tập Test độc lập
        y_pred = model.predict(X_test)
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_test)[:, 1]
            auc = roc_auc_score(y_test, y_proba) * 100
        else:
            auc = 0.0

        # Tính toán các chỉ số đánh giá
        acc = accuracy_score(y_test, y_pred) * 100
        prec = precision_score(y_test, y_pred, zero_division=0) * 100
        rec = recall_score(y_test, y_pred, zero_division=0) * 100
        f1 = f1_score(y_test, y_pred, zero_division=0) * 100

        results.append({
            'Model': name,
            'Accuracy (%)': round(acc, 2),
            'Precision (%)': round(prec, 2),
            'Recall (%)': round(rec, 2),
            'F1-Score (%)': round(f1, 2),
            'ROC-AUC (%)': round(auc, 2),
            'Training Time (s)': round(train_time, 4)
        })

        print(f"{name:<26} | {acc:>7.2f}% | {prec:>7.2f}% | {rec:>7.2f}% | {f1:>7.2f}% | {auc:>7.2f}% | {train_time:>6.4f}s")

    print("=" * 85)

    # Xuất kết quả ra file CSV
    res_df = pd.DataFrame(results)
    res_df.to_csv(output_csv, index=False, encoding='utf-8')
    print(f"\n[✓] Đã xuất bảng kết quả đối sánh chi tiết ra: {output_csv}")

    # Tìm mô hình dẫn đầu
    best_model = res_df.sort_values(by='F1-Score (%)', ascending=False).iloc[0]
    print(f"[★] Mô hình có F1-Score cao nhất: {best_model['Model']} ({best_model['F1-Score (%)']}%)")

    # Tự động sinh biểu đồ đối sánh trực quan
    try:
        from plot_model_comparison import plot_comparison
        plot_comparison()
    except Exception as e:
        print(f"[!] Không thể tự động vẽ biểu đồ: {e}")

if __name__ == '__main__':
    evaluate_models()
