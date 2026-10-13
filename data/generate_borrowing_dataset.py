"""
File: data/generate_borrowing_dataset.py
Sprint: 6.1 (Huấn luyện AI) - Task: L0LRA-106
Mô tả: Script sinh 10.000 bản ghi dữ liệu mượn trả mô phỏng theo phân phối xác suất hành vi
       (Rule-based Probabilistic Simulation), xử lý bài toán Cold-Start cho SmartLib AI.
"""

import os
import sys

# Đảm bảo in tiếng Việt chuẩn trên Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# pyrefly: ignore [missing-import]
import numpy as np
import pandas as pd

def generate_dataset(num_records=10000, random_seed=42):
    """
    Sinh tập dữ liệu mượn trả hành vi với số lượng num_records bản ghi.
    Đảm bảo tính tái lập (reproducibility) qua random_seed.
    """
    np.random.seed(random_seed)

    print(f"[*] Bắt đầu sinh {num_records:,} bản ghi dữ liệu hành vi mượn trả...")

    # 1. Danh sách Khoa / Viện và phân bố tỷ lệ sinh viên
    faculties = ['CNTT', 'Kinh tế', 'Cơ khí', 'Ngoại ngữ', 'Luật', 'Y dược']
    faculty_probs = [0.30, 0.25, 0.15, 0.12, 0.10, 0.08]
    data_faculty = np.random.choice(faculties, size=num_records, p=faculty_probs)

    # 2. Loại đối tượng bạn đọc (Sinh viên chiếm đa số)
    member_types = ['Sinh viên', 'Giảng viên', 'Học viên SĐH']
    member_probs = [0.85, 0.10, 0.05]
    data_member_type = np.random.choice(member_types, size=num_records, p=member_probs)

    # 3. Điểm tín nhiệm bạn đọc (CreditScore: 0 - 100, phân phối chuẩn quanh 85, std 12)
    raw_credit = np.random.normal(loc=85, scale=12, size=num_records)
    data_credit_score = np.clip(np.round(raw_credit), 20, 100).astype(int)

    # 4. Số lượng sách đang giữ tại thời điểm mượn (1 đến 5 cuốn)
    # Đa số mượn 1-2 cuốn, ít người giữ tối đa 4-5 cuốn
    holding_probs = [0.35, 0.30, 0.18, 0.12, 0.05]
    data_holding_books = np.random.choice([1, 2, 3, 4, 5], size=num_records, p=holding_probs)

    # 5. Số lần từng trễ hạn trong quá khứ (HistoricalOverdueCount: 0 đến 10)
    # Phụ thuộc nghịch đảo nhẹ vào điểm tín nhiệm
    overdue_lambda = np.clip((100 - data_credit_score) / 18.0, 0.1, 4.0)
    data_historical_overdue = np.random.poisson(lam=overdue_lambda, size=num_records)
    data_historical_overdue = np.clip(data_historical_overdue, 0, 10)

    # 6. Thời hạn mượn quy định (BorrowDurationDays: Sinh viên 14 ngày, Giảng viên 30 ngày)
    data_duration = np.where(data_member_type == 'Giảng viên', 30, 14)

    # 7. Số tiền phạt nợ hiện tại (TotalCurrentDebt: đa số nợ 0, người có trễ hạn thì nợ)
    has_debt_mask = (data_historical_overdue > 0) & (np.random.rand(num_records) < 0.6)
    debt_amounts = np.random.exponential(scale=25000, size=num_records)
    data_debt = np.where(has_debt_mask, np.round(debt_amounts, -3), 0.0)
    data_debt = np.clip(data_debt, 0, 150000.0)

    # 8. Mùa thi cử (IsExamSeason: Tháng 5, 11 - chiếm ~25% tổng đợt mượn)
    data_is_exam_season = (np.random.rand(num_records) < 0.25).astype(int)

    # 9. Tính toán xác suất trễ hạn dựa trên hàm Logistic Sigmoid
    # Chuẩn hóa điểm tín nhiệm và nợ phạt để phân phối xác suất cân bằng
    credit_normalized = (data_credit_score - 80.0) / 10.0
    debt_normalized = data_debt / 30000.0

    logit = (
        -2.15
        + 0.30 * (data_holding_books - 2)
        + 0.58 * data_historical_overdue
        - 0.68 * credit_normalized
        + 0.38 * debt_normalized
        + 0.45 * data_is_exam_season
        - 0.75 * (data_member_type == 'Giảng viên').astype(int)
    )

    prob_overdue = 1.0 / (1.0 + np.exp(-logit))
    # Sinh nhãn thực tế theo phân phối xác suất Bernoulli
    data_is_overdue = (np.random.rand(num_records) < prob_overdue).astype(int)

    # Tạo DataFrame tổng hợp
    df = pd.DataFrame({
        'Faculty': data_faculty,
        'MemberType': data_member_type,
        'CreditScore': data_credit_score,
        'CurrentHoldingBooks': data_holding_books,
        'HistoricalOverdueCount': data_historical_overdue,
        'BorrowDurationDays': data_duration,
        'TotalCurrentDebt': data_debt,
        'IsExamSeason': data_is_exam_season,
        'IsOverdue': data_is_overdue
    })

    return df

if __name__ == '__main__':
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(output_dir, 'borrowing_behavior_dataset.csv')

    df = generate_dataset(num_records=10000, random_seed=42)

    # Lưu tệp CSV
    df.to_csv(output_file, index=False, encoding='utf-8')

    # Báo cáo thống kê
    overdue_count = df['IsOverdue'].sum()
    overdue_rate = (overdue_count / len(df)) * 100

    print("=" * 60)
    print(f"[✓] Đã tạo thành công tệp: {output_file}")
    print(f"[+] Tổng số bản ghi (Rows): {len(df):,}")
    print(f"[+] Tổng số đặc trưng (Columns): {len(df.columns)}")
    print(f"[+] Số ca trễ hạn (Overdue = 1): {overdue_count:,} ({overdue_rate:.2f}%)")
    print(f"[+] Số ca đúng hạn (On-time = 0): {len(df) - overdue_count:,} ({100 - overdue_rate:.2f}%)")
    print(f"[+] Kiểm tra giá trị khuyết (NaN): {df.isna().sum().sum()} ô")
    print("=" * 60)
