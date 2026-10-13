"""
File: data/plot_model_comparison.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-107 & L0LRA-86
Mô tả: Trực quan hóa kết quả đối sánh 4 mô hình học máy cơ sở dưới dạng biểu đồ cột nhóm (Grouped Bar Chart)
       và xuất tệp ảnh PNG phân giải cao (300 DPI) phục vụ báo cáo Đồ án tốt nghiệp Chương 6.
"""

import os
import sys
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import numpy as np

# Cấu hình in UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def plot_comparison():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'model_comparison_results.csv')
    chart_path = os.path.join(base_dir, 'model_comparison_chart.png')

    if not os.path.exists(csv_path):
        print(f"[-] Không tìm thấy tệp {csv_path}. Vui lòng chạy compare_baseline_models.py trước.")
        return

    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"[*] Đang đọc kết quả từ {csv_path}...")

    # Thiết lập kiểu dáng biểu đồ
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(12, 6.5), dpi=300)

    # Các chỉ số cần vẽ biểu đồ
    metrics = ['Accuracy (%)', 'Precision (%)', 'Recall (%)', 'F1-Score (%)', 'ROC-AUC (%)']
    metric_labels = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'ROC-AUC']
    models = df['Model'].tolist()

    x = np.arange(len(models))
    width = 0.16  # Chiều rộng mỗi cột
    
    # Bảng màu sắc chuyên nghiệp (Modern Palette)
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    for i, (metric, label, color) in enumerate(zip(metrics, metric_labels, colors)):
        offset = (i - len(metrics) / 2 + 0.5) * width
        bars = ax.bar(x + offset, df[metric], width, label=label, color=color, alpha=0.9, edgecolor='white', linewidth=0.8)
        
        # Thêm nhãn giá trị lên từng cột
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=7.5, fontweight='bold', rotation=45)

    # Cấu hình trục và tiêu đề
    ax.set_ylabel('Điểm số đánh giá (%)', fontsize=12, fontweight='bold', labelpad=10)
    ax.set_title('ĐỐI SÁNH HIỆU NĂNG 4 MÔ HÌNH HỌC MÁY CƠ SỞ (BASELINE EVALUATION)', 
                 fontsize=14, fontweight='bold', pad=18, color='#1e293b')
    ax.set_xticks(x)
    ax.set_xticklabels(models, fontsize=11, fontweight='bold')
    ax.set_ylim(60, 105)
    ax.grid(axis='y', linestyle='--', alpha=0.5)
    ax.legend(loc='lower right', frameon=True, framealpha=0.95, facecolor='white', edgecolor='#cbd5e1', fontsize=10)

    # Thêm ghi chú nguồn dữ liệu
    plt.figtext(0.99, 0.01, 'Nguồn: Đồ án Tốt nghiệp SmartLib AI - Tập Test: 2.000 mẫu', 
                horizontalalignment='right', fontsize=8.5, fontstyle='italic', color='#64748b')

    plt.tight_layout()
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"[✓] Đã xuất biểu đồ đối sánh 4 mô hình ra: {chart_path}")

if __name__ == '__main__':
    plot_comparison()
