"""
File: data/train_optimize_random_forest.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-86
Mô tả: Tinh chỉnh siêu tham số mô hình Random Forest Classifier bằng GridSearchCV
       kết hợp 5-Fold Stratified Cross Validation và class_weight='balanced'.
       Đo kiểm chỉ số F1-Score >= 90%, trích xuất Feature Importance và lưu mô hình .pkl.
"""

import os
import sys
import json
import time

# Cấu hình in tiếng Việt chuẩn trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# pyrefly: ignore [missing-import]
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

def train_and_optimize():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    train_path = os.path.join(base_dir, 'train_data.csv')
    test_path = os.path.join(base_dir, 'test_data.csv')
    model_output_path = os.path.join(base_dir, 'best_random_forest.pkl')
    feat_importance_path = os.path.join(base_dir, 'feature_importance.json')

    print("[*] Đang tải dữ liệu huấn luyện (Train) và kiểm thử (Test)...")
    train_df = pd.read_csv(train_path, encoding='utf-8')
    test_df = pd.read_csv(test_path, encoding='utf-8')

    target_col = 'IsOverdue'
    feature_cols = [c for c in train_df.columns if c != target_col]

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_test, y_test = test_df[feature_cols], test_df[target_col]

    print(f"[+] Kích thước tập Train: {X_train.shape[0]:,} dòng x {len(feature_cols)} đặc trưng")
    print(f"[+] Kích thước tập Test : {X_test.shape[0]:,} dòng x {len(feature_cols)} đặc trưng")
    print(f"[+] Tỷ lệ trễ hạn tập Train: {y_train.mean()*100:.2f}% | Test: {y_test.mean()*100:.2f}%\n")

    # 1. Thiết lập không gian siêu tham số (Hyperparameter Grid)
    # class_weight='balanced' là chìa khóa then chốt để xử lý mất cân bằng lớp và tối ưu F1
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [12, 16, 20, None],
        'min_samples_split': [2, 5],
        'min_samples_leaf': [1, 2],
        'class_weight': ['balanced', 'balanced_subsample'],
        'criterion': ['gini', 'entropy']
    }

    rf_base = RandomForestClassifier(random_state=42)
    cv_strategy = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    print("[*] Bắt đầu tìm kiếm siêu tham số tối ưu bằng GridSearchCV (5-Fold Stratified CV)...")
    grid_search = GridSearchCV(
        estimator=rf_base,
        param_grid=param_grid,
        scoring='f1',
        cv=cv_strategy,
        n_jobs=-1,
        verbose=1
    )

    start_time = time.time()
    grid_search.fit(X_train, y_train)
    total_tuning_time = time.time() - start_time

    best_rf = grid_search.best_estimator_
    print(f"\n[✓] Hoàn thành tối ưu siêu tham số trong {total_tuning_time:.2f} giây!")
    print(f"[+] Bộ siêu tham số tốt nhất (Best Params):")
    for k, v in grid_search.best_params_.items():
        print(f"    • {k:<18}: {v}")
    print(f"[+] Điểm F1-Score trung bình qua 5-Fold CV: {grid_search.best_score_*100:.2f}%\n")

    # 2. Đánh giá toàn diện trên tập kiểm thử độc lập (Test Set 2.000 dòng)
    print("=" * 65)
    print("ĐÁNH GIÁ TRÊN TẬP KIỂM THỬ ĐỘC LẬP (TEST SET 20% - 2.000 MẪU)")
    print("=" * 65)

    y_pred = best_rf.predict(X_test)
    y_proba = best_rf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred) * 100
    prec = precision_score(y_test, y_pred) * 100
    rec = recall_score(y_test, y_pred) * 100
    f1 = f1_score(y_test, y_pred) * 100
    auc = roc_auc_score(y_test, y_proba) * 100

    print(f"• Accuracy (Độ chính xác tổng thể) : {acc:.2f}%")
    print(f"• Precision (Độ chuẩn xác)          : {prec:.2f}%")
    print(f"• Recall (Độ phủ / Độ nhạy)         : {rec:.2f}%")
    print(f"• F1-Score (Thước đo cam kết SMART) : {f1:.2f}% {'(ĐẠT MỤC TIÊU >= 90%)' if f1 >= 90.0 else '(CHƯA ĐẠT)'}")
    print(f"• ROC-AUC Score                     : {auc:.2f}%")
    print("-" * 65)

    # Ma trận nhầm lẫn (Confusion Matrix)
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    print("MA TRẬN NHẦM LẪN (CONFUSION MATRIX):")
    print(f"  True Negative (Đúng hạn đúng) : {tn:,} ca")
    print(f"  False Positive (Báo nhầm trễ) : {fp:,} ca")
    print(f"  False Negative (Bỏ lọt trễ)   : {fn:,} ca")
    print(f"  True Positive (Trễ hạn đúng)  : {tp:,} ca")
    print("-" * 65)

    # 3. Phân tích độ quan trọng của đặc trưng (Feature Importance)
    importances = best_rf.feature_importances_
    feat_imp = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)

    print("XẾP HẠNG ĐỘ QUAN TRỌNG ĐẶC TRƯNG (FEATURE IMPORTANCE):")
    feat_imp_dict = {}
    for rank, (feat, val) in enumerate(feat_imp, 1):
        feat_imp_dict[feat] = round(float(val) * 100, 2)
        print(f"  {rank}. {feat:<24}: {val*100:>6.2f}%")
    print("=" * 65)

    # Xuất Feature Importance ra file JSON
    with open(feat_importance_path, 'w', encoding='utf-8') as f:
        json.dump({
            'model_name': 'RandomForestClassifier_Optimized',
            'evaluation_metrics': {
                'accuracy': round(acc, 2),
                'precision': round(prec, 2),
                'recall': round(rec, 2),
                'f1_score': round(f1, 2),
                'roc_auc': round(auc, 2)
            },
            'best_hyperparameters': grid_search.best_params_,
            'feature_importance_percent': feat_imp_dict
        }, f, ensure_ascii=False, indent=2)
    print(f"[✓] Đã xuất file Feature Importance: {feat_importance_path}")

    # 4. Lưu mô hình tối ưu sang file .pkl
    joblib.dump(best_rf, model_output_path)
    print(f"[✓] Đã lưu mô hình tối ưu thành công ra: {model_output_path}")

    # Tự động xuất biểu đồ trực quan Feature Importance
    try:
        from plot_feature_importance import plot_feature_importance
        plot_feature_importance()
    except Exception as e:
        print(f"[!] Không thể tự động vẽ biểu đồ Feature Importance: {e}")

if __name__ == '__main__':
    train_and_optimize()
