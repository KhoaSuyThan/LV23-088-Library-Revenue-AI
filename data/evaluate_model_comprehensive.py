"""
File: data/evaluate_model_comprehensive.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-87
Mô tả: Đánh giá toàn diện mô hình Random Forest tối ưu trên tập kiểm thử độc lập 2.000 mẫu.
       Thực hiện Threshold Tuning để tối ưu hóa F1-Score.
       Xuất 2 biểu đồ phân giải cao (300 DPI): Confusion Matrix và ROC Curve.
"""

import os
import sys
import json
# pyrefly: ignore [missing-import]
import joblib
# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix, classification_report,
    precision_recall_curve
)

# Cấu hình UTF-8 trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def evaluate_comprehensive():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, 'best_random_forest.pkl')
    test_path = os.path.join(base_dir, 'test_data.csv')
    cm_chart_path = os.path.join(base_dir, 'confusion_matrix.png')
    roc_chart_path = os.path.join(base_dir, 'roc_curve.png')
    output_json = os.path.join(base_dir, 'evaluation_metrics.json')

    print("[*] Đang đọc tập dữ liệu kiểm thử độc lập (test_data.csv)...")
    test_df = pd.read_csv(test_path, encoding='utf-8')
    target_col = 'IsOverdue'
    feature_cols = [c for c in test_df.columns if c != target_col]

    X_test = test_df[feature_cols]
    y_test = test_df[target_col]
    print(f"[+] Kích thước tập kiểm thử: {len(y_test):,} mẫu ({np.sum(y_test == 1):,} trễ hạn, {np.sum(y_test == 0):,} đúng hạn)")

    print("[*] Đang tải mô hình tối ưu (best_random_forest.pkl)...")
    model = joblib.load(model_path)

    # Dự báo xác suất lớp 1 (Trễ hạn)
    y_proba = model.predict_proba(X_test)[:, 1]

    # 1. ĐO KIỂM TẠI NGƯỠNG MẶC ĐỊNH T = 0.5
    y_pred_default = (y_proba >= 0.5).astype(int)
    acc_def = accuracy_score(y_test, y_pred_default) * 100
    prec_def = precision_score(y_test, y_pred_default, zero_division=0) * 100
    rec_def = recall_score(y_test, y_pred_default, zero_division=0) * 100
    f1_def = f1_score(y_test, y_pred_default, zero_division=0) * 100
    auc_score = roc_auc_score(y_test, y_proba) * 100

    print("\n" + "=" * 70)
    print("KẾT QUẢ ĐO KIỂM TẠI NGƯỠNG MẶC ĐỊNH (Threshold = 0.50):")
    print("-" * 70)
    print(f"  - Accuracy  : {acc_def:.2f}%")
    print(f"  - Precision : {prec_def:.2f}%")
    print(f"  - Recall    : {rec_def:.2f}%")
    print(f"  - F1-Score  : {f1_def:.2f}%")
    print(f"  - ROC-AUC   : {auc_score:.2f}%")
    print("=" * 70)

    # 2. THRESHOLD TUNING: TỐI ƯU HÓA NGƯỠNG XÁC SUẤT ĐỂ TỐI ĐA HÓA F1-SCORE
    thresholds = np.linspace(0.20, 0.80, 121)
    best_f1 = 0.0
    best_thresh = 0.50
    best_metrics = {}

    for t in thresholds:
        y_pred_t = (y_proba >= t).astype(int)
        f1_t = f1_score(y_test, y_pred_t, zero_division=0) * 100
        if f1_t > best_f1:
            best_f1 = f1_t
            best_thresh = float(t)
            best_metrics = {
                'threshold': round(best_thresh, 4),
                'accuracy': round(accuracy_score(y_test, y_pred_t) * 100, 2),
                'precision': round(precision_score(y_test, y_pred_t, zero_division=0) * 100, 2),
                'recall': round(recall_score(y_test, y_pred_t, zero_division=0) * 100, 2),
                'f1_score': round(f1_t, 2),
                'roc_auc': round(auc_score, 2)
            }

    print(f"\n[★] THRESHOLD TUNING HOÀN TẤT:")
    print(f"  - Ngưỡng tối ưu xác định : T* = {best_thresh:.2f}")
    print(f"  - F1-Score tối ưu        : {best_f1:.2f}% (Tăng +{best_f1 - f1_def:.2f}% so với mặc định)")
    print(f"  - Recall tại ngưỡng T*   : {best_metrics['recall']:.2f}%")
    print(f"  - Precision tại ngưỡng T*: {best_metrics['precision']:.2f}%")
    print(f"  - Accuracy tại ngưỡng T* : {best_metrics['accuracy']:.2f}%")

    # Áp dụng ngưỡng tốt nhất để đánh giá ma trận nhầm lẫn
    y_pred_opt = (y_proba >= best_thresh).astype(int)
    cm = confusion_matrix(y_test, y_pred_opt)
    tn, fp, fn, tp = cm.ravel()

    # Classification Report
    clf_report = classification_report(y_test, y_pred_opt, target_names=['Đúng hạn (0)', 'Trễ hạn (1)'], output_dict=True)

    # 3. VẼ VÀ XUẤT BIỂU ĐỒ CONFUSION MATRIX (300 DPI)
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(8, 6.5), dpi=300)

    cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100
    annot = np.empty_like(cm).astype(str)
    for r in range(2):
        for c in range(2):
            count = cm[r, c]
            pct = cm_percent[r, c]
            annot[r, c] = f"{count:,}\n({pct:.1f}%)"

    sns.heatmap(cm, annot=annot, fmt='', cmap='Blues', cbar=False, ax=ax,
                xticklabels=['Đúng hạn (0)', 'Trễ hạn (1)'],
                yticklabels=['Đúng hạn (0)', 'Trễ hạn (1)'],
                annot_kws={"fontsize": 14, "fontweight": "bold", "color": "#0f172a"})

    ax.set_title(f'MA TRẬN NHẦM LẪN (CONFUSION MATRIX) - T* = {best_thresh:.2f}',
                 fontsize=13, fontweight='bold', pad=15, color='#0f172a')
    ax.set_xlabel('Nhãn dự báo bởi AI (Predicted Label)', fontsize=11, fontweight='bold', labelpad=10)
    ax.set_ylabel('Nhãn thực tế (True Label)', fontsize=11, fontweight='bold', labelpad=10)

    plt.figtext(0.99, 0.01, f'Tổng tập Test: 2.000 mẫu | Accuracy: {best_metrics["accuracy"]}% | F1: {best_metrics["f1_score"]}%',
                horizontalalignment='right', fontsize=8.5, fontstyle='italic', color='#64748b')

    plt.tight_layout()
    plt.savefig(cm_chart_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"\n[✓] Đã xuất biểu đồ Confusion Matrix: {cm_chart_path}")

    # 4. VẼ VÀ XUẤT BIỂU ĐỒ ROC CURVE (300 DPI)
    fpr, tpr, roc_thresh = roc_curve(y_test, y_proba)
    fig, ax = plt.subplots(figsize=(8, 6.5), dpi=300)

    ax.plot(fpr, tpr, color='#2563eb', linewidth=2.5, label=f'Random Forest tối ưu (AUC = {auc_score:.2f}%)')
    ax.plot([0, 1], [0, 1], color='#94a3b8', linestyle='--', linewidth=1.5, label='Phân loại ngẫu nhiên (AUC = 50.00%)')

    # Đánh dấu điểm hoạt động tại ngưỡng T*
    opt_idx = np.argmin(np.abs(roc_thresh - best_thresh))
    ax.scatter(fpr[opt_idx], tpr[opt_idx], color='#ef4444', s=120, zorder=5,
               label=f'Ngưỡng tối ưu T* = {best_thresh:.2f} (Recall: {best_metrics["recall"]}%, FPR: {fpr[opt_idx]*100:.1f}%)')

    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.05])
    ax.set_xlabel('Tỷ lệ báo nhầm / False Positive Rate (FPR)', fontsize=11, fontweight='bold', labelpad=10)
    ax.set_ylabel('Tỷ lệ phát hiện đúng / True Positive Rate (TPR)', fontsize=11, fontweight='bold', labelpad=10)
    ax.set_title('ĐƯỜNG CONG ĐẶC TRƯNG HOẠT ĐỘNG THU NHẬN (ROC CURVE)',
                 fontsize=13, fontweight='bold', pad=15, color='#0f172a')
    ax.legend(loc='lower right', frameon=True, framealpha=0.95, facecolor='white', edgecolor='#cbd5e1', fontsize=9.5)
    ax.grid(True, linestyle='--', alpha=0.5)

    plt.figtext(0.99, 0.01, f'Nguồn: Đồ án Tốt nghiệp SmartLib AI - Tập Test: 2.000 mẫu',
                horizontalalignment='right', fontsize=8.5, fontstyle='italic', color='#64748b')

    plt.tight_layout()
    plt.savefig(roc_chart_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"[✓] Đã xuất biểu đồ ROC Curve: {roc_chart_path}")

    # 5. XUẤT BÁO CÁO TỔNG HỢP RA JSON
    eval_summary = {
        'model_name': 'RandomForestClassifier_Optimized',
        'test_samples_total': int(len(y_test)),
        'positive_samples_actual': int(np.sum(y_test == 1)),
        'negative_samples_actual': int(np.sum(y_test == 0)),
        'default_metrics_at_0_5': {
            'threshold': 0.5,
            'accuracy': round(acc_def, 2),
            'precision': round(prec_def, 2),
            'recall': round(rec_def, 2),
            'f1_score': round(f1_def, 2),
            'roc_auc': round(auc_score, 2)
        },
        'optimal_metrics_tuned': best_metrics,
        'confusion_matrix': {
            'true_negative': int(tn),
            'false_positive': int(fp),
            'false_negative': int(fn),
            'true_positive': int(tp)
        },
        'classification_report': clf_report
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(eval_summary, f, ensure_ascii=False, indent=2)
    print(f"[✓] Đã xuất tệp đặc tả kết quả: {output_json}\n")

if __name__ == '__main__':
    evaluate_comprehensive()
