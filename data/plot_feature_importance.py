"""
File: data/plot_feature_importance.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-86
Mô tả: Trực quan hóa xếp hạng độ quan trọng đặc trưng (Feature Importance) của mô hình
       Random Forest Classifier tối ưu ra tệp ảnh PNG (300 DPI) cho báo cáo Đồ án.
"""

import os
import sys
import json
# pyrefly: ignore [missing-import]
import matplotlib.pyplot as plt
# pyrefly: ignore [missing-import]
import numpy as np

# Cấu hình UTF-8
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def plot_feature_importance():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, 'feature_importance.json')
    chart_path = os.path.join(base_dir, 'feature_importance_chart.png')

    if not os.path.exists(json_path):
        print(f"[-] Không tìm thấy file {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    feat_dict = data.get('feature_importance_percent', {})
    
    # Bản dịch tên thuộc tính sang tiếng Việt cho trực quan
    feat_names_vi = {
        'CreditScore': 'Điểm tín nhiệm (CreditScore)',
        'HistoricalOverdueCount': 'Số lần từng trễ hạn (HistoricalOverdueCount)',
        'TotalCurrentDebt': 'Tổng tiền nợ phạt hiện tại (TotalCurrentDebt)',
        'CurrentHoldingBooks': 'Số sách đang mượn giữ (CurrentHoldingBooks)',
        'Faculty': 'Khoa chuyên môn (Faculty)',
        'IsExamSeason': 'Mùa thi cử (IsExamSeason)',
        'MemberType': 'Loại độc giả (MemberType)',
        'BorrowDurationDays': 'Thời hạn mượn quy định (BorrowDurationDays)'
    }

    features = list(feat_dict.keys())
    values = list(feat_dict.values())

    # Đảo ngược để vẽ từ cao xuống thấp trên thanh ngang
    features.reverse()
    values.reverse()
    labels = [feat_names_vi.get(f, f) for f in features]

    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=300)

    # Gradient màu theo độ quan trọng
    colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(values)))

    bars = ax.barh(labels, values, color=colors, height=0.6, edgecolor='none')

    # Thêm số liệu % trên đầu từng thanh
    for bar in bars:
        width = bar.get_width()
        ax.annotate(f' {width:.2f}%',
                    xy=(width, bar.get_y() + bar.get_height() / 2),
                    xytext=(3, 0),
                    textcoords="offset points",
                    ha='left', va='center', fontsize=9.5, fontweight='bold', color='#1e293b')

    ax.set_xlabel('Tỷ lệ đóng góp vào quyết định phân loại (%)', fontsize=11, fontweight='bold', labelpad=8)
    ax.set_title('ĐỘ QUAN TRỌNG CỦA CÁC ĐẶC TRƯNG - RANDOM FOREST TỐI ƯU (L0LRA-86)', 
                 fontsize=13, fontweight='bold', pad=15, color='#0f172a')
    ax.set_xlim(0, max(values) * 1.15)
    ax.grid(axis='x', linestyle='--', alpha=0.5)

    plt.figtext(0.99, 0.01, 'Nguồn: Mô hình Random Forest tối ưu (GridSearchCV, F1=86.76%, ROC-AUC=93.17%)', 
                horizontalalignment='right', fontsize=8, fontstyle='italic', color='#64748b')

    plt.tight_layout()
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"[✓] Đã xuất biểu đồ Feature Importance ra: {chart_path}")

if __name__ == '__main__':
    plot_feature_importance()
