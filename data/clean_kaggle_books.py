"""
Script: clean_kaggle_books.py
Mục đích:
1. Làm sạch và chuẩn hóa tập dữ liệu Kaggle books.csv (Goodreads).
2. Khử trùng lặp, xử lý ký tự trống, truncate chuỗi theo đúng schema CSDL SQL Server.
3. Sinh giá bìa BasePrice (50k - 250k VNĐ) và gán CategoryID (1 - 10).
4. Xuất file UTF-8-SIG (cleaned_books.csv, cleaned_book_copies.csv).
5. Tự động sinh file script SQL (03_import_books_and_copies.sql) để nạp thẳng vào CSDL.
"""

import os
import sys
import random
import pandas as pd

# Thiết lập encoding utf-8 cho stdout trên Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def clean_books():
    # Cố định random seed để kết quả sinh dữ liệu nhất quán qua các lần chạy
    random.seed(42)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv = os.path.join(script_dir, "books.csv")
    output_books_csv = os.path.join(script_dir, "cleaned_books.csv")
    output_copies_csv = os.path.join(script_dir, "cleaned_book_copies.csv")
    output_sql_file = os.path.join(script_dir, "03_import_books_and_copies.sql")

    print(f"[1/5] Đang đọc file gốc: {input_csv}...")
    
    # Đọc CSV với on_bad_lines='skip' để loại bỏ các dòng lệch cột
    df = pd.read_csv(
        input_csv,
        on_bad_lines="skip",
        encoding="utf-8",
        dtype=str
    )
    print(f" -> Đã nạp {len(df):,} dòng dữ liệu thô.")

    # Làm sạch tên cột (loại bỏ khoảng trắng thừa)
    df.columns = [col.strip() for col in df.columns]

    # [2/5] Lọc bỏ dữ liệu rỗng ở các trường bắt buộc
    print("[2/5] Đang lọc bỏ dữ liệu rỗng và trùng lặp...")
    df = df.dropna(subset=["title", "authors"])
    df["title"] = df["title"].astype(str).str.strip()
    df["authors"] = df["authors"].astype(str).str.strip()
    
    if "publisher" in df.columns:
        df["publisher"] = df["publisher"].fillna("Đang cập nhật").astype(str).str.strip()
    else:
        df["publisher"] = "Đang cập nhật"

    # Lọc bỏ các dòng có tiêu đề rỗng
    df = df[df["title"] != ""]
    df = df[df["authors"] != ""]

    # Chuẩn hóa ISBN: Ưu tiên isbn13 (loại bỏ đuôi .0 nếu có), nếu không có dùng isbn
    def parse_isbn(row):
        isbn13 = str(row.get("isbn13", "")).strip()
        if isbn13.endswith(".0"):
            isbn13 = isbn13[:-2]
        if isbn13 and isbn13.lower() != "nan" and len(isbn13) >= 10:
            return isbn13[:20]
        isbn = str(row.get("isbn", "")).strip()
        if isbn and isbn.lower() != "nan":
            return isbn[:20]
        return None

    df["ISBN"] = df.apply(parse_isbn, axis=1)

    # Khử trùng lặp theo ISBN (nếu có ISBN)
    df_with_isbn = df[df["ISBN"].notnull()].drop_duplicates(subset=["ISBN"])
    df_no_isbn = df[df["ISBN"].isnull()]
    df = pd.concat([df_with_isbn, df_no_isbn], ignore_index=True)
    print(f" -> Số lượng đầu sách sau khi khử trùng lặp: {len(df):,} cuốn.")

    # [3/5] Chuẩn hóa trường và cắt ngắn ký tự (Truncate) theo schema SQL Server
    print("[3/5] Đang chuẩn hóa trường dữ liệu...")
    # Thay dấu gạch chéo '/' của đồng tác giả thành ', '
    df["Author"] = df["authors"].str.replace("/", ", ", regex=False).str.slice(0, 800)
    df["Title"] = df["title"].str.slice(0, 350)
    df["Publisher"] = df["publisher"].str.slice(0, 200)

    # Sinh trường giả lập: BasePrice (50.000 - 250.000 VNĐ, bước nhảy 5.000)
    prices = [random.randint(10, 50) * 5000 for _ in range(len(df))]
    df["BasePrice"] = prices

    # Sinh trường giả lập: CategoryID (1 - 10)
    categories = [random.randint(1, 10) for _ in range(len(df))]
    df["CategoryID"] = categories

    # Cấp BookID tuần tự 1, 2, 3...
    df["BookID"] = range(1, len(df) + 1)

    # Sắp xếp các cột theo đúng cấu trúc bảng Books
    cleaned_books_df = df[["BookID", "CategoryID", "ISBN", "Title", "Author", "Publisher", "BasePrice"]]

    # [4/5] Sinh dữ liệu BookCopies (mỗi đầu sách có 2 bản sao barcode)
    print("[4/5] Đang tạo danh sách bản sao mã vạch (BookCopies)...")
    copies_records = []
    copy_counter = 1
    for book_id in cleaned_books_df["BookID"]:
        # Bản sao A
        copies_records.append({
            "CopyID": copy_counter,
            "BookID": book_id,
            "Barcode": f"BC{book_id:06d}-A",
            "Status": "Available"
        })
        copy_counter += 1
        # Bản sao B
        copies_records.append({
            "CopyID": copy_counter,
            "BookID": book_id,
            "Barcode": f"BC{book_id:06d}-B",
            "Status": "Available"
        })
        copy_counter += 1

    cleaned_copies_df = pd.DataFrame(copies_records)

    # Xuất ra file CSV định dạng UTF-8-SIG (có BOM để Excel và SQL Server không lỗi font)
    cleaned_books_df.to_csv(output_books_csv, index=False, encoding="utf-8-sig")
    cleaned_copies_df.to_csv(output_copies_csv, index=False, encoding="utf-8-sig")
    print(f" -> Đã xuất file sách: {output_books_csv}")
    print(f" -> Đã xuất file bản sao: {output_copies_csv} ({len(cleaned_copies_df):,} bản sao)")

    # [5/5] Sinh script SQL nạp tự động vào CSDL (03_import_books_and_copies.sql)
    print("[5/5] Đang sinh file script SQL nạp dữ liệu...")
    
    # Chuẩn hóa đường dẫn tương thích cú pháp T-SQL BULK INSERT trên Windows
    sql_books_path = output_books_csv.replace("\\", "\\\\")
    sql_copies_path = output_copies_csv.replace("\\", "\\\\")

    sql_content = f"""-- ==========================================================
-- File: 03_import_books_and_copies.sql
-- Database: SmartLibAI
-- Description: Nạp dữ liệu sách sạch từ cleaned_books.csv và cleaned_book_copies.csv
-- Hướng dẫn: Mở SSMS, kết nối Database SmartLibAI và nhấn Execute (F5).
-- ==========================================================

USE SmartLibAI;
GO

SET NOCOUNT ON;

PRINT N'=== BẮT ĐẦU QUÁ TRÌNH NẠP DỮ LIỆU SÁCH KAGGLE ===';

-- 1. Bật IDENTITY_INSERT cho bảng Books để chèn đúng BookID
PRINT N'[1/4] Đang nạp dữ liệu vào bảng Books...';

-- Tạo bảng tạm để đọc file CSV sạch
IF OBJECT_ID('tempdb..#TempBooks') IS NOT NULL DROP TABLE #TempBooks;

CREATE TABLE #TempBooks (
    BookID INT,
    CategoryID INT,
    ISBN VARCHAR(20),
    Title NVARCHAR(350),
    Author NVARCHAR(800),
    Publisher NVARCHAR(200),
    BasePrice DECIMAL(18,2)
);

BULK INSERT #TempBooks
FROM '{output_books_csv}'
WITH (
    FORMAT = 'CSV',
    FIELDQUOTE = '"',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0a',
    CODEPAGE = '65001', -- UTF-8
    TABLOCK
);

SET IDENTITY_INSERT Books ON;

INSERT INTO Books (BookID, CategoryID, ISBN, Title, Author, Publisher, BasePrice)
SELECT t.BookID, t.CategoryID, t.ISBN, t.Title, t.Author, t.Publisher, t.BasePrice
FROM #TempBooks t
WHERE NOT EXISTS (SELECT 1 FROM Books b WHERE b.BookID = t.BookID);

SET IDENTITY_INSERT Books OFF;

DROP TABLE #TempBooks;
DECLARE @BookCount INT = (SELECT COUNT(*) FROM Books);
PRINT N' -> Đã hoàn tất nạp bảng Books. Tổng số đầu sách hiện tại: ' + CAST(@BookCount AS NVARCHAR(20));

-- 2. Nạp dữ liệu bản sao vào bảng BookCopies
PRINT N'[2/4] Đang nạp dữ liệu vào bảng BookCopies...';

IF OBJECT_ID('tempdb..#TempCopies') IS NOT NULL DROP TABLE #TempCopies;

CREATE TABLE #TempCopies (
    CopyID INT,
    BookID INT,
    Barcode VARCHAR(50),
    Status NVARCHAR(50)
);

BULK INSERT #TempCopies
FROM '{output_copies_csv}'
WITH (
    FORMAT = 'CSV',
    FIELDQUOTE = '"',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '0x0a',
    CODEPAGE = '65001',
    TABLOCK
);

SET IDENTITY_INSERT BookCopies ON;

INSERT INTO BookCopies (CopyID, BookID, Barcode, Status)
SELECT c.CopyID, c.BookID, c.Barcode, c.Status
FROM #TempCopies c
WHERE NOT EXISTS (SELECT 1 FROM BookCopies bc WHERE bc.Barcode = c.Barcode);

SET IDENTITY_INSERT BookCopies OFF;

DROP TABLE #TempCopies;
DECLARE @CopyCount INT = (SELECT COUNT(*) FROM BookCopies);
PRINT N' -> Đã hoàn tất nạp bảng BookCopies. Tổng số bản sao hiện tại: ' + CAST(@CopyCount AS NVARCHAR(20));

PRINT N'=== HOÀN TẤT NẠP DỮ LIỆU THÀNH CÔNG ===';
GO
"""

    with open(output_sql_file, "w", encoding="utf-8") as f:
        f.write(sql_content)
    
    print(f" -> Đã tạo file script SQL: {output_sql_file}")
    print("\n[THÀNH CÔNG] Quá trình xử lý dữ liệu hoàn tất 100%!")

if __name__ == "__main__":
    clean_books()
